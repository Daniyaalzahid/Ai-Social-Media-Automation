import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { migrateDatabase, readMigrations } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { Migrator, type Migration } from 'kysely/migration';
import { randomBytes } from 'node:crypto';

const dropOrder = ['audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions',
  'password_reset_tokens', 'invitations', 'installation_state', 'user_roles', 'role_permissions', 'permissions', 'roles', 'users', 'auth_rate_limits',
  'kysely_migration', 'kysely_migration_lock', 'schema_migration_checksums'] as const;
function scratch(name: 'bsa_test_clean' | 'bsa_test_recovery') {
  const url = new URL(process.env.TEST_DATABASE_MIGRATION_URL!); url.pathname = `/${name}`;
  const source = { ...process.env, TEST_DATABASE_MIGRATION_URL: url.href };
  return { source, handle: createDatabase(resolveDatabaseConfiguration(source, 'destructive-test')) };
}
async function clearScratch(db: Kysely<DatabaseSchema>, source: Record<string, string | undefined>) {
  await assertDestructiveTestDatabase(db, source);
  for (const table of dropOrder) await sql`DROP TABLE IF EXISTS ${sql.id(table)}`.execute(db);
}

describe('isolated clean migration and recovery', () => {
  it('upgrades the actual Phase 2A SQL/journal to 0003, preserves old enum rows and rejects checksum tampering', async () => {
    const { source, handle } = scratch('bsa_test_clean');
    const db = handle.db;
    try {
      await clearScratch(db, source);
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64) NOT NULL, state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const phase2a = (await readMigrations()).slice(0, 3);
      const migrations: Record<string, Migration> = Object.fromEntries(phase2a.map((entry) => [entry.name, { up: async (connection) => {
        await sql`INSERT INTO schema_migration_checksums (name,sha256,state) VALUES (${entry.name},${entry.sha256},'applying')`.execute(connection);
        for (const statement of entry.statements) await sql.raw(statement).execute(connection);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(connection);
      } }]));
      const result = await new Migrator({ db, provider: { getMigrations: async () => migrations } }).migrateToLatest();
      expect(result.error === undefined).toBe(true);
      await seedCatalog(db);
      const userId = randomUUID();
      await db.insertInto('users').values({ id: userId, email_normalized: `${userId}@example.test`, display_name: 'Synthetic upgrade', status: 'invited', password_hash: null, password_changed_at: null, last_login_at: null }).execute();
      const oldProof = randomUUID();
      await db.insertInto('auth_challenges').values({ id: oldProof, user_id: userId, purpose: 'login_mfa', token_hash: randomBytes(32), auth_version: 1, action_code: null, consumed_at: null, revoked_at: null,
        created_at: new Date(), expires_at: new Date(Date.now() + 300000) }).execute();
      await migrateDatabase(db); await migrateDatabase(db);
      expect((await db.selectFrom('auth_challenges').select('purpose').where('id', '=', oldProof).executeTakeFirstOrThrow()).purpose).toBe('login_mfa');
      await db.insertInto('auth_challenges').values({ id: randomUUID(), user_id: userId, purpose: 'password_verified', token_hash: randomBytes(32), auth_version: 1, action_code: 'PASSWORD_VERIFIED', consumed_at: null, revoked_at: null,
        created_at: new Date(), expires_at: new Date(Date.now() + 300000) }).execute();
      expect((await sql`SELECT name FROM schema_migration_checksums`.execute(db)).rows).toHaveLength(5);
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0003_password_verified_challenges.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    } finally { await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close(); }
  });
  it('upgrades Phase 2B to 0004, enforces binding FK/CHECK and rejects 0004 tampering', async () => {
    const { source, handle } = scratch('bsa_test_clean'); const db = handle.db;
    try {
      await clearScratch(db, source);
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64) NOT NULL, state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const phase2b = (await readMigrations()).slice(0, 4);
      const migrations: Record<string, Migration> = Object.fromEntries(phase2b.map((entry) => [entry.name, { up: async (connection) => {
        await sql`INSERT INTO schema_migration_checksums (name,sha256,state) VALUES (${entry.name},${entry.sha256},'applying')`.execute(connection);
        for (const statement of entry.statements) await sql.raw(statement).execute(connection);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(connection);
      } }]));
      expect((await new Migrator({ db, provider: { getMigrations: async () => migrations } }).migrateToLatest()).error === undefined).toBe(true);
      await seedCatalog(db);
      const userId = randomUUID(), methodId = randomUUID();
      await db.insertInto('users').values({ id: userId, email_normalized: `${userId}@example.test`, display_name: 'Synthetic upgrade', status: 'invited', password_hash: null, password_changed_at: null, last_login_at: null }).execute();
      await db.insertInto('mfa_methods').values({ id: methodId, user_id: userId, type: 'totp', state: 'active', created_at: new Date(Date.now() - 1000), seed_ciphertext: randomBytes(20), iv: randomBytes(12), tag: randomBytes(16), key_id: 'test-only', confirmed_at: new Date(), enrollment_expires_at: null, last_accepted_step: 1 }).execute();
      await migrateDatabase(db); await migrateDatabase(db);
      expect((await db.selectFrom('mfa_methods').select('enrollment_challenge_id').where('id', '=', methodId).executeTakeFirstOrThrow()).enrollment_challenge_id).toBeNull();
      const challengeId = randomUUID();
      await db.insertInto('auth_challenges').values({ id: challengeId, user_id: userId, token_hash: randomBytes(32), purpose: 'password_verified', auth_version: 1, action_code: 'PASSWORD_VERIFIED', consumed_at: null, revoked_at: null, expires_at: new Date(Date.now() + 60000) }).execute();
      await expect(db.updateTable('mfa_methods').set({ enrollment_challenge_id: challengeId }).where('id', '=', methodId).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
      await expect(db.updateTable('auth_challenges').set({ bound_session_id: randomUUID() }).where('id', '=', challengeId).execute()).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0004_phase2c_access_bindings.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    } finally { await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close(); }
  });
  it('migrates a completely clean database and permits a repeat without changes', async () => {
    const { source, handle } = scratch('bsa_test_clean');
    try {
      await clearScratch(handle.db, source);
      await migrateDatabase(handle.db); await seedCatalog(handle.db); await migrateDatabase(handle.db);
      expect(await handle.db.selectFrom('roles').select('id').execute()).toHaveLength(5);
      expect(await handle.db.selectFrom('users').select('id').execute()).toHaveLength(0);
      expect((await handle.db.selectFrom('installation_state').selectAll().execute())[0]?.bootstrap_consumed_at).toBeNull();
    } finally { await handle.close(); }
  });
  it('rejects changed applied checksums and incomplete DDL, then restores an isolated logical snapshot', async () => {
    const { source, handle } = scratch('bsa_test_recovery');
    const db = handle.db;
    try {
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db);
      const id = randomUUID();
      await db.insertInto('users').values({ id, email_normalized: `${id}@example.test`, display_name: 'Synthetic restore fixture', status: 'invited',
        password_hash: null, password_changed_at: null, last_login_at: null }).execute();
      const snapshot = await db.selectFrom('users').selectAll().execute();
      await sql`UPDATE schema_migration_checksums SET sha256 = ${'0'.repeat(64)} WHERE name = '0000_phase2a_security_foundation.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
      await clearScratch(db, source);
      const migration = (await readMigrations())[0]!;
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64), state enum('applying','applied'))`.execute(db);
      await sql`INSERT INTO schema_migration_checksums (name, sha256, state) VALUES (${migration.name}, ${migration.sha256}, 'applying')`.execute(db);
      await sql.raw(migration.statements[0]!).execute(db);
      await expect(sql`CREATE TABLE audit_logs (id int)`.execute(db)).rejects.toMatchObject({ code: 'ER_TABLE_EXISTS_ERROR' });
      const partial = await sql<{ count: number }>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs'`.execute(db);
      expect(Number(partial.rows[0]?.count)).toBe(1);
      await expect(migrateDatabase(db)).rejects.toThrow('restoration');
      // DDL has implicit commits: do not claim transaction rollback. Recreate ONLY
      // this explicitly guarded scratch schema, then restore its synthetic data.
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db);
      await db.insertInto('users').values(snapshot).execute();
      expect(await db.selectFrom('users').selectAll().execute()).toEqual(snapshot);
      expect(await db.selectFrom('roles').select('id').execute()).toHaveLength(5);
    } finally { await handle.close(); }
  });
  it('rejects an empty checksum ledger when the migration journal still records applied SQL', async () => {
    const { source, handle } = scratch('bsa_test_recovery');
    try {
      await clearScratch(handle.db, source); await migrateDatabase(handle.db);
      await sql`DELETE FROM schema_migration_checksums`.execute(handle.db);
      await expect(migrateDatabase(handle.db)).rejects.toThrow('ledger inconsistent');
      await clearScratch(handle.db, source); await migrateDatabase(handle.db);
    } finally { await handle.close(); }
  });
  it.each(['role_id', 'role_code', 'permission_id', 'permission_code'] as const)('fails closed for a conflicting canonical %s without adding privileges', async (conflict) => {
    const { source, handle } = scratch('bsa_test_clean');
    const db = handle.db;
    try {
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db);
      const role = await db.selectFrom('roles').selectAll().where('code', '=', 'OWNER').executeTakeFirstOrThrow();
      const permission = await db.selectFrom('permissions').selectAll().where('code', '=', 'security.manage').executeTakeFirstOrThrow();
      await db.deleteFrom('role_permissions').execute();
      await db.deleteFrom('roles').execute(); await db.deleteFrom('permissions').execute();
      if (conflict.startsWith('role')) await db.insertInto('roles').values({
        id: conflict === 'role_id' ? role.id : randomUUID(), code: conflict === 'role_code' ? 'OWNER' : 'WRONG_CODE', label: 'Untrusted catalog fixture',
      }).execute();
      else await db.insertInto('permissions').values({
        id: conflict === 'permission_id' ? permission.id : randomUUID(), code: conflict === 'permission_code' ? permission.code : 'wrong.code',
      }).execute();
      const beforeRoles = await db.selectFrom('roles').selectAll().execute(), beforePermissions = await db.selectFrom('permissions').selectAll().execute();
      await expect(seedCatalog(db)).rejects.toThrow('catalog conflict');
      expect(await db.selectFrom('roles').selectAll().execute()).toEqual(beforeRoles);
      expect(await db.selectFrom('permissions').selectAll().execute()).toEqual(beforePermissions);
      expect(await db.selectFrom('role_permissions').selectAll().execute()).toHaveLength(0);
    } finally {
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close();
    }
  });
});
