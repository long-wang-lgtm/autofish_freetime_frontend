/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  /**
   * 构建产物目录。默认仍是 `.next`（行为不变）；用 NEXT_DIST_DIR 可指到别处，
   * 用于在不打断运行中的 next dev（它占着 .next）的前提下做一次生产构建验证。
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
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

  // === 安全响应头 ===
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  // === 生产构建剔除 console.log/debug，保留 error/warn ===
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
}

module.exports = nextConfig
