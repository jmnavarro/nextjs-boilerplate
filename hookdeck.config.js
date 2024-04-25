const {
  RetryStrategy,
  DestinationRateLimitPeriod,
  SourceCustomResponseContentType,
} = require('@hookdeck/sdk/api');

const hookdeckConfig = {
  match : {
    '/webhook-handler': {
      retry: {
        strategy: RetryStrategy.Linear,
        count: 5,
        interval: 1 * 60 * 1000, // in milliseconds
      },
      delay: 1 * 60 * 1000, // in milliseconds
      filters: [
        {
          headers: {
            'x-my-header': 'my-value',
          },
          body: {},
          query: {},
          path: {},
        },
      ],
      rate: {
        limit: 10,
        period: DestinationRateLimitPeriod.Seconds,
      },

      verification: {
        type: 'API_KEY',
        configs: {
          header_key: 'x-my-api-key',
          api_key: 'this-is-my-token',
        }
      },

      custom_response: {
        contentType: SourceCustomResponseContentType.Json,
        body: '{"message": "Vercel handled the webhook using Hookdeck"}',
      },
    },
  }
};

module.exports = hookdeckConfig;
