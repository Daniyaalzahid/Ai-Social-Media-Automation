'use client';

import { Button } from '../components/ui/button';
import { ErrorState } from '../components/ui/states';

export default function AppError({ reset }: { reset: () => void }) {
  return <main className="status-page"><ErrorState title="A small pause in the flow." description="We couldn’t open this page. Please try again." action={<Button onClick={reset}>Try again</Button>} /></main>;
}
