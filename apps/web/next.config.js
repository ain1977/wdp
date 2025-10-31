/** @type {import('next').NextConfig} */
const FUNCTIONS_BASE = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || 'https://func-xob7nugiarm7e.azurewebsites.net'

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${FUNCTIONS_BASE}/api/:path*`
      }
    ]
  }
}

module.exports = nextConfig


