import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from './server/db/client';
import { authorizationContext, AuthorizationError, requireAnyPermission } from './server/authorization/authorization';
import { createContentService } from './server/content/service';
import { ContentError } from './server/content/policy';
import { ROUTE_PERMISSIONS } from './server/authorization/routes';
import { SESSION_COOKIE, browserConfiguration } from './server/auth/browser-security';
import { SensitiveValue } from './server/security/sensitive';

/** Early denial on every workspace request preserves HTTP 403 before streaming.
 * Page/API guards still revalidate; this never replaces mutation authorization. */
export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const path = request.nextUrl.pathname.replace(/\/$/, '') || '/';
  const route=path.startsWith('/content/')?'/content':path;
  headers.set('x-bsa-route', route); // Always overwrite client input.
  const privateHeaders = { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' };
  const login = () => {
    // Next's Flight adapter requires an absolute redirect. Use configured origin, never forwarded hosts.
    try { return new NextResponse(null, { status: 307, headers: { ...privateHeaders, Location: new URL('/login', browserConfiguration(process.env).origin).href } }); }
    catch { return new NextResponse('Unable to access this workspace area.', { status: 503, headers: privateHeaders }); }
  };
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return login();
  try {
    const context = await authorizationContext(getDatabase(), new SensitiveValue(raw));
    requireAnyPermission(context, ROUTE_PERMISSIONS[route] ?? []);
    if(path.startsWith('/content/')){const parts=path.split('/');if(parts.length!==3)return new NextResponse(null,{status:404,headers:privateHeaders});await createContentService(getDatabase()).get(new SensitiveValue(raw),parts[2]);}
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) return login();
    if (error instanceof AuthorizationError && !request.headers.has('rsc') && !request.headers.has('next-router-prefetch')) {
      // Render the existing denial UI through a stable SSR endpoint whose handler
      // sets HTTP 403. Never render the protected workspace or infer permission.
      const denial = request.nextUrl.clone(); denial.pathname = '/access-denied'; denial.search = '';
      return NextResponse.rewrite(denial, { headers: privateHeaders });
    }
    return new NextResponse('Unable to access this workspace area.', { status: error instanceof AuthorizationError ? 403 : error instanceof ContentError ? error.status : 503, headers: privateHeaders });
  }
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/overview', '/create-post', '/calendar', '/content/:path*', '/media', '/approvals', '/analytics', '/connections', '/brand-brain', '/team', '/activity', '/settings', '/ui-kit'] };
