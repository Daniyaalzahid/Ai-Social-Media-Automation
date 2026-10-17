import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  // OAuth callback query strings contain one-use credentials even in development.
  logging: { incomingRequests: { ignore: [/\/api\/oauth\//] } },
  // Preserve Flight headers for the early RSC denial check; route/page guards remain authoritative.
  skipProxyUrlNormalize: true,
  experimental: { authInterrupts: true },
  // Development overlay overlaps the approved sidebar footer controls.
  devIndicators: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }, { source: '/api/oauth/:provider/callback', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] }];
  },
};
export default config;
