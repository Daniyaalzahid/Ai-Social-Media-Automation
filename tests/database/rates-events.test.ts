import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import type { KyselyPlugin } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { admitAuthentication, cleanupExpiredRateLimits, RATE_POLICY } from '../../src/server/security/rate-limits';
import { appendAudit, appendSecurityEvent } from '../../src/server/security/events';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { NetworkIdentity, normalizeEmail, pseudonym } from '../../src/server/security/identity';

const target = scratchDatabase('bsa_test_clean'), db = target.handle.db;
beforeAll(() => resetScratch(target));
beforeEach(async () => { await db.deleteFrom('auth_rate_limits').execute(); });
afterAll(() => target.handle.close());
const rate = () => ({ scope: 'auth_account' as const, hash: randomBytes(32) });

describe('shared atomic rate controls', () => {
  it('admits five attempts, backs off, and blocked retries cannot extend the deadline', async () => {
    const key = rate();
    for (let i = 0; i < 5; i++) expect(await admitAuthentication(db, [key])).toBe(true);
    const original = await db.selectFrom('auth_rate_limits').selectAll().executeTakeFirstOrThrow();
    for (let i = 0; i < 4; i++) expect(await admitAuthentication(db, [key])).toBe(false);
    const final = await db.selectFrom('auth_rate_limits').selectAll().executeTakeFirstOrThrow();
    expect(final.blocked_until).toEqual(original.blocked_until);
    expect(final.attempts).toBe(5);
    await db.updateTable('auth_rate_limits').set({ blocked_until: new Date(Date.now() - 1000) }).execute();
    expect(await admitAuthentication(db, [key])).toBe(true);
    const backoff = await db.selectFrom('auth_rate_limits').selectAll().executeTakeFirstOrThrow();
    expect(backoff.blocked_until!.getTime() - Date.now()).toBeGreaterThan(55000);
  });
  it('resets after fixed expiry and never creates a permanent lock', async () => {
    const key = rate();
    for (let i = 0; i < 5; i++) await admitAuthentication(db, [key]);
    await sql`UPDATE auth_rate_limits SET window_started_at=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 20 MINUTE), expires_at=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 1 MINUTE), blocked_until=NULL`.execute(db);
    expect(await admitAuthentication(db, [key])).toBe(true);
    expect((await db.selectFrom('auth_rate_limits').selectAll().executeTakeFirstOrThrow()).attempts).toBe(1);
  });
  it('admits exactly five concurrent attempts across independent pools/transactions', async () => {
    const key = rate();
    const results = await Promise.all(Array.from({ length: 16 }, () => admitAuthentication(db, [key])));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect((await db.selectFrom('auth_rate_limits').selectAll().executeTakeFirstOrThrow()).attempts).toBe(5);
  });
  it('enforces network and challenge scopes independently of account existence', async () => {
    const network = { scope: 'auth_network' as const, hash: randomBytes(32) };
    await admitAuthentication(db, [network]);
    await db.updateTable('auth_rate_limits').set({ attempts: RATE_POLICY.auth_network.limit, blocked_until: new Date(Date.now() + 30000) }).execute();
    expect(await admitAuthentication(db, [rate(), network])).toBe(false);
    const challenge = { scope: 'auth_challenge' as const, hash: randomBytes(32) };
    for (let i = 0; i < 5; i++) expect(await admitAuthentication(db, [challenge])).toBe(true);
    expect(await admitAuthentication(db, [challenge])).toBe(false);
  });
  it('bounds cleanup at 100 expired rows and leaves live rows intact', async () => {
    const now = new Date();
    await admitAuthentication(db, [rate()]);
    await db.insertInto('auth_rate_limits').values(Array.from({ length: 105 }, () => ({ scope: 'auth_account', subject_hash: randomBytes(32),
      window_started_at: new Date(now.getTime() - 120000), expires_at: new Date(now.getTime() - 60000), blocked_until: null }))).execute();
    expect(await cleanupExpiredRateLimits(db)).toBe(100);
    expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(6);
  });
  it('cleanup does not wait for an unrelated uncommitted live global gate', async () => {
    const second = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
    const now = new Date();
    await db.insertInto('auth_rate_limits').values(Array.from({ length: 105 }, () => ({ scope: 'auth_account', subject_hash: randomBytes(32),
      window_started_at: new Date(now.getTime() - 120000), expires_at: new Date(now.getTime() - 60000), blocked_until: null }))).execute();
    let inserted!: () => void, release!: () => void;
    const ready = new Promise<void>((resolve) => { inserted = resolve; });
    const held = second.db.transaction().execute(async (transaction) => {
      await transaction.insertInto('auth_rate_limits').values({ scope: 'auth_global', subject_hash: randomBytes(32), window_started_at: now, expires_at: new Date(now.getTime() + 60000), blocked_until: null }).execute();
      inserted(); await new Promise<void>((resolve) => { release = resolve; });
    });
    await ready;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([cleanupExpiredRateLimits(db), new Promise<'blocked'>((resolve) => { timer = setTimeout(() => resolve('blocked'), 1500); })]);
      expect(result).toBe(100);
    } finally { if (timer) clearTimeout(timer); release(); await held; await second.close(); }
  });
  it('rechecks expiry if a cleanup candidate is renewed before its point delete', async () => {
    const subject = randomBytes(32), now = new Date();
    await db.insertInto('auth_rate_limits').values({ scope: 'auth_account', subject_hash: subject, window_started_at: new Date(now.getTime() - 120000), expires_at: new Date(now.getTime() - 60000), blocked_until: null }).execute();
    const candidates = new Set<unknown>(); let renewed = false;
    const plugin: KyselyPlugin = {
      transformQuery({ node, queryId }) { if (node.kind === 'SelectQueryNode' && node.limit) candidates.add(queryId); return node; },
      async transformResult({ result, queryId }) {
        if (candidates.has(queryId)) {
          await db.updateTable('auth_rate_limits').set({ expires_at: new Date(Date.now() + 60000) }).where('scope', '=', 'auth_account').where('subject_hash', '=', subject).execute();
          renewed = true;
        }
        return result;
      },
    };
    expect(await cleanupExpiredRateLimits(db.withPlugin(plugin))).toBe(0);
    expect(renewed).toBe(true);
    expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(1);
  });
  it('avoids the expiry-index/primary-key lock inversion during concurrent renewal', async () => {
    const second = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
    const subject = randomBytes(32), now = new Date();
    await db.insertInto('auth_rate_limits').values({ scope: 'auth_global', subject_hash: subject,
      window_started_at: new Date(now.getTime() - 120000), expires_at: new Date(now.getTime() - 60000), blocked_until: null }).execute();
    let locked!: () => void, resume!: () => void, mutation!: () => void;
    const ready = new Promise<void>((resolve) => { locked = resolve; });
    const mutationReady = new Promise<void>((resolve) => { mutation = resolve; });
    const actor = second.db.transaction().execute(async (transaction) => {
      await transaction.selectFrom('auth_rate_limits').select('scope').where('scope', '=', 'auth_global').where('subject_hash', '=', subject).forUpdate().execute();
      locked(); await new Promise<void>((resolve) => { resume = resolve; });
      await transaction.updateTable('auth_rate_limits').set({ expires_at: new Date(Date.now() + 60000) }).where('scope', '=', 'auth_global').where('subject_hash', '=', subject).execute();
    }).then(() => true, () => false);
    await ready;
    const plugin: KyselyPlugin = {
      transformQuery({ node }) {
        if (node.kind === 'DeleteQueryNode' || (node.kind === 'RawNode' && node.sqlFragments.some((fragment) => fragment.toLowerCase().includes('delete from auth_rate_limits')))) mutation();
        return node;
      },
      async transformResult({ result }) { return result; },
    };
    const cleaning = cleanupExpiredRateLimits(db.withPlugin(plugin)).then((count) => count, () => -1);
    try {
      await mutationReady; await new Promise((resolve) => setTimeout(resolve, 50)); resume();
      expect(await actor).toBe(true);
      expect(await cleaning).toBe(0);
      expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(1);
    } finally { resume(); await actor; await cleaning; await second.close(); }
  });
  it('uses one account key for case/outer-space variants and consistent network pseudonyms', async () => {
    const secret = randomBytes(32);
    for (const email of ['USER@example.test', 'user@EXAMPLE.test', ' user@example.test ', 'USER@EXAMPLE.TEST', 'user@example.test']) {
      expect(await admitAuthentication(db, [{ scope: 'auth_account', hash: pseudonym(secret, 'account', normalizeEmail(email)) }])).toBe(true);
    }
    expect(await admitAuthentication(db, [{ scope: 'auth_account', hash: pseudonym(secret, 'account', normalizeEmail(' User@example.test ')) }])).toBe(false);
    expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(1);
    expect(NetworkIdentity.fromSocketAddress('2001:db8::1').pseudonym(secret).equals(NetworkIdentity.fromSocketAddress('2001:0db8:0:0:0:0:0:1').pseudonym(secret))).toBe(true);
  });
  it('caps aggregate concurrency across separate pools and avoids rows for blocked rotating identities', async () => {
    const second = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
    const global = { scope: 'auth_global' as const, hash: randomBytes(32) };
    try {
      const results: boolean[] = [];
      for (let batch = 0; batch < 8; batch++) results.push(...await Promise.all(Array.from({ length: 16 }, (_, index) => admitAuthentication(index % 2 ? db : second.db, [global, rate()]))));
      expect(results.filter(Boolean)).toHaveLength(RATE_POLICY.auth_global.limit);
      const before = await db.selectFrom('auth_rate_limits').select('scope').execute();
      const state = await db.selectFrom('auth_rate_limits').select(['scope', 'attempts']).execute();
      expect(state.filter((row) => row.scope === 'auth_global').map((row) => row.attempts)).toEqual([120]);
      expect(state.filter((row) => row.scope === 'auth_account')).toHaveLength(120);
      expect(state.filter((row) => row.scope === 'auth_account').every((row) => row.attempts === 1)).toBe(true);
      expect(state).toHaveLength(121);
      for (let index = 0; index < 20; index++) expect(await admitAuthentication(db, [global, rate(), { scope: 'auth_network', hash: randomBytes(32) }])).toBe(false);
      expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(before.length);
    } finally { await second.close(); }
  });
  it('blocks new account rows behind network limits and performs bounded admission cleanup', async () => {
    const network = { scope: 'auth_network' as const, hash: randomBytes(32) };
    for (let index = 0; index < 60; index++) expect(await admitAuthentication(db, [network])).toBe(true);
    for (let index = 0; index < 10; index++) expect(await admitAuthentication(db, [network, rate()])).toBe(false);
    expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(1);
    const now = new Date();
    await db.insertInto('auth_rate_limits').values(Array.from({ length: 105 }, () => ({ scope: 'auth_account', subject_hash: randomBytes(32),
      window_started_at: new Date(now.getTime() - 120000), expires_at: new Date(now.getTime() - 60000), blocked_until: null }))).execute();
    expect(await admitAuthentication(db, [network, rate()])).toBe(false);
    expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(6);
    expect(await admitAuthentication(db, [network, rate()])).toBe(false);
    expect(await db.selectFrom('auth_rate_limits').select('scope').execute()).toHaveLength(1);
  });
});
describe('strict append-only event services', () => {
  it('accepts only catalogued types, outcomes and metadata; rejects secret-bearing dumps', async () => {
    const input = { type: 'auth.failure' as const, outcome: 'failure' as const, userId: null, correlationId: randomUUID(), ipHash: null, metadata: { reasonCode: 'INVALID_CREDENTIALS' as const } };
    await appendSecurityEvent(db, input);
    for (const secretField of ['password', 'passwordHash', 'token', 'challengeHash', 'authorization', 'mfaSecret']) {
      await expect(appendSecurityEvent(db, { ...input, metadata: { ...input.metadata, [secretField]: 'synthetic' } } as never)).rejects.toThrow('Security operation unavailable');
    }
    await expect(appendSecurityEvent(db, { ...input, type: 'auth.password_verified' } as never)).rejects.toThrow();
    await expect(appendSecurityEvent(db, { ...input, headers: {} } as never)).rejects.toThrow();
  });
  it('commits attributable mutation and audit together, or rolls both back', async () => {
    const user = await makeUser(db, randomBytes(24).toString('hex'));
    const before = await db.selectFrom('audit_logs').select('id').execute();
    await expect(db.transaction().execute(async (transaction) => {
      await transaction.updateTable('users').set({ display_name: 'mutation must roll back' }).where('id', '=', user.id).execute();
      await appendAudit(transaction, { action: 'owner.bootstrap', actorUserId: user.id, targetUserId: user.id, correlationId: randomUUID(), metadata: { reasonCode: 'BOOTSTRAP_CREATED', password: 'synthetic' } } as never);
    })).rejects.toThrow();
    expect((await db.selectFrom('users').select('display_name').where('id', '=', user.id).executeTakeFirstOrThrow()).display_name).toBe('Synthetic security test');
    expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(before.length);
    await db.transaction().execute(async (transaction) => {
      await transaction.updateTable('users').set({ display_name: 'committed test mutation' }).where('id', '=', user.id).execute();
      await appendAudit(transaction, { action: 'password.hash_replaced', actorUserId: user.id, targetUserId: user.id, correlationId: randomUUID(), metadata: { reasonCode: 'HASH_REPLACED' } });
    });
    expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(before.length + 1);
  });
  it('rejects prohibited fields, free-form strings, request objects and errors in both services', async () => {
    const user = await makeUser(db, randomBytes(24).toString('hex'));
    const security = { type: 'auth.failure' as const, outcome: 'failure' as const, userId: null, correlationId: randomUUID(), ipHash: null, metadata: { reasonCode: 'INVALID_CREDENTIALS' as const } };
    const audit = { action: 'owner.bootstrap' as const, actorUserId: user.id, targetUserId: user.id, correlationId: randomUUID(), metadata: { reasonCode: 'BOOTSTRAP_CREATED' as const } };
    for (const field of ['password', 'passwordHash', 'rawChallengeToken', 'challengeHash', 'authorization', 'cookie', 'mfaSecret', 'resetToken', 'request', 'error']) {
      const value = field === 'request' ? { headers: {}, body: {} } : field === 'error' ? new Error('Synthetic error') : randomBytes(32).toString('hex');
      await expect(appendSecurityEvent(db, { ...security, metadata: { ...security.metadata, [field]: value } } as never)).rejects.toThrow('Security operation unavailable');
      await expect(appendAudit(db, { ...audit, metadata: { ...audit.metadata, [field]: value } } as never)).rejects.toThrow('Security operation unavailable');
    }
    for (const metadata of [new Error('Synthetic'), { request: {} }, { reasonCode: 'x'.repeat(10000) }, { reasonCode: randomBytes(32).toString('hex') }]) {
      await expect(appendSecurityEvent(db, { ...security, metadata } as never)).rejects.toThrow();
      await expect(appendAudit(db, { ...audit, metadata } as never)).rejects.toThrow();
    }
    expect(await db.selectFrom('security_events').select('id').where('correlation_id', '=', security.correlationId).execute()).toHaveLength(0);
    expect(await db.selectFrom('audit_logs').select('id').where('correlation_id', '=', audit.correlationId).execute()).toHaveLength(0);
  });
});
