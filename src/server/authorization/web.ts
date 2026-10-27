import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDatabase } from '../db/client';
import { SESSION_COOKIE } from '../auth/browser-security';
import { SensitiveValue } from '../security/sensitive';
import { AuthorizationError, authorizationContext, requireAnyPermission } from './authorization';
import { ROUTE_PERMISSIONS } from './routes';
export const requireWorkspaceAuthorization = cache(async () => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) redirect('/login');
  try { return await authorizationContext(getDatabase(), new SensitiveValue(raw)); }
  catch (error) { if (error instanceof AuthorizationError && error.status === 403) redirect('/access-denied'); redirect('/login'); }
});
export async function requireRoute(path: string) {
  const context = await requireWorkspaceAuthorization(), permissions = ROUTE_PERMISSIONS[path];
  if (!permissions) redirect('/access-denied');
  try { requireAnyPermission(context, permissions); } catch { redirect('/access-denied'); }
  return context;
}
