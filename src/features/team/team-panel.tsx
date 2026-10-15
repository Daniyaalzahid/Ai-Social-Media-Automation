'use client';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/fields';
import { Dialog } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { memberSchema, teamRoles, type MemberView } from './types';

const replySchema = z.object({ ok: z.boolean(), message: z.string().max(200).optional(), proof: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(), invitation: z.string().url().max(300).optional() }).strict();
async function request(input: unknown) {
  const csrf = z.object({ csrf: z.string().length(43) }).strict().parse(await (await fetch('/api/auth', { cache: 'no-store' })).json());
  const result = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrf }, body: JSON.stringify(input) });
  return replySchema.parse(await result.json());
}
export function TeamPanel({ initialMembers, selfId }: { initialMembers: MemberView[]; selfId: string }) {
  const [members, setMembers] = useState(initialMembers), [page, setPage] = useState(0), [pending, setPending] = useState<Record<string, unknown> | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [invitation, setInvitation] = useState('');
  async function refresh(nextPage = page) {
    const result = z.object({ ok: z.literal(true), members: z.array(memberSchema).max(50) }).strict().parse(await (await fetch(`/api/team?page=${nextPage}`, { cache: 'no-store' })).json());
    setMembers(result.members); setPage(nextPage);
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!pending || busy) return;
    const form = event.currentTarget, data = new FormData(form); setBusy(true); setMessage('');
    try {
      const proof = await request({ operation: 'step-up', mutation: pending, password: data.get('password'), code: data.get('code') });
      form.reset();
      if (!proof.ok || !proof.proof) { setMessage('Unable to confirm. Check your password and a fresh authenticator code.'); return; }
      const result = await request({ operation: 'mutate', mutation: pending, proof: proof.proof });
      if (!result.ok) { setMessage('Unable to complete this change. Refresh the team and try again.'); return; }
      setInvitation(result.invitation ?? ''); setPending(null); setMessage('Team updated.'); await refresh();
    } catch { setMessage('Unable to complete this request. Refresh and try again.'); }
    finally { form.reset(); setBusy(false); }
  }
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setPending({ action: 'invite', email: data.get('email'), displayName: data.get('displayName'), role: data.get('role') }); event.currentTarget.reset();
  }
  return <div className="team-stack"><p role="status">{message}</p><Card className="team-card"><h2>Invite a teammate</h2><p>Create a one-time link to share through a trusted private channel. Links expire in 24 hours. Reissuing an invitation invalidates the previous link.</p><form onSubmit={invite} aria-label="Invite member" className="team-grid"><Input id="invite-name" name="displayName" label="Display name" required maxLength={120} /><Input id="invite-email" name="email" type="email" label="Work email" required maxLength={254} /><Select id="invite-role" name="role" label="Initial role" defaultValue="VIEWER">{teamRoles.map((role) => <option key={role}>{role}</option>)}</Select><Button type="submit">Invite member</Button></form></Card>
    <section aria-label="Team members" className="team-stack">{members.map((member) => <Member key={member.id} member={member} self={member.id === selfId} onAction={setPending} />)}</section>
    <div className="team-actions"><Button variant="secondary" disabled={page === 0} onClick={() => { void refresh(page - 1).catch(() => setMessage('Unable to load members.')); }}>Previous page</Button><span>Page {page + 1}</span><Button variant="secondary" disabled={members.length < 50} onClick={() => { void refresh(page + 1).catch(() => setMessage('Unable to load members.')); }}>Next page</Button></div>
    <Dialog open={pending !== null} onClose={() => { if (!busy) setPending(null); }} title="Confirm team change"><p>Confirm with your password and a fresh authenticator code. This confirmation applies only to this change.</p><form onSubmit={confirm} aria-label="Confirm team change" className="team-stack"><Input id="team-password" name="password" label="Your password" type="password" autoComplete="current-password" required /><Input id="team-code" name="code" label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /><p role="status">{message}</p><Button type="submit" disabled={busy}>{busy ? 'Confirming…' : 'Confirm change'}</Button></form></Dialog>
    {invitation && <Dialog open={true} onClose={() => setInvitation('')} title="Invitation link — shown once"><p>Share privately with the intended recipient. This link cannot be retrieved after closing. Do not post it in a shared channel.</p><Input id="invitation-link" label="One-time invitation link" value={invitation} readOnly /><Button onClick={() => setInvitation('')}>I have saved the link securely</Button></Dialog>}
  </div>;
}
function Member({ member, self, onAction }: { member: MemberView; self: boolean; onAction: (action: Record<string, unknown>) => void }) {
  const [role, setRole] = useState(member.role);
  return <Card className="team-card"><div className="team-member-heading"><div><h2>{member.displayName}{self ? ' (you)' : ''}</h2><p className="team-email">{member.email}</p></div><Badge>{member.status.replaceAll('_', ' ')}</Badge></div><p>{member.role} · {member.mfaEnabled ? 'MFA enabled' : 'MFA not enrolled'} · {member.activeSessions} active sessions</p>{!self && <div className="team-actions"><Select id={`role-${member.id}`} label={`Role for ${member.displayName}`} value={role} onChange={(event) => setRole(event.target.value as MemberView['role'])}>{teamRoles.map((value) => <option key={value}>{value}</option>)}</Select><Button variant="secondary" disabled={role === member.role} onClick={() => onAction({ action: 'role', targetId: member.id, role })}>Change role</Button>{member.status !== 'invited' && <Button variant="secondary" onClick={() => onAction({ action: 'status', targetId: member.id, enabled: member.status === 'disabled' })}>{member.status === 'disabled' ? 'Enable account' : 'Disable account'}</Button>}<Button variant="secondary" onClick={() => onAction({ action: 'sessions', targetId: member.id })}>Revoke sessions</Button>{member.status === 'invited' && <Button variant="secondary" onClick={() => onAction({ action: 'revoke-invitation', targetId: member.id })}>Revoke invitation</Button>}</div>}</Card>;
}
