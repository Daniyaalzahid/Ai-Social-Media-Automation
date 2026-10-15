import { randomBytes, randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { createDatabase } from '../../src/server/db/connection';
import { migrateDatabase } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import { PERMISSION_CODES, ROLE_CODES, ROLE_PERMISSIONS } from '../../src/server/db/catalog';
import type { DatabaseSchema } from '../../src/server/db/schema';

const config = resolveDatabaseConfiguration(process.env, 'destructive-test');
const handle = createDatabase(config);
const db = handle.db;
const runtime = createDatabase(resolveDatabaseConfiguration(process.env));
const rollback = Symbol('intentional-test-rollback');
async function isolated(test: (transaction: Kysely<DatabaseSchema>) => Promise<void>) {
  try { await db.transaction().execute(async (transaction) => { await test(transaction); throw rollback; }); }
  catch (error) { if (error !== rollback) throw error; }
}
async function user(transaction: Kysely<DatabaseSchema>) {
  const id = randomUUID();
  await transaction.insertInto('users').values({ id, email_normalized: `${id}@example.test`, display_name: 'Synthetic test user',
    password_hash: null, status: 'invited', password_changed_at: null, last_login_at: null }).execute();
  return id;
}
function session(userId: string, tokenHash = randomBytes(32)) {
  const now = new Date();
  return { id: randomUUID(), user_id: userId, token_hash: tokenHash, auth_version: 1,
    created_at: now, last_activity_at: now, idle_expires_at: new Date(now.getTime() + 60000), absolute_expires_at: new Date(now.getTime() + 120000),
    authenticated_at: now, mfa_verified_at: null, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null };
}
async function method(transaction: Kysely<DatabaseSchema>, userId: string) {
  const id = randomUUID();
  await transaction.insertInto('mfa_methods').values({ id, user_id: userId, type: 'totp', state: 'pending', seed_ciphertext: randomBytes(20),
    iv: randomBytes(12), tag: randomBytes(16), key_id: 'test-only', enrollment_expires_at: new Date(Date.now() + 60000), confirmed_at: null, last_accepted_step: null }).execute();
  return id;
}

beforeAll(async () => {
  await assertDestructiveTestDatabase(db, process.env);
  await migrateDatabase(db);
  await seedCatalog(db);
});
afterAll(async () => { await runtime.close(); await handle.close(); });

describe('real MySQL security foundation', () => {
  it('creates 16 security tables on real MySQL with enforced checks and explicit InnoDB', async () => {
    const version = await sql<{ version: string }>`SELECT VERSION() AS version`.execute(db);
    expect(version.rows[0]?.version).toMatch(/^8\./);
    const tables = await sql<{ name: string; engine: string; collation: string }>`SELECT TABLE_NAME AS name, ENGINE AS engine, TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()`.execute(db);
    const security = tables.rows.filter((row) => !row.name.startsWith('kysely_') && row.name !== 'schema_migration_checksums');
    expect(security).toHaveLength(16);
    expect(security.every((row) => row.engine === 'InnoDB' && row.collation === 'utf8mb4_bin')).toBe(true);
  });
  it('migrations are repeatable and record checksums without reseeding bootstrap', async () => {
    await migrateDatabase(db);
    expect(await db.selectFrom('installation_state').selectAll().execute()).toHaveLength(1);
    const ledger = await sql<{ state: string }>`SELECT state FROM schema_migration_checksums`.execute(db);
    expect(ledger.rows).toHaveLength(6);
    expect(ledger.rows.every((row) => row.state === 'applied')).toBe(true);
  });
  it('sets the server connection timezone to UTC for SQL defaults', async () => {
    const result = await sql<{ timezone: string }>`SELECT @@session.time_zone AS timezone`.execute(runtime.db);
    expect(result.rows[0]?.timezone).toBe('+00:00');
  });
  it('seeds exactly five canonical roles and the approved permission matrix idempotently', async () => {
    await seedCatalog(db);
    expect((await db.selectFrom('roles').select('code').execute()).map((row) => row.code).sort()).toEqual([...ROLE_CODES].sort());
    expect((await db.selectFrom('permissions').select('code').execute()).map((row) => row.code).sort()).toEqual([...PERMISSION_CODES].sort());
    for (const role of ROLE_CODES) {
      const rows = await db.selectFrom('role_permissions').innerJoin('roles', 'roles.id', 'role_permissions.role_id').innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
        .select('permissions.code').where('roles.code', '=', role).execute();
      expect(rows.map((row) => row.code).sort()).toEqual([...ROLE_PERMISSIONS[role]].sort());
    }
  });
  it('does not seed users, passwords, MFA material or sessions', async () => {
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('mfa_methods').select('id').execute()).toHaveLength(0);
  });
  it('enforces one operational role per user', () => isolated(async (transaction) => {
    const id = await user(transaction);
    const roles = await transaction.selectFrom('roles').select('id').execute();
    await transaction.insertInto('user_roles').values({ user_id: id, role_id: roles[0]!.id, assigned_by: null }).execute();
    await expect(transaction.insertInto('user_roles').values({ user_id: id, role_id: roles[1]!.id, assigned_by: null }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  }));
  it('rejects duplicate normalized emails and noncanonical casing', () => isolated(async (transaction) => {
    const id = await user(transaction);
    const row = await transaction.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
    await expect(transaction.insertInto('users').values({ ...row, id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.insertInto('users').values({ ...row, id: randomUUID(), email_normalized: 'UPPER@example.test' }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('rejects active users without password hashes and zero auth versions', () => isolated(async (transaction) => {
    const id = await user(transaction);
    await expect(transaction.updateTable('users').set({ status: 'active' }).where('id', '=', id).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(transaction.updateTable('users').set({ auth_version: 0 }).where('id', '=', id).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('enforces bootstrap singleton and consumed-marker consistency', () => isolated(async (transaction) => {
    await expect(transaction.insertInto('installation_state').values({ id: 1, bootstrap_consumed_at: null, initial_owner_id: null }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.insertInto('installation_state').values({ id: 2, bootstrap_consumed_at: null, initial_owner_id: null }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(transaction.updateTable('installation_state').set({ bootstrap_consumed_at: new Date() }).where('id', '=', 1).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('rejects orphan records and preserves referenced users', () => isolated(async (transaction) => {
    await expect(transaction.insertInto('sessions').values(session(randomUUID())).execute()).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
    const id = await user(transaction); await transaction.insertInto('sessions').values(session(id)).execute();
    await expect(transaction.deleteFrom('users').where('id', '=', id).execute()).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  }));
  it('enforces session token uniqueness, exact hash lengths and expiry ordering', () => isolated(async (transaction) => {
    const id = await user(transaction); const row = session(id); await transaction.insertInto('sessions').values(row).execute();
    await expect(transaction.insertInto('sessions').values({ ...row, id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.insertInto('sessions').values(session(id, randomBytes(31))).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(transaction.insertInto('sessions').values({ ...session(id), idle_expires_at: new Date(0) }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('enforces challenge token uniqueness and positive lifetime', () => isolated(async (transaction) => {
    const id = await user(transaction); const row = { id: randomUUID(), user_id: id, token_hash: randomBytes(32), purpose: 'login_mfa' as const,
      auth_version: 1, action_code: null, expires_at: new Date(Date.now() + 60000), consumed_at: null, revoked_at: null };
    await transaction.insertInto('auth_challenges').values(row).execute();
    await expect(transaction.insertInto('auth_challenges').values({ ...row, id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.insertInto('auth_challenges').values({ ...row, id: randomUUID(), token_hash: randomBytes(32), expires_at: new Date(0) }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('enforces invitation/reset hashes and expiry constraints', () => isolated(async (transaction) => {
    const id = await user(transaction);
    const base = { id: randomUUID(), user_id: id, issued_by: id, token_hash: randomBytes(32), expires_at: new Date(Date.now() + 60000), revoked_at: null };
    await transaction.insertInto('invitations').values({ ...base, accepted_at: null }).execute();
    await expect(transaction.insertInto('invitations').values({ ...base, id: randomUUID(), accepted_at: null }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await transaction.insertInto('password_reset_tokens').values({ ...base, consumed_at: null }).execute();
    await expect(transaction.insertInto('password_reset_tokens').values({ ...base, id: randomUUID(), consumed_at: null }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.insertInto('password_reset_tokens').values({ ...base, id: randomUUID(), token_hash: randomBytes(32), consumed_at: null, expires_at: new Date(0) }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('enforces one TOTP method, enrollment state and encrypted-field lengths', () => isolated(async (transaction) => {
    const id = await user(transaction); const methodId = await method(transaction, id);
    await expect(method(transaction, id)).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.updateTable('mfa_methods').set({ state: 'active' }).where('id', '=', methodId).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(transaction.updateTable('mfa_methods').set({ iv: randomBytes(11) }).where('id', '=', methodId).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('enforces recovery-code uniqueness and method foreign keys', () => isolated(async (transaction) => {
    const id = await user(transaction); const methodId = await method(transaction, id);
    const row = { id: randomUUID(), method_id: methodId, batch_id: randomUUID(), code_hash: randomBytes(32), used_at: null, revoked_at: null };
    await transaction.insertInto('mfa_recovery_codes').values(row).execute();
    await expect(transaction.insertInto('mfa_recovery_codes').values({ ...row, id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.deleteFrom('mfa_methods').where('id', '=', methodId).execute()).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  }));
  it('enforces rate-control key uniqueness and expiry', () => isolated(async (transaction) => {
    const row = { scope: 'login_account', subject_hash: randomBytes(32), window_started_at: new Date(), blocked_until: null, expires_at: new Date(Date.now() + 60000) };
    await transaction.insertInto('auth_rate_limits').values(row).execute();
    await expect(transaction.insertInto('auth_rate_limits').values(row).execute()).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    await expect(transaction.insertInto('auth_rate_limits').values({ ...row, subject_hash: randomBytes(32), expires_at: new Date(0) }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('preserves actor/target/session audit relationships and rejects secret metadata keys', () => isolated(async (transaction) => {
    const id = await user(transaction); const sessionRow = session(id); await transaction.insertInto('sessions').values(sessionRow).execute();
    const event = { id: randomUUID(), actor_user_id: id, target_user_id: id, session_id: sessionRow.id, action: 'login.success', outcome: 'success' as const,
      correlation_id: randomUUID(), metadata_safe_json: JSON.stringify({ reasonCode: 'TEST_ONLY' }), ip_hash: null };
    await transaction.insertInto('audit_logs').values(event).execute();
    await expect(transaction.deleteFrom('sessions').where('id', '=', sessionRow.id).execute()).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
    await expect(transaction.insertInto('audit_logs').values({ ...event, id: randomUUID(), metadata_safe_json: JSON.stringify({ password: 'synthetic' }) }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('supports anonymous security events while rejecting orphan identities and unknown metadata', () => isolated(async (transaction) => {
    const row = { id: randomUUID(), user_id: null, type: 'login.failure', severity: 'warning' as const, outcome: 'failure' as const,
      correlation_id: randomUUID(), metadata_safe_json: null, ip_hash: null };
    await transaction.insertInto('security_events').values(row).execute();
    await expect(transaction.insertInto('security_events').values({ ...row, id: randomUUID(), user_id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
    await expect(transaction.insertInto('security_events').values({ ...row, id: randomUUID(), metadata_safe_json: JSON.stringify({ authorization: 'synthetic' }) }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('provides indexes for expiry, session lookups, MFA batches, rates and audit queries', async () => {
    const rows = await sql<{ name: string }>`SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()`.execute(db);
    for (const expected of ['sessions_token_hash_uq', 'sessions_user_active_idx', 'sessions_idle_expiry_idx', 'sessions_absolute_expiry_idx', 'auth_challenges_expiry_idx', 'mfa_recovery_codes_method_batch_idx', 'auth_rate_limits_expiry_idx', 'audit_logs_actor_created_idx', 'security_events_user_created_idx']) {
      expect(rows.rows.map((row) => row.name)).toContain(expected);
    }
  });
  it('runtime grants prohibit DDL, audit mutation, bootstrap mutation and dev access', async () => {
    await expect(sql`CREATE TABLE forbidden_runtime_table (id int)`.execute(runtime.db)).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.updateTable('installation_state').set({ bootstrap_consumed_at: null }).where('id', '=', 1).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.deleteFrom('audit_logs').execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.updateTable('audit_logs').set({ action: 'forbidden' }).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.updateTable('security_events').set({ severity: 'info' }).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.deleteFrom('security_events').execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.deleteFrom('installation_state').execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(sql`SELECT * FROM bsa_dev_phase2a.users`.execute(runtime.db)).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    for (const table of ['roles', 'permissions', 'role_permissions', 'users', 'sessions'] as const) {
      await expect(runtime.db.deleteFrom(table).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    }
    await expect(runtime.db.updateTable('roles').set({ label: 'forbidden' }).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.updateTable('permissions').set({ code: 'forbidden' }).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
    await expect(runtime.db.insertInto('role_permissions').values({ role_id: randomUUID(), permission_id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_TABLEACCESS_DENIED_ERROR' });
  });
  it('rejects a connected database identity mismatch before destructive SQL', async () => {
    const other = new URL(process.env.TEST_DATABASE_MIGRATION_URL!); other.pathname = '/bsa_test_wrong';
    await expect(assertDestructiveTestDatabase(db, { ...process.env, TEST_DATABASE_MIGRATION_URL: other.href })).rejects.toThrow('identity mismatch');
  });
  it('rejects a connected account mismatch without changing grants or contacting another server', async () => {
    const other = new URL(process.env.TEST_DATABASE_MIGRATION_URL!); other.username = 'bsa_test_other_migration';
    await expect(assertDestructiveTestDatabase(db, { ...process.env, TEST_DATABASE_MIGRATION_URL: other.href })).rejects.toThrow('identity mismatch');
  });
  it('bounds pool acquisition and releases connections arriving after timeout', async () => {
    const small = createDatabase({ ...config, connectionLimit: 1, acquireTimeout: 100 });
    let release: (() => void) | undefined;
    let acquired: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => { acquired = resolve; });
    const wait = new Promise<void>((resolve) => { release = resolve; });
    try {
      const held = small.db.connection().execute(async () => { acquired!(); await wait; });
      await ready;
      await expect(sql`SELECT 1`.execute(small.db)).rejects.toThrow('acquisition timed out');
      release!(); await held;
      expect((await sql<{ value: number }>`SELECT 1 AS value`.execute(small.db)).rows[0]?.value).toBe(1);
    } finally { release?.(); await small.close(); }
  });
});
