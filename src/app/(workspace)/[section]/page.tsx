import { requireRoute } from '../../../server/authorization/web';
import { notFound } from 'next/navigation';
import { navigation } from '../../../components/shell/navigation';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/states';
import { PageHeader } from '../../../components/ui/page-header';

export const dynamicParams = false;
export function generateStaticParams() {
  return navigation.filter((item) => item.href !== '/overview' && item.href !== '/team' && item.href !== '/brand-brain' && item.href !== '/media' && item.href !== '/create-post').map((item) => ({ section: item.href.slice(1) }));
}
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: navigation.find((item) => item.href === `/${section}`)?.label ?? 'Page not found' };
}
export default async function PlaceholderPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = navigation.find((entry) => entry.href === `/${section}`);
  if (!item || item.href === '/overview') notFound();
  await requireRoute(item.href);
  return <><PageHeader eyebrow="ROOM FOR WHAT’S NEXT" title={item.label} description={item.description} /><Card className="placeholder-card"><EmptyState icon={item.icon} title={`Your ${item.label.toLowerCase()} space is taking shape.`} description="The space is ready. Its tools will arrive in a future approved phase." action={<Badge>UI placeholder</Badge>} /></Card></>;
}
