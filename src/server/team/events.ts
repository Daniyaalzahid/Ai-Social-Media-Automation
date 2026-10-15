import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import { ROLE_CODES } from '../db/catalog.ts';
import type { DatabaseSchema } from '../db/schema.ts';
import { SecurityOperationError } from '../security/sensitive.ts';
const eventSchema = z.object({
  type: z.enum(['team.invitation_created', 'team.invitation_revoked', 'team.invitation_accepted', 'team.role_changed', 'team.account_enabled', 'team.account_disabled', 'team.sessions_revoked', 'team.denied', 'team.last_owner_denied', 'team.invitation_invalid']),
  actorId: z.uuid().nullable(), targetId: z.uuid().nullable(), outcome: z.enum(['success', 'denied']),
  before: z.enum([...ROLE_CODES, 'invited', 'pending_mfa', 'active', 'disabled']).optional(),
  after: z.enum([...ROLE_CODES, 'invited', 'pending_mfa', 'active', 'disabled']).optional(),
}).strict();
export async function recordTeamEvent(db: Kysely<DatabaseSchema>, input: z.infer<typeof eventSchema>) {
  const result = eventSchema.safeParse(input); if (!result.success) throw new SecurityOperationError();
  const data = result.data, correlation = randomUUID();
  // Only closed enum values enter strings; existing SQL metadata-key restrictions retained.
  const metadata = JSON.stringify({ reasonCode: data.type, ...(data.before || data.after ? { changedFields: [data.before ? `before:${data.before}` : 'before:none', data.after ? `after:${data.after}` : 'after:none'] } : {}) });
  await db.insertInto('security_events').values({ id: randomUUID(), user_id: data.actorId, type: data.type, severity: data.outcome === 'success' ? 'info' : 'warning', outcome: data.outcome, correlation_id: correlation, metadata_safe_json: metadata, ip_hash: null }).execute();
  if (data.outcome === 'success' && data.actorId) await db.insertInto('audit_logs').values({ id: randomUUID(), actor_user_id: data.actorId, target_user_id: data.targetId, session_id: null, action: data.type, outcome: data.outcome, correlation_id: correlation, metadata_safe_json: metadata, ip_hash: null }).execute();
}
