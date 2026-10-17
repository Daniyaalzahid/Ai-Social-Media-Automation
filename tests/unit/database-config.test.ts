import { describe, expect, it } from 'vitest';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { PERMISSION_CODES, ROLE_PERMISSIONS } from '../../src/server/db/catalog';
import { readMigrations } from '../../src/server/db/migrations';
import { assertRestrictedTestGrants } from '../../src/server/db/test-guard';

function source() {
  const runtime = new URL('mysql://127.0.0.1:3307/bsa_test_unit');
  runtime.username = 'bsa_test_runtime'; runtime.password = 'synthetic-unit-fixture';
  const migration = new URL(runtime); migration.username = 'bsa_test_migration';
  return { APP_ENV: 'test', NODE_ENV: 'test', TEST_DATABASE_URL: runtime.href, TEST_DATABASE_MIGRATION_URL: migration.href, TEST_DATABASE_RESET_ALLOWED: '1' };
}
describe('database configuration isolation', () => {
  it('requires explicit configuration without a production fallback', () => {
    expect(() => resolveDatabaseConfiguration({})).toThrow('DEV_DATABASE_URL');
    expect(() => resolveDatabaseConfiguration({ APP_ENV: 'test' })).toThrow('TEST_DATABASE_URL');
  });
  it('separates runtime/migration identities and bounds pool defaults', () => {
    const runtime = resolveDatabaseConfiguration(source());
    expect(runtime.user).toBe('bsa_test_runtime');
    expect(runtime.connectionLimit).toBe(2);
    expect(runtime.acquireTimeout).toBe(5000);
    expect(runtime.tls).toBe(false);
    expect(resolveDatabaseConfiguration(source(), 'migration').user).toBe('bsa_test_migration');
    expect(Object.isFrozen(runtime)).toBe(true);
  });
  it.each([
    { DATABASE_URL: 'mysql://production.invalid/private' },
    { DATABASE_MIGRATION_URL: 'mysql://production.invalid/private' },
    { APP_ENV: 'production' }, { NODE_ENV: 'production' },
    { TEST_DATABASE_RESET_ALLOWED: undefined }, { TEST_DATABASE_RESET_ALLOWED: 'true' },
    { TEST_DATABASE_MIGRATION_URL: '' },
  ])('rejects unsafe destructive configuration %#', (override) => {
    expect(() => resolveDatabaseConfiguration({ ...source(), ...override }, 'destructive-test')).toThrow();
  });
  it.each(['production.invalid', '192.0.2.10', '127.0.0.1.evil.invalid'])('rejects non-loopback host %s before connecting', (host) => {
    const url = new URL(source().TEST_DATABASE_MIGRATION_URL); url.hostname = host;
    expect(() => resolveDatabaseConfiguration({ ...source(), TEST_DATABASE_MIGRATION_URL: url.href }, 'destructive-test')).toThrow();
  });
  it.each(['production', 'bsa_dev_unit', 'mysql'])('rejects production-like database %s', (database) => {
    const url = new URL(source().TEST_DATABASE_MIGRATION_URL); url.pathname = `/${database}`;
    expect(() => resolveDatabaseConfiguration({ ...source(), TEST_DATABASE_MIGRATION_URL: url.href }, 'destructive-test')).toThrow();
  });
  it('rejects swapped privilege identities', () => {
    expect(() => resolveDatabaseConfiguration({ ...source(), TEST_DATABASE_URL: source().TEST_DATABASE_MIGRATION_URL })).toThrow();
    expect(() => resolveDatabaseConfiguration({ ...source(), TEST_DATABASE_MIGRATION_URL: source().TEST_DATABASE_URL }, 'migration')).toThrow();
  });
  it('rejects query-string overrides and malformed credentials without leaking values', () => {
    const supplied = source().TEST_DATABASE_URL + '?multipleStatements=true';
    expect(() => resolveDatabaseConfiguration({ ...source(), TEST_DATABASE_URL: supplied })).toThrow('TEST_DATABASE_URL');
    try { resolveDatabaseConfiguration({ ...source(), TEST_DATABASE_URL: supplied }); } catch (error) {
      expect(String(error)).not.toContain('synthetic-unit-fixture');
      expect(String(error)).not.toContain(supplied);
    }
  });
  it.each([['DB_POOL_MAX', '0'], ['DB_POOL_MAX', '11'], ['DB_POOL_MAX', '2.5'], ['DB_CONNECT_TIMEOUT_MS', 'Infinity'], ['DB_POOL_ACQUIRE_TIMEOUT_MS', '1']])('rejects unbounded %s=%s', (key, value) => {
    expect(() => resolveDatabaseConfiguration({ ...source(), [key]: value })).toThrow(key);
  });
  it('requires verified TLS in production and blocks Phase 2A production migrations', () => {
    const url = new URL(source().TEST_DATABASE_URL); url.username = 'production_fixture'; url.pathname = '/production_fixture'; url.hostname = 'database.example.test';
    const env = { APP_ENV: 'production', NODE_ENV: 'production', DATABASE_URL: url.href };
    expect(resolveDatabaseConfiguration(env).tls).toBe(true);
    expect(() => resolveDatabaseConfiguration(env, 'migration')).toThrow('not authorized');
    expect(() => resolveDatabaseConfiguration(env, 'destructive-test')).toThrow();
  });
  it('requires grants restricted to test schemas, without global privileges or delegation', () => {
    const allowed = ['GRANT USAGE ON *.* TO `bsa_test_migration`@`127.0.0.1`', 'GRANT ALL PRIVILEGES ON `bsa\\_test\\_unit`.* TO `bsa_test_migration`@`127.0.0.1`'];
    expect(() => assertRestrictedTestGrants(allowed, 'bsa_test_unit')).not.toThrow();
    for (const grant of [
      'GRANT ALL PRIVILEGES ON *.* TO `bsa_test_migration`@`127.0.0.1`',
      'GRANT USAGE ON *.* TO `bsa_test_migration`@`127.0.0.1` WITH GRANT OPTION',
      'GRANT SELECT ON `production`.* TO `bsa_test_migration`@`127.0.0.1`',
      'GRANT SELECT ON `bsa_dev_unit`.* TO `bsa_test_migration`@`127.0.0.1`',
      'GRANT ALL PRIVILEGES ON `bsa_test_unit`.* TO `bsa_test_migration`@`127.0.0.1` WITH GRANT OPTION',
      'GRANT `admin_role` TO `bsa_test_migration`@`127.0.0.1`',
    ]) expect(() => assertRestrictedTestGrants([...allowed, grant], 'bsa_test_unit')).toThrow('unrestricted');
    expect(() => assertRestrictedTestGrants(allowed, 'bsa_test_other')).toThrow('missing');
  });
  it('selects bootstrap migration credentials only for the intended database', () => {
    expect(resolveDatabaseConfiguration(source(), 'bootstrap').user).toBe('bsa_test_migration');
    const runtime = new URL(source().TEST_DATABASE_URL);
    runtime.hostname = 'database.example.test'; runtime.pathname = '/deployment_fixture'; runtime.username = 'deployment_runtime';
    const admin = new URL(runtime); admin.username = 'deployment_admin';
    const env = { APP_ENV: 'production', NODE_ENV: 'production', DATABASE_URL: runtime.href, DATABASE_MIGRATION_URL: admin.href };
    const configuration = resolveDatabaseConfiguration(env, 'bootstrap');
    expect(configuration.user).toBe('deployment_admin');
    expect(configuration.tls).toBe(true);
    expect(() => resolveDatabaseConfiguration({ ...env, DATABASE_MIGRATION_URL: runtime.href }, 'bootstrap')).toThrow();
    const mismatch = new URL(admin); mismatch.pathname = '/different_fixture';
    expect(() => resolveDatabaseConfiguration({ ...env, DATABASE_MIGRATION_URL: mismatch.href }, 'bootstrap')).toThrow();
    expect(() => resolveDatabaseConfiguration({ ...env, APP_ENV: undefined }, 'bootstrap')).toThrow();
    expect(() => resolveDatabaseConfiguration({ ...env, DATABASE_MIGRATION_URL: undefined }, 'bootstrap')).toThrow();
  });
  it('rejects a consistently production mode before any database access', () => {
    expect(() => resolveDatabaseConfiguration({ ...source(), APP_ENV: 'production', NODE_ENV: 'production' }, 'destructive-test')).toThrow();
  });
});

