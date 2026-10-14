'use client';

import { Button } from '../components/ui/button';
import { ErrorState } from '../components/ui/states';
import '../styles/globals.css';

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="en"><body><main className="status-page"><ErrorState title="Something went wrong." description="Please try reopening your workspace." action={<Button onClick={reset}>Try again</Button>} /></main></body></html>;
}
