import { requireRoute } from '../../../server/authorization/web';
import type { Metadata } from 'next';
import { PageHeader } from '../../../components/ui/page-header';
import { ComponentShowcase } from '../../../features/design-system/component-showcase';

export const metadata: Metadata = { title: 'Design system' };
export default async function DesignSystemPage() {
  await requireRoute('/ui-kit');
  return <><PageHeader eyebrow="THE BUILDING BLOCKS" title="A consistent kind of good." description="The visual language of Bismillah Social AI. Interactive component previews only." /><ComponentShowcase /></>;
}
