import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import { SecurityOperationError } from './sensitive.ts';

const types = ['mfa.enrollment_start', 'mfa.enrollment_success', 'mfa.enrollment_failure', 'mfa.totp_failure', 'mfa.recovery_used', 'mfa.recovery_regenerated', 'mfa.replaced', 'session.issued', 'session.limit', 'session.revoked', 'session.rotated', 'auth.logout', 'csrf.rejected', 'auth.recent_success', 'auth.recent_failure', 'auth.mfa_limited'] as const;
const inputSchema = z.object({ type: z.enum(types), userId: z.uuid().nullable(), outcome: z.enum(['success', 'failure', 'denied']) }).strict();
/** Closed event vocabulary. No caller metadata, request, error or free-form strings. */
export async function recordAccessEvent(db: Kysely<DatabaseSchema>, input: z.infer<typeof inputSchema>, audit = false): Promise<void> {
  const data = inputSchema.safeParse(input);
  if (!data.success || (audit && !data.data.userId)) throw new SecurityOperationError();
  const { type, userId, outcome } = data.data;
  const correlation = randomUUID();
  try {
    await db.insertInto('security_events').values({ id: randomUUID(), user_id: userId, type, outcome, severity: outcome === 'success' ? 'info' : 'warning', correlation_id: correlation, ip_hash: null, metadata_safe_json: JSON.stringify({ reasonCode: type }) }).execute();
    if (audit) await db.insertInto('audit_logs').values({ id: randomUUID(), actor_user_id: userId, target_user_id: userId, session_id: null, action: type, outcome, correlation_id: correlation, ip_hash: null, metadata_safe_json: JSON.stringify({ reasonCode: type }) }).execute();
  } catch { throw new SecurityOperationError(); }
}
