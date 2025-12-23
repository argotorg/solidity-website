/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  experimental: { esmExternals: true },
  trailingSlash: true,
  webpack: (config) => {
    // Handle KaTeX fonts
    config.module.rules.push({
      test: /\.(woff|woff2|ttf)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name][ext]'
      }
    })
    return config
  }
}

const removeImports = require('next-remove-imports')()
module.exports = removeImports(nextConfig)
