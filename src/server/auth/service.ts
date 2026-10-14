import 'server-only';
import { getDatabase } from '../db/client';
import { loadSecurityEventKey } from '../security/identity';
import { createAuthenticationService } from './authentication';

let service: ReturnType<typeof createAuthenticationService> | undefined;
/** Explicit private entrypoint only; never loaded by the existing login preview. */
export function getPasswordAuthenticationService() {
  service ??= createAuthenticationService(getDatabase(), loadSecurityEventKey(process.env)).catch(() => { service = undefined; throw new Error('Authentication service unavailable'); });
  return service;
}
