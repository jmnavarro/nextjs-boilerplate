module.exports = {
  connections: [
    {
      source_name: "from-vercel-v033",
      destination_url: "https://nextjs-boilerplate-eta-five-30.vercel.app/webhook-handler",
      match_path: "/webhook-handler",
      rules: [
        {
          type: "retry",
          interval: 60000,
          count: 10,
          strategy: "exponential",
        },
      ],
      source_config: {
        allowed_http_methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
        custom_response: {
          content_type: "json",
          body: '{"message":"Hello World"}',
        },
      },
      destination_config: {
        rate_limit: 100,
        rate_limit_period: "hour",
        auth_method: {
          type: "OAUTH2_AUTHORIZATION_CODE",
          config: {
            client_id: "test_client_id",
            client_secret: "test_client_secret",
            refresh_token: "test_refresh_token",
            scope: "",
            auth_server: "http://auth_server",
          },
        },
      },
    },
    {
      source_name: "from-vercel-v033-2",
      destination_url: "https://nextjs-boilerplate-eta-five-30.vercel.app/webhook-handler",
      match_path: "/webhook-handler",
      rules: [
        {
          type: "retry",
          interval: 60000,
          count: 20,
          strategy: "exponential",
        },
      ],
      source_config: {
        allowed_http_methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
        custom_response: {
          content_type: "json",
          body: '{"message":"Hello World, but updated"}',
        },
      },
      destination_config: {
        rate_limit: 100,
        rate_limit_period: "hour",
        auth_method: {
          type: "OAUTH2_AUTHORIZATION_CODE",
          config: {
            client_id: "test_client_id",
            client_secret: "test_client_secret",
            refresh_token: "test_refresh_token",
            scope: "",
            auth_server: "http://auth_server",
          },
        },
      },
    },
  ],
};
