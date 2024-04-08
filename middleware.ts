import { NextResponse } from 'next/server'
import { NextFetchEvent } from 'next/server'
// import type { NextRequest } from 'next/server'

export const config = {
  matcher: '/webhook-handler',
};
 
export default function middleware(request: Request, ctx: NextFetchEvent) {
  console.log(`Middleware call from ${request.url.toString()}: host=${process.env.VERCEL_URL}`); 

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('user-agent', 'New User Agent overriden by middleware!')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });  
}
