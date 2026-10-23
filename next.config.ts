import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  // Invalidate assets from the previous Supabase account UI after this migration.
  deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'clerk-accounts-v1',
  // Clerk's session headers use a same-origin rewrite; preserve the browser URL.
  skipProxyUrlNormalize: true,
  outputFileTracingIncludes: {
    '/dashboard/workspace': ['./src/features/storefront/template.html'],
    '/s/*': ['./src/features/storefront/template.html'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/dashboard/workspace',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ];
  },
};
export default config;
