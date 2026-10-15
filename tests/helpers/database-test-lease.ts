import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection.ts';
import { resolveDatabaseConfiguration } from '../../src/server/db/config.ts';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard.ts';
import type { EnvironmentSource } from '../../src/server/config/schema.ts';

export const DATABASE_TEST_LEASE = 'bsa/isolated-database-tests/v1';

/** Test-worker ownership, including direct Vitest runs. No waiting or retries. */
export async function acquireDatabaseTestLease(source: EnvironmentSource, name = DATABASE_TEST_LEASE) {
  if (!/^[A-Za-z0-9/_-]{1,64}$/.test(name)) throw new Error('Invalid database test lease');
  const configuration = resolveDatabaseConfiguration(source, 'destructive-test');
  const handle = createDatabase({ ...configuration, connectionLimit: 1 });
  let ready!: () => void, reject!: (error: unknown) => void, release!: () => void;
  const acquired = new Promise<void>((resolve, fail) => { ready = resolve; reject = fail; });
  const finished = new Promise<void>((resolve) => { release = resolve; });
  let occupied = false;
  const holding = handle.db.connection().execute(async (connection) => {
    await assertDestructiveTestDatabase(connection, source);
    const result = await sql<{ acquired: number | null }>`SELECT GET_LOCK(${name}, 0) AS acquired`.execute(connection);
    if (result.rows[0]?.acquired !== 1) { occupied = true; throw new Error('Database test lease unavailable'); }
    ready();
    try { await finished; }
    finally { await sql`SELECT RELEASE_LOCK(${name})`.execute(connection); }
  });
  void holding.catch(reject);
  try { await acquired; }
  catch {
    await handle.close();
    throw new Error(occupied ? 'Another database test execution holds the isolated fixture lease' : 'Isolated database test lease unavailable');
  }
  let closed = false;
  return { async close() {
    if (closed) return;
    closed = true; release();
    try { await holding; } finally { await handle.close(); }
  } };
}
