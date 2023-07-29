const withPWA = require('next-pwa')({
  dest: "public",
  register: false,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: true,
});

module.exports = nextConfig
