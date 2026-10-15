import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { teamService } from '../../../server/team/web';
import { browserBody } from '../../../server/security/browser-request';
import { browserConfiguration, PRE_COOKIE, COOKIE_OPTIONS, csrfToken, newPreState, validPreState, verifyBrowserRequest } from '../../../server/auth/browser-security';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ token: z.string().max(100), email: z.string().max(320), password: z.string().max(256) }).strict();
export async function GET(request: NextRequest) {
  try {
    const configuration = browserConfiguration(process.env);
    let pre = request.cookies.get(PRE_COOKIE)?.value ?? '';
    if (!validPreState(configuration.key, pre)) pre = newPreState(configuration.key);
    const result = NextResponse.json({ csrf: csrfToken(configuration.key, 'pre', pre) }, { headers: { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' } });
    result.cookies.set(PRE_COOKIE, pre, { ...COOKIE_OPTIONS, maxAge: 600 }); return result;
  } catch { return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
export async function POST(request: NextRequest) {
  const reply = (ok: boolean, status = 200) => NextResponse.json({ ok, message: ok ? 'Password set. Sign in to continue.' : 'Unable to accept this invitation. Check the link and password requirements, or request a new invitation.' }, { status, headers: { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' } });
  try {
    const configuration = browserConfiguration(process.env);
    if (!verifyBrowserRequest(request.headers, configuration, 'pre', request.cookies.get(PRE_COOKIE)?.value ?? '')) return reply(false, 403);
    const parsed = schema.safeParse(await browserBody(request)); if (!parsed.success) return reply(false, 400);
    return reply((await teamService().acceptInvitation(parsed.data)).ok);
  } catch { return reply(false); }
}
