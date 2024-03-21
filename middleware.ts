import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: '/webhook-handler',
};
 
export default function middleware(request: NextRequest) {
  console.log(`Middleware call from ${request.url.toString()}`); 

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('user-agent', 'New User Agent overriden by middleware!')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });  
}