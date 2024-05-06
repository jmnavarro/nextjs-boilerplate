import { next } from '@vercel/edge';

//import { withHookdeck } from "@hookdeck/vercel";
//import hookdeckConfig from "./hookdeck.config";


export const config = {
  matcher: '/webhook-handler',
};
 
async function middleware(request: Request) {
  console.log(`Middleware call from ${request.url.toString()}`);

  if (request.method === 'POST') {
    console.log(`Return JSON and stop here`);

    return new Response(JSON.stringify({ message: 'this was returned by the middleware' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return next();
}

//export default withHookdeck(hookdeckConfig, middleware);
export default middleware;
