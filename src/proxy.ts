import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from './server/db/client';
import { authorizationContext, AuthorizationError, requireAnyPermission } from './server/authorization/authorization';
import { ROUTE_PERMISSIONS } from './server/authorization/routes';
import { SESSION_COOKIE } from './server/auth/browser-security';
import { SensitiveValue } from './server/security/sensitive';

/** Early RSC denial prevents Flight streaming from fixing the HTTP status at 200.
 * Page/API guards still revalidate; this never replaces mutation authorization. */
export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const path = request.nextUrl.pathname.replace(/\/$/, '') || '/';
  headers.set('x-bsa-route', path); // Always overwrite client input.
  if (request.headers.has('rsc') || request.headers.has('next-router-prefetch')) {
    const privateHeaders = { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' };
    const login = () => new NextResponse(null, { status: 307, headers: { ...privateHeaders, Location: '/login' } });
    const raw = request.cookies.get(SESSION_COOKIE)?.value;
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return login();
    try {
      const context = await authorizationContext(getDatabase(), new SensitiveValue(raw));
      requireAnyPermission(context, ROUTE_PERMISSIONS[path] ?? []);
    } catch (error) {
      if (error instanceof AuthorizationError && error.status === 401) return login();
      return new NextResponse('Unable to access this workspace area.', { status: error instanceof AuthorizationError ? 403 : 503, headers: privateHeaders });
    }
  }
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/overview', '/create-post', '/calendar', '/content', '/media', '/approvals', '/analytics', '/connections', '/brand-brain', '/team', '/activity', '/settings', '/ui-kit'] };
