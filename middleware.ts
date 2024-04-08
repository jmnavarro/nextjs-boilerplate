import { NextResponse } from 'next/server'
import { NextFetchEvent } from 'next/server'
// import type { NextRequest } from 'next/server'

// add hookdeck imports
// import { withHookdeck } from "vercel-integration-demo";
import hookdeckConfig from "./hookdeck.config";


export const config = {
  matcher: '/webhook-handler',
};
 
function middleware(request: Request, ctx: NextFetchEvent) {
  console.log(`Middleware call from ${request.url.toString()}`);

  if (request.method === 'POST') {
    console.log(`Return JSON and stop here`);
    return new Response(JSON.stringify({ from: 'middleware' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('user-agent', 'New User Agent overriden by middleware!')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });  
}

// wrap the middleware with hookdeck wrapper
export default withHookdeck2(hookdeckConfig, middleware);




export function withHookdeck2(config: any, f: Function) {
  return function (...args) {
    const request = args[0];
    if (!config) {
      console.error('Error getting hookdeck.config.js. Using standard middleware...');
      return f.apply(this, args);
    }
    try {
      const pathname = (request.nextUrl ?? {}).pathname;
      const cleanPath = pathname.split('&')[0];

      const matching = config.connections
        .filter(
          (conn_config) => (cleanPath.match(conn_config.config['match']) ?? []).length > 0,
        ).map(
          (conn_config) => Object.assign(conn_config.config, { id: conn_config.connection.id })
        );

      if (matching.length === 0) {
        console.log('No match... calling user middleware');
        return f.apply(this, args);
      }

      // Forward to Hookdeck

      if (matching.length === 1) {
          // single source
          const api_key = matching[0].api_key || process.env.HOOKDECK_API_KEY;
          const source_name = matching[0].source_name;
          return forwardToHookdeck(request, api_key, source_name);
      }

/*
      // check if there are multiple matches with the same api_key and source_name

      const used = new Map<string, [any]>();

      for (const result of matching) {
        const api_key = result.api_key || process.env.HOOKDECK_API_KEY;
        const source_name = result.source_name;

        if (!api_key) {
          console.error(
            "Hookdeck API key doesn't found. You must set it as a env variable named HOOKDECK_API_KEY or include it in your hookdeck.config.js file.",
          );
          return f.apply(this, args);
        }

        if (!source_name) {
          console.error(
            "Hookdeck Source name doesn't found. You must include it in your hookdeck.config.js file.",
          );
          return f.apply(this, args);
        }

        const match_key = `${api_key}/${source_name}`;
        const array = used[match_key] ?? [];
        array.push(result);
        used[match_key] = array;
      }

      const promises: Promise<any>[] = [];
      for (const array of Object.values(used)) {
        const used_connection_ids: string[] = [];
        if ((array as [any]).length > 1) {
          // If there is more than one similar match, we need the connection_id
          // to pick out the right connection
          for (const entry of array) {
            if (!!entry.id && !used_connection_ids.includes(entry.id)) {
              const api_key = entry.api_key || process.env.HOOKDECK_API_KEY;
              const source_name = entry.source_name;
              promises.push(forwardToHookdeck(request, api_key, source_name));
              used_connection_ids.push(entry.id);
            }
          }
          if (promises.length === 0) {
            console.warn(
              'Found indistinguishable source names, could not process',
              array[0].source_name,
            );
          }
        }
      }

      // If several promises were fullfilled, return the first one as required by the middleware definition
      return Promise.all(promises).then((val) => val[0]);
*/
    } catch (e) {
      // If an error is thrown here, it's better not to continue
      // with default middleware function, as it could lead to more errors
      console.error(e);
      return new Response(JSON.stringify(e), { status: 500 });
    }

    return f.apply(this, args);
  };
}

type HookdeckConnectionConfig = {
  source_name: string;
  match: string;
  host?: string;
  api_key?: string;
  url?: string;
};

const AUTHENTICATED_ENTRY_POINT = 'https://hkdk.events/';

async function forwardToHookdeck(
  request: Request,
  api_key: string,
  source_name: string
): Promise<any> {
  const request_headers = {};
  // iterate using forEach because this can be either a Headers object or a plain object
  request.headers.forEach((value, key) => {
    if (!key.startsWith('x-vercel-')) {
      request_headers[key] = value;
    }
  });

  const headers = {
    ...request_headers,
    connection: 'close',
    'x-hookdeck-api-key': api_key,
    'x-hookdeck-source-name': source_name,
  };
  // TODO:     'x-hookdeck-connection-id': connection_id

  // TODO: assumed string body
  const body = await new Response(request.body).text();

  console.log("-------->", body, request.body, request.bodyUsed, request.bodyUsed ? "true" : "false");

  const options = {
    method: request.method,
    headers,
  };

  if (!!body) {
    options['body'] = body;
  }

  console.log(`Forwarding to hookdeck (${!!body ? 'with' : 'without'} body)...`, options);

  return fetch(AUTHENTICATED_ENTRY_POINT, options);
}

