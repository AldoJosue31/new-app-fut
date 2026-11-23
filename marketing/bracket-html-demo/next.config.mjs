export default {
  output: 'export',
  devIndicators: false,
  images: { unoptimized: true },
  webpack: config => { config.cache = false; return config; },
};
