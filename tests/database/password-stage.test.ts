import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { createAuthenticationService, AUTHENTICATION_FAILURE } from '../../src/server/auth/authentication';
import { consumePasswordChallenge, revokePasswordChallenge, insertPasswordChallenge, challengeHash } from '../../src/server/auth/challenges';
import { NetworkIdentity } from '../../src/server/security/identity';
import { SensitiveValue } from '../../src/server/security/sensitive';
import * as events from '../../src/server/security/events';
import * as passwords from '../../src/server/auth/passwords';

const target = scratchDatabase('bsa_test_clean'), db = target.handle.db;
const key = randomBytes(32), network = NetworkIdentity.fromSocketAddress('127.0.0.1'), context = { key, network };
const password = randomBytes(24).toString('hex');
let user: Awaited<ReturnType<typeof makeUser>>;
let service: Awaited<ReturnType<typeof createAuthenticationService>>;
beforeAll(async () => { await resetScratch(target); service = await createAuthenticationService(db, key); });
beforeEach(async () => { await resetScratch(target); user = await makeUser(db, password); });
afterAll(() => target.handle.close());
const binding = () => ({ userId: user.id, authVersion: 1, purpose: 'password_verified' as const });
async function challenge() { return db.transaction().execute((transaction) => insertPasswordChallenge(transaction, user.id, 1)); }

