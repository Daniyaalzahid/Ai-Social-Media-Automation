import { EnvironmentValidationError, type EnvironmentSource } from '../config/schema.ts';
import { isIP } from 'node:net';

export type DatabasePurpose = 'runtime' | 'migration' | 'destructive-test';
export type DatabaseConfiguration = Readonly<{
  mode: 'development' | 'test' | 'production'; host: string; port: number; database: string;
  user: string; password: string; connectionLimit: number; acquireTimeout: number; connectTimeout: number;
  tls: boolean; caCertPath?: string;
}>;

function boundedNumber(source: EnvironmentSource, key: string, fallback: number, min: number, max: number): number {
  const raw = source[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new EnvironmentValidationError([key]);
  return value;
}

/** Validate BEFORE constructing a pool. No URL/credential is retained in errors. */
export function resolveDatabaseConfiguration(source: EnvironmentSource, purpose: DatabasePurpose = 'runtime'): DatabaseConfiguration {
  const mode = source.APP_ENV ?? source.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(mode) || (source.NODE_ENV && source.NODE_ENV !== mode)) {
    throw new EnvironmentValidationError(['APP_ENV', 'NODE_ENV']);
  }
  if (mode !== 'production' && (source.DATABASE_URL || source.DATABASE_MIGRATION_URL)) {
    throw new EnvironmentValidationError(['DATABASE_URL', 'DATABASE_MIGRATION_URL']);
  }
  if (mode === 'production' && (source.DEV_DATABASE_URL || source.TEST_DATABASE_URL || source.DEV_DATABASE_MIGRATION_URL || source.TEST_DATABASE_MIGRATION_URL || source.TEST_DATABASE_RESET_ALLOWED)) {
    throw new EnvironmentValidationError(['database environment isolation']);
  }
  // Production deployment/migration authorization is deliberately absent in Phase 2A.
  if (mode === 'production' && purpose !== 'runtime') throw new EnvironmentValidationError(['production migrations not authorized']);
  if (purpose === 'destructive-test' && (mode !== 'test' || source.TEST_DATABASE_RESET_ALLOWED !== '1')) {
    throw new EnvironmentValidationError(['APP_ENV', 'TEST_DATABASE_RESET_ALLOWED']);
  }
  const key = mode === 'production' ? 'DATABASE_URL' : `${mode === 'test' ? 'TEST' : 'DEV'}_DATABASE_${purpose === 'runtime' ? 'URL' : 'MIGRATION_URL'}`;
  let url: URL;
  try { url = new URL(source[key] ?? ''); } catch { throw new EnvironmentValidationError([key]); }
  let user: string, password: string, database: string;
  try { user = decodeURIComponent(url.username); password = decodeURIComponent(url.password); database = decodeURIComponent(url.pathname.slice(1)); }
  catch { throw new EnvironmentValidationError([key]); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'mysql:' || !host || !password || !/^[a-zA-Z0-9_]+$/.test(user) || !/^[a-zA-Z0-9_]+$/.test(database) || url.search || url.hash) {
    throw new EnvironmentValidationError([key]);
  }
  if (mode !== 'production') {
    const prefix = mode === 'test' ? 'bsa_test_' : 'bsa_dev_';
    if (!['127.0.0.1', 'localhost', '::1'].includes(host) || !database.startsWith(prefix) || !user.startsWith(prefix)) {
      throw new EnvironmentValidationError([key, 'local isolated database required']);
    }
    if (purpose !== 'runtime' && !user.endsWith('_migration')) throw new EnvironmentValidationError([key, 'migration identity required']);
    if (purpose === 'runtime' && !user.endsWith('_runtime')) throw new EnvironmentValidationError([key, 'runtime identity required']);
    const other = source[mode === 'test' ? 'DEV_DATABASE_URL' : 'TEST_DATABASE_URL'];
    if (other) {
      try { if (decodeURIComponent(new URL(other).pathname.slice(1)) === database) throw new Error(); }
      catch { throw new EnvironmentValidationError(['development/test database overlap']); }
    }
  } else if (user.startsWith('bsa_test_') || user.startsWith('bsa_dev_') || database.startsWith('bsa_test_') || database.startsWith('bsa_dev_')) {
    throw new EnvironmentValidationError([key]);
  }
  // mysql2's explicit certificate identity check requires a DNS hostname.
  if (mode === 'production' && isIP(host)) throw new EnvironmentValidationError([key, 'verified database hostname required']);
  const port = Number(url.port || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new EnvironmentValidationError([key]);
  return Object.freeze({
    mode: mode as DatabaseConfiguration['mode'], host, port, database, user, password,
    connectionLimit: boundedNumber(source, 'DB_POOL_MAX', 2, 1, 10),
    acquireTimeout: boundedNumber(source, 'DB_POOL_ACQUIRE_TIMEOUT_MS', 5000, 100, 10000),
    connectTimeout: boundedNumber(source, 'DB_CONNECT_TIMEOUT_MS', 5000, 100, 10000),
    tls: mode === 'production', ...(source.DB_CA_CERT_PATH ? { caCertPath: source.DB_CA_CERT_PATH } : {}),
  });
}
