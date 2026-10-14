import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import { SecurityOperationError } from './sensitive.ts';

const reason = z.enum(['PASSWORD_VERIFIED', 'INVALID_CREDENTIALS', 'DISABLED', 'INCOMPLETE', 'RATE_LIMITED', 'CAPACITY', 'AUTH_VERSION_CHANGED', 'UNAVAILABLE',
  'BOOTSTRAP_ATTEMPT', 'BOOTSTRAP_CONSUMED', 'OWNER_EXISTS', 'BOOTSTRAP_CREATED', 'BOOTSTRAP_FAILED', 'HASH_REPLACED', 'CHALLENGE_CONSUMED', 'CHALLENGE_REVOKED']);
const metadata = z.object({ reasonCode: reason }).strict();
const event = z.object({
  type: z.enum(['auth.password_verified', 'auth.failure', 'auth.disabled', 'auth.rate_limited', 'auth.hash_replaced', 'bootstrap.attempt', 'bootstrap.success', 'bootstrap.failure', 'challenge.consumed', 'challenge.revoked']),
  outcome: z.enum(['success', 'failure', 'denied']), userId: z.uuid().nullable(), correlationId: z.uuid(),
  ipHash: z.instanceof(Buffer).refine((value) => value.length === 32).nullable(), metadata,
}).strict();
export type SecurityEventInput = z.infer<typeof event>;
const eventPolicies: Record<SecurityEventInput['type'], { outcome: SecurityEventInput['outcome']; reasons: readonly SecurityEventInput['metadata']['reasonCode'][] }> = {
  'auth.password_verified': { outcome: 'success', reasons: ['PASSWORD_VERIFIED'] },
  'auth.failure': { outcome: 'failure', reasons: ['INVALID_CREDENTIALS', 'INCOMPLETE', 'CAPACITY', 'AUTH_VERSION_CHANGED', 'UNAVAILABLE'] },
  'auth.disabled': { outcome: 'failure', reasons: ['DISABLED'] },
  'auth.rate_limited': { outcome: 'denied', reasons: ['RATE_LIMITED'] },
  'auth.hash_replaced': { outcome: 'success', reasons: ['HASH_REPLACED'] },
  'bootstrap.attempt': { outcome: 'success', reasons: ['BOOTSTRAP_ATTEMPT'] },
  'bootstrap.success': { outcome: 'success', reasons: ['BOOTSTRAP_CREATED'] },
  'bootstrap.failure': { outcome: 'failure', reasons: ['BOOTSTRAP_CONSUMED', 'OWNER_EXISTS', 'BOOTSTRAP_FAILED'] },
  'challenge.consumed': { outcome: 'success', reasons: ['CHALLENGE_CONSUMED'] },
  'challenge.revoked': { outcome: 'success', reasons: ['CHALLENGE_REVOKED'] },
};
const audit = z.object({
  action: z.enum(['owner.bootstrap', 'password.hash_replaced', 'challenge.consume', 'challenge.revoke']),
  actorUserId: z.uuid(), targetUserId: z.uuid(), correlationId: z.uuid(), metadata,
}).strict();
export type AuditInput = z.infer<typeof audit>;

/** Append APIs only. Accept schema-checked structured data, never request/error dumps. */
export async function appendSecurityEvent(db: Kysely<DatabaseSchema>, input: SecurityEventInput): Promise<void> {
  const parsed = event.safeParse(input);
  if (!parsed.success) throw new SecurityOperationError();
  const data = parsed.data;
  const policy = eventPolicies[data.type];
  if (policy.outcome !== data.outcome || !policy.reasons.includes(data.metadata.reasonCode)) throw new SecurityOperationError();
  try {
    await db.insertInto('security_events').values({ id: randomUUID(), user_id: data.userId, type: data.type, outcome: data.outcome,
      severity: data.outcome === 'success' ? 'info' : 'warning', correlation_id: data.correlationId,
      ip_hash: data.ipHash, metadata_safe_json: JSON.stringify(data.metadata) }).execute();
  } catch { throw new SecurityOperationError(); }
}
/** Caller must pass its DML transaction for required administrative mutations. */
export async function appendAudit(db: Kysely<DatabaseSchema>, input: AuditInput): Promise<void> {
  const parsed = audit.safeParse(input);
  if (!parsed.success) throw new SecurityOperationError();
  const data = parsed.data;
  const expectedReasons: Record<AuditInput['action'], AuditInput['metadata']['reasonCode']> = {
    'owner.bootstrap': 'BOOTSTRAP_CREATED', 'password.hash_replaced': 'HASH_REPLACED', 'challenge.consume': 'CHALLENGE_CONSUMED', 'challenge.revoke': 'CHALLENGE_REVOKED',
  };
  if (data.metadata.reasonCode !== expectedReasons[data.action]) throw new SecurityOperationError();
  try {
    await db.insertInto('audit_logs').values({ id: randomUUID(), actor_user_id: data.actorUserId, target_user_id: data.targetUserId,
      session_id: null, action: data.action, outcome: 'success', correlation_id: data.correlationId, ip_hash: null,
      metadata_safe_json: JSON.stringify(data.metadata) }).execute();
  } catch { throw new SecurityOperationError(); }
}
