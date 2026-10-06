import type { NextConfig } from 'next'

const TRACKER = 'http://31.97.56.148:3098'

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      { source: '/auth-api/:path*', destination: 'http://31.97.56.148:3110/:path*' },
      { source: '/t.js', destination: `${TRACKER}/t.js` },
      { source: '/track', destination: `${TRACKER}/track` },
      { source: '/session', destination: `${TRACKER}/session` },
      { source: '/feedback', destination: `${TRACKER}/feedback` },
    ]
  },
}

export default nextConfig
