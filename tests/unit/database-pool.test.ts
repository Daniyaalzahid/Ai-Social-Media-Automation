import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPool } from 'mysql2';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { getDatabase } from '../../src/server/db/client';

vi.mock('server-only', () => ({}));
vi.mock('mysql2', () => ({ createPool: vi.fn(() => ({
  getConnection: vi.fn(), end: (callback: () => void) => callback(),
})) }));
beforeEach(() => { vi.clearAllMocks(); Reflect.deleteProperty(globalThis, 'bismillahDatabase'); });
afterEach(() => { vi.unstubAllEnvs(); Reflect.deleteProperty(globalThis, 'bismillahDatabase'); });

describe('application database pool boundary', () => {
  it('reuses a lazy process singleton across calls without acquiring a connection', () => {
    const url = new URL('mysql://127.0.0.1/bsa_test_pool');
    url.username = 'bsa_test_runtime'; url.password = 'synthetic-fixture';
    vi.stubEnv('TEST_DATABASE_URL', url.href);
    const first = getDatabase();
    expect(getDatabase()).toBe(first);
    expect(createPool).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createPool).mock.results[0]?.value.getConnection).not.toHaveBeenCalled();
  });
  it('requires certificate chain AND hostname verification, with bounded pool options', async () => {
    const url = new URL('mysql://database.example.test/private_fixture');
    url.username = 'production_fixture'; url.password = 'synthetic-fixture';
    const configuration = resolveDatabaseConfiguration({ APP_ENV: 'production', NODE_ENV: 'production', DATABASE_URL: url.href });
    const handle = createDatabase(configuration);
    expect(createPool).toHaveBeenCalledWith(expect.objectContaining({
      connectionLimit: 2, queueLimit: 20, connectTimeout: 5000, multipleStatements: false,
      ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' },
    }));
    await handle.close();
    url.hostname = '127.0.0.1';
    expect(() => resolveDatabaseConfiguration({ APP_ENV: 'production', NODE_ENV: 'production', DATABASE_URL: url.href })).toThrow('hostname required');
  });
});
