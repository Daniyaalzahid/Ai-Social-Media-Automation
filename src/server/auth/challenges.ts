import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import { appendAudit, appendSecurityEvent } from '../security/events.ts';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';
import { NetworkIdentity, pseudonym } from '../security/identity.ts';
import { admitAuthentication } from '../security/rate-limits.ts';

export const CHALLENGE_LIFETIME_MS = 300000;
export function challengeHash(token: SensitiveValue): Buffer {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token.reveal())) throw new SecurityOperationError();
  return createHash('sha256').update(token.reveal()).digest();
}
/** Caller holds a fresh user row lock after password verification; commit before revealing. */
export async function insertPasswordChallenge(transaction: Kysely<DatabaseSchema>, userId: string, authVersion: number) {
  const token = new SensitiveValue(randomBytes(32).toString('base64url'));
  const clock = await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(transaction);
  const now = clock.rows[0]!.now, expiresAt = new Date(now.getTime() + CHALLENGE_LIFETIME_MS);
  // Latest password-stage proof replaces earlier unconsumed proofs for this user.
  await transaction.updateTable('auth_challenges').set({ revoked_at: now }).where('user_id', '=', userId).where('purpose', '=', 'password_verified')
    .where('consumed_at', 'is', null).where('revoked_at', 'is', null).execute();
  const id = randomUUID();
  await transaction.insertInto('auth_challenges').values({ id, user_id: userId, token_hash: challengeHash(token), purpose: 'password_verified',
    auth_version: authVersion, action_code: 'PASSWORD_VERIFIED', attempts: 0, created_at: now, expires_at: expiresAt, consumed_at: null, revoked_at: null }).execute();
  return { token, id, expiresAt };
}
const proof = z.object({ userId: z.uuid(), authVersion: z.number().int().positive(), purpose: z.literal('password_verified') }).strict();
export type PasswordProofBinding = z.infer<typeof proof>;

/** Single-use restricted proof only. Consuming it creates no session or MFA factor. */
export type ChallengeRateContext = { key: Buffer; network: NetworkIdentity };
export async function consumePasswordChallenge(db: Kysely<DatabaseSchema>, token: SensitiveValue, binding: PasswordProofBinding, context: ChallengeRateContext): Promise<boolean> {
  const parsed = proof.safeParse(binding);
  if (!parsed.success) return false;
  let hash: Buffer;
  try { hash = challengeHash(token); } catch { return false; }
  try {
    if (!(context.network instanceof NetworkIdentity) || !await admitAuthentication(db, [
      { scope: 'auth_challenge', hash: pseudonym(context.key, 'challenge', parsed.data.userId) },
      { scope: 'auth_network', hash: context.network.pseudonym(context.key) },
      { scope: 'auth_global', hash: pseudonym(context.key, 'global', 'challenge-stage') },
    ])) return false;
    binding = parsed.data;
    return await db.transaction().execute(async (transaction) => {
      const user = await transaction.selectFrom('users').select(['status', 'auth_version']).where('id', '=', binding.userId).forUpdate().executeTakeFirst();
      if (!user || !['active', 'pending_mfa'].includes(user.status) || user.auth_version !== binding.authVersion) return false;
      const now = (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(transaction)).rows[0]!.now;
      const result = await transaction.updateTable('auth_challenges').set({ consumed_at: now }).where('token_hash', '=', hash).where('user_id', '=', binding.userId)
        .where('purpose', '=', binding.purpose).where('auth_version', '=', user.auth_version).where('action_code', '=', 'PASSWORD_VERIFIED')
        .where('expires_at', '>', now).where('consumed_at', 'is', null).where('revoked_at', 'is', null).executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) return false;
      const correlationId = randomUUID();
      await appendAudit(transaction, { action: 'challenge.consume', actorUserId: binding.userId, targetUserId: binding.userId, correlationId, metadata: { reasonCode: 'CHALLENGE_CONSUMED' } });
      await appendSecurityEvent(transaction, { type: 'challenge.consumed', outcome: 'success', userId: binding.userId, correlationId, ipHash: null, metadata: { reasonCode: 'CHALLENGE_CONSUMED' } });
      return true;
    });
  } catch { throw new SecurityOperationError(); }
}
export async function revokePasswordChallenge(db: Kysely<DatabaseSchema>, token: SensitiveValue, binding: PasswordProofBinding, context: ChallengeRateContext): Promise<boolean> {
  const parsed = proof.safeParse(binding);
  if (!parsed.success) return false;
  let hash: Buffer;
  try { hash = challengeHash(token); } catch { return false; }
  try {
    if (!(context.network instanceof NetworkIdentity) || !await admitAuthentication(db, [
      { scope: 'auth_challenge', hash: pseudonym(context.key, 'challenge', parsed.data.userId) },
      { scope: 'auth_network', hash: context.network.pseudonym(context.key) },
      { scope: 'auth_global', hash: pseudonym(context.key, 'global', 'challenge-stage') },
    ])) return false;
    binding = parsed.data;
    return await db.transaction().execute(async (transaction) => {
      const user = await transaction.selectFrom('users').select('auth_version').where('id', '=', binding.userId).forUpdate().executeTakeFirst();
      if (!user || user.auth_version !== binding.authVersion) return false;
      const now = (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(transaction)).rows[0]!.now;
      const result = await transaction.updateTable('auth_challenges').set({ revoked_at: now }).where('token_hash', '=', hash).where('user_id', '=', binding.userId).where('purpose', '=', binding.purpose)
        .where('auth_version', '=', binding.authVersion).where('action_code', '=', 'PASSWORD_VERIFIED').where('expires_at', '>', now).where('consumed_at', 'is', null).where('revoked_at', 'is', null).executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) return false;
      const correlationId = randomUUID();
      await appendAudit(transaction, { action: 'challenge.revoke', actorUserId: binding.userId, targetUserId: binding.userId, correlationId, metadata: { reasonCode: 'CHALLENGE_REVOKED' } });
      await appendSecurityEvent(transaction, { type: 'challenge.revoked', outcome: 'success', userId: binding.userId, correlationId, ipHash: null, metadata: { reasonCode: 'CHALLENGE_REVOKED' } });
      return true;
    });
  } catch { throw new SecurityOperationError(); }
}
