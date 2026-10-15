import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabase } from '../../../server/db/client';
import { getPasswordAuthenticationService } from '../../../server/auth/service';
import { accessService } from '../../../server/auth/web';
import { SensitiveValue } from '../../../server/security/sensitive';
import { NetworkIdentity } from '../../../server/security/identity';
import { recordAccessEvent } from '../../../server/security/access-events';
import { browserConfiguration, decodeBrowserJson, SESSION_COOKIE, FLOW_COOKIE, PRE_COOKIE, COOKIE_OPTIONS, csrfToken, newPreState, validPreState, verifyBrowserRequest } from '../../../server/auth/browser-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('password'), email: z.string().max(320), password: z.string().max(256) }).strict(),
  z.object({ action: z.literal('enroll') }).strict(),
  z.object({ action: z.literal('enroll-confirm'), code: z.string().max(32) }).strict(),
  z.object({ action: z.literal('mfa'), code: z.string().max(64), recovery: z.boolean() }).strict(),
  z.object({ action: z.literal('logout') }).strict(),
  z.object({ action: z.literal('activity') }).strict(),
]);
function response(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store, private', 'Pragma': 'no-cache', 'Referrer-Policy': 'no-referrer' } }); }
function binding(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value, flow = request.cookies.get(FLOW_COOKIE)?.value, pre = request.cookies.get(PRE_COOKIE)?.value;
  return session ? { kind: 'session' as const, value: session } : flow ? { kind: 'flow' as const, value: flow } : { kind: 'pre' as const, value: pre ?? '' };
}
export async function GET(request: NextRequest) {
  try {
    const configuration = browserConfiguration(process.env);
    let state = binding(request);
    let fresh = false;
    if (state.kind === 'pre' && !validPreState(configuration.key, state.value)) {
      state = { kind: 'pre', value: newPreState(configuration.key) }; fresh = true;
    }
    // CSRF material confers no authentication. Lifecycle is validated again on POST.
    const result = response({ csrf: csrfToken(configuration.key, state.kind, state.value) });
    if (fresh) result.cookies.set(PRE_COOKIE, state.value, { ...COOKIE_OPTIONS, maxAge: 600 });
    return result;
  } catch { return response({ ok: false, message: 'Sign-in is temporarily unavailable.' }, 503); }
}
export async function POST(request: NextRequest) {
  try {
    const configuration = browserConfiguration(process.env), bound = binding(request);
    if (!verifyBrowserRequest(request.headers, configuration, bound.kind, bound.value)) {
      try { await recordAccessEvent(getDatabase(), { type: 'csrf.rejected', userId: null, outcome: 'denied' }); } catch { /* Remains denied. */ }
      return response({ ok: false, message: 'Unable to complete this request.' }, 403);
    }
    if (request.headers.get('content-type') !== 'application/json') return response({ ok: false }, 400);
    // Bound the stream before parsing: Content-Length is not trusted.
    const reader = request.body?.getReader(); if (!reader) return response({ ok: false }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); return response({ ok: false }, 413); } chunks.push(value); }
    let payload: unknown;
    try { payload = decodeBrowserJson(Buffer.concat(chunks)); } catch { return response({ ok: false, message: 'Unable to complete this request.' }, 400); }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return response({ ok: false, message: 'Unable to complete this request.' }, 400);
    const input = parsed.data;
    const service = accessService();
    if (input.action === 'logout') {
      if (bound.kind === 'session') await service.logout(new SensitiveValue(bound.value));
      const result = response({ ok: true });
      for (const name of [SESSION_COOKIE, FLOW_COOKIE, PRE_COOKIE]) result.cookies.set(name, '', { ...COOKIE_OPTIONS, maxAge: 0 });
      return result;
    }
    if (input.action === 'activity') {
      if (bound.kind !== 'session') return response({ ok: false }, 401);
      const identity = await service.validateSession(new SensitiveValue(bound.value), 'interaction');
      if (!identity) return response({ ok: false }, 401);
      const result = response({ ok: true }); result.cookies.set(SESSION_COOKIE, bound.value, { ...COOKIE_OPTIONS, expires: identity.expiresAt }); return result;
    }
    let outcome;
    let flow: string | undefined;
    if (input.action === 'password') {
      const checked = await (await getPasswordAuthenticationService()).checkPassword({ email: input.email, password: input.password, network: NetworkIdentity.fromSocketAddress('::') });
      if (!checked.ok) return response(checked, 401);
      flow = checked.challenge.token.reveal();
      outcome = await service.continuePassword(checked.challenge.token);
    } else {
      if (bound.kind !== 'flow') return response({ ok: false, state: 'RESTART', message: 'Please sign in again.' }, 401);
      const raw = new SensitiveValue(bound.value);
      if (input.action === 'enroll') outcome = await service.startEnrollment(raw);
      else if (input.action === 'enroll-confirm') outcome = await service.completeEnrollment(raw, input.code);
      else outcome = await service.completeMfa(raw, input.code, input.recovery);
    }
    if (!outcome.ok) return response(outcome, outcome.state === 'SESSION_LIMIT' ? 409 : 401);
    const publicData = 'session' in outcome ? { ok: true, state: 'AUTHENTICATED', ...('recoveryCodes' in outcome && Array.isArray(outcome.recoveryCodes) ? { recoveryCodes: outcome.recoveryCodes.map((code: SensitiveValue) => code.reveal()) } : {}) }
      : 'secret' in outcome ? { ok: true, state: outcome.state, secret: outcome.secret.reveal() } : { ok: true, state: outcome.state };
    const result = response(publicData);
    if ('session' in outcome) {
      result.cookies.set(SESSION_COOKIE, outcome.session.reveal(), { ...COOKIE_OPTIONS, expires: outcome.expiresAt });
      for (const name of [FLOW_COOKIE, PRE_COOKIE]) result.cookies.set(name, '', { ...COOKIE_OPTIONS, maxAge: 0 });
    } else if (flow) result.cookies.set(FLOW_COOKIE, flow, { ...COOKIE_OPTIONS, maxAge: 300 });
    return result;
  } catch { return response({ ok: false, state: 'RESTART', message: 'Unable to complete authentication. Please try again.' }, 503); }
}
