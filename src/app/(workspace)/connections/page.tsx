import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { connectionsService } from '../../../server/social/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { Connections } from '../../../features/connections/connections';
import { PageHeader } from '../../../components/ui/page-header';
export const dynamic='force-dynamic';
export default async function ConnectionsPage(){await requireRoute('/connections');const raw=(await cookies()).get(SESSION_COOKIE)!.value;const view=await connectionsService().read(new SensitiveValue(raw));return <><PageHeader eyebrow="YOUR AUTHORIZED CHANNELS" title="Connections" description="Manage workspace social authorization. Publishing is not available in this phase."/><Connections initial={view}/></>;}
