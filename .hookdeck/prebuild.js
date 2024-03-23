const appRoot = require("app-root-path");
const fs = require("fs");
const { customAlphabet } = require("nanoid");
const path = require('path');
const { exit } = require("process");
const hookdeckConfig = require("../hookdeck.config");


const LIBRARY_NAME = 'vercel-integration-demo';
const WRAPPER_NAME = "withHookdeck";
const TUTORIAL_URL = "https://hookdeck.com/docs";
const API_VERSION = "2024-03-01";
const HOOKDECK_API_URL = "https://api.hookdeck.com";


function generateId(prefix = "") {
  const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
  const ID_length = 16;

  const nanoid = customAlphabet(ID_ALPHABET, ID_length);
  return `${prefix}${nanoid()}`;
}


function isValidPropertyValue(propValue) {
  return !(
    propValue === undefined ||
    propValue === null ||
    !isString(propValue)
  );
}

function isString(str) {
  return typeof str === "string" || str instanceof String;
}


function validateConfig(config) {
  if (!config.connections) {
    return {
      ok: false,
      msg: 'Missing `connections` array in configuration file at hookdeck.config.js'
    };
  }
  if (!Array.isArray(config.connections)) {
    return {
      ok: false,
      msg: 'Invalid `connections` value in configuration file at hookdeck.config.js. Must be an array.'
    };
  }

  let valid = true;
  let msgs = [];
  const string_props = ["source_name", "match_path"];
  let index = 0;

  for(const conn of config.connections) {
    for (const prop of string_props) {
        if (!isValidPropertyValue(conn[prop])) {
          msgs.push(`connections[${index}]: Undefined or invalid value for key ${prop} in configuration file at hookdeck.config.js`)
          valid = false;
        }
    }
    index ++;
  }
  
  return {
    ok: valid,
    msg: msgs.join(', ')
  };
}


async function getSourceByName(api_key, source_name) {
  try {
    const url = `${HOOKDECK_API_URL}/${API_VERSION}/sources?name=${source_name}`;
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      credentials: "include",
    });
    if (response.status !== 200) {
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    if (json.models.length === 0) {
      return null;
    }
    return json.models[0];
  } catch (e) {
    manageError(e);
  }
}

