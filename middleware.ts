import { NextResponse } from 'next/server'
import { NextFetchEvent } from 'next/server'
// import type { NextRequest } from 'next/server'

// add hookdeck imports
import { withHookdeck } from "@hookdeck/vercel";
import hookdeckConfig from "./hookdeck.config";


export const config = {
  matcher: '/webhook-handler',
};
 
async function middleware(request: Request, ctx: NextFetchEvent) {
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
export default withHookdeck(hookdeckConfig, middleware);
//export default middleware;
