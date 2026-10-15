import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { teamService } from '../../../server/team/web';
import { accessService } from '../../../server/auth/web';
import { AuthorizationError } from '../../../server/authorization/authorization';
import { SensitiveValue } from '../../../server/security/sensitive';
import { browserBody } from '../../../server/security/browser-request';
import { browserConfiguration, SESSION_COOKIE, COOKIE_OPTIONS, verifyBrowserRequest } from '../../../server/auth/browser-security';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function response(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' } }); }
const failed = (status: number) => response({ ok: false, message: 'Unable to complete this request.' }, status);
export async function GET(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value; if (!raw) return failed(401);
  try {
    const page = Number(request.nextUrl.searchParams.get('page') ?? 0), id = request.nextUrl.searchParams.get('id') ?? undefined;
    const members = await teamService().members(new SensitiveValue(raw), page, id); return response({ ok: true, members });
  } catch (error) { return failed(error instanceof AuthorizationError ? error.status : 503); }
}
const schema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('step-up'), mutation: z.unknown(), password: z.string().max(256), code: z.string().max(32) }).strict(),
  z.object({ operation: z.literal('mutate'), mutation: z.unknown(), proof: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(),
]);
export async function POST(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value; if (!raw) return failed(401);
  try {
    const configuration = browserConfiguration(process.env);
    if (!verifyBrowserRequest(request.headers, configuration, 'session', raw)) return failed(403);
    const parsed = schema.safeParse(await browserBody(request)); if (!parsed.success) return failed(400);
    const input = parsed.data, session = new SensitiveValue(raw), service = teamService();
    if (input.operation === 'step-up') {
      const action = await service.authorizeStepUp(session, input.mutation);
      const result = await accessService().recentAuthentication(session, input.password, input.code, action);
      if (!result.ok) return failed(401);
      const reply = response({ ok: true, proof: result.proof.reveal() });
      reply.cookies.set(SESSION_COOKIE, result.session.reveal(), { ...COOKIE_OPTIONS, expires: result.expiresAt }); return reply;
    }
    const result = await service.mutate(session, new SensitiveValue(input.proof), input.mutation);
    return response({ ok: true, ...('invitation' in result ? { invitation: `${configuration.origin}/invitation#${result.invitation.reveal()}` } : {}) });
  } catch (error) { return failed(error instanceof AuthorizationError ? error.status : error instanceof z.ZodError ? 400 : 503); }
}
