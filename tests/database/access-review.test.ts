import { randomBytes } from 'node:crypto';
import { type Kysely } from 'kysely';
import { generate } from 'otplib';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { createAccessService, ACCESS_FAILURE, tokenHash, sessionPolicy } from '../../src/server/auth/access';
import { insertPasswordChallenge } from '../../src/server/auth/challenges';
import { decryptMfa } from '../../src/server/auth/mfa-crypto';
import { NetworkIdentity } from '../../src/server/security/identity';
import { SensitiveValue } from '../../src/server/security/sensitive';

const target = scratchDatabase('bsa_test_recovery'), handle = target.handle;
const second = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
const base = 1800000000000; let time = base;
const key = { key: randomBytes(32), id: 'adversarial-v1' }, hmac = randomBytes(32);
const phrase = 'public synthetic adversarial phrase';
function clocked(connection: Kysely<DatabaseSchema>) {
  const queries = new Set<unknown>();
  return connection.withPlugin({ transformQuery(args) {
    if (args.node.kind === 'RawNode' && JSON.stringify(args.node).includes('SELECT CURRENT_TIMESTAMP(3) AS now')) queries.add(args.queryId);
    return args.node;
  }, async transformResult(args) {
    return queries.has(args.queryId) ? { ...args.result, rows: [{ now: new Date(time) }] } : args.result;
  } });
}
const db = clocked(handle.db), otherDb = clocked(second.db);
const service = (connection = db) => createAccessService(connection, key, hmac, NetworkIdentity.fromSocketAddress('::'));
beforeAll(() => resetScratch(target));
beforeEach(async () => {
  time = base;
  for (const table of ['audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions', 'user_roles', 'users', 'auth_rate_limits'] as const) await db.deleteFrom(table).execute();
});
afterAll(async () => { await second.close(); await handle.close(); });
async function proof(userId: string) {
  return db.transaction().execute(async (tx) => {
    const user = await tx.selectFrom('users').select('auth_version').where('id', '=', userId).forUpdate().executeTakeFirstOrThrow();
    return (await insertPasswordChallenge(tx, userId, user.auth_version)).token;
  });
}
async function login(role = 'VIEWER') {
  const user = await makeUser(db, phrase, 'active', role), raw = await proof(user.id);
  const result = await service().continuePassword(raw);
  if (!result.ok || !('session' in result)) throw new Error('Synthetic session fixture failed');
  return { user, raw, result };
}
async function enrolled(role = 'OWNER') {
  const user = await makeUser(db, phrase, 'pending_mfa', role), raw = await proof(user.id);
  await service().startEnrollment(raw);
  const factor = await db.selectFrom('mfa_methods').selectAll().where('user_id', '=', user.id).executeTakeFirstOrThrow();
  const secret = decryptMfa(factor, key);
  const code = await generate({ secret: secret.reveal(), epoch: time / 1000 });
  const result = await service().completeEnrollment(raw, code);
  if (!result.ok || !('recoveryCodes' in result)) throw new Error('Synthetic factor fixture failed');
  return { user, raw, secret, result };
}
async function independentProofs(userId: string, count: number) {
  const proofs = [];
  for (let i = 0; i < count; i++) proofs.push(await proof(userId));
  // Explicit synthetic eligible proofs isolate downstream one-use/count invariants
  // from the independent Phase 2B supersession guard (which remains unchanged).
  await db.updateTable('auth_challenges').set({ revoked_at: null }).where('user_id', '=', userId).where('consumed_at', 'is', null).execute();
  return proofs;
}
function gateAfterHint() {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>((resolve) => { enter = resolve; });
  const proceed = new Promise<void>((resolve) => { release = resolve; });
  const hints = new Set<unknown>(); let paused = false;
  const connection = db.withPlugin({ transformQuery(args) {
    if (!paused && args.node.kind === 'SelectQueryNode' && args.node.selections && args.node.selections.length <= 2 && JSON.stringify(args.node.selections).includes('user_id') && JSON.stringify(args.node.from).includes('sessions')) hints.add(args.queryId);
    return args.node;
  }, async transformResult(args) {
    if (!paused && hints.has(args.queryId)) { paused = true; enter(); await proceed; }
    return args.result;
  } });
  return { connection, entered, release };
}

describe('demonstrated logout boundary regressions', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index))('logout observing a token revokes its rotated successor, trial %i', async () => {
    const { result } = await login(), gate = gateAfterHint();
    const pending = service(gate.connection).logout(result.session);
    try {
      await gate.entered;
      const rotated = await service(otherDb).rotateSession(result.session);
      if (!rotated) throw new Error('Synthetic rotation failed');
      gate.release(); await pending;
      expect((await service().validateSession(rotated.token)) === null).toBe(true);
      const rows = await db.selectFrom('sessions').select('revoked_at').execute();
      expect(rows.every((row) => row.revoked_at !== null)).toBe(true);
    } finally { gate.release(); await pending; }
  });
  it('malformed-session logout is a safe no-op', async () => {
    let threw = false; try { await service().logout(new SensitiveValue('malformed')); } catch { threw = true; }
    expect(threw).toBe(false);
  });
});

describe('exact session and recent-auth timestamp boundaries', () => {
  it.each(['OWNER', 'MARKETING_ADMIN', 'CONTENT_CREATOR', 'REVIEWER', 'VIEWER'])('enforces %s idle/absolute expiry at -1, 0 and +1 ms', async (role) => {
    const setup = ['OWNER', 'MARKETING_ADMIN'].includes(role) ? await enrolled(role) : await login(role);
    const policy = sessionPolicy(role), raw = setup.result.session;
    time = base + policy.idle - 1; expect((await service().validateSession(raw)) !== null).toBe(true);
    time++; expect(await service().validateSession(raw)).toBeNull();
    time++; expect(await service().validateSession(raw, 'interaction')).toBeNull();
    // Keep idle valid to isolate the absolute boundary.
    time = base + policy.absolute - 1;
    await db.updateTable('sessions').set({ last_activity_at: new Date(time - 1), idle_expires_at: new Date(base + policy.absolute) }).where('user_id', '=', setup.user.id).execute();
    expect((await service().validateSession(raw)) !== null).toBe(true);
    time++; expect(await service().validateSession(raw)).toBeNull(); time++; expect(await service().validateSession(raw, 'interaction')).toBeNull();
  });
  it.each(Array.from({length: 20}, (_, index) => index))('touch throttle is exact and activity cannot extend absolute deadline, trial %i', async () => {
    const { result } = await login();
    time += 59999; expect((await service().validateSession(result.session, 'interaction')) !== null).toBe(true);
    expect((await db.selectFrom('sessions').select('last_activity_at').where('id', '=', result.id).executeTakeFirstOrThrow()).last_activity_at.getTime()).toBe(base);
    time++; expect((await service().validateSession(result.session, 'interaction')) !== null).toBe(true);
    expect((await db.selectFrom('sessions').select('last_activity_at').where('id', '=', result.id).executeTakeFirstOrThrow()).last_activity_at.getTime()).toBe(time);
    const absolute = base + sessionPolicy('VIEWER').absolute; time = absolute - 1000;
    await db.updateTable('sessions').set({ last_activity_at: new Date(time - 120000), idle_expires_at: new Date(absolute) }).where('id', '=', result.id).execute();
    const touched = await service().validateSession(result.session, 'interaction');
    expect(touched?.expiresAt.getTime()).toBe(absolute);
    time = absolute; expect(await service().validateSession(result.session, 'interaction')).toBeNull();
  });
  it('reported cookie deadline respects a newly stricter role before the touch throttle', async () => {
    const setup = await enrolled('VIEWER');
    const owner = await db.selectFrom('roles').select('id').where('code', '=', 'OWNER').executeTakeFirstOrThrow();
    await db.updateTable('user_roles').set({ role_id: owner.id }).where('user_id', '=', setup.user.id).execute();
    time += 1;
    const validated = await service().validateSession(setup.result.session, 'interaction');
    expect(validated !== null).toBe(true);
    expect(validated!.expiresAt.getTime()).toBe(base + sessionPolicy('OWNER').idle);
    const rotated = await service().rotateSession(setup.result.session);
    expect(rotated?.expiresAt.getTime()).toBe(base + sessionPolicy('OWNER').idle);
  });
  it.each([-1, 0, 1])('recent-auth five-minute cutoff %+i ms', async (delta) => {
    const { result } = await login();
    const recent = await service().recentAuthentication(result.session, phrase, '', 'REVOKE_SESSIONS');
    if (!recent.ok) throw new Error('Synthetic recent auth failed');
    time += 300000 + delta;
    const outcome = await service().performSensitiveAction(recent.session, recent.proof, 'REVOKE_SESSIONS');
    expect(outcome.ok).toBe(delta < 0);
  });
});

