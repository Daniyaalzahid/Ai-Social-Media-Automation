import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const config: NextConfig = {
  // Ship Next's generated server with the reviewed configuration serialized in it.
  output: 'standalone',
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
export default function nextConfig(phase: string): NextConfig {
  return phase === PHASE_PRODUCTION_BUILD
    ? { ...config, typescript: { tsconfigPath: './tsconfig.build.json' } }
    : config;
}
