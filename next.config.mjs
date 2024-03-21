/** @type {import('next').NextConfig} */
const nextConfig = {
    headers: [
        ...
        {
          key: 'Access-Control-Allow-Origin',
          value: '*',
        },
    ],
};

export default nextConfig;
