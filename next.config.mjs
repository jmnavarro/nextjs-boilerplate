/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

module.exports = {
    headers: [
        ...
        {
          key: 'Access-Control-Allow-Origin',
          value: '*',
        },
    ],
}
