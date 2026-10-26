import type { Metadata } from 'next';
import Link from 'next/link';
import { Brand } from '../../components/brand';
import { Icon } from '../../components/ui/icon';
import { LoginForm } from '../../features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };
export default function LoginPage() {
  return <div className="login-page"><a className="skip-link" href="#main-content">Skip to sign in</a><section className="login-editorial" aria-label="Welcome to Bismillah Social AI"><Brand /><div className="login-editorial-main"><p className="eyebrow">YOUR BRAND HAS SOMETHING TO SAY.</p><h2>Make it<br /><span>worth</span><br />sharing.</h2><p className="login-editorial-description">One workspace for your ideas, your team, and the stories only your brand can tell.</p><div className="login-decoration" aria-hidden="true"><span className="login-star"><Icon name="asterisk" /></span><p>created with care.<br />approved by humans.</p></div></div><footer><span>Bismillah Electronics</span><span>01 / The next good idea</span></footer></section><main id="main-content" className="login-panel"><Link href="/" className="login-back text-link">Back to home</Link><LoginForm /></main></div>;
}
