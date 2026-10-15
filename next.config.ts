import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
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
    ] }];
  },
};
export default config;
