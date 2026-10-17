import { requireRoute } from '../../../server/authorization/web';
import { can } from '../../../server/authorization/authorization';
import type { Metadata } from 'next';
import { Overview } from '../../../features/overview/overview';

export const metadata: Metadata = { title: 'Overview' };
export default async function OverviewPage() { const context = await requireRoute('/overview'); return <Overview canCreate={can(context, 'content.create')} canAudit={can(context, 'audit.read')} canConnect={can(context, 'integrations.read')} />; }