describe('security catalog and reviewed migration inputs', () => {
  it('restricts approval and administration capabilities', () => {
    expect(ROLE_PERMISSIONS.OWNER).toEqual(PERMISSION_CODES);
    expect(ROLE_PERMISSIONS.MARKETING_ADMIN).toContain('content.approve_self');
    for (const role of ['CONTENT_CREATOR', 'REVIEWER', 'VIEWER'] as const) expect(ROLE_PERMISSIONS[role]).not.toContain('content.approve_self');
    expect(ROLE_PERMISSIONS.CONTENT_CREATOR).not.toContain('content.approve');
    expect(ROLE_PERMISSIONS.REVIEWER).not.toContain('content.publish');
    expect(ROLE_PERMISSIONS.MARKETING_ADMIN).not.toContain('users.manage');
    expect(ROLE_PERMISSIONS.MARKETING_ADMIN).not.toContain('security.manage');
    expect(PERMISSION_CODES.some((code) => /decrypt|secret/.test(code))).toBe(false);
  });
  it('verifies migration file checksums and rejects missing manifest entries', async () => {
    const entries = await readMigrations();
    expect(entries.map((entry) => entry.name)).toEqual(['0000_phase2a_security_foundation.sql', '0001_security_invariants.sql', '0002_review_integrity.sql', '0003_password_verified_challenges.sql', '0004_phase2c_access_bindings.sql', '0005_phase2d_administration.sql', '0006_brand_brain.sql', '0007_temporary_media.sql', '0008_ai_generations.sql', '0009_content_workflow.sql', '0010_social_connections.sql']);
    expect(entries.every((entry) => entry.statements.length > 0)).toBe(true);
  });
});
