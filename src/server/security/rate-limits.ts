import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import { SecurityOperationError } from './sensitive.ts';

export const RATE_POLICY = Object.freeze({
  auth_account: { limit: 5, windowMs: 900000 },
  auth_network: { limit: 60, windowMs: 300000 },
  auth_global: { limit: 120, windowMs: 60000 },
  auth_challenge: { limit: 5, windowMs: 300000 },
});
const keySchema = z.object({ scope: z.enum(['auth_account', 'auth_network', 'auth_global', 'auth_challenge']), hash: z.instanceof(Buffer).refine((value) => value.length === 32) }).strict();
export type RateKey = z.infer<typeof keySchema>;
const keysSchema = z.array(keySchema).min(1).max(4).refine((values) => new Set(values.map((value) => value.scope)).size === values.length);

/** Shared MySQL admission counters. Blocked retries never extend a lockout. */
export async function admitAuthentication(db: Kysely<DatabaseSchema>, keys: readonly RateKey[]): Promise<boolean> {
  const parsed = keysSchema.safeParse(keys);
  if (!parsed.success) throw new SecurityOperationError();
  const priority = { auth_global: 0, auth_network: 1, auth_account: 2, auth_challenge: 3 };
  const ordered = [...parsed.data].sort((a, b) => priority[a.scope] - priority[b.scope]);
  try {
    // Indexed bounded maintenance on admission, including blocked work: no worker.
    await cleanupExpiredRateLimits(db);
    return await db.transaction().execute(async (transaction) => {
      const time = await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(transaction);
      const now = time.rows[0]!.now;
      const rows = [];
      for (const key of ordered) {
        const policy = RATE_POLICY[key.scope];
        await transaction.insertInto('auth_rate_limits').values({ scope: key.scope, subject_hash: key.hash,
          window_started_at: now, attempts: 0, blocked_until: null, expires_at: new Date(now.getTime() + policy.windowMs) })
          .onDuplicateKeyUpdate({ scope: key.scope }).execute();
        let row = await transaction.selectFrom('auth_rate_limits').selectAll().where('scope', '=', key.scope).where('subject_hash', '=', key.hash).forUpdate().executeTakeFirstOrThrow();
        if (row.expires_at <= now) {
          row = { ...row, window_started_at: now, attempts: 0, blocked_until: null, expires_at: new Date(now.getTime() + policy.windowMs) };
        }
        // Stop before inserting attacker-selected identifiers behind a blocked gate.
        if (row.blocked_until && row.blocked_until > now) return false;
        rows.push({ key, row, policy });
      }
      for (const { key, row, policy } of rows) {
        const attempts = Math.min(row.attempts + 1, policy.limit + 20);
        const delay = attempts >= policy.limit ? Math.min(30000 * 2 ** Math.min(attempts - policy.limit, 5), 900000) : 0;
        const blocked = delay ? new Date(Math.min(now.getTime() + delay, row.expires_at.getTime())) : null;
        await transaction.updateTable('auth_rate_limits').set({ attempts, window_started_at: row.window_started_at, expires_at: row.expires_at, blocked_until: blocked })
          .where('scope', '=', key.scope).where('subject_hash', '=', key.hash).execute();
      }
      return true;
    });
  } catch { throw new SecurityOperationError(); }
}
export async function clearSuccessfulAccountAttempts(transaction: Kysely<DatabaseSchema>, hash: Buffer): Promise<void> {
  await transaction.updateTable('auth_rate_limits').set({ attempts: 0, blocked_until: null }).where('scope', '=', 'auth_account').where('subject_hash', '=', hash).execute();
}
/** Bounded, explicit housekeeping; no worker/cron introduced. Never deletes a live row. */
export async function cleanupExpiredRateLimits(db: Kysely<DatabaseSchema>): Promise<number> {
  try {
    // A range DELETE under REPEATABLE READ can gap-lock live/missing admission
    // keys and deadlock with an account upsert holding the global gate. Select
    // candidates without locks, then use single-key autocommit deletes. Recheck
    // expiry under the delete's row lock: a concurrently renewed row must survive.
    const candidates = await db.selectFrom('auth_rate_limits').select(['scope', 'subject_hash'])
      .where('expires_at', '<=', sql<Date>`CURRENT_TIMESTAMP(3)`)
      .orderBy('expires_at').orderBy('scope').orderBy('subject_hash').limit(100).execute();
    let removed = 0;
    for (const candidate of candidates) {
      const result = await db.deleteFrom('auth_rate_limits').where('scope', '=', candidate.scope)
        .where('subject_hash', '=', candidate.subject_hash).where('expires_at', '<=', sql<Date>`CURRENT_TIMESTAMP(3)`)
        .executeTakeFirst();
      removed += Number(result.numDeletedRows);
    }
    return removed;
  } catch { throw new SecurityOperationError(); }
}
