/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    if (!config.externals.includes('ws')) {
      config.externals.push('ws');
    }
    return config;
  },
};

module.exports = nextConfig;
