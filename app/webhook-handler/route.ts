// To stream responses you must use Route Handlers in the App Router, even if the rest of your app uses the Pages Router.
 
export const dynamic = 'force-dynamic'; // static by default, unless reading the request


const json_ok_options = {
    status: 200,
    headers: { 'content-type': 'application/json' },
};

 
export function POST(request: Request) {
    console.log("POST Edge function", request.headers);
    return new Response(
        JSON.stringify({ message: `this was returned by an Edge function (PUT handler)`}), 
        json_ok_options
    );
}

export function PUT(request: Request) {
    console.log("PUT Edge function", request.headers);
    return new Response(
        JSON.stringify({ message: `this was returned by an Edge function (PUT handler)`}), 
        json_ok_options
    );
}