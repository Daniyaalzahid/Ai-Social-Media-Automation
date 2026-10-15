import { requireWorkspaceIdentity } from '../../../server/auth/web';
import type { Metadata } from 'next';
import { Overview } from '../../../features/overview/overview';

export const metadata: Metadata = { title: 'Overview' };
export default async function OverviewPage() { await requireWorkspaceIdentity(); return <Overview />; }
