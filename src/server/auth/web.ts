import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDatabase } from '../db/client';
import { NetworkIdentity, loadSecurityEventKey } from '../security/identity';
import { SensitiveValue } from '../security/sensitive';
import { loadMfaKey } from './mfa-crypto';
import { createAccessService } from './access';
import { SESSION_COOKIE } from './browser-security';

export function accessService() {
  // Next Request has no trustworthy socket peer. All browser traffic shares the
  // unattributed network bucket until Hostinger proxy trust is explicitly verified.
  return createAccessService(getDatabase(), loadMfaKey(process.env), loadSecurityEventKey(process.env), NetworkIdentity.fromSocketAddress('::'));
}
export async function requireWorkspaceIdentity() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  let identity = null;
  try { if (raw) identity = await accessService().validateSession(new SensitiveValue(raw)); } catch { /* Fail closed; no internal error crosses the route boundary. */ }
  if (!identity) redirect('/login');
  return identity;
}
