'use client';

import { useState } from 'react';
import { Button, buttonClass } from '../../components/ui/button';
import { Input } from '../../components/ui/fields';
import { Icon } from '../../components/ui/icon';
import { authRequest } from './transport';

type Stage = 'PASSWORD' | 'MFA_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED' | 'ENROLLING' | 'CODES';
export function LoginForm() {
  const [stage, setStage] = useState<Stage>('PASSWORD');
  const [secret, setSecret] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(input: Record<string, unknown>) {
    setBusy(true); setMessage('');
    try {
      const result = await authRequest(input);
      if (!result.ok) { setMessage(result.message); if (result.state === 'RESTART') { setStage('PASSWORD'); setSecret(''); } return; }
      if (result.state === 'AUTHENTICATED') {
        setSecret('');
        if (result.recoveryCodes) { setCodes(result.recoveryCodes); setStage('CODES'); }
        else window.location.assign('/overview');
      } else if (result.state === 'ENROLLING') { setSecret(result.secret ?? ''); setStage('ENROLLING'); }
      else if (result.state === 'MFA_REQUIRED' || result.state === 'MFA_ENROLLMENT_REQUIRED') setStage(result.state);
    } catch { setMessage('Sign-in is temporarily unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="login-form"><p className="eyebrow">A little focus. A lot of possibility.</p><h1>Welcome back.</h1><p className="muted">Your next great post starts here.</p>
    {stage === 'PASSWORD' && <form aria-label="Sign in" onSubmit={(event) => {
      event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
      void submit({ action: 'password', email: data.get('email'), password: data.get('password') }); form.reset();
    }}><fieldset disabled={busy}><Input id="email" name="email" label="Work email" type="email" autoComplete="username" placeholder="you@company.com" required maxLength={320} /><Input id="password" name="password" label="Password" type="password" autoComplete="current-password" placeholder="Your password" required maxLength={256} /></fieldset><Button type="submit" disabled={busy}>Sign in <Icon name="arrow" /></Button></form>}
    {stage === 'MFA_ENROLLMENT_REQUIRED' && <div><p className="form-notice">Set up an authenticator to secure your workspace. Setup must be completed before access is granted.</p><Button disabled={busy} onClick={() => void submit({ action: 'enroll' })}>Set up authenticator</Button></div>}
    {(stage === 'ENROLLING' || stage === 'MFA_REQUIRED') && <form aria-label={stage === 'ENROLLING' ? 'Enroll authenticator' : 'Verify second factor'} onSubmit={(event) => {
      event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
      void submit({ action: stage === 'ENROLLING' ? 'enroll-confirm' : 'mfa', code: data.get('code'), ...(stage === 'MFA_REQUIRED' ? { recovery } : {}) }); form.reset();
    }}>{stage === 'ENROLLING' && <div className="form-notice"><p>Add a TOTP account in your authenticator. Issuer: Bismillah Social AI (Bismillah Electronics). Use 6 digits, 30 seconds, SHA-1.</p><p>Manual setup key (keep private):</p><p style={{ overflowWrap: 'anywhere' }}><code>{secret}</code></p></div>}<Input id="mfa-code" name="code" label={recovery ? 'Recovery code' : 'Authenticator code'} autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} required maxLength={64} disabled={busy} /><Button disabled={busy} type="submit">Verify and sign in</Button>{stage === 'MFA_REQUIRED' && <Button type="button" variant="ghost" onClick={() => setRecovery(!recovery)} disabled={busy}>{recovery ? 'Use authenticator code' : 'Use a recovery code'}</Button>}</form>}
    {stage === 'CODES' && <section aria-label="Recovery codes"><p className="form-notice">Save these recovery codes somewhere private. They are shown once, and each can be used once. Losing your authenticator and these codes requires exceptional recovery.</p><ul>{codes.map((code) => <li key={code}><code>{code}</code></li>)}</ul><Button onClick={() => { setCodes([]); window.location.assign('/overview'); }}>I have saved my codes</Button></section>}
    <p role="status" aria-live="polite">{busy ? 'Please wait…' : message}</p>
    <div className="login-preview-link"><span>Private, secure access</span><a href="/" className={buttonClass('secondary')}>Back to home <Icon name="arrow" /></a></div><p className="login-footnote">A private workspace for Bismillah Electronics.</p></div>;
}
