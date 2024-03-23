import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withHookdeck } from 'vercel-integration-demo'

export const config = {
  matcher: '/webhook-handler',
};
 
function middleware(request: NextRequest) {
  console.log(`Middleware call from ${request.url.toString()}`); 

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('user-agent', 'New User Agent overriden by middleware!')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });  
}

export default withHookdeck(middleware);