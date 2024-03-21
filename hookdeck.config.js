// See documentation here https://hookdeck.com/xxxxx

module.exports.hookdeckConfig = {
  // TODO these values are sensitive and should be stored in a secure way
  vercel_token: "2aIm0Q3dNbp71XJXOJmO9rx1",
  vercel_project_id: "prj_eZZu2yfcz7HUVvW2ArIU5CKEETpK",

  connections: [
    {
      source_name: "from-vercel",
      destination_url: "https://nextjs-boilerplate-eta-five-30.vercel.app/webhook-handler",
      match_path: "/webhook-handler",
      api_key: "4rzpinn4gjfj1hxhlpc63ufhbeenrhq2z6y2bkwxqycnrhjvd5",
      source_config : {
        allowed_http_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
    },
  ],
};