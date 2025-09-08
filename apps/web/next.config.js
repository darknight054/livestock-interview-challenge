/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@livestock/types', '@livestock/shared'],
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
      {
        source: '/health',
        destination: `${process.env.API_BASE_URL || 'http://localhost:3001'}/health`,
      },
    ]
  },
}

export default nextConfig