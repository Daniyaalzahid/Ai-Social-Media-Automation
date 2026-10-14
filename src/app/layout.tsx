import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/dm-sans';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'Bismillah Social AI', template: '%s · Bismillah Social AI' },
  description: 'A thoughtful social workspace for Bismillah Electronics. Phase 1 UI preview.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
