import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { sql, type Kysely } from 'kysely';
import { generate } from 'otplib';
import { beforeAll, beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { createAccessService, ACCESS_FAILURE, sessionPolicy } from '../../src/server/auth/access';
import { insertPasswordChallenge } from '../../src/server/auth/challenges';
import { decryptMfa } from '../../src/server/auth/mfa-crypto';
import { NetworkIdentity } from '../../src/server/security/identity';
import { newPreState, validPreState } from '../../src/server/auth/browser-security';
import { acquireDatabaseTestLease } from '../helpers/database-test-lease';

const target = scratchDatabase('bsa_test_recovery'), db = target.handle.db;
const second = createDatabase(resolveDatabaseConfiguration(target.source, 'destructive-test'));
const base = 1800000000000, phrase = 'public synthetic clock closure phrase';
const key = { key: randomBytes(32), id: 'clock-closure' }, hmac = randomBytes(32);
const service = (connection: Kysely<DatabaseSchema>) => createAccessService(connection, key, hmac, NetworkIdentity.fromSocketAddress('::'));
beforeAll(() => resetScratch(target));
beforeEach(async () => {
  for (const table of ['audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions', 'user_roles', 'users', 'auth_rate_limits'] as const) await db.deleteFrom(table).execute();
});
afterEach(() => { const leaked = vi.isFakeTimers(); vi.useRealTimers(); expect(leaked).toBe(false); });
afterAll(async () => { await second.close(); await target.handle.close(); });

async function withDatabaseClock<T>(work: (connection: Kysely<DatabaseSchema>, set: (milliseconds: number) => Promise<void>) => Promise<T>, connection = db) {
  return connection.connection().execute(async (pinned) => {
    const set = async (milliseconds: number) => { await sql`SET timestamp = ${milliseconds / 1000}`.execute(pinned); };
    try { await set(base); return await work(pinned, set); }
    finally { await sql`SET timestamp = 0`.execute(pinned); }
  });
}
async function withApplicationClock<T>(milliseconds: number, work: () => Promise<T>) {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(milliseconds);
  try { return await work(); } finally { vi.useRealTimers(); }
}
async function proof(connection: Kysely<DatabaseSchema>, userId: string) {
  return connection.transaction().execute(async (tx) => (await insertPasswordChallenge(tx, userId, 1)).token);
}
async function login(connection: Kysely<DatabaseSchema>) {
  const user = await makeUser(connection, phrase), result = await service(connection).continuePassword(await proof(connection, user.id));
  if (!result.ok || !('session' in result)) throw new Error('Synthetic clock fixture failed');
  return { user, result };
}
async function enrolled(connection: Kysely<DatabaseSchema>) {
  const user = await makeUser(connection, phrase, 'pending_mfa', 'VIEWER'), raw = await proof(connection, user.id);
  await service(connection).startEnrollment(raw);
  const method = await connection.selectFrom('mfa_methods').selectAll().where('user_id', '=', user.id).executeTakeFirstOrThrow();
  const code = await generate({ secret: decryptMfa(method, key).reveal(), epoch: base / 1000 });
  const result = await service(connection).completeEnrollment(raw, code);
  if (!result.ok) throw new Error('Synthetic clock enrollment failed');
  return { user, result };
}
function childLease(name?: string) {
  const module = new URL('../helpers/database-test-lease.ts', import.meta.url).href;
  const source = `import {acquireDatabaseTestLease} from ${JSON.stringify(module)};try {const lease=await acquireDatabaseTestLease(process.env,${JSON.stringify(name)});await lease.close();console.log('acquired');}catch(e){if(e.message!=='Another database test execution holds the isolated fixture lease')process.exitCode=1;else console.log('occupied');}`;
  return spawnSync(process.execPath, ['--input-type=module', '--eval', source], { env: process.env, encoding: 'utf8', timeout: 10000 });
}

it('historical wrong-row mechanism: scoped assertion sees the successfully touched owner row', async () => {
  await withDatabaseClock(async (connection, set) => {
    const other = await login(connection);
    await connection.updateTable('sessions').set({ id: '00000000-0000-4000-8000-000000000001' }).where('id', '=', other.result.id).execute();
    await service(connection).logout(other.result.session);
    const victim = await login(connection);
    await connection.updateTable('sessions').set({ id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }).where('id', '=', victim.result.id).execute();
    await set(base + 60000); expect((await service(connection).validateSession(victim.result.session, 'interaction')) !== null).toBe(true);
    const wrong = await connection.selectFrom('sessions').select('last_activity_at').executeTakeFirstOrThrow();
    const owned = await connection.selectFrom('sessions').select('last_activity_at').where('user_id', '=', victim.user.id).executeTakeFirstOrThrow();
    expect(wrong.last_activity_at.getTime()).toBe(base); expect(owned.last_activity_at.getTime()).toBe(base + 60000);
  });
});
it('a separate process cannot acquire fixtures while this test worker owns them', () => {
  const result = childLease(); expect(result.status).toBe(0); expect(result.stdout.trim()).toBe('occupied');
});
it('fixture lease releases in finally and a subsequent process acquires it', async () => {
  const name = `bsa/clock-closure/${randomUUID()}`, lease = await acquireDatabaseTestLease(process.env, name);
  try { const result = childLease(name); expect(result.status).toBe(0); expect(result.stdout.trim()).toBe('occupied'); }
  finally { await lease.close(); }
  const result = childLease(name); expect(result.status).toBe(0); expect(result.stdout.trim()).toBe('acquired');
});
it('SQL clock overrides are connection-local and reset before pool reuse', async () => {
  const constructor = Date, wall = Date.now;
  await withDatabaseClock(async (connection) => {
    expect((await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(connection)).rows[0]!.now.getTime()).toBe(base);
    await withDatabaseClock(async (other, set) => {
      await set(base + 5000);
      expect((await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(other)).rows[0]!.now.getTime()).toBe(base + 5000);
      expect((await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(connection)).rows[0]!.now.getTime()).toBe(base);
    }, second.db);
  });
  const restored = (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now.getTime();
  expect(restored === base).toBe(false); expect(Date === constructor).toBe(true); expect(Date.now === wall).toBe(true);
});
it('throwing diagnostic work restores both SQL time and JavaScript Date in finally', async () => {
  const originalDate = Date, originalNow = Date.now;
  let failed = false;
  try { await withDatabaseClock(async () => withApplicationClock(base, async () => { throw new Error('Controlled clock diagnostic interruption'); })); } catch { failed = true; }
  expect(failed).toBe(true); expect(Date === originalDate).toBe(true); expect(Date.now === originalNow).toBe(true);
  expect((await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now.getTime() === base).toBe(false);
});
it.each([-1, 0, 1])('actual SQL clock activity threshold T%+i ms', async (delta) => {
  await withDatabaseClock(async (connection, set) => {
    const { result } = await login(connection); await set(base + 60000 + delta);
    expect((await service(connection).validateSession(result.session, 'interaction')) !== null).toBe(true);
    const row = await connection.selectFrom('sessions').select('last_activity_at').where('id', '=', result.id).executeTakeFirstOrThrow();
    expect(row.last_activity_at.getTime()).toBe(delta < 0 ? base : base + 60000 + delta);
  });
});
it.each([-1, 0, 1])('actual SQL clock password proof expiry T%+i ms', async (delta) => {
  await withDatabaseClock(async (connection, set) => {
    const user = await makeUser(connection, phrase), raw = await proof(connection, user.id); await set(base + 300000 + delta);
    expect((await service(connection).continuePassword(raw)).ok).toBe(delta < 0);
  });
});
it.each([-1, 0, 1])('actual SQL clock recent-auth expiry T%+i ms', async (delta) => {
  await withDatabaseClock(async (connection, set) => {
    const { result } = await login(connection), recent = await service(connection).recentAuthentication(result.session, phrase, '', 'REVOKE_SESSIONS');
    if (!recent.ok) throw new Error('Synthetic recent-auth fixture failed');
    await set(base + 300000 + delta);
    expect((await service(connection).performSensitiveAction(recent.session, recent.proof, 'REVOKE_SESSIONS')).ok).toBe(delta < 0);
  });
});
for (const role of ['OWNER', 'MARKETING_ADMIN']) it.each(['idle', 'absolute'])('%s current-role deadline after promotion to '+role, async (limit) => {
  await withDatabaseClock(async (connection, set) => {
    const { user, result } = await enrolled(connection), policy = sessionPolicy(role);
    const targetRole = await connection.selectFrom('roles').select('id').where('code', '=', role).executeTakeFirstOrThrow();
    await connection.updateTable('user_roles').set({ role_id: targetRole.id }).where('user_id', '=', user.id).execute();
    if (limit === 'absolute') await connection.updateTable('sessions').set({ last_activity_at: new Date(base + policy.absolute - 60000), idle_expires_at: new Date(base + sessionPolicy('VIEWER').absolute) }).where('id', '=', result.id).execute();
    await set(limit === 'idle' ? base + 1 : base + policy.absolute - 59999);
    const validated = await service(connection).validateSession(result.session);
    expect(validated !== null).toBe(true); expect(validated!.expiresAt.getTime()).toBe(base + policy[limit === 'idle' ? 'idle' : 'absolute']);
    await set(base + policy[limit === 'idle' ? 'idle' : 'absolute']); expect(await service(connection).validateSession(result.session)).toBeNull();
  });
});
it.each([-120000, 120000])('application clock skew %+i ms cannot change SQL session/proof authority', async (skew) => {
  await withDatabaseClock(async (connection, setSql) => withApplicationClock(base + skew, async () => {
    const at = async (now: number) => { await setSql(now); vi.setSystemTime(now + skew); };
    const { result } = await login(connection), policy = sessionPolicy('VIEWER');
    const stored = await connection.selectFrom('sessions').select('created_at').where('id', '=', result.id).executeTakeFirstOrThrow(); expect(stored.created_at.getTime()).toBe(base);
    const recent = await service(connection).recentAuthentication(result.session, phrase, '', 'REVOKE_SESSIONS');
    if (!recent.ok) throw new Error('Synthetic skew step-up failed');
    await at(base + 300000); expect(await service(connection).performSensitiveAction(recent.session, recent.proof, 'REVOKE_SESSIONS')).toEqual(ACCESS_FAILURE);
    await at(base + policy.idle - 1); expect((await service(connection).validateSession(recent.session)) !== null).toBe(true);
    await at(base + policy.idle); expect(await service(connection).validateSession(recent.session, 'interaction')).toBeNull();
    // Synthetic independent absolute-boundary fixture; no expired session is touched back to life.
    const fresh = await login(connection), absolute = base + policy.idle + policy.absolute;
    await connection.updateTable('sessions').set({ last_activity_at: new Date(absolute - 120000), idle_expires_at: new Date(absolute) }).where('id', '=', fresh.result.id).execute();
    await at(absolute - 1); expect((await service(connection).validateSession(fresh.result.session, 'interaction'))?.expiresAt.getTime()).toBe(absolute);
    const touched = await connection.selectFrom('sessions').select(['last_activity_at', 'idle_expires_at', 'absolute_expires_at']).where('id', '=', fresh.result.id).executeTakeFirstOrThrow();
    expect(touched.last_activity_at.getTime()).toBe(absolute - 1); expect(touched.idle_expires_at.getTime()).toBe(touched.absolute_expires_at.getTime());
    await at(absolute); expect(await service(connection).validateSession(fresh.result.session)).toBeNull();
    const pre = newPreState(hmac); expect(validPreState(hmac, pre)).toBe(true);
    vi.setSystemTime(Date.now() + 600000); expect(validPreState(hmac, pre)).toBe(false);
  }));
});
