import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { contentService } from '../../../server/content/web';
import { ContentListing } from '../../../features/content/workspace';
import { PageHeader } from '../../../components/ui/page-header';
export const dynamic='force-dynamic';export const metadata={title:'Posts'};
export default async function ContentPage(){await requireRoute('/content');const raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);return <><PageHeader eyebrow="YOUR POSTS" title="Posts" description="Your drafts and publishing history, together."/><ContentListing initial={await contentService().list(raw)}/></>;}
