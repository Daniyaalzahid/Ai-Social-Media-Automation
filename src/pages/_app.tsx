import type { AppProps } from 'next/app';
import '@fontsource-variable/dm-sans';
import '../styles/globals.css';

// Only the stable denial endpoint lives here; retain the existing design system.
export default function DenialApplication({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
