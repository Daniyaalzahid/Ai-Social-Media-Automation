import Link from 'next/link';
import { Icon } from './ui/icon';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="Bismillah Social AI home"><span className="brand-symbol" aria-hidden="true">b<span><Icon name="arrow" /></span></span>{!compact && <span className="brand-name">bismillah<span>social ai</span></span>}</Link>;
}
