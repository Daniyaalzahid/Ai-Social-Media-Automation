import { randomBytes } from 'node:crypto';
import { beforeEach, afterAll, it, expect } from 'vitest';
import { sql } from 'kysely';
import { scratchDatabase, emptyScratch, makeUser } from './phase2b-helpers';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { provisionDatabase } from '../../src/server/db/provision';
import { assertMigrationsComplete, readMigrations } from '../../src/server/db/migrations';
import { verifyBootstrapDatabase } from '../../src/server/auth/bootstrap';
import { productionProviders } from '../../src/server/social/provider';
import { productionPublishingProviders } from '../../src/server/publishing/provider';
const target = scratchDatabase('bsa_test_recovery'), db = target.handle.db;
const config = resolveDatabaseConfiguration(target.source, 'destructive-test');
beforeEach(() => emptyScratch(target)); afterAll(() => target.handle.close());
it('applies all twelve canonical migrations, complete journals, exact seeds and no identities', async () => {
  await provisionDatabase(db, config); await assertMigrationsComplete(db);
  await verifyBootstrapDatabase(db, { ...config, mode: 'production', tls: true });
  const expected = await readMigrations(), ledger = (await sql<{name:string;sha256:string;state:string}>`SELECT name,sha256,state FROM schema_migration_checksums ORDER BY name`.execute(db)).rows;
  expect(ledger).toEqual(expected.map(e => ({ name: e.name, sha256: e.sha256, state: 'applied' })));
  expect((await sql<{name:string}>`SELECT name FROM kysely_migration ORDER BY name`.execute(db)).rows.map(e => e.name)).toEqual(expected.map(e => e.name));
  expect(expected).toHaveLength(12); expect(await db.selectFrom('permissions').select('id').execute()).toHaveLength(32);
  expect(await db.selectFrom('users').select('id').execute()).toEqual([]); expect(await db.selectFrom('social_authorizations').select('id').execute()).toEqual([]); expect(await db.selectFrom('social_credentials').select('version').execute()).toEqual([]);
  expect(await db.selectFrom('installation_state').select(['initial_owner_id', 'bootstrap_consumed_at']).executeTakeFirstOrThrow()).toEqual({ initial_owner_id: null, bootstrap_consumed_at: null });
  expect(productionProviders().size).toBe(0); expect(productionPublishingProviders().size).toBe(0);
});
it('rerun preserves existing users/data and identical authorization catalog without an Owner', async () => {
  await provisionDatabase(db, config); const user = await makeUser(db, randomBytes(24).toString('hex'), 'active', 'VIEWER');
  const catalog = async () => ({ roles: await db.selectFrom('roles').selectAll().orderBy('id').execute(), permissions: await db.selectFrom('permissions').selectAll().orderBy('id').execute(), assignments: await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute() });
  const before = await catalog(); await provisionDatabase(db, config); expect(await catalog()).toEqual(before);
  expect((await db.selectFrom('users').select('id').execute()).map(u => u.id)).toEqual([user.id]);
  expect((await db.selectFrom('installation_state').select('initial_owner_id').executeTakeFirstOrThrow()).initial_owner_id).toBeNull(); await assertMigrationsComplete(db);
});
it.each(['database', 'user'] as const)('wrong live %s identity refuses before creating schema tables', async field => {
  await expect(provisionDatabase(db, { ...config, [field]: 'not_the_selected_identity' })).rejects.toThrow('Production database provisioning unavailable.');
  const tables = (await sql<{count:number}>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()`.execute(db)).rows[0]!;
  expect(Number(tables.count)).toBe(0);
});
it.each(['checksum', 'incomplete', 'journal'] as const)('rejects %s corruption without resetting or repairing it', async scenario => {
  await provisionDatabase(db, config);
  if (scenario === 'checksum') await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0011_publishing_foundation.sql'`.execute(db);
  if (scenario === 'incomplete') await sql`UPDATE schema_migration_checksums SET state='applying' WHERE name='0011_publishing_foundation.sql'`.execute(db);
  if (scenario === 'journal') await sql`DELETE FROM kysely_migration WHERE name='0011_publishing_foundation.sql'`.execute(db);
  await expect(provisionDatabase(db, config)).rejects.toThrow('Production database provisioning unavailable.'); await expect(assertMigrationsComplete(db)).rejects.toThrow();
  expect(await db.selectFrom('permissions').select('id').execute()).toHaveLength(32); expect(await db.selectFrom('users').select('id').execute()).toEqual([]);
});
it('production bootstrap readiness rejects an incomplete journal without creating any user', async () => {
  await provisionDatabase(db, config); await sql`DELETE FROM kysely_migration WHERE name='0011_publishing_foundation.sql'`.execute(db);
  // No production connection: exercise readiness against the already guarded isolated handle.
  await expect(verifyBootstrapDatabase(db, { ...config, mode: 'production', tls: true })).rejects.toThrow('Security operation unavailable');
  expect(await db.selectFrom('users').select('id').execute()).toEqual([]);
});
