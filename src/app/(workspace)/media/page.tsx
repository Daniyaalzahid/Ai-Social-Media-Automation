import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { mediaService } from '../../../server/media/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { TemporaryMedia } from '../../../features/media/temporary-media';
import { PageHeader } from '../../../components/ui/page-header';
export const metadata={title:'Temporary media'};export const dynamic='force-dynamic';
export default async function MediaPage(){await requireRoute('/media');const raw=(await cookies()).get(SESSION_COOKIE)!.value;const initial=await mediaService().list(new SensitiveValue(raw));return <><PageHeader eyebrow="WORKING FILES" title="Temporary media" description="Upload validated creatives for upcoming work. Unattached files expire after 24 hours."/><TemporaryMedia initial={initial}/></>;}
