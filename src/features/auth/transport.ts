import { z } from 'zod';
const reply = z.object({ ok: z.boolean(), state: z.enum(['AUTHENTICATED', 'MFA_REQUIRED', 'MFA_ENROLLMENT_REQUIRED', 'ENROLLING', 'RESTART', 'SESSION_LIMIT']).optional(), message: z.string().max(200).optional(), secret: z.string().regex(/^[A-Z2-7]{32}$/).optional(), recoveryCodes: z.array(z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/)).length(10).optional() }).strict();
/** All transient authentication material stays in memory. No browser persistence. */
export async function authRequest(input: Record<string, unknown>) {
  const csrfResponse = await fetch('/api/auth', { cache: 'no-store', credentials: 'same-origin' });
  const csrf = z.object({ csrf: z.string().length(43) }).strict().parse(await csrfResponse.json());
  const response = await fetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrf }, body: JSON.stringify(input) });
  const parsed = reply.safeParse(await response.json());
  return parsed.success ? { ...parsed.data, message: parsed.data.message ?? 'Unable to complete this request.' } : { ok: false, message: 'Unable to complete this request.' };
}
