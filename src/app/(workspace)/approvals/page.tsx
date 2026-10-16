import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { contentService } from '../../../server/content/web';
import { ContentListing } from '../../../features/content/workspace';
import { PageHeader } from '../../../components/ui/page-header';
export const dynamic='force-dynamic';export const metadata={title:'Review queue'};
export default async function ReviewPage(){await requireRoute('/approvals');const raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);return <><PageHeader eyebrow="REVIEW" title="Review queue" description="Each decision applies to the exact submitted revision."/><ContentListing review initial={await contentService().list(raw,{scope:'review'})}/></>;}
