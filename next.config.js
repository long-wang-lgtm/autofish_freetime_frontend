/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // 在生产构建时运行ESLint
    ignoreDuringBuilds: false,
  },
  typescript: {
    // 在生产构建时运行TypeScript检查
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig