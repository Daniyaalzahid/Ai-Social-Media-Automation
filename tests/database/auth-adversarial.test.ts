import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KyselyPlugin } from 'kysely';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { createAuthenticationService, AUTHENTICATION_FAILURE } from '../../src/server/auth/authentication';
import { consumePasswordChallenge, insertPasswordChallenge, revokePasswordChallenge } from '../../src/server/auth/challenges';
import { NetworkIdentity, pseudonym } from '../../src/server/security/identity';
import * as passwords from '../../src/server/auth/passwords';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { bootstrapOwner } from '../../src/server/auth/bootstrap';
import { passwordAttemptDiagnostic } from '../helpers/password-attempt-diagnostic';

const target = scratchDatabase('bsa_test_clean'), db = target.handle.db;
const key = randomBytes(32), network = NetworkIdentity.fromSocketAddress('127.0.0.1'), context = { key, network };
const password = randomBytes(24).toString('hex');
let user: Awaited<ReturnType<typeof makeUser>>;
beforeEach(async () => { vi.restoreAllMocks(); await resetScratch(target); user = await makeUser(db, password); });
afterAll(() => target.handle.close());
const binding = () => ({ userId: user.id, authVersion: 1, purpose: 'password_verified' as const });

function failQuery(targetTable: string, afterWrite = false): KyselyPlugin {
  const failures = new Set<unknown>();
  return {
    transformQuery({ node, queryId }) {
      const table = node.kind === 'InsertQueryNode' ? node.into?.table.identifier.name : node.kind === 'UpdateQueryNode'
        ? (node.table as { table?: { identifier?: { name?: string } } }).table?.identifier?.name : undefined;
      if (table === targetTable) {
        if (afterWrite) failures.add(queryId); else throw new Error('Synthetic database fault');
      }
      return node;
    },
    async transformResult({ result, queryId }) {
      if (failures.has(queryId)) throw new Error('Synthetic post-write database fault');
      return result;
    },
  };
}

