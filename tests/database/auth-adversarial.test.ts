import { randomBytes, randomUUID } from 'node:crypto';
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
  it('allows two legitimate concurrent passwords without increasing active Argon2 work', async () => {
    const second = await makeUser(db, password);
    const service = await createAuthenticationService(db, key);
    const results = await Promise.all([user.email, second.email].map((email) => service.checkPassword({ email, password, network })));
    expect(results.every((result) => result.ok)).toBe(true);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
  });
  it('recovers legitimate authentication deterministically after attacker capacity releases', async () => {
    const service = await createAuthenticationService(db, key);
    const state = globalThis as typeof globalThis & { bismillahHashCapacity: passwords.HashCapacity };
    let release!: () => void;
    const held = state.bismillahHashCapacity.run(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();
    try {
      const results = await Promise.all([user.email, `${randomUUID()}@example.test`].map((email) => service.checkPassword({ email, password, network })));
      expect(results.every((result) => JSON.stringify(result) === JSON.stringify(AUTHENTICATION_FAILURE))).toBe(true);
    } finally { release(); await held; }
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
