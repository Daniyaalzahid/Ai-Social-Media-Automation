import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it, vi } from 'vitest';
import { createPool } from 'mysql2';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { productionProvisioningConfiguration, provisionDatabase } from '../../src/server/db/provision';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { createDatabase } from '../../src/server/db/connection';
import { readMigrations } from '../../src/server/db/migrations';

const tamper = vi.hoisted(() => ({ enabled: false }));
vi.mock('node:fs/promises', async original => {
  const fs = await original<typeof import('node:fs/promises')>();
  return { ...fs, readFile: async (path: URL, encoding: 'utf8') => {
    const text = await fs.readFile(path, encoding);
    return tamper.enabled && String(path).endsWith('.sql') ? text + '\n-- synthetic changed history' : text;
  } };
});
vi.mock('mysql2', () => ({ createPool: vi.fn(() => ({ end: (callback: () => void) => callback() })) }));
afterEach(() => { tamper.enabled = false; });
function source() {
  const runtime = new URL('mysql://database.example.test/deployment_fixture');
  runtime.username = 'deployment_runtime'; runtime.password = randomBytes(24).toString('hex');
  const admin = new URL(runtime); admin.username = 'deployment_admin'; admin.password = randomBytes(24).toString('hex');
  return { APP_ENV: 'production', NODE_ENV: 'production', DATABASE_URL: runtime.href, DATABASE_MIGRATION_URL: admin.href };
}
const intent = '--confirm-production-database=deployment_fixture';
it('admits only the separate admin identity and does not construct a runtime connection', () => {
  const env = source(), config = productionProvisioningConfiguration(env, intent);
  expect(config).toMatchObject({ mode: 'production', host: 'database.example.test', port: 3306, database: 'deployment_fixture', user: 'deployment_admin', tls: true });
  expect(Object.isFrozen(config)).toBe(true); expect(createPool).not.toHaveBeenCalled();
  expect(config.password === decodeURIComponent(new URL(env.DATABASE_MIGRATION_URL).password)).toBe(true);
});
it.each([
  { APP_ENV: undefined }, { NODE_ENV: undefined }, { APP_ENV: 'development' }, { NODE_ENV: 'test' },
  { APP_ENV: 'test', NODE_ENV: 'test' }, { DATABASE_MIGRATION_URL: undefined }, { DATABASE_URL: undefined },
  { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
])('rejects missing or conflicting production intent/configuration %#', patch => {
  expect(() => productionProvisioningConfiguration({ ...source(), ...patch }, intent)).toThrow('Production database provisioning unavailable.');
  expect(createPool).not.toHaveBeenCalled();
});
it.each(['', '--confirm-production-database=other', '--reset', '--drop', '--confirm-production-database=deployment_fixture --reset'])('rejects unsupported intent %s', confirmation => {
  expect(() => productionProvisioningConfiguration(source(), confirmation)).toThrow();
});
it.each(['DEV_DATABASE_URL', 'DEV_DATABASE_MIGRATION_URL', 'TEST_DATABASE_URL', 'TEST_DATABASE_MIGRATION_URL', 'TEST_DATABASE_RESET_ALLOWED'])('rejects production %s contamination', key => {
  expect(() => productionProvisioningConfiguration({ ...source(), [key]: 'synthetic' }, intent)).toThrow();
});
it.each(['DATABASE_URL', 'DATABASE_MIGRATION_URL'] as const)('fully validates both URLs: %s', key => {
  for (const scenario of ['host', 'port', 'database', 'password', 'query', 'fragment', 'user', 'ip4', 'ip6'] as const) {
    const env = source(), url = new URL(env[key]);
    if (scenario === 'host') url.hostname = 'other.example.test';
    if (scenario === 'port') url.port = '3307';
    if (scenario === 'database') url.pathname = '/different';
    if (scenario === 'password') url.password = '';
    if (scenario === 'query') url.search = '?ssl=false';
    if (scenario === 'fragment') url.hash = '#override';
    if (scenario === 'user') url.username = '';
    if (scenario === 'ip4') url.hostname = '127.0.0.1';
    if (scenario === 'ip6') url.hostname = '[::1]';
    expect(() => productionProvisioningConfiguration({ ...env, [key]: url.href }, intent)).toThrow();
  }
});
it('rejects the same decoded username, including a URL-encoded alias', () => {
  const env = source(), admin = new URL(env.DATABASE_MIGRATION_URL); admin.username = 'deployment_runtime';
  expect(() => productionProvisioningConfiguration({ ...env, DATABASE_MIGRATION_URL: admin.href }, intent)).toThrow();
  expect(() => productionProvisioningConfiguration({ ...env, DATABASE_MIGRATION_URL: admin.href.replace('deployment_runtime', '%64eployment_runtime') }, intent)).toThrow();
});
it('preserves the old production migration and destructive-test prohibitions', () => {
  const env = source();
  for (const purpose of ['migration', 'destructive-test'] as const) expect(() => resolveDatabaseConfiguration(env, purpose)).toThrow();
});
it('preserves verified TLS, TLS1.2 floor and admin-only pool construction', async () => {
  const config = productionProvisioningConfiguration(source(), intent), handle = createDatabase(config);
  expect(createPool).toHaveBeenCalledTimes(1);
  expect(createPool).toHaveBeenCalledWith(expect.objectContaining({ user: 'deployment_admin', ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' } }));
  await handle.close();
});
it('retains the existing optional CA path contract', () => {
  expect(productionProvisioningConfiguration({ ...source(), DB_CA_CERT_PATH: '/synthetic/private/database-ca.pem' }, intent).caCertPath).toBe('/synthetic/private/database-ca.pem');
});
it('rejects changed historical SQL before any database operation, without exposing it', async () => {
  expect(await readMigrations()).toHaveLength(12); tamper.enabled = true;
  const attempted = vi.fn(() => { throw new Error('Unexpected database access'); });
  const db = { getExecutor: attempted } as unknown as Kysely<DatabaseSchema>;
  await expect(provisionDatabase(db, { database: 'synthetic', user: 'synthetic' })).rejects.toThrow('Production database provisioning unavailable.');
  expect(attempted).not.toHaveBeenCalled();
});
it('reports neither complete URLs nor passwords in admission failures', () => {
  const env = source();
  try { productionProvisioningConfiguration(env, '--wrong'); expect.fail('Expected refusal'); }
  catch (error) {
    const text = String(error); expect(text).toBe('Error: Production database provisioning unavailable.');
    for (const url of [env.DATABASE_URL, env.DATABASE_MIGRATION_URL]) { expect(text.includes(url)).toBe(false); expect(text.includes(decodeURIComponent(new URL(url).password))).toBe(false); }
  }
});
it.each([{ args: [] }, { args: ['--reset'] }, { args: [intent, '--drop'] }])('native CLI refuses unsafe invocation without printing supplied configuration %#', ({ args }) => {
  const env = source(), result = spawnSync(process.execPath, ['scripts/provision-production.mjs', ...args], { encoding: 'utf8', env: { ...process.env, ...env, NODE_ENV: 'test', APP_ENV: 'test' } });
  expect(result.status).toBe(1); expect(result.stdout).toBe('');
  expect(result.stderr.trim()).toBe('Production database provisioning unavailable. Verify explicit production intent, private configuration, database identity and migration integrity.');
});
