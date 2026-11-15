import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: path.resolve(frontendDir, '..'),
  outputFileTracingIncludes: {
    '/api/sql-insights/[queryId]': ['../database/queries/*.sql'],
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
