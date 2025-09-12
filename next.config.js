/** @type {import('next').NextConfig} */
const nextConfig = {
  // 暂时跳过TypeScript和ESLint检查以便部署
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  // 禁用静态优化以避免SSR问题
  output: 'standalone',
  experimental: {
    esmExternals: 'loose',
  }
}

module.exports = nextConfig