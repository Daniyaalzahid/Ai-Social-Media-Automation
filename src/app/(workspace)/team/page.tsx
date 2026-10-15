import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { teamService } from '../../../server/team/web';
import { SensitiveValue } from '../../../server/security/sensitive';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { PageHeader } from '../../../components/ui/page-header';
import { TeamPanel } from '../../../features/team/team-panel';
export const metadata = { title: 'Team' };
export default async function TeamPage() {
  const context = await requireRoute('/team');
  const raw = (await cookies()).get(SESSION_COOKIE)!.value;
  const members = await teamService().members(new SensitiveValue(raw));
  return <><PageHeader eyebrow="WORKSPACE ADMINISTRATION" title="Team" description="Manage access to Bismillah Social AI. Security changes require a fresh confirmation." /><TeamPanel initialMembers={members} selfId={context.userId} /></>;
}
