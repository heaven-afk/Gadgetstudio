import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/demo': ['./src/features/storefront/template.html'],
    '/dashboard': ['./src/features/storefront/template.html'],
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
    ];
  },
};
export default config;
