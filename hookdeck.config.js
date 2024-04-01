module.exports = {
  connections: [
    {
      source_name: "from-vercel",
      destination_url: "https://nextjs-boilerplate-eta-five-30.vercel.app/webhook-handler",
      match_path: "/webhook-handler"
    }
  ]
}