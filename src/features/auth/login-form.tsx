'use client';

import Link from 'next/link';
import { Button, buttonClass } from '../../components/ui/button';
import { Input } from '../../components/ui/fields';
import { Icon } from '../../components/ui/icon';

export function LoginForm() {
  return <div className="login-form"><p className="eyebrow">A little focus. A lot of possibility.</p><h1>Welcome back.</h1><p className="muted">Your next great post starts here.</p><form aria-label="Sign in preview" onSubmit={(event) => event.preventDefault()}><fieldset disabled><Input id="email" label="Work email" type="email" autoComplete="username" placeholder="you@company.com" required /><Input id="password" label="Password" type="password" autoComplete="current-password" placeholder="Your password" required minLength={8} /></fieldset><p id="login-preview-note" className="form-notice">Sign-in is a visual preview. Credential entry is disabled.</p><Button type="submit" disabled aria-describedby="login-preview-note">Sign in <Icon name="arrow" /></Button></form><div className="login-preview-link"><span>Take a look around</span><Link href="/overview" className={buttonClass('secondary')}>Explore demo workspace <Icon name="arrow" /></Link></div><p className="login-footnote">A private workspace for Bismillah Electronics.</p></div>;
}
