const appRoot = require('app-root-path');
const fs = require('fs');
const path = require('path');
const process = require('process');
const crypto = require('crypto');
const hookdeckConfig = require('../hookdeck.config');
const { match, api_key: _api_key, signing_secret: _signing_secret, vercel_url } = hookdeckConfig;

const LIBRARY_NAME = '@hookdeck/vercel';
const WRAPPER_NAME = 'withHookdeck';
const TUTORIAL_URL = 'https://hookdeck.com/docs';

const HookdeckEnvironment = require('@hookdeck/sdk').HookdeckEnvironment;
const API_ENDPOINT = HookdeckEnvironment.Default;

async function checkPrebuild() {
  try {
    validateMiddleware();
    if (!validateConfig(hookdeckConfig)) {
      return false;
    }

    const connections = Object.entries(match).map((e) => {
      const key = e[0];
      const value = e[1];
      return Object.assign(value, {
        api_key: _api_key || process.env.HOOKDECK_API_KEY,
        signing_secret: _signing_secret || process.env.HOOKDECK_SIGNING_SECRET,
        host: vercel_url || `https://${process.env.VERCEL_BRANCH_URL}`,
        matcher: key,
        source_name: slugify(key),
      });
    });

    if (connections.length === 0) {
      console.warn(
        'hookdeck.config.js file seems to be invalid. Please follow the steps in ${TUTORIAL_URL}.',
      );
      return false;
    }

    console.log('hookdeck.config.js is valid');

    // const env_configs = [];
    const created_connections_pseudo_keys = {};
    for (const conn_config of connections) {
      const has_connection_id = !!conn_config.id;

      let connection;
      if (has_connection_id) {
        connection = await updateConnection(conn_config.api_key, conn_config);
      } else {
        // avoid creating identical connections
        const pseudo_key = `${conn_config.api_key}*${conn_config.source_name}`;
        const cached_connection_id = created_connections_pseudo_keys[pseudo_key] || null;

        if (cached_connection_id) {
          connection = await updateConnection(
            conn_config.api_key,
            Object.assign({ id: cached_connection_id }, conn_config),
          );
        } else {
          const source = await getSourceByName(conn_config.api_key, conn_config.source_name);
          if (source) {
            const dest_url = getDestinationUrl(conn_config);
            const destination = await getDestinationByUrl(conn_config.api_key, dest_url);
            if (destination) {
              connection = await getConnectionWithSourceAndDestination(
                conn_config.api_key,
                source,
                destination,
              );
              if (connection) {
                connection = await updateConnection(
                  conn_config.api_key,
                  Object.assign({ id: connection.id }, conn_config),
                );
              }
            }
          }
          if (!connection) {
            connection = await autoCreateConnection(conn_config.api_key, conn_config);
          }
          created_connections_pseudo_keys[pseudo_key] = connection.id;
        }
      }

      console.log('Hookdeck connection configured successfully', connection.source.url);
    }

    console.log('Hookdeck successfully configured');
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

if (!checkPrebuild()) {
  exit(1);
}

function generateId(prefix = '') {
  const ID_length = 16;

  const randomAlphaNumeric = (length) => {
    let s = '';
    Array.from({ length }).some(() => {
      s += Math.random().toString(36).slice(2);
      return s.length >= length;
    });
    return s.slice(0, length);
  };

  const nanoid = randomAlphaNumeric(ID_length);
  return `${prefix}${nanoid}`;
}

function isValidPropertyValue(propValue) {
  return !(propValue === undefined || propValue === null || !isString(propValue));
}

function isString(str) {
  return typeof str === 'string' || str instanceof String;
}

function getDestinationUrl(config) {
  const dest_url = config.url || config.host || `https://${process.env.VERCEL_BRANCH_URL}`;
  return dest_url.endsWith('/') ? dest_url.substring(0, dest_url.length - 1) : dest_url;
}

function getConnectionName(config) {
  const dest_url = getDestinationUrl(config);
  const valueToHash = `${config.source_name}*${dest_url}*${config.matcher}`;
  return crypto.createHash('sha256').update(valueToHash).digest('hex');
}

function getConnectionRules(config) {
  const rules = [];

  if ((config.retry || null) !== null && config.retry.constructor === Object) {
    const target = config.retry;
    rules.push(Object.assign(target, { type: 'retry' }));
  }
  if ((config.delay || null) !== null && isNaN(config.delay) === false) {
    rules.push({ type: 'delay', delay: config.delay });
  }
  if (typeof (config.alert || null) === 'string' || config.alert instanceof String) {
    // 'each_attempt' or 'last_attempt'
    rules.push({ type: 'alert', strategy: config.alert });
  }
  if (Array.isArray(config.filters)) {
    for (const filter of config.filters.map((e) => Object.assign(e, { type: 'filter' }))) {
      rules.push(filter);
    }
  }

  // Transformations disabled for now
  //  if ((config.transformation || null) !== null && config.transformation.constructor === Object) {
  //    const target = config.transformation;
  //    rules.push({ type: 'transform', transformation: target });
  //  }

  return rules;
}

async function autoCreateConnection(api_key, config) {
  if (!config.path_forwarding_disabled) {
    // if they set a specific url, path forwarding is disabled by default
    config.path_forwarding_disabled = !!config.url ? true : false;
  }

  const connection_name = getConnectionName(config);
  const dest_url = getDestinationUrl(config);

  const data = {
    name: connection_name,
    source: Object.assign(
      {
        description: 'Autogenerated from Vercel integration',
        name: config.source_name,
      },
      config.source_config || {},
    ),
    destination: Object.assign(
      {
        description: 'Autogenerated from Vercel integration',
        url: dest_url,
        name: generateId('dst-'),
      },
      config.destination_config || {},
    ),
    rules: config.rules || [],
    description: 'Autogenerated from Vercel integration',
  };

  const rules = getConnectionRules(config);
  if (rules.length > 0) {
    data['rules'] = rules;
  }

  if (!!config.allowed_http_methods) {
    data.source.allowed_http_methods = config.allowed_http_methods;
  }

  if (!!config.custom_response) {
    data.source.custom_response = config.custom_response;
  }

  if (!!config.verification) {
    data.source.verification = config.verification;
  }

  if (config.path_forwarding_disabled !== null) {
    data.destination.path_forwarding_disabled = config.path_forwarding_disabled;
  }
  if (!!config.http_method) {
    data.destination.http_method = config.http_method;
  }
  if (!!config.auth_method) {
    data.destination.auth_method = config.auth_method;
  }
  if (!!config.delivery_rate) {
    data.destination.delivery_rate = config.delivery_rate;
  }

  try {
    const url = `${API_ENDPOINT}/connections`;
    const response = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (response.status !== 200) {
      manageResponseError(response, JSON.stringify(data));
      return null;
    }
    const json = await response.json();
    console.log('Connection created', json);
    return json;
  } catch (e) {
    manageError(e);
  }
}

function manageError(error) {
  console.error(error);
  process.exit(1);
}

function manageResponseError(response, body) {
  switch (response.status) {
    case 401:
      console.error('Invalid or expired hookdeck api_key', response.status, response.statusText);
      break;

    default:
      console.error('Error', response.status, response.statusText, body);
      break;
  }
  process.exit(1);
}

function readMiddlewareFile(basePath) {
  const extensions = ['js', 'mjs', 'ts']; // Supported by now
  for (const ext of extensions) {
    const filePath = `${basePath}.${ext}`;
    try {
      const middlewareSourceCode = fs.readFileSync(filePath, 'utf-8');
      if (middlewareSourceCode) {
        const purgedCode = middlewareSourceCode.replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g, ''); // removes al comments. May mess with http:// bars but doesn't matter here.
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
  const middlewareSourceCode =
    readMiddlewareFile(`${appRoot}/middleware`) || readMiddlewareFile(`${appRoot}/src/middleware`);
  if (!middlewareSourceCode) {
    console.warn(
      `Middleware file not found. Consider removing ${LIBRARY_NAME} from your dev dependencies if you are not using it.`,
    );
    return;
  }

  // 2) Check if library is used in middleware.
  const hasLibraryName = middlewareSourceCode.includes(LIBRARY_NAME);
  const hasWrapper = middlewareSourceCode.includes(WRAPPER_NAME);

  if (!hasLibraryName || !hasWrapper) {
    // If it's not being used, just shows a warning
    console.warn(
      `Usage of ${LIBRARY_NAME} not found in the middleware file. Consider removing ${LIBRARY_NAME} from your dev dependencies if you are not using it.`,
    );
  } else {
    console.log(`Usage of ${LIBRARY_NAME} detected`);
  }
}

function validateConfig(config) {
  if (!config) {
    console.error(
      `Usage of ${LIBRARY_NAME} detected but hookdeck.config.js could not be imported. Please follow the steps in ${TUTORIAL_URL} to export the hookdeckConfig object`,
    );
    return false;
  }

  const api_key = config.api_key || process.env.HOOKDECK_API_KEY;
  if (!api_key) {
    console.error(
      `Hookdeck's API key not found. You must set it as a env variable named HOOKDECK_API_KEY or include it in your hookdeck.config.js. Check ${TUTORIAL_URL} for more info.`,
    );
    return false;
  }
  if (!isString(api_key) || api_key.trim().length === 0) {
    console.error(`Invalid Hookdeck API KEY format. Check ${TUTORIAL_URL} for more info.`);
    return false;
  }

  if (!(config.signing_secret || process.env.HOOKDECK_SIGNING_SECRET)) {
    console.warn(
      "Signing secret key is not present neither in `hookdeckConfig.signing_secret` nor `process.env.HOOKDECK_SIGNING_SECRET`. You won't be able to validate webhooks' signatures. " +
        `Please follow the steps in ${TUTORIAL_URL}.`,
    );
  }

  if (!config.vercel_url && !process.env.VERCEL_BRANCH_URL) {
    console.info(
      'Vercel url not present in config file nor in `process.env.VERCEL_BRANCH_URL`. ' +
        `Please follow the steps in ${TUTORIAL_URL}.`,
    );
    return false;
  }

  return true;
}

async function updateConnection(api_key, config) {
  const data = {};
  const rules = getConnectionRules(config);
  if (rules.length > 0) {
    data['rules'] = rules;
  }

  try {
    const url = `${API_ENDPOINT}/connections/${config.id}`;
    const response = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (response.status !== 200) {
      console.error('Error while updating connection with ID', config.id);
      manageResponseError(response, JSON.stringify(data));
      return null;
    }
    const json = await response.json();
    console.log('Connection updated', json);

    // Updates configurations if neeeded
    if (
      (config.allowed_http_methods || null) !== null ||
      (config.custom_response || null) !== null ||
      (config.verification || null) !== null
    ) {
      const source_id = json.source.id;
      await updateSource(api_key, source_id, config);
    }

    if (
      config.path_forwarding_disabled !== null ||
      (config.http_method || null) !== null ||
      (config.auth_method || null) !== null ||
      (config.delivery_rate || null) !== null
    ) {
      const destination_id = json.destination.id;
      await updateDestination(api_key, destination_id, config);
    }

    return json;
  } catch (e) {
    manageError(e);
  }
}

async function updateSource(api_key, id, config) {
  const data = {};

  data.allowed_http_methods = config.allowed_http_methods || [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ];

  if ((config.custom_response || null) !== null) {
    data.custom_response = config.custom_response;
  }
  if ((config.verification || null) !== null) {
    data.verification = config.verification;
  }

  const url = `${API_ENDPOINT}/sources/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${api_key}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (response.status !== 200) {
    throw new Error(`Error while updating source with ID ${id}`);
  }
  const json = await response.json();
  console.log('Source updated', json);
}

async function updateDestination(api_key, id, config) {
  const data = {};
  if (config.path_forwarding_disabled !== null) {
    data.path_forwarding_disabled = config.path_forwarding_disabled;
  }
  if ((config.http_method || null) !== null) {
    data.http_method = config.http_method;
  }
  if ((config.auth_method || null) !== null) {
    data.auth_method = config.auth_method;
  }
  if ((config.delivery_rate || null) !== null) {
    data.rate_limit = config.delivery_rate.limit;
    data.rate_limit_period = config.delivery_rate.period;
  }

  const url = `${API_ENDPOINT}/destinations/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${api_key}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (response.status !== 200) {
    throw new Error(`Error while updating destination with ID ${id}`);
  }
  const json = await response.json();
  console.log('Destination updated', json);
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\//g, '-') // Replace / with -
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

async function getConnectionWithSourceAndDestination(api_key, source, destination) {
  try {
    const url = `${API_ENDPOINT}/connections?source_id=${source.id}&destination_id=${destination.id}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
      },
      credentials: 'include',
    });
    if (response.status !== 200) {
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    if (json.models.length === 0) {
      return null;
    }

    console.info(
      `Connection for source ${source.id} and destination ${destination.id} found`,
      json.models[0],
    );
    return json.models[0];
  } catch (e) {
    manageError(e);
  }
}

async function getSourceByName(api_key, source_name) {
  try {
    const url = `${API_ENDPOINT}/sources?name=${source_name}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
      },
      credentials: 'include',
    });
    if (response.status !== 200) {
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    if (json.models.length === 0) {
      return null;
    }

    console.info(`Source '${source_name}' found`, json.models[0]);
    return json.models[0];
  } catch (e) {
    manageError(e);
  }
}

async function getDestinationByUrl(api_key, destination_url) {
  try {
    const url = `${API_ENDPOINT}/destinations?url=${encodeURI(destination_url)}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: `Bearer ${api_key}`,
      },
      credentials: 'include',
    });
    if (response.status !== 200) {
      console.error(`Error getting destination by url ${destination_url}`);
      manageResponseError(response);
      return null;
    }
    const json = await response.json();
    if (json.models.length === 0) {
      return null;
    }

    console.info(`Destination '${destination_url}' found`, json.models[0]);
    return json.models[0];
  } catch (e) {
    manageError(e);
  }
}