describe('state machine and credential-binding attacks', () => {
  it.each(['OWNER', 'MARKETING_ADMIN'])('%s never receives password-only access even with active status and absent factor', async (role) => {
    const user = await makeUser(db, phrase, 'active', role), raw = await proof(user.id);
    expect((await service().continuePassword(raw)).state).toBe('MFA_ENROLLMENT_REQUIRED');
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
  });
  it.each(['role', 'pending', 'disabled', 'version', 'invited'] as const)('revalidates password proof after %s change', async (change) => {
    const user = await makeUser(db, phrase), raw = await proof(user.id);
    if (change === 'role') {
      const owner = await db.selectFrom('roles').select('id').where('code', '=', 'OWNER').executeTakeFirstOrThrow();
      await db.updateTable('user_roles').set({ role_id: owner.id }).where('user_id', '=', user.id).execute();
    } else if (change === 'version') await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', user.id).execute();
    else await db.updateTable('users').set({ status: change === 'pending' ? 'pending_mfa' : change }).where('id', '=', user.id).execute();
    const result = await service().continuePassword(raw);
    expect(result.ok && 'session' in result).toBe(false);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
  });
  it.each(['disabled', 'version', 'other-user', 'used'])('rejects recovery after %s', async (change) => {
    const source = await enrolled(), raw = await proof(source.user.id);
    if (change === 'disabled') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', source.user.id).execute();
    if (change === 'version') await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', source.user.id).execute();
    let targetProof = raw;
    if (change === 'other-user') { const destination = await enrolled('MARKETING_ADMIN'); targetProof = await proof(destination.user.id); }
    if (change === 'used') {
      expect((await service().completeMfa(raw, source.result.recoveryCodes[0]!.reveal(), true)).ok).toBe(true);
      targetProof = await proof(source.user.id);
    }
    expect((await service().completeMfa(targetProof, source.result.recoveryCodes[0]!.reveal(), true)).ok).toBe(false);
  });
  it.each(['other-session', 'version', 'disabled', 'wrong-purpose'])('rejects recent-auth proof after %s', async (change) => {
    const { user, result } = await login();
    const recent = await service().recentAuthentication(result.session, phrase, '', 'REVOKE_SESSIONS'); if (!recent.ok) throw new Error('Synthetic step-up failed');
    let raw = recent.session;
    if (change === 'other-session') { const next = await service().continuePassword(await proof(user.id)); if (!next.ok || !('session' in next)) throw new Error('Synthetic alternate session failed'); raw = next.session; }
    if (change === 'version') await db.updateTable('users').set({ auth_version: 2 }).where('id', '=', user.id).execute();
    if (change === 'disabled') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', user.id).execute();
    expect(await service().performSensitiveAction(raw, recent.proof, change === 'wrong-purpose' ? 'REGENERATE_RECOVERY' : 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
  });
  it('privileged step-up cannot omit or replay MFA', async () => {
    const { result } = await enrolled();
    expect(await service().recentAuthentication(result.session, phrase, '', 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
    expect(await service().recentAuthentication(result.session, phrase, '', 'REPLACE_FACTOR', true)).toEqual(ACCESS_FAILURE);
  });
});

describe('real MySQL independent-pool adversarial races', () => {
  it('eight competing issuers at four sessions create exactly one row and retain rejected proofs', async () => {
    const { user } = await login();
    for (let i = 0; i < 3; i++) await service().continuePassword(await proof(user.id));
    const proofs = await independentProofs(user.id, 8);
    await db.deleteFrom('auth_rate_limits').execute();
    const outcomes = await Promise.all(proofs.map((raw, i) => service(i % 2 ? otherDb : db).continuePassword(raw)));
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    const rows = await db.selectFrom('sessions').select(['revoked_at', 'token_hash']).execute();
    expect(rows).toHaveLength(5); expect(rows.every((row) => !row.revoked_at)).toBe(true);
    const states = await db.selectFrom('auth_challenges').select('consumed_at').where('token_hash', 'in', proofs.map(tokenHash)).execute();
    expect(states.filter((row) => row.consumed_at)).toHaveLength(1);
  });
  it('expired/revoked sessions release capacity; no live session is evicted', async () => {
    const { user, result } = await login();
    for (let i = 0; i < 4; i++) await service().continuePassword(await proof(user.id));
    await db.updateTable('sessions').set({ revoked_at: new Date(time), revocation_reason: 'synthetic' }).where('id', '=', result.id).execute();
    await db.deleteFrom('auth_rate_limits').execute();
    expect((await service().continuePassword(await proof(user.id))).ok).toBe(true);
    time += sessionPolicy('VIEWER').idle;
    expect((await service().continuePassword(await proof(user.id))).ok).toBe(true);
    expect(await db.selectFrom('sessions').select('id').where('revoked_at', 'is', null).where('idle_expires_at', '>', new Date(time)).execute()).toHaveLength(1);
  });
  it('same recovery code across independently eligible proofs has exactly one winner', async () => {
    const { user, result } = await enrolled();
    const proofs = await independentProofs(user.id, 2);
    const results = await Promise.all(proofs.map((raw, i) => service(i ? otherDb : db).completeMfa(raw, result.recoveryCodes[0]!.reveal(), true)));
    expect(results.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect((await db.selectFrom('mfa_recovery_codes').select('used_at').execute()).filter((row) => row.used_at)).toHaveLength(1);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(2);
  });
  it('same TOTP at boundary has one winner; previous/current order remains monotonic', async () => {
    const { user, secret } = await enrolled();
    time += 30002;
    const previous = await generate({ secret: secret.reveal(), epoch: (time - 30000) / 1000 });
    const current = await generate({ secret: secret.reveal(), epoch: time / 1000 });
    const future = await generate({ secret: secret.reveal(), epoch: (time + 30000) / 1000 });
    let raw = await proof(user.id);
    const before = await db.selectFrom('mfa_methods').select('last_accepted_step').executeTakeFirstOrThrow();
    expect((await service().completeMfa(raw, previous)).ok).toBe(false);
    expect((await service().completeMfa(raw, future)).ok).toBe(false);
    expect((await db.selectFrom('mfa_methods').select('last_accepted_step').executeTakeFirstOrThrow()).last_accepted_step).toBe(before.last_accepted_step);
    const proofs = await independentProofs(user.id, 2);
    const results = await Promise.all(proofs.map((p, i) => service(i ? otherDb : db).completeMfa(p, current)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    await db.deleteFrom('auth_rate_limits').execute(); raw = await proof(user.id);
    expect((await service().completeMfa(raw, current)).ok).toBe(false);
    expect((await service().completeMfa(raw, previous)).ok).toBe(false);
  });
  it('accepts previously unused adjacent step, then current step once, with monotonic replay state', async () => {
    const { user, secret } = await enrolled();
    time += 60002;
    const previous = await generate({ secret: secret.reveal(), epoch: (time - 30000) / 1000 });
    const current = await generate({ secret: secret.reveal(), epoch: time / 1000 });
    const priorProof = await proof(user.id);
    expect((await service().completeMfa(priorProof, previous)).ok).toBe(true);
    const currentProof = await proof(user.id);
    expect((await service().completeMfa(currentProof, current)).ok).toBe(true);
    const replayProof = await proof(user.id);
    expect((await service().completeMfa(replayProof, previous)).ok).toBe(false);
    expect((await service().completeMfa(replayProof, current)).ok).toBe(false);
    expect((await db.selectFrom('mfa_methods').select('last_accepted_step').executeTakeFirstOrThrow()).last_accepted_step).toBe(Math.floor(time / 30000));
  });
  it('concurrent factor replacement consumes one proof and leaves no privileged access after interruption', async () => {
    const { user, result } = await enrolled();
    const recent = await service().recentAuthentication(result.session, phrase, result.recoveryCodes[0]!.reveal(), 'REPLACE_FACTOR', true);
    if (!recent.ok) throw new Error('Synthetic step-up failed');
    const results = await Promise.all([service().performSensitiveAction(recent.session, recent.proof, 'REPLACE_FACTOR'), service(otherDb).performSensitiveAction(recent.session, recent.proof, 'REPLACE_FACTOR')]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await db.selectFrom('users').select('status').where('id', '=', user.id).executeTakeFirstOrThrow()).status).toBe('pending_mfa');
    expect((await db.selectFrom('sessions').select('revoked_at').execute()).every((row) => row.revoked_at)).toBe(true);
    expect((await db.selectFrom('mfa_methods').select('state').executeTakeFirstOrThrow()).state).toBe('pending');
  });
  it('concurrent one-use revoke-all proof has one winner and serializes with issuance', async () => {
    const { user, result } = await login();
    const recent = await service().recentAuthentication(result.session, phrase, '', 'REVOKE_SESSIONS'); if (!recent.ok) throw new Error('Synthetic step-up failed');
    const raw = await proof(user.id);
    const results = await Promise.all([service().performSensitiveAction(recent.session, recent.proof, 'REVOKE_SESSIONS'), service(otherDb).performSensitiveAction(recent.session, recent.proof, 'REVOKE_SESSIONS'), service(otherDb).continuePassword(raw)]);
    expect(results.slice(0, 2).filter((r) => r.ok)).toHaveLength(1);
    const rows = await db.selectFrom('sessions').select(['id', 'created_at', 'revoked_at']).execute();
    expect(rows.filter((row) => !row.revoked_at).length).toBeLessThanOrEqual(1);
    expect(rows.find((row) => row.id === result.id)?.revoked_at !== null).toBe(true);
  });
});
