import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { sql, type Kysely, type Selectable } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema, SessionsTable } from '../db/schema.ts';
import { canonicalCatalogId } from '../db/seeds.ts';
import { ROLE_CODES } from '../db/catalog.ts';
import { recordAccessEvent } from '../security/access-events.ts';
import { NetworkIdentity, pseudonym } from '../security/identity.ts';
import { admitAuthentication } from '../security/rate-limits.ts';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';
import { verifyPassword } from './passwords.ts';
import { decryptMfa, encryptMfa, newTotpSecret, enrollmentURI, verifyTotp, generateRecoveryCodes, recoveryHash, type MfaKey } from './mfa-crypto.ts';

export const ACCESS_FAILURE = Object.freeze({ ok: false as const, state: 'RESTART' as const, message: 'Unable to complete authentication. Please try again.' });
export const SESSION_LIMIT = Object.freeze({ ok: false as const, state: 'SESSION_LIMIT' as const, message: 'Session limit reached. Sign out of another device before trying again.' });
export const ACTIONS = ['REPLACE_FACTOR', 'REGENERATE_RECOVERY', 'REVOKE_SESSIONS'] as const;
export type Action = typeof ACTIONS[number];
export type RecentAction = Action | `TEAM_${string}:${string}` | `INTEGRATION_${string}:${string}`;
function validRecentAction(action: string): boolean { return ACTIONS.some((value) => value === action) || /^INTEGRATION_(CONNECT|RECONNECT|SELECT|DISCONNECT):[A-Za-z0-9_-]{43}$/.test(action) || /^TEAM_(INVITE|ROLE|STATUS|SESSIONS|REVOKE_INVITATION):[A-Za-z0-9_-]{43}$/.test(action); }
export function tokenHash(token: SensitiveValue): Buffer {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token.reveal())) throw new SecurityOperationError();
  return createHash('sha256').update(token.reveal()).digest();
}
function token() { return new SensitiveValue(randomBytes(32).toString('base64url')); }
export function sessionPolicy(role: string) { if (!ROLE_CODES.some((code) => code === role)) throw new SecurityOperationError(); return ['OWNER', 'MARKETING_ADMIN'].includes(role) ? { idle: 1800000, absolute: 86400000 } : { idle: 7200000, absolute: 604800000 }; }
const clock = async (db: Kysely<DatabaseSchema>) => (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;
async function lockIdentity(db: Kysely<DatabaseSchema>, userId: string) {
  const user = await db.selectFrom('users').selectAll().where('id', '=', userId).forUpdate().executeTakeFirst();
  const role = await db.selectFrom('user_roles').innerJoin('roles', 'roles.id', 'user_roles.role_id').select(['roles.code', 'roles.id']).where('user_roles.user_id', '=', userId).forShare().executeTakeFirst();
  if (!user || !['active', 'pending_mfa'].includes(user.status) || !role || !ROLE_CODES.some((code) => code === role.code) || role.id !== canonicalCatalogId('role', role.code)) return null;
  const factor = await db.selectFrom('mfa_methods').selectAll().where('user_id', '=', userId).forUpdate().executeTakeFirst();
  return { user, role: role.code, factor, mandatory: ['OWNER', 'MARKETING_ADMIN'].includes(role.code) || user.status === 'pending_mfa' };
}
type Identity = NonNullable<Awaited<ReturnType<typeof lockIdentity>>>;
function sessionDeadline(row: Selectable<SessionsTable>, role: string) {
  const policy = sessionPolicy(role);
  return new Date(Math.min(row.idle_expires_at.getTime(), row.absolute_expires_at.getTime(),
    row.last_activity_at.getTime() + policy.idle, row.created_at.getTime() + policy.absolute));
}
function validSession(row: Selectable<SessionsTable>, identity: Identity, now: Date) {
  const policy = sessionPolicy(identity.role);
  return identity.user.status === 'active' && row.auth_version === identity.user.auth_version && !row.revoked_at
    && row.idle_expires_at > now && row.absolute_expires_at > now
    && now.getTime() < row.created_at.getTime() + policy.absolute
    && now.getTime() < row.last_activity_at.getTime() + policy.idle
    && (!(identity.mandatory || identity.factor?.state === 'active') || (identity.factor?.state === 'active' && row.mfa_verified_at !== null && row.mfa_verified_at >= identity.factor.confirmed_at!));
}
export async function lockedSession(db: Kysely<DatabaseSchema>, raw: SensitiveValue) {
  const hash = tokenHash(raw);
  const hint = await db.selectFrom('sessions').select('user_id').where('token_hash', '=', hash).executeTakeFirst();
  if (!hint) return null;
  const identity = await lockIdentity(db, hint.user_id);
  if (!identity) return null;
  const row = await db.selectFrom('sessions').selectAll().where('token_hash', '=', hash).forUpdate().executeTakeFirst();
  const now = await clock(db);
  return row && validSession(row, identity, now) ? { row, identity, now } : null;
}
async function lockedProof(db: Kysely<DatabaseSchema>, raw: SensitiveValue) {
  const hash = tokenHash(raw);
  const hint = await db.selectFrom('auth_challenges').select('user_id').where('token_hash', '=', hash).executeTakeFirst();
  if (!hint) return null;
  const identity = await lockIdentity(db, hint.user_id);
  if (!identity) return null;
  const proof = await db.selectFrom('auth_challenges').selectAll().where('token_hash', '=', hash).forUpdate().executeTakeFirst();
  const now = await clock(db);
  if (!proof || proof.purpose !== 'password_verified' || proof.action_code !== 'PASSWORD_VERIFIED' || proof.auth_version !== identity.user.auth_version || proof.consumed_at || proof.revoked_at || proof.expires_at <= now) return null;
  return { identity, proof, now };
}
async function replaceCodes(db: Kysely<DatabaseSchema>, methodId: string, now: Date) {
  await db.updateTable('mfa_recovery_codes').set({ revoked_at: now }).where('method_id', '=', methodId).where('used_at', 'is', null).where('revoked_at', 'is', null).execute();
  const codes = generateRecoveryCodes(), batch = randomUUID();
  await db.insertInto('mfa_recovery_codes').values(codes.map((code) => ({ id: randomUUID(), method_id: methodId, batch_id: batch, code_hash: recoveryHash(code), created_at: now, used_at: null, revoked_at: null }))).execute();
  return codes;
}
/** Only called inside a fresh, user-locked authentication transaction. */
async function issue(db: Kysely<DatabaseSchema>, identity: Identity, now: Date, mfa: boolean) {
  if (identity.user.status !== 'active' || ((identity.mandatory || identity.factor?.state === 'active') && !mfa)) return ACCESS_FAILURE;
  const active = await db.selectFrom('sessions').select('id').where('user_id', '=', identity.user.id).where('revoked_at', 'is', null).where('auth_version', '=', identity.user.auth_version).where('idle_expires_at', '>', now).where('absolute_expires_at', '>', now).forUpdate().execute();
  if (active.length >= 5) { await recordAccessEvent(db, { type: 'session.limit', userId: identity.user.id, outcome: 'denied' }); return SESSION_LIMIT; }
  const raw = token(), id = randomUUID(), policy = sessionPolicy(identity.role);
  const absolute = new Date(now.getTime() + policy.absolute), idle = new Date(now.getTime() + policy.idle);
  await db.insertInto('sessions').values({ id, user_id: identity.user.id, token_hash: tokenHash(raw), auth_version: identity.user.auth_version, created_at: now, last_activity_at: now, idle_expires_at: idle, absolute_expires_at: absolute, authenticated_at: now, mfa_verified_at: mfa ? now : null, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null }).execute();
  await db.updateTable('users').set({ last_login_at: now }).where('id', '=', identity.user.id).execute();
  await recordAccessEvent(db, { type: 'session.issued', userId: identity.user.id, outcome: 'success' }, true);
  return { ok: true as const, state: 'AUTHENTICATED' as const, session: raw, expiresAt: idle, id };
}
/** All writes lock user -> factor -> proof/session -> recovery; admission commits first. No retries. */
export function createAccessService(db: Kysely<DatabaseSchema>, mfaKey: MfaKey, rateKey: Buffer, network: NetworkIdentity) {
  async function transaction<T>(operation: (db: Kysely<DatabaseSchema>) => Promise<T>): Promise<T> {
    try { return await db.transaction().execute(operation); } catch { throw new SecurityOperationError(); }
  }
  async function admission(raw: SensitiveValue) {
    try {
    const hint = await db.selectFrom('auth_challenges').select('user_id').where('token_hash', '=', tokenHash(raw)).executeTakeFirst();
    const allowed = await admitAuthentication(db, [ { scope: 'auth_global', hash: pseudonym(rateKey, 'global', 'challenge-stage') }, { scope: 'auth_network', hash: network.pseudonym(rateKey) }, { scope: 'auth_challenge', hash: pseudonym(rateKey, 'challenge', hint?.user_id ?? 'invalid-proof') } ]);
    if (!allowed) await recordAccessEvent(db, { type: 'auth.mfa_limited', userId: hint?.user_id ?? null, outcome: 'denied' });
    return allowed;
    } catch { throw new SecurityOperationError(); }
  }
  async function secondFactor(tx: Kysely<DatabaseSchema>, identity: Identity, code: unknown, recovery: boolean, now: Date) {
    const factor = identity.factor;
    if (factor?.state !== 'active') return false;
    if (recovery) {
      if (typeof code !== 'string') return false;
      let hash: Buffer; try { hash = recoveryHash(new SensitiveValue(code)); } catch { return false; }
      const result = await tx.updateTable('mfa_recovery_codes').set({ used_at: now }).where('method_id', '=', factor.id).where('code_hash', '=', hash).where('used_at', 'is', null).where('revoked_at', 'is', null).executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) return false;
      await recordAccessEvent(tx, { type: 'mfa.recovery_used', userId: identity.user.id, outcome: 'success' }, true); return true;
    }
    const step = await verifyTotp(decryptMfa(factor, mfaKey), code, now, factor.last_accepted_step);
    if (step === null) return false;
    await tx.updateTable('mfa_methods').set({ last_accepted_step: step }).where('id', '=', factor.id).execute(); return true;
  }
  return {
    async continuePassword(raw: SensitiveValue) {
      if (!await admission(raw)) return ACCESS_FAILURE;
      return transaction(async (tx) => {
        const state = await lockedProof(tx, raw); if (!state) return ACCESS_FAILURE;
        const { identity, proof, now } = state;
        if (identity.factor?.state === 'active') return { ok: true as const, state: 'MFA_REQUIRED' as const };
        if (identity.mandatory) return { ok: true as const, state: 'MFA_ENROLLMENT_REQUIRED' as const };
        const result = await issue(tx, identity, now, false);
        if (result.ok) await tx.updateTable('auth_challenges').set({ consumed_at: now }).where('id', '=', proof.id).execute();
        return result;
      });
    },
    async startEnrollment(raw: SensitiveValue) {
      if (!await admission(raw)) return ACCESS_FAILURE;
      return transaction(async (tx) => {
        const state = await lockedProof(tx, raw); if (!state || state.identity.factor?.state === 'active') return ACCESS_FAILURE;
        const { identity, proof, now } = state;
        const id = identity.factor?.id ?? randomUUID(), secret = newTotpSecret();
        const values = { ...encryptMfa(secret, mfaKey, identity.user.id, id), state: 'pending' as const, confirmed_at: null, last_accepted_step: null, created_at: now, enrollment_expires_at: proof.expires_at, enrollment_challenge_id: proof.id };
        if (identity.factor) await tx.updateTable('mfa_methods').set(values).where('id', '=', id).execute();
        else await tx.insertInto('mfa_methods').values({ id, user_id: identity.user.id, type: 'totp', ...values }).execute();
        await recordAccessEvent(tx, { type: 'mfa.enrollment_start', userId: identity.user.id, outcome: 'success' }, true);
        return { ok: true as const, state: 'ENROLLING' as const, secret, uri: enrollmentURI(secret, identity.user.email_normalized) };
      });
    },
    async completeEnrollment(raw: SensitiveValue, code: unknown) {
      if (!await admission(raw)) return ACCESS_FAILURE;
      return transaction(async (tx) => {
        const state = await lockedProof(tx, raw); if (!state) return ACCESS_FAILURE;
        const { identity, proof, now } = state, factor = identity.factor;
        if (!factor || factor.state !== 'pending' || factor.enrollment_challenge_id !== proof.id || !factor.enrollment_expires_at || factor.enrollment_expires_at <= now) return ACCESS_FAILURE;
        const step = await verifyTotp(decryptMfa(factor, mfaKey), code, now, null);
        if (step === null) { await recordAccessEvent(tx, { type: 'mfa.enrollment_failure', userId: identity.user.id, outcome: 'failure' }); return ACCESS_FAILURE; }
        // Session limit checked before activating factor or revealing recovery material.
        const active = await tx.selectFrom('sessions').select('id').where('user_id', '=', identity.user.id).where('revoked_at', 'is', null).where('idle_expires_at', '>', now).where('absolute_expires_at', '>', now).forUpdate().execute();
        if (active.length >= 5) { await recordAccessEvent(tx, { type: 'session.limit', userId: identity.user.id, outcome: 'denied' }); return SESSION_LIMIT; }
        await tx.updateTable('mfa_methods').set({ state: 'active', confirmed_at: now, enrollment_expires_at: null, enrollment_challenge_id: null, last_accepted_step: step }).where('id', '=', factor.id).execute();
        await tx.updateTable('users').set({ status: 'active', updated_at: now }).where('id', '=', identity.user.id).execute();
        await tx.updateTable('auth_challenges').set({ consumed_at: now }).where('id', '=', proof.id).execute();
        const codes = await replaceCodes(tx, factor.id, now);
        await recordAccessEvent(tx, { type: 'mfa.enrollment_success', userId: identity.user.id, outcome: 'success' }, true);
        const result = await issue(tx, { ...identity, user: { ...identity.user, status: 'active' } }, now, true);
        if (!result.ok) throw new SecurityOperationError();
        return { ...result, recoveryCodes: codes };
      });
    },
    async completeMfa(raw: SensitiveValue, code: unknown, recovery = false) {
      if (!await admission(raw)) return ACCESS_FAILURE;
      return transaction(async (tx) => {
        const state = await lockedProof(tx, raw); if (!state) return ACCESS_FAILURE;
        const { identity, proof, now } = state;
        if (identity.user.status !== 'active') return ACCESS_FAILURE;
        const active = await tx.selectFrom('sessions').select('id').where('user_id', '=', identity.user.id).where('revoked_at', 'is', null).where('idle_expires_at', '>', now).where('absolute_expires_at', '>', now).forUpdate().execute();
        if (active.length >= 5) { await recordAccessEvent(tx, { type: 'session.limit', userId: identity.user.id, outcome: 'denied' }); return SESSION_LIMIT; }
        if (!await secondFactor(tx, identity, code, recovery, now)) { await recordAccessEvent(tx, { type: 'mfa.totp_failure', userId: identity.user.id, outcome: 'failure' }); return ACCESS_FAILURE; }
        const result = await issue(tx, identity, now, true);
        if (!result.ok) throw new SecurityOperationError();
        await tx.updateTable('auth_challenges').set({ consumed_at: now }).where('id', '=', proof.id).execute(); return result;
      });
    },
    async validateSession(raw: SensitiveValue, activity: 'none' | 'interaction' = 'none') {
      return transaction(async (tx) => {
        const state = await lockedSession(tx, raw); if (!state) return null;
        const { row, identity, now } = state;
        if (activity === 'interaction' && now.getTime() - row.last_activity_at.getTime() >= 60000) {
          const idle = new Date(Math.min(now.getTime() + sessionPolicy(identity.role).idle, row.absolute_expires_at.getTime(), row.created_at.getTime() + sessionPolicy(identity.role).absolute));
          await tx.updateTable('sessions').set({ last_activity_at: now, idle_expires_at: idle }).where('id', '=', row.id).execute();
          row.last_activity_at = now; row.idle_expires_at = idle;
        }
        return { userId: identity.user.id, displayName: identity.user.display_name, role: identity.role, sessionId: row.id, expiresAt: sessionDeadline(row, identity.role) };
      });
    },
    async logout(raw: SensitiveValue) {
      // Invalid credentials cannot identify a live session; logout remains safe.
      let hash: Buffer; try { hash = tokenHash(raw); } catch { return; }
      return transaction(async (tx) => {
        const hint = await tx.selectFrom('sessions').select(['id', 'user_id']).where('token_hash', '=', hash).executeTakeFirst(); if (!hint) return;
        const user = await tx.selectFrom('users').select('id').where('id', '=', hint.user_id).forUpdate().executeTakeFirst(); if (!user) return;
        // Once this request has observed a valid token, revoke its stable session
        // lineage even if a concurrent rotation wins the user lock first.
        const row = await tx.selectFrom('sessions').selectAll().where('id', '=', hint.id).where('user_id', '=', user.id).forUpdate().executeTakeFirst(); if (!row || row.revoked_at) return;
        await tx.updateTable('sessions').set({ revoked_at: await clock(tx), revocation_reason: 'logout' }).where('id', '=', row.id).execute();
        await recordAccessEvent(tx, { type: 'auth.logout', userId: user.id, outcome: 'success' }, true);
      });
    },
    async revokeSession(raw: SensitiveValue, sessionId: string) {
      if (!z.uuid().safeParse(sessionId).success) return false;
      return transaction(async (tx) => {
        const state = await lockedSession(tx, raw); if (!state) return false;
        const result = await tx.updateTable('sessions').set({ revoked_at: state.now, revocation_reason: 'user_revoked' }).where('id', '=', sessionId).where('user_id', '=', state.identity.user.id).where('revoked_at', 'is', null).executeTakeFirst();
        if (Number(result.numUpdatedRows) !== 1) return false;
        await recordAccessEvent(tx, { type: 'session.revoked', userId: state.identity.user.id, outcome: 'success' }, true); return true;
      });
    },
    async rotateSession(raw: SensitiveValue) {
      return transaction(async (tx) => {
        const state = await lockedSession(tx, raw); if (!state) return null;
        // Atomic replacement on the same authoritative row preserves original lifetime.
        const replacement = token();
        await tx.updateTable('sessions').set({ token_hash: tokenHash(replacement) }).where('id', '=', state.row.id).execute();
        await tx.updateTable('auth_challenges').set({ revoked_at: state.now }).where('bound_session_id', '=', state.row.id).where('consumed_at', 'is', null).where('revoked_at', 'is', null).execute();
        await recordAccessEvent(tx, { type: 'session.rotated', userId: state.identity.user.id, outcome: 'success' }, true);
        return { token: replacement, expiresAt: sessionDeadline(state.row, state.identity.role) };
      });
    },
    async recentAuthentication(raw: SensitiveValue, password: unknown, code: unknown, action: RecentAction, recovery = false) {
      if (!validRecentAction(action) || (recovery && action !== 'REPLACE_FACTOR')) return ACCESS_FAILURE;
      const snapshot = await transaction(async (tx) => lockedSession(tx, raw)); if (!snapshot?.identity.user.password_hash) return ACCESS_FAILURE;
      if (!await admitAuthentication(db, [{ scope: 'auth_global', hash: pseudonym(rateKey, 'global', 'password-stage') }, { scope: 'auth_network', hash: network.pseudonym(rateKey) }, { scope: 'auth_account', hash: pseudonym(rateKey, 'account', snapshot.identity.user.email_normalized) }])) return ACCESS_FAILURE;
      if (!await verifyPassword(new SensitiveValue(snapshot.identity.user.password_hash), password)) { await recordAccessEvent(db, { type: 'auth.recent_failure', userId: snapshot.identity.user.id, outcome: 'failure' }); return ACCESS_FAILURE; }
      return transaction(async (tx) => {
        const state = await lockedSession(tx, raw);
        if (!state || state.identity.user.auth_version !== snapshot.identity.user.auth_version || state.identity.user.password_hash !== snapshot.identity.user.password_hash) return ACCESS_FAILURE;
        if ((state.identity.mandatory || state.identity.factor?.state === 'active') && !await secondFactor(tx, state.identity, code, recovery, state.now)) {
          await recordAccessEvent(tx, { type: 'auth.recent_failure', userId: state.identity.user.id, outcome: 'failure' }); return ACCESS_FAILURE;
        }
        // Step-up rotates the identifier and revokes older action proofs without
        // extending idle/absolute lifetime or changing the session's identity.
        const replacement = token();
        await tx.updateTable('auth_challenges').set({ revoked_at: state.now }).where('bound_session_id', '=', state.row.id).where('consumed_at', 'is', null).where('revoked_at', 'is', null).execute();
        await tx.updateTable('sessions').set({ token_hash: tokenHash(replacement) }).where('id', '=', state.row.id).execute();
        await recordAccessEvent(tx, { type: 'session.rotated', userId: state.identity.user.id, outcome: 'success' }, true);
        const proofToken = token();
        await tx.insertInto('auth_challenges').values({ id: randomUUID(), user_id: state.identity.user.id, token_hash: tokenHash(proofToken), purpose: 'reauthentication', action_code: action, bound_session_id: state.row.id, auth_version: state.identity.user.auth_version, expires_at: new Date(state.now.getTime() + 300000), created_at: state.now, consumed_at: null, revoked_at: null }).execute();
        await tx.updateTable('sessions').set({ reauthenticated_at: state.now }).where('id', '=', state.row.id).execute();
        await recordAccessEvent(tx, { type: 'auth.recent_success', userId: state.identity.user.id, outcome: 'success' }, true);
        return { ok: true as const, proof: proofToken, session: replacement, expiresAt: sessionDeadline(state.row, state.identity.role) };
      });
    },
    async performSensitiveAction(raw: SensitiveValue, proofToken: SensitiveValue, action: Action) {
      if (!z.enum(ACTIONS).safeParse(action).success) return ACCESS_FAILURE;
      return transaction(async (tx) => {
        const state = await lockedSession(tx, raw); if (!state) return ACCESS_FAILURE;
        const proof = await tx.selectFrom('auth_challenges').selectAll().where('token_hash', '=', tokenHash(proofToken)).forUpdate().executeTakeFirst();
        if (!proof || proof.purpose !== 'reauthentication' || proof.action_code !== action || proof.user_id !== state.identity.user.id || proof.auth_version !== state.identity.user.auth_version || proof.bound_session_id !== state.row.id || proof.expires_at <= state.now || proof.consumed_at || proof.revoked_at || state.now.getTime() - proof.created_at.getTime() > 300000) return ACCESS_FAILURE;
        await tx.updateTable('auth_challenges').set({ consumed_at: state.now }).where('id', '=', proof.id).execute();
        if (action === 'REGENERATE_RECOVERY') {
          if (state.identity.factor?.state !== 'active') throw new SecurityOperationError();
          const codes = await replaceCodes(tx, state.identity.factor.id, state.now);
          await recordAccessEvent(tx, { type: 'mfa.recovery_regenerated', userId: state.identity.user.id, outcome: 'success' }, true);
          return { ok: true as const, recoveryCodes: codes };
        }
        await tx.updateTable('sessions').set({ revoked_at: state.now, revocation_reason: action === 'REPLACE_FACTOR' ? 'factor_replacement' : 'user_revoked_all' }).where('user_id', '=', state.identity.user.id).where('revoked_at', 'is', null).execute();
        await recordAccessEvent(tx, { type: 'session.revoked', userId: state.identity.user.id, outcome: 'success' }, true);
        if (action === 'REVOKE_SESSIONS') return { ok: true as const };
        if (state.identity.factor?.state !== 'active') throw new SecurityOperationError();
        const version = state.identity.user.auth_version + 1;
        await tx.updateTable('users').set({ status: 'pending_mfa', auth_version: version, updated_at: state.now }).where('id', '=', state.identity.user.id).execute();
        await tx.updateTable('mfa_recovery_codes').set({ revoked_at: state.now }).where('method_id', '=', state.identity.factor.id).where('used_at', 'is', null).where('revoked_at', 'is', null).execute();
        await tx.updateTable('auth_challenges').set({ revoked_at: state.now }).where('user_id', '=', state.identity.user.id).where('consumed_at', 'is', null).where('revoked_at', 'is', null).execute();
        // Destroy the old encrypted seed; retain method identity/recovery history.
        const enrollment = token(), id = randomUUID(), expires = new Date(state.now.getTime() + 300000);
        await tx.insertInto('auth_challenges').values({ id, user_id: state.identity.user.id, token_hash: tokenHash(enrollment), purpose: 'password_verified', action_code: 'PASSWORD_VERIFIED', auth_version: version, created_at: state.now, expires_at: expires, consumed_at: null, revoked_at: null }).execute();
        await tx.updateTable('mfa_methods').set({ ...encryptMfa(newTotpSecret(), mfaKey, state.identity.user.id, state.identity.factor.id), state: 'pending', confirmed_at: null, last_accepted_step: null, created_at: state.now, enrollment_expires_at: expires, enrollment_challenge_id: id }).where('id', '=', state.identity.factor.id).execute();
        await recordAccessEvent(tx, { type: 'mfa.replaced', userId: state.identity.user.id, outcome: 'success' }, true);
        return { ok: true as const, state: 'MFA_ENROLLMENT_REQUIRED' as const, challenge: enrollment };
      });
    },
  };
}
