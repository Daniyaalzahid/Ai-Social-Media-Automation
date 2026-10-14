import Link from 'next/link';
import { Brand } from './brand';
import { buttonClass } from './ui/button';

export function StatusPage({ code, title, description, preview = false }: { code: string; title: string; description: string; preview?: boolean }) {
  return <main className="status-page"><Brand /><p className="status-code" aria-hidden="true">{code}</p><h1>{title}</h1><p>{description}</p><Link href="/overview" className={buttonClass('secondary')}>Back to overview</Link>{preview && <small>Visual error-state preview</small>}</main>;
}
