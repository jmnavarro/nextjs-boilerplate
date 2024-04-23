// TODO: See documentation here https://hookdeck.com/xxxxx

module.exports = {
  match: {
    '/webhook-handler': {
      retry: {
        strategy: 'exponential',
        count: 10,
        interval: 3600,
      },
    },
  }
};
