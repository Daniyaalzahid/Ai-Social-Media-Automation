'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Input } from '../../components/ui/fields';
import { Button } from '../../components/ui/button';
export function InvitationForm() {
  const [token, setToken] = useState(''), [message, setMessage] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { const value = window.location.hash.slice(1); window.history.replaceState(null, '', '/invitation'); if (/^[A-Za-z0-9_-]{43}$/.test(value)) setToken(value); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const form = event.currentTarget, data = new FormData(form); setBusy(true);
    try {
      const csrf = z.object({ csrf: z.string().length(43) }).strict().parse(await (await fetch('/api/invitations', { cache: 'no-store' })).json());
      const result = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrf }, body: JSON.stringify({ token, email: data.get('email'), password: data.get('password') }) });
      const reply = z.object({ ok: z.boolean(), message: z.string().max(200) }).strict().parse(await result.json());
      setMessage(reply.message); if (reply.ok) { setDone(true); setToken(''); }
    } catch { setMessage('Unable to accept this invitation. Request a new link if needed.'); }
    finally { form.reset(); setBusy(false); }
  }
  return <>{done ? <><p role="status">{message}</p><Link href="/login">Sign in and complete security setup</Link></> : <form onSubmit={submit} aria-label="Accept invitation" className="team-stack"><p>Set a password of 15–128 characters. Administrators must enroll an authenticator after signing in.</p><Input id="recipient-email" name="email" label="Invited work email" type="email" required autoComplete="username" /><Input id="recipient-password" name="password" label="New password" type="password" required autoComplete="new-password" /><p role="status">{message}</p><Button type="submit" disabled={busy || !token}>{busy ? 'Setting password…' : 'Accept invitation'}</Button><Link href="/login">Back to sign in</Link></form>}</>;
}
