// TODO: See documentation here https://hookdeck.com/xxxxx

module.exports = {
  vercel_url: 'https://nextjs-boilerplate-eta-five-30.vercel.app',
  api_key: process.env.HOOKDECK_API_KEY,
  match: {
    '/webhook-handler': {
      delay: 1000,
    },
  }
};
