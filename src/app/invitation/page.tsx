import { Brand } from '../../components/brand';
import { Card } from '../../components/ui/card';
import { InvitationForm } from '../../features/team/invitation-form';
export const metadata = { title: 'Accept invitation', referrer: 'no-referrer' as const };
export default function InvitationPage() { return <main className="page-container"><Brand /><Card className="team-card"><h1>Join your workspace</h1><InvitationForm /></Card></main>; }
