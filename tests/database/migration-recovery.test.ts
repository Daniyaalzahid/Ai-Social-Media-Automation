import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { migrateDatabase, readMigrations } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import type { DatabaseSchema } from '../../src/server/db/schema';

const dropOrder = ['audit_logs', 'security_events', 'auth_challenges', 'sessions', 'mfa_recovery_codes', 'mfa_methods',
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