async function getDestinationByUrl(api_key, destination) {
  try {
    const url = `${HOOKDECK_API_URL}/${API_VERSION}/destinations?url=${encodeURI(destination)}`;
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${api_key}`,
      },
      credentials: "include",
    });
    if (response.status !== 200) {
      console.error(`Error getting destination by url ${destination}`);
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    if (json.models.length === 0) {
      return null;
    }
    return json.models[0];
  } catch (e) {
    manageError(e);
  }
}

async function getConnectionWithSourceAndDestination(
  api_key,
  source,
  destination
) {
  try {
    const url = `${HOOKDECK_API_URL}/${API_VERSION}/webhooks?source_id=${source.id}&destination_id=${destination.id}`;
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      credentials: "include",
    });
    if (response.status !== 200) {
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    if (json.models.length === 0) {
      return null;
    }
    return json.models[0];
  } catch (e) {
    manageError(e);
  }
}

async function createSource(api_key, source_name) {
  const data = {
    name: source_name,
    description: "Autogenerated from Vercel integration",
    allowed_http_methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]    
    // TODO: other configs
  };
  try {
    const url = `${HOOKDECK_API_URL}/${API_VERSION}/sources`;
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (response.status !== 200) {
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    console.log("Source created", json);
    return json;
  } catch (e) {
    manageError(e);
  }
}

async function createDestination(api_key, destination) {
  const destination_name = generateId("dst-");
  const data = {
    name: destination_name,
    url: destination,
    path_forwarding_disabled: false,
    description: "Autogenerated from Vercel integration",
    // TODO: other configs
  };
  try {
    const url = `${HOOKDECK_API_URL}/${API_VERSION}/destinations`;
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (response.status !== 200) {
      console.error(`Error creating destination ${destination}`);
      console.error(JSON.stringify(data));
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    console.log("Destination created", json);
    return json;
  } catch (e) {
    manageError(e);
  }
}

async function createConnection(api_key, source, destination) {
  const data = {
    source_id: source.id,
    destination_id: destination.id,
    // TODO: other configs
  };
  try {
    const url = `${HOOKDECK_API_URL}/${API_VERSION}/webhooks`;
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (response.status !== 200) {
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    console.log("Connection created", json);
    return json;
  } catch (e) {
    manageError(e);
  }
}

function manageError(error) {
  console.error(error);
  process.exit(1);
}

function manageResponseError(response, isFromHookdeck = true) {
  switch (response.status) {
    case 401:
      console.error( `Invalid or expired ${isFromHookdeck ? "hookdeck api_key" : "vercel token"}`, response.status, response.statusText);
      break;
  
    default:
      console.error("Error", response.status, response.statusText);
      break;
  }
  process.exit(1);
}

function saveCurrentConfig(config) {
  // Save the current config to a file just for debugging and information purposes.
  // This is actually not needed for the wrapper to work
  try {
    const destDir = `${appRoot}/.hookdeck`;
    const destinationPath = path.join(
      `${appRoot}/.hookdeck`,
      "hookdeck.current.json"
    );

    if (!fs.existsSync(path)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const json = JSON.stringify(config, null, 2);
    fs.writeFileSync(destinationPath, json, "utf-8");
  } catch (e) {
    manageError(e);
  }
}

function readMiddlewareFile(basePath) {
  const extensions = ["js", "mjs", "ts"]; // Add more if needed
  for (let ext of extensions) {
    const filePath = `${basePath}.${ext}`;
    try {
      const middlewareSourceCode = fs.readFileSync(filePath, "utf-8");
      if (middlewareSourceCode) {
        const purgedCode = middlewareSourceCode.replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g, ""); // removes al comments. May mess with http:// bars but doesn't matter here.
        if (purgedCode.length > 0) {
          return purgedCode;
        } else {
          console.warn(`File ${filePath} is empty`);
        }
      }
    } catch (error) {
      // File does not exist, continue checking the next extension
    }
  }
  return null;
}


function validateMiddleware() {
  // 1) Check if middleware exists. If not, just shows a warning
  const middlewareSourceCode = readMiddlewareFile(`${appRoot}/middleware`);
  if (!middlewareSourceCode) {
    console.warn(
      `Middleware file not found. Consider removing ${LIBRARY_NAME} from your dev dependencies if you are not using it.`
    );
    return;
  }

  // 2) Check if library is used in middleware.
  const hasLibraryName = middlewareSourceCode.includes(LIBRARY_NAME);
  const hasWrapper = middlewareSourceCode.includes(WRAPPER_NAME);

  if (!hasLibraryName || !hasWrapper) {
    // If it's not being used, just shows a warning
    console.warn(
      `Usage of ${LIBRARY_NAME} not found at ${middlewareFilePath}. Consider removing ${LIBRARY_NAME} from your dev dependencies if you are not using it.`
    );
  } else {
    console.log(`Usage of ${LIBRARY_NAME} detected`);
  }
}

function validateHookdeckJson() {
  const hookdeckFilePath = `${appRoot}/hookdeck.config.js`;
  try {
    const hookdeckConfigSourceCode = fs.readFileSync(hookdeckFilePath, "utf-8");
    if (!hookdeckConfigSourceCode) {
      console.error("hookdeck.config.js file not found in the project root");
      return null;
    }

    const hookdeckConfig = JSON.parse(hookdeckConfigSourceCode);
    if (!hookdeckConfig) {
      console.error("hookdeck.config.js is not a valid JS file");
      return null;
    }

    console.log(`hookdeck.config.js found`);
    return hookdeckConfig;
  } catch (error) {
    console.error("hookdeck.config.js is not a valid JSON file");
  }

  return null;
}

async function checkPrebuild() {
  try {
    validateMiddleware();

    if (!hookdeckConfig) {
      console.error(
        `Usage of ${LIBRARY_NAME} detected but hookdeck.config.js could not be imported. Please follow the steps in ${TUTORIAL_URL} to export the hookdeckConfig object`
      );
      return false;      
    }
    
    const validConfigFileResult = validateConfig(hookdeckConfig);
    if (!validConfigFileResult.ok) {
      console.error(validConfigFileResult.msg);
      return false;
    }

    console.log('hookdeck.config.js validated successfully');

    const env_configs = [];
    for (const conn_config of hookdeckConfig.connections) {
        const api_key = conn_config.api_key ?? process.env.HOOKDECK_API_KEY;
        if (!api_key) {
          console.error(
            `Hookdeck's API key doesn't found. You must set it as a env variable named HOOKDECK_API_KEY or include it in your hookdeck.config.js. Check ${TUTORIAL_URL} for more info.`
          );
          return false;
        }
        if (!isString(api_key) || api_key.trim().length === 0) {
          console.error(
            `Invalid Hookdeck API KEY format. Check ${TUTORIAL_URL} for more info.`
          );
          return false;
        }
    
        let source = await getSourceByName(api_key, conn_config.source_name);
        let shouldCreateConnection = false;
    
        // TODO: this is not transactional. Create cleaup-rollback mechanism?
    
        if (!source) {
          source = await createSource(api_key, conn_config.source_name);
          shouldCreateConnection = true;
        }

        let destination = await getDestinationByUrl(api_key, conn_config.destination_url);
        if (!destination) {
          destination = await createDestination(api_key, conn_config.destination_url);
          shouldCreateConnection = true;
        }
    
        let connection;
        if (shouldCreateConnection) {
          connection = await createConnection(api_key, source, destination);
        } else {
          connection = await getConnectionWithSourceAndDestination(
            api_key,
            source,
            destination
          );
          if (!connection) {
            connection = await createConnection(api_key, source, destination);
          }
        }

        env_configs.push({
            connection: connection, 
            config: conn_config
        });
        console.log(
          "Hookdeck connection configured successfully ",
          connection.source.url
        );
    }

    saveCurrentConfig({ connections: env_configs });

    console.log("Hookdeck successfully configured");
    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}

if (!checkPrebuild()) {
  exit(1);
}