describe('password-stage authentication without workspace access', () => {
  it('normalizes email, verifies a user and stores only a restricted token hash', async () => {
    const result = await service.checkPassword({ email: ` ${user.email.toUpperCase()} `, password, network });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Password stage failed');
    const row = await db.selectFrom('auth_challenges').selectAll().executeTakeFirstOrThrow();
    expect(row.token_hash.equals(challengeHash(result.challenge.token))).toBe(true);
    expect(row.purpose).toBe('password_verified');
    expect(row.action_code).toBe('PASSWORD_VERIFIED');
    expect(row.expires_at.getTime() - row.created_at.getTime()).toBe(300000);
    expect(JSON.stringify(result).includes(result.challenge.token.reveal())).toBe(false);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('mfa_methods').select('id').execute()).toHaveLength(0);
  });
  it.each(['unknown', 'wrong', 'disabled', 'invited', 'missing_role', 'invalid_length'] as const)('returns the same generic failure for %s', async (kind) => {
    let email = user.email, submitted = password;
    if (kind === 'unknown') email = `${randomUUID()}@example.test`;
    if (kind === 'wrong') submitted += 'wrong';
    if (kind === 'invalid_length') submitted = 'short';
    if (kind === 'disabled') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', user.id).execute();
    if (kind === 'invited') await db.updateTable('users').set({ status: 'invited', password_hash: null }).where('id', '=', user.id).execute();
    if (kind === 'missing_role') await db.deleteFrom('user_roles').where('user_id', '=', user.id).execute();
    expect(await service.checkPassword({ email, password: submitted, network })).toEqual(AUTHENTICATION_FAILURE);
    expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0);
  });
  it('uses dummy verification for unknown accounts', async () => {
    const spy = vi.spyOn(passwords, 'verifyDummyPassword');
    await service.checkPassword({ email: `${randomUUID()}@example.test`, password, network });
    expect(spy).toHaveBeenCalledTimes(1); spy.mockRestore();
  });
  it('allows a pending-MFA user only a restricted enrollment-stage proof', async () => {
    await db.updateTable('users').set({ status: 'pending_mfa' }).where('id', '=', user.id).execute();
    const result = await service.checkPassword({ email: user.email, password, network });
    expect(result.ok && result.mfaEnrollmentRequired).toBe(true);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
  });
  it('rejects an authentication-version change occurring during verification', async () => {
    const actual = passwords.verifyPassword;
    const spy = vi.spyOn(passwords, 'verifyPassword').mockImplementationOnce(async (...args) => {
      const valid = await actual(...args);
      await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', user.id).execute();
      return valid;
    });
    expect(await service.checkPassword({ email: user.email, password, network })).toEqual(AUTHENTICATION_FAILURE);
    expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0); spy.mockRestore();
  });
  it('rolls back challenge creation if the required success event fails', async () => {
    const actual = events.appendSecurityEvent;
    const spy = vi.spyOn(events, 'appendSecurityEvent').mockImplementation(async (transaction, event) => {
      if (event.type === 'auth.password_verified') throw new Error('Synthetic event storage failure');
      await actual(transaction, event);
    });
    expect(await service.checkPassword({ email: user.email, password, network })).toEqual(AUTHENTICATION_FAILURE);
    expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0); spy.mockRestore();
  });
  it('returns a generic rate-limited failure and records a controlled reason', async () => {
    for (let i = 0; i < 6; i++) expect(await service.checkPassword({ email: user.email, password: password + 'wrong', network })).toEqual(AUTHENTICATION_FAILURE);
    expect(await db.selectFrom('security_events').select('id').where('type', '=', 'auth.rate_limited').execute()).toHaveLength(1);
  });
  it('returns the same failure for known and unknown users during hash saturation', async () => {
    const state = globalThis as typeof globalThis & { bismillahHashCapacity: passwords.HashCapacity };
    let release!: () => void;
    const held = state.bismillahHashCapacity.run(() => new Promise<void>((resolve) => { release = resolve; }));
    try {
      for (const email of [user.email, `${randomUUID()}@example.test`]) expect(await service.checkPassword({ email, password, network })).toEqual(AUTHENTICATION_FAILURE);
    } finally { release(); await held; }
  });
  it('rehashes an older safe cost with atomic audit and without exposing the hash', async () => {
    const older = await argon2.hash(password, { ...passwords.ARGON2_POLICY, timeCost: 2 });
    await db.updateTable('users').set({ password_hash: older }).where('id', '=', user.id).execute();
    const result = await service.checkPassword({ email: user.email, password, network });
    expect(result.ok).toBe(true);
    const stored = (await db.selectFrom('users').select('password_hash').where('id', '=', user.id).executeTakeFirstOrThrow()).password_hash!;
    expect(stored === older).toBe(false);
    expect(passwords.needsPasswordRehash(new SensitiveValue(stored))).toBe(false);
    expect(JSON.stringify(result).includes(stored)).toBe(false);
    expect(await db.selectFrom('audit_logs').select('id').where('action', '=', 'password.hash_replaced').execute()).toHaveLength(1);
  });
});
describe('restricted challenge lifecycle', () => {
  it('requires the password-stage action binding for consumption and revocation', async () => {
    const proof = await challenge();
    await db.updateTable('auth_challenges').set({ action_code: 'UNRELATED_ACTION' }).where('id', '=', proof.id).execute();
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
    expect(await revokePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
    await db.updateTable('auth_challenges').set({ action_code: 'PASSWORD_VERIFIED' }).where('id', '=', proof.id).execute();
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(true);
  });
  it('rejects wrong token, purpose, ownership and authentication version', async () => {
    const proof = await challenge();
    expect(await consumePasswordChallenge(db, new SensitiveValue(randomBytes(32).toString('base64url')), binding(), context)).toBe(false);
    expect(await consumePasswordChallenge(db, proof.token, { ...binding(), userId: randomUUID() }, context)).toBe(false);
    expect(await consumePasswordChallenge(db, proof.token, { ...binding(), authVersion: 2 }, context)).toBe(false);
    expect(await consumePasswordChallenge(db, proof.token, { ...binding(), purpose: 'login_mfa' } as never, context)).toBe(false);
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(true);
  });
  it('rejects expired and revoked proofs', async () => {
    const proof = await challenge();
    await sql`UPDATE auth_challenges SET created_at=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 10 MINUTE), expires_at=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 1 MINUTE)`.execute(db);
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
    const next = await challenge();
    expect(await revokePasswordChallenge(db, next.token, binding(), context)).toBe(true);
    expect(await consumePasswordChallenge(db, next.token, binding(), context)).toBe(false);
  });
  it('consumes once under concurrent requests and rejects replay', async () => {
    const proof = await challenge();
    const results = await Promise.all(Array.from({ length: 4 }, () => consumePasswordChallenge(db, proof.token, binding(), context)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
  });
  it('revokes earlier proofs when a new password-stage proof is issued', async () => {
    const first = await challenge(), second = await challenge();
    expect(first.token.reveal() === second.token.reveal()).toBe(false);
    expect(await consumePasswordChallenge(db, first.token, binding(), context)).toBe(false);
    expect(await consumePasswordChallenge(db, second.token, binding(), context)).toBe(true);
  });
  it('rejects stale user versions and rolls back consumption if audit storage fails', async () => {
    const proof = await challenge();
    await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', user.id).execute();
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
    await db.updateTable('users').set({ auth_version: 1 }).where('id', '=', user.id).execute();
    const spy = vi.spyOn(events, 'appendAudit').mockRejectedValueOnce(new Error('Synthetic audit failure'));
    await expect(consumePasswordChallenge(db, proof.token, binding(), context)).rejects.toThrow('Security operation unavailable');
    expect((await db.selectFrom('auth_challenges').select('consumed_at').executeTakeFirstOrThrow()).consumed_at).toBeNull(); spy.mockRestore();
  });
});
