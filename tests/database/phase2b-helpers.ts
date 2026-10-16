import { BRAND_DROP_ORDER,MEDIA_DROP_ORDER,AI_DROP_ORDER } from '../../src/server/db/schema';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import { migrateDatabase } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { hashPassword } from '../../src/server/auth/passwords';

export function scratchDatabase(name: 'bsa_test_clean' | 'bsa_test_recovery') {
  const url = new URL(process.env.TEST_DATABASE_MIGRATION_URL!); url.pathname = `/${name}`;
  const source = { ...process.env, TEST_DATABASE_MIGRATION_URL: url.href };
  return { source, handle: createDatabase(resolveDatabaseConfiguration(source, 'destructive-test')) };
}
export async function resetScratch(target: ReturnType<typeof scratchDatabase>) {
  const db = target.handle.db;
  await assertDestructiveTestDatabase(db, target.source);
  for (const table of [...AI_DROP_ORDER,...MEDIA_DROP_ORDER,...BRAND_DROP_ORDER, 'audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions', 'password_reset_tokens', 'invitations',
    'team_administration_guard', 'installation_state', 'user_roles', 'role_permissions', 'permissions', 'roles', 'users', 'auth_rate_limits', 'kysely_migration', 'kysely_migration_lock', 'schema_migration_checksums']) {
    await sql`DROP TABLE IF EXISTS ${sql.id(table)}`.execute(db);
  }
  await migrateDatabase(db); await seedCatalog(db);
}
export async function makeUser(db: ReturnType<typeof scratchDatabase>['handle']['db'], password: string, status: 'active' | 'pending_mfa' | 'disabled' | 'invited' = 'active', role = 'VIEWER') {
  const id = randomUUID(), email = `${id}@example.test`;
  const encoded = status === 'invited' ? null : (await hashPassword(password)).reveal();
  await db.insertInto('users').values({ id, email_normalized: email, display_name: 'Synthetic security test', password_hash: encoded, status,
    password_changed_at: null, last_login_at: null }).execute();
  const canonical = await db.selectFrom('roles').select('id').where('code', '=', role).executeTakeFirstOrThrow();
  await db.insertInto('user_roles').values({ user_id: id, role_id: canonical.id, assigned_by: null }).execute();
  return { id, email };
}