describe('generic failures and expensive-work admission', () => {
  it.each(['account', 'network', 'global'] as const)('returns the generic external result for %s limits before native hashing', async (scope) => {
    const service = await createAuthenticationService(db, key);
    const native = vi.spyOn(passwords, 'verifyPassword'), dummy = vi.spyOn(passwords, 'verifyDummyPassword');
    const hash = scope === 'account' ? pseudonym(key, 'account', user.email) : scope === 'network' ? network.pseudonym(key) : pseudonym(key, 'global', 'password-stage');
    const now = new Date();
    await db.insertInto('auth_rate_limits').values({ scope: `auth_${scope}`, subject_hash: hash, attempts: 120,
      window_started_at: now, blocked_until: new Date(now.getTime() + 30000), expires_at: new Date(now.getTime() + 60000) }).execute();
    for (const email of [user.email, ...(scope !== 'account' ? [`${randomUUID()}@example.test`] : [])]) {
      const result = await service.checkPassword({ email, password, network });
      expect(JSON.stringify(result)).toBe(JSON.stringify(AUTHENTICATION_FAILURE));
      expect(Object.keys(result)).toEqual(['ok', 'message']);
    }
    expect(native.mock.calls.length).toBe(0); expect(dummy.mock.calls.length).toBe(0);
  });
  it('serializes two real password verifications under available host capacity', async () => {
    const second = await makeUser(db, password);
    const service = await createAuthenticationService(db, key);
    const diagnostic = passwordAttemptDiagnostic(db);
    try {
      const results = await Promise.all([user.email, second.email].map((email, index) => diagnostic.run(index === 0 ? 1 : 2, () => service.checkPassword({ email, password, network }))));
      const evidence = JSON.stringify({ ...diagnostic.report(), ...(!results.every((result) => result.ok) ? { resources: diagnostic.resources() } : {}) });
      process.stdout.write(`Two-password evidence: ${evidence}\n`);
      // Real native/MySQL availability check, not a promise of success under host starvation.
      // Unexpected CAPACITY remains a failure with safe evidence, never an accepted alternative.
      expect(results.every((result) => result.ok), evidence).toBe(true);
      expect(diagnostic.report().maximumActive, evidence).toBe(1);
      expect(diagnostic.report().databaseErrors, evidence).toEqual([]);
      expect(diagnostic.report().attempts.every((attempt) => attempt.classification === 'PASSWORD_VERIFIED' && attempt.admitted && attempt.rateAdmitted && attempt.nativeMs !== null), evidence).toBe(true);
      expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    } finally { diagnostic.close(); }
  });
  it('rejects known and unknown accounts generically before native work when the FIFO queue is full', async () => {
    const service = await createAuthenticationService(db, key);
    const state = globalThis as typeof globalThis & { bismillahHashCapacity: passwords.HashCapacity };
    // Freeze only admission timers/performance, not Date or MySQL's real clock.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const native = vi.spyOn(argon2, 'verify'), diagnostic = passwordAttemptDiagnostic(db);
    const gate = Promise.withResolvers<void>(), started = Promise.withResolvers<void>();
    const held = state.bismillahHashCapacity.run(async () => { started.resolve(); await gate.promise; });
    await started.promise;
    const waiting = [1, 2].map(() => state.bismillahHashCapacity.run(async () => undefined));
    // Observe all outcomes immediately, including any unexpected timer rejection.
    const settled = Promise.allSettled([held, ...waiting]);
    try {
      const results = await Promise.all([user.email, `${randomUUID()}@example.test`].map((email, index) => diagnostic.run(index === 0 ? 1 : 2, () => service.checkPassword({ email, password, network }))));
      expect(results.every((result) => JSON.stringify(result) === JSON.stringify(AUTHENTICATION_FAILURE))).toBe(true);
      const evidence = diagnostic.report();
      expect(evidence.attempts.every((attempt) => attempt.classification === 'CAPACITY' && !attempt.admitted && attempt.nativeMs === null && attempt.rateAdmitted)).toBe(true);
      expect(evidence.maximumActive).toBe(1); expect(evidence.databaseErrors).toEqual([]); expect(native.mock.calls.length).toBe(0);
      expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0);
    } finally { gate.resolve(); const outcomes = await settled; diagnostic.close(); native.mockRestore(); vi.useRealTimers(); expect(outcomes.every((result) => result.status === 'fulfilled')).toBe(true); }
    expect((await service.checkPassword({ email: user.email, password, network })).ok).toBe(true);
  });
});
describe('challenge adversarial state changes', () => {
  it('rejects disablement after issuance and token-bearing revocation cannot create access', async () => {
    const proof = await db.transaction().execute((transaction) => insertPasswordChallenge(transaction, user.id, 1));
    await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', user.id).execute();
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
    expect(await revokePasswordChallenge(db, proof.token, binding(), context)).toBe(true);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
  });
  it('rejects password/auth-version replacement and database purpose tampering', async () => {
    const proof = await db.transaction().execute((transaction) => insertPasswordChallenge(transaction, user.id, 1));
    await db.updateTable('users').set({ password_hash: (await passwords.hashPassword(randomBytes(24).toString('hex'))).reveal(), auth_version: 2 }).where('id', '=', user.id).execute();
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
    expect(await consumePasswordChallenge(db, proof.token, { ...binding(), authVersion: 2 }, context)).toBe(false);
    await db.updateTable('users').set({ auth_version: 1 }).where('id', '=', user.id).execute();
    await db.updateTable('auth_challenges').set({ purpose: 'login_mfa' }).where('id', '=', proof.id).execute();
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(false);
  });
});
describe('database failure injection', () => {
  it('fails authentication and bootstrap safely when a connection is unavailable', async () => {
    const unavailable = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
    // Initialize the lazy driver before closing: closing an unused driver is not
    // evidence of a failed connection and can legitimately leave it uninitialized.
    await unavailable.db.selectFrom('users').select('id').limit(1).execute();
    await unavailable.close();
    const service = await createAuthenticationService(unavailable.db, key);
    expect(await service.checkPassword({ email: user.email, password, network })).toEqual(AUTHENTICATION_FAILURE);
    await expect(bootstrapOwner(unavailable.db, { email: 'owner@example.test', displayName: 'Synthetic', password }, resolveDatabaseConfiguration(target.source, 'bootstrap'))).rejects.toThrow('Security operation unavailable');
  });
  it.each(['auth_rate_limits', 'auth_challenges', 'security_events'])('fails closed when %s writes fail', async (table) => {
    const service = await createAuthenticationService(db.withPlugin(failQuery(table)), key);
    expect(await service.checkPassword({ email: user.email, password, network })).toEqual(AUTHENTICATION_FAILURE);
    expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
  });
  it.each(['auth_challenges', 'audit_logs', 'security_events'])('rolls back challenge consumption when %s fails after its write', async (table) => {
    const proof = await db.transaction().execute((transaction) => insertPasswordChallenge(transaction, user.id, 1));
    await expect(consumePasswordChallenge(db.withPlugin(failQuery(table, true)), proof.token, binding(), context)).rejects.toThrow('Security operation unavailable');
    expect((await db.selectFrom('auth_challenges').select('consumed_at').executeTakeFirstOrThrow()).consumed_at).toBeNull();
    expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(0);
    expect(await consumePasswordChallenge(db, proof.token, binding(), context)).toBe(true);
  });
});
