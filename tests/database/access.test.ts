import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import { generate } from 'otplib';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { createAccessService, tokenHash, ACCESS_FAILURE } from '../../src/server/auth/access';
import { insertPasswordChallenge } from '../../src/server/auth/challenges';
import { decryptMfa } from '../../src/server/auth/mfa-crypto';
import { NetworkIdentity } from '../../src/server/security/identity';
import { recordAccessEvent } from '../../src/server/security/access-events';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';

const target = scratchDatabase('bsa_test_recovery'), db = target.handle.db;
const second = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
const mfaKey = { key: randomBytes(32), id: 'integration-v1' }, hmac = randomBytes(32);
const service = createAccessService(db, mfaKey, hmac, NetworkIdentity.fromSocketAddress('::'));
const other = createAccessService(second.db, mfaKey, hmac, NetworkIdentity.fromSocketAddress('::'));
// Public synthetic phrase, never a real account credential.
const password = 'synthetic integration phrase 2c';
beforeAll(async () => { await resetScratch(target); });
beforeEach(async () => {
  for (const table of ['audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions', 'user_roles', 'users', 'auth_rate_limits'] as const) await db.deleteFrom(table).execute();
});
afterAll(async () => { await second.close(); await target.handle.close(); });
async function proof(id: string) {
  return db.transaction().execute(async (tx) => {
    const u = await tx.selectFrom('users').select('auth_version').where('id', '=', id).forUpdate().executeTakeFirstOrThrow();
    return (await insertPasswordChallenge(tx, id, u.auth_version)).token;
  });
}
async function code(id: string, offset = 0) {
  const factor = await db.selectFrom('mfa_methods').selectAll().where('user_id', '=', id).executeTakeFirstOrThrow();
  const now = (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;
  return generate({ secret: decryptMfa(factor, mfaKey).reveal(), epoch: Math.floor(now.getTime() / 1000) + offset });
}
async function enrolled(role = 'OWNER') {
  const u = await makeUser(db, password, 'pending_mfa', role), raw = await proof(u.id);
  const start = await service.startEnrollment(raw); expect(start.ok).toBe(true);
  const finish = await service.completeEnrollment(raw, await code(u.id)); expect(finish.ok).toBe(true);
  if (!finish.ok || !('recoveryCodes' in finish)) throw new Error('Synthetic enrollment failed');
  return { u, raw, finish };
}
async function viewerSession() {
  const u = await makeUser(db, password), raw = await proof(u.id), result = await service.continuePassword(raw);
  if (!result.ok || !('session' in result)) throw new Error('Synthetic login failed'); return { u, raw, result };
}
describe('real MySQL enrollment and second-factor boundary', () => {
  it.each(['OWNER', 'MARKETING_ADMIN'])('requires verified enrollment for %s', async (role) => {
    const u = await makeUser(db, password, 'pending_mfa', role), raw = await proof(u.id);
    expect((await service.continuePassword(raw)).state).toBe('MFA_ENROLLMENT_REQUIRED');
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    const start = await service.startEnrollment(raw); expect(start.ok).toBe(true);
    const pending = await db.selectFrom('mfa_methods').selectAll().executeTakeFirstOrThrow();
    expect(pending.state).toBe('pending'); expect(pending.enrollment_challenge_id !== null).toBe(true);
    if (start.ok) expect(pending.seed_ciphertext.includes(Buffer.from(start.secret.reveal()))).toBe(false);
    const result = await service.completeEnrollment(raw, await code(u.id)); expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected enrollment');
    expect(await service.validateSession(result.session)).not.toBeNull();
    expect((await db.selectFrom('users').select('status').where('id', '=', u.id).executeTakeFirstOrThrow()).status).toBe('active');
    expect(await db.selectFrom('mfa_recovery_codes').select('id').execute()).toHaveLength(10);
    expect(await service.completeEnrollment(raw, await code(u.id))).toEqual(ACCESS_FAILURE);
  });
  it('fails invalid TOTP and expires interrupted enrollment without access', async () => {
    const u = await makeUser(db, password, 'pending_mfa', 'OWNER'), raw = await proof(u.id);
    await service.startEnrollment(raw);
    expect(await service.completeEnrollment(raw, 'invalid')).toEqual(ACCESS_FAILURE);
    await db.updateTable('auth_challenges').set({ created_at: new Date(Date.now() - 120000), expires_at: new Date(Date.now() - 60000) }).execute();
    expect(await service.completeEnrollment(raw, await code(u.id))).toEqual(ACCESS_FAILURE);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect((await db.selectFrom('mfa_methods').select('state').executeTakeFirstOrThrow()).state).toBe('pending');
  });
  it('replaces pending factor and binds it to newer proof', async () => {
    const u = await makeUser(db, password, 'pending_mfa', 'OWNER'), old = await proof(u.id);
    const a = await service.startEnrollment(old), newer = await proof(u.id), b = await service.startEnrollment(newer);
    expect(a.ok && b.ok && a.secret.reveal() !== b.secret.reveal()).toBe(true);
    expect(await service.completeEnrollment(old, await code(u.id))).toEqual(ACCESS_FAILURE);
    expect((await service.completeEnrollment(newer, await code(u.id))).ok).toBe(true);
  });
  it('exactly one enrollment completion wins across two pools', async () => {
    const u = await makeUser(db, password, 'pending_mfa', 'OWNER'), raw = await proof(u.id);
    await service.startEnrollment(raw); const otp = await code(u.id);
    const results = await Promise.all([service.completeEnrollment(raw, otp), other.completeEnrollment(raw, otp)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(1);
    expect(await db.selectFrom('mfa_recovery_codes').select('id').execute()).toHaveLength(10);
  });
  it('rejects enrollment code replay; concurrent recovery login has one winner', async () => {
    const { u, finish } = await enrolled(), raw = await proof(u.id);
    expect(await service.completeMfa(raw, await code(u.id))).toEqual(ACCESS_FAILURE);
    const recovery = finish.recoveryCodes[0]!.reveal();
    const results = await Promise.all([service.completeMfa(raw, recovery, true), other.completeMfa(raw, recovery, true)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const used = await db.selectFrom('mfa_recovery_codes').select('used_at').where('method_id', '=', (await db.selectFrom('mfa_methods').select('id').where('user_id', '=', u.id).executeTakeFirstOrThrow()).id).execute();
    expect(used.filter((row) => row.used_at)).toHaveLength(1);
  });
  it('concurrent TOTP across distinct proofs has exactly one winner', async () => {
    const { u } = await enrolled();
    // Move replay floor one step back without changing encrypted seed/clock.
    await db.updateTable('mfa_methods').set((eb) => ({ last_accepted_step: eb('last_accepted_step', '-', 1) })).where('user_id', '=', u.id).execute();
    const a = await proof(u.id), b = await proof(u.id);
    // Synthetic independent valid proofs exercise the replay floor, not supersession.
    await db.updateTable('auth_challenges').set({ revoked_at: null }).where('token_hash', '=', tokenHash(a)).execute();
    const otp = await code(u.id), results = await Promise.all([service.completeMfa(a, otp), other.completeMfa(b, otp)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it.each(['disabled', 'version', 'purpose', 'revoked', 'consumed'])('rejects invalid proof binding: %s', async (variant) => {
    const u = await makeUser(db, password), raw = await proof(u.id);
    if (variant === 'disabled') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', u.id).execute();
    if (variant === 'version') await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', u.id).execute();
    if (variant === 'purpose') await db.updateTable('auth_challenges').set({ purpose: 'login_mfa' }).execute();
    if (variant === 'revoked') await db.updateTable('auth_challenges').set({ revoked_at: new Date() }).execute();
    if (variant === 'consumed') await db.updateTable('auth_challenges').set({ consumed_at: new Date() }).execute();
    expect(await service.continuePassword(raw)).toEqual(ACCESS_FAILURE);
  });
});
describe('session lifetime, state and concurrency', () => {
  it.each(['CONTENT_CREATOR', 'REVIEWER', 'VIEWER'])('allows password-only session only for optional-MFA %s', async (role) => {
    const u = await makeUser(db, password, 'active', role), result = await service.continuePassword(await proof(u.id));
    expect(result.ok && 'session' in result).toBe(true);
    const row = await db.selectFrom('sessions').selectAll().executeTakeFirstOrThrow();
    expect(row.mfa_verified_at).toBeNull(); expect(row.token_hash.length).toBe(32);
    expect(row.absolute_expires_at.getTime() - row.created_at.getTime()).toBe(604800000);
    expect(row.idle_expires_at.getTime() - row.last_activity_at.getTime()).toBe(7200000);
  });
  it('privileged sessions retain 30 minute / 24 hour lifetime and no raw token storage', async () => {
    const { finish } = await enrolled(), row = await db.selectFrom('sessions').selectAll().executeTakeFirstOrThrow();
    expect(row.token_hash.equals(tokenHash(finish.session))).toBe(true);
    expect(row.token_hash.includes(Buffer.from(finish.session.reveal()))).toBe(false);
    expect(row.absolute_expires_at.getTime() - row.created_at.getTime()).toBe(86400000);
    expect(row.idle_expires_at.getTime() - row.created_at.getTime()).toBe(1800000);
  });
  it.each(['disabled', 'version', 'revoked', 'idle', 'absolute', 'role', 'mfa'])('invalidates session on %s change', async (variant) => {
    const { u, result } = await viewerSession();
    if (variant === 'disabled') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', u.id).execute();
    if (variant === 'version') await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', u.id).execute();
    if (variant === 'revoked') await db.updateTable('sessions').set({ revoked_at: new Date(), revocation_reason: 'synthetic' }).execute();
    if (variant === 'idle' || variant === 'absolute') {
      const past = new Date(Date.now() - 120000), expires = new Date(Date.now() - 60000);
      await db.updateTable('sessions').set({ created_at: past, last_activity_at: past, idle_expires_at: expires, ...(variant === 'absolute' ? { absolute_expires_at: expires } : {}) }).execute();
    }
    if (variant === 'role') await db.deleteFrom('user_roles').where('user_id', '=', u.id).execute();
    if (variant === 'mfa') await db.updateTable('user_roles').set({ role_id: (await db.selectFrom('roles').select('id').where('code', '=', 'OWNER').executeTakeFirstOrThrow()).id }).where('user_id', '=', u.id).execute();
    expect(await service.validateSession(result.session)).toBeNull();
  });
  it('background checks never touch idle state; interaction updates at most once/minute', async () => {
    const { result } = await viewerSession(), past = new Date(Date.now() - 120000);
    await db.updateTable('sessions').set({ created_at: past, last_activity_at: past }).execute();
    const before = await db.selectFrom('sessions').selectAll().executeTakeFirstOrThrow();
    await service.validateSession(result.session); const afterBackground = await db.selectFrom('sessions').selectAll().executeTakeFirstOrThrow();
    expect(afterBackground.last_activity_at.getTime()).toBe(before.last_activity_at.getTime());
    await service.validateSession(result.session, 'interaction'); const touched = await db.selectFrom('sessions').selectAll().executeTakeFirstOrThrow();
    expect(touched.last_activity_at > before.last_activity_at).toBe(true);
    await service.validateSession(result.session, 'interaction'); expect((await db.selectFrom('sessions').selectAll().executeTakeFirstOrThrow()).last_activity_at.getTime()).toBe(touched.last_activity_at.getTime());
  });
  it('concurrent fifth/sixth issuance never exceeds five or revokes oldest', async () => {
    const u = await makeUser(db, password);
    for (let i = 0; i < 4; i++) expect((await service.continuePassword(await proof(u.id))).ok).toBe(true);
    const a = await proof(u.id), b = await proof(u.id);
    await db.updateTable('auth_challenges').set({ revoked_at: null }).where('token_hash', '=', tokenHash(a)).execute();
    await db.deleteFrom('auth_rate_limits').execute();
    const results = await Promise.all([service.continuePassword(a), other.continuePassword(b)]);
    expect(results.filter((r) => r.ok && 'session' in r)).toHaveLength(1);
    expect(results.filter((r) => r.state === 'SESSION_LIMIT')).toHaveLength(1);
    const rows = await db.selectFrom('sessions').select(['id', 'revoked_at']).execute(); expect(rows).toHaveLength(5); expect(rows.every((r) => !r.revoked_at)).toBe(true);
  });
  it('concurrent rotation has one winner and invalidates old identifier', async () => {
    const { result } = await viewerSession();
    const rotated = await Promise.all([service.rotateSession(result.session), other.rotateSession(result.session)]);
    expect(rotated.filter(Boolean)).toHaveLength(1); expect(await service.validateSession(result.session)).toBeNull();
    expect(await service.validateSession(rotated.find(Boolean)!.token)).not.toBeNull(); expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(1);
  });
  it('concurrent logout/revocation preserves revocation and audits one mutation', async () => {
    const { result } = await viewerSession();
    await Promise.all([service.logout(result.session), other.revokeSession(result.session, result.id)]);
    expect(await service.validateSession(result.session)).toBeNull();
    expect(await db.selectFrom('audit_logs').select('id').where('action', 'in', ['auth.logout', 'session.revoked']).execute()).toHaveLength(1);
  });
  it('specific revocation cannot target another user', async () => {
    const a = await viewerSession(), b = await viewerSession();
    expect(await service.revokeSession(a.result.session, b.result.id)).toBe(false);
    expect(await service.validateSession(b.result.session)).not.toBeNull();
  });
});
describe('purpose-bound recent authentication and recovery replacement', () => {
  it('requires password, binds action and session, expires and consumes once', async () => {
    const { result } = await viewerSession();
    expect(await service.recentAuthentication(result.session, 'wrong synthetic password', '', 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
    const auth = await service.recentAuthentication(result.session, password, '', 'REVOKE_SESSIONS');
    expect(auth.ok).toBe(true); if (!auth.ok) throw new Error('Expected step up');
    expect(await service.performSensitiveAction(auth.session, auth.proof, 'REGENERATE_RECOVERY')).toEqual(ACCESS_FAILURE);
    expect((await service.performSensitiveAction(auth.session, auth.proof, 'REVOKE_SESSIONS')).ok).toBe(true);
    expect(await service.performSensitiveAction(auth.session, auth.proof, 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
    expect(await service.validateSession(result.session)).toBeNull();
  });
  it('expired step-up and proof bound to rotated session cannot be used', async () => {
    const { result } = await viewerSession();
    const auth = await service.recentAuthentication(result.session, password, '', 'REVOKE_SESSIONS'); if (!auth.ok) throw new Error('Expected step up');
    await db.updateTable('auth_challenges').set({ created_at: new Date(Date.now() - 600000), expires_at: new Date(Date.now() - 300000) }).where('purpose', '=', 'reauthentication').execute();
    expect(await service.performSensitiveAction(auth.session, auth.proof, 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
    await db.deleteFrom('auth_rate_limits').execute();
    const newer = await service.recentAuthentication(auth.session, password, '', 'REVOKE_SESSIONS'); if (!newer.ok) throw new Error('Expected step up');
    const rotation = await service.rotateSession(newer.session); if (!rotation) throw new Error('Expected rotation');
    expect(await service.performSensitiveAction(rotation.token, newer.proof, 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
  });
  it('recovery-assisted replacement revokes access and requires new TOTP before access resumes', async () => {
    const { u, finish } = await enrolled();
    const auth = await service.recentAuthentication(finish.session, password, finish.recoveryCodes[0]!.reveal(), 'REPLACE_FACTOR', true);
    if (!auth.ok) throw new Error('Expected recovery step up');
    const replacement = await service.performSensitiveAction(auth.session, auth.proof, 'REPLACE_FACTOR');
    expect(replacement.ok && 'challenge' in replacement).toBe(true); if (!replacement.ok || !('challenge' in replacement)) throw new Error('Expected replacement');
    expect(await service.validateSession(finish.session)).toBeNull();
    expect((await db.selectFrom('users').select('status').where('id', '=', u.id).executeTakeFirstOrThrow()).status).toBe('pending_mfa');
    expect((await service.continuePassword(replacement.challenge)).state).toBe('MFA_ENROLLMENT_REQUIRED');
    expect((await service.startEnrollment(replacement.challenge)).ok).toBe(true);
    const completed = await service.completeEnrollment(replacement.challenge, await code(u.id)); expect(completed.ok).toBe(true);
    const oldRows = await db.selectFrom('mfa_recovery_codes').select(['used_at', 'revoked_at']).execute();
    expect(oldRows.filter((row) => !row.used_at && !row.revoked_at)).toHaveLength(10);
  });
  it('regenerates recovery set only with purpose-bound MFA step up and invalidates old codes', async () => {
    const { u, finish } = await enrolled();
    await db.updateTable('mfa_methods').set((eb) => ({ last_accepted_step: eb('last_accepted_step', '-', 1) })).where('user_id', '=', u.id).execute();
    const auth = await service.recentAuthentication(finish.session, password, await code(u.id), 'REGENERATE_RECOVERY'); if (!auth.ok) throw new Error('Expected step up');
    const regenerated = await service.performSensitiveAction(auth.session, auth.proof, 'REGENERATE_RECOVERY'); expect(regenerated.ok).toBe(true);
    const raw = await proof(u.id);
    expect(await service.completeMfa(raw, finish.recoveryCodes[0]!.reveal(), true)).toEqual(ACCESS_FAILURE);
    expect(await service.performSensitiveAction(auth.session, auth.proof, 'REGENERATE_RECOVERY')).toEqual(ACCESS_FAILURE);
  });
  it('rejects arbitrary event metadata and audit mutation rolls back if required event fails', async () => {
    const input = { type: 'session.issued' as const, userId: null, outcome: 'success' as const };
    for (const field of ['password', 'token', 'recoveryHash', 'cookie', 'secret', 'csrf', 'error', 'request']) await expect(recordAccessEvent(db, { ...input, [field]: 'synthetic' } as never)).rejects.toThrow('Security operation unavailable');
    const u = await makeUser(db, password), raw = await proof(u.id);
    const { createAccessService: factory } = await import('../../src/server/auth/access');
    const failing = db.withPlugin({ transformQuery(args) { if (JSON.stringify(args.node).includes('audit_logs')) throw new Error('Injected safe audit failure'); return args.node; }, async transformResult(args) { return args.result; } });
    await expect(factory(failing, mfaKey, hmac, NetworkIdentity.fromSocketAddress('::')).continuePassword(raw)).rejects.toThrow('Security operation unavailable');
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect((await service.continuePassword(raw)).ok).toBe(true);
  });
});

describe('failure injection and defensive state revalidation', () => {
  it('rolls back factor activation, recovery set and session if required enrollment audit fails', async () => {
    const u = await makeUser(db, password, 'pending_mfa', 'OWNER'), raw = await proof(u.id);
    await service.startEnrollment(raw); const otp = await code(u.id);
    const broken = db.withPlugin({ transformQuery(args) {
      if (JSON.stringify(args.node).includes('audit_logs')) throw new Error('Injected safe enrollment audit failure'); return args.node;
    }, async transformResult(args) { return args.result; } });
    const failing = createAccessService(broken, mfaKey, hmac, NetworkIdentity.fromSocketAddress('::'));
    await expect(failing.completeEnrollment(raw, otp)).rejects.toThrow('Security operation unavailable');
    expect((await db.selectFrom('mfa_methods').select('state').executeTakeFirstOrThrow()).state).toBe('pending');
    expect((await db.selectFrom('users').select('status').where('id', '=', u.id).executeTakeFirstOrThrow()).status).toBe('pending_mfa');
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('mfa_recovery_codes').select('id').execute()).toHaveLength(0);
    expect((await service.completeEnrollment(raw, otp)).ok).toBe(true);
  });
  it('fails closed on unavailable DB before admission and during session validation', async () => {
    const broken = db.withPlugin({ transformQuery() { throw new Error('Injected safe unavailable database'); }, async transformResult(args) { return args.result; } });
    const failing = createAccessService(broken, mfaKey, hmac, NetworkIdentity.fromSocketAddress('::'));
    const raw = new (await import('../../src/server/security/sensitive')).SensitiveValue(randomBytes(32).toString('base64url'));
    await expect(failing.continuePassword(raw)).rejects.toThrow('Security operation unavailable');
    await expect(failing.validateSession(raw)).rejects.toThrow('Security operation unavailable');
  });
  it('optional MFA becomes mandatory once active; missing/changed factor invalidates privileged access', async () => {
    const { u, finish } = await enrolled('VIEWER');
    expect((await service.continuePassword(await proof(u.id))).state).toBe('MFA_REQUIRED');
    await db.updateTable('mfa_methods').set({ state: 'pending', confirmed_at: null, last_accepted_step: null, created_at: new Date(Date.now() - 1000), enrollment_expires_at: new Date(Date.now() + 60000) }).where('user_id', '=', u.id).execute();
    // An admin-required state must never be treated as an optional factor.
    await db.updateTable('users').set({ status: 'pending_mfa' }).where('id', '=', u.id).execute();
    expect(await service.validateSession(finish.session)).toBeNull();
  });
  it('recovery use at session capacity does not consume a code or silently revoke a session', async () => {
    const { u, finish } = await enrolled();
    for (let i = 0; i < 4; i++) { await db.deleteFrom('auth_rate_limits').execute(); expect((await service.completeMfa(await proof(u.id), finish.recoveryCodes[i]!.reveal(), true)).ok).toBe(true); }
    await db.deleteFrom('auth_rate_limits').execute();
    const result = await service.completeMfa(await proof(u.id), finish.recoveryCodes[4]!.reveal(), true);
    expect(result.state).toBe('SESSION_LIMIT');
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(5);
    expect((await db.selectFrom('mfa_recovery_codes').select('used_at').execute()).filter((r) => r.used_at)).toHaveLength(4);
  });
  it('logout revokes an expired session and does not require live workspace access', async () => {
    const { result } = await viewerSession();
    await db.updateTable('sessions').set({ created_at: new Date(Date.now() - 120000), last_activity_at: new Date(Date.now() - 120000), idle_expires_at: new Date(Date.now() - 60000) }).execute();
    await service.logout(result.session);
    expect((await db.selectFrom('sessions').select('revoked_at').executeTakeFirstOrThrow()).revoked_at !== null).toBe(true);
  });
});
