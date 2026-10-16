import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { contentService } from '../../../server/content/web';
import { ContentListing } from '../../../features/content/workspace';
import { PageHeader } from '../../../components/ui/page-header';
export const dynamic='force-dynamic';export const metadata={title:'Content'};
export default async function ContentPage(){await requireRoute('/content');const raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);return <><PageHeader eyebrow="CONTENT" title="Content workspace" description="Drafts, immutable revisions and approved text within your access scope."/><ContentListing initial={await contentService().list(raw)}/></>;}
