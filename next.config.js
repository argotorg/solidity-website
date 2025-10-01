/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'docs',
  experimental: { esmExternals: true },
  trailingSlash: true,
}

const removeImports = require('next-remove-imports')()
module.exports = removeImports(nextConfig)
