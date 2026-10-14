import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../db/schema.ts';
import { ROLE_CODES } from '../db/catalog.ts';
import { normalizeEmail, NetworkIdentity, pseudonym } from '../security/identity.ts';
import { appendAudit, appendSecurityEvent, type SecurityEventInput } from '../security/events.ts';
import { admitAuthentication, clearSuccessfulAccountAttempts } from '../security/rate-limits.ts';
import { SensitiveValue } from '../security/sensitive.ts';
import { hashPassword, verifyPassword, verifyDummyPassword, initializePasswordSecurity, needsPasswordRehash, isSupportedPasswordHash } from './passwords.ts';
import { validatePassword, isBoundedPassword } from './password-policy.ts';
import { insertPasswordChallenge } from './challenges.ts';

export const AUTHENTICATION_FAILURE = Object.freeze({ ok: false as const, message: 'Unable to sign in.' });
type FailureReason = SecurityEventInput['metadata']['reasonCode'];

/** Private Node service; no HTTP endpoint, cookies, MFA or workspace access. */
export async function createAuthenticationService(db: Kysely<DatabaseSchema>, key: Buffer) {
  if (key.length !== 32) throw new Error('Authentication service unavailable');
  await initializePasswordSecurity();
  return {
    async checkPassword(input: { email: unknown; password: unknown; network: NetworkIdentity }) {
      const correlationId = randomUUID();
      let userId: string | null = null, ipHash: Buffer | null = null;
      async function failure(reasonCode: FailureReason) {
        try {
          await appendSecurityEvent(db, { type: reasonCode === 'DISABLED' ? 'auth.disabled' : reasonCode === 'RATE_LIMITED' ? 'auth.rate_limited' : 'auth.failure',
            outcome: reasonCode === 'RATE_LIMITED' ? 'denied' : 'failure', userId, correlationId, ipHash, metadata: { reasonCode } });
        } catch { /* Authentication remains denied if diagnostics cannot be persisted. */ }
        return AUTHENTICATION_FAILURE;
      }
      try {
        if (!(input.network instanceof NetworkIdentity)) return failure('UNAVAILABLE');
        ipHash = input.network.pseudonym(key);
        let email: string | undefined;
        try { email = normalizeEmail(input.email); } catch { /* Admission still charges malformed inputs. */ }
        const accountHash = pseudonym(key, 'account', email ?? 'invalid-account-input');
        if (!await admitAuthentication(db, [
          { scope: 'auth_account', hash: accountHash }, { scope: 'auth_network', hash: ipHash },
          { scope: 'auth_global', hash: pseudonym(key, 'global', 'password-stage') },
        ])) return failure('RATE_LIMITED');
        if (!email || !isBoundedPassword(input.password)) {
          await verifyDummyPassword(input.password);
          return failure('INVALID_CREDENTIALS');
        }
        const user = await db.selectFrom('users').leftJoin('user_roles', 'user_roles.user_id', 'users.id').leftJoin('roles', 'roles.id', 'user_roles.role_id')
          .select(['users.id', 'users.password_hash', 'users.status', 'users.auth_version', 'roles.code']).where('users.email_normalized', '=', email).executeTakeFirst();
        userId = user?.id ?? null;
        if (!user?.password_hash) {
          await verifyDummyPassword(input.password);
          return failure(user ? 'INCOMPLETE' : 'INVALID_CREDENTIALS');
        }
        const encoded = new SensitiveValue(user.password_hash);
        if (!isSupportedPasswordHash(encoded)) { await verifyDummyPassword(input.password); return failure('UNAVAILABLE'); }
        const verified = await verifyPassword(encoded, input.password);
        if (user.status === 'disabled') return failure('DISABLED');
        if (!verified) return failure('INVALID_CREDENTIALS');
        if (!['active', 'pending_mfa'].includes(user.status) || !user.code || !ROLE_CODES.some((code) => code === user.code)) return failure('INCOMPLETE');
        let replacement: SensitiveValue | undefined;
        if (needsPasswordRehash(encoded)) {
          // Newly blocklisted legacy credentials may verify, but aren't silently transformed.
          try { validatePassword(input.password); replacement = await hashPassword(input.password); } catch { /* No unsafe or weaker replacement. */ }
        }
        const result = await db.transaction().execute(async (transaction) => {
          const fresh = await transaction.selectFrom('users').selectAll().where('id', '=', user.id).forUpdate().executeTakeFirst();
          const role = await transaction.selectFrom('user_roles').innerJoin('roles', 'roles.id', 'user_roles.role_id').select('roles.code').where('user_roles.user_id', '=', user.id).executeTakeFirst();
          if (!fresh || fresh.auth_version !== user.auth_version || fresh.password_hash !== user.password_hash || fresh.status !== user.status || role?.code !== user.code) return null;
          if (replacement) {
            await transaction.updateTable('users').set({ password_hash: replacement.reveal(), updated_at: new Date() }).where('id', '=', user.id).execute();
            await appendAudit(transaction, { action: 'password.hash_replaced', actorUserId: user.id, targetUserId: user.id, correlationId, metadata: { reasonCode: 'HASH_REPLACED' } });
            await appendSecurityEvent(transaction, { type: 'auth.hash_replaced', outcome: 'success', userId: user.id, correlationId, ipHash, metadata: { reasonCode: 'HASH_REPLACED' } });
          }
          const challenge = await insertPasswordChallenge(transaction, user.id, fresh.auth_version);
          await appendSecurityEvent(transaction, { type: 'auth.password_verified', outcome: 'success', userId: user.id, correlationId, ipHash, metadata: { reasonCode: 'PASSWORD_VERIFIED' } });
          await clearSuccessfulAccountAttempts(transaction, accountHash);
          return { ok: true as const, stage: 'PASSWORD_VERIFIED' as const, userId: user.id, authVersion: fresh.auth_version,
            mfaEnrollmentRequired: fresh.status === 'pending_mfa', challenge };
        });
        return result ?? failure('AUTH_VERSION_CHANGED');
      } catch (error) {
        return failure(error instanceof Error && error.name === 'HashCapacityError' ? 'CAPACITY' : 'UNAVAILABLE');
      }
    },
  };
}
