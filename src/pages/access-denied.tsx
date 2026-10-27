import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { StatusPage } from '../components/status-page';

// A single stable HTTP SSR endpoint: App Router Server Components cannot set
// a 403 response without experimental interrupts. Reuse the existing denial UI.
export const getServerSideProps: GetServerSideProps<Record<string, never>> = async ({ res }) => {
  res.statusCode = 403;
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return { props: {} };
};
export default function AccessDenied() {
  return <><Head><title>Access denied · Bismillah Social AI</title><meta name="robots" content="noindex, nofollow" /></Head><StatusPage code="403" title="Access denied" description="You do not have access to this workspace area." /></>;
}
