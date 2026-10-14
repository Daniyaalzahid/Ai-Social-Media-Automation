import { sql, type Kysely } from 'kysely';
import type { EnvironmentSource } from '../config/schema.ts';
import { resolveDatabaseConfiguration } from './config.ts';
import type { DatabaseSchema } from './schema.ts';

export function assertRestrictedTestGrants(grants: readonly string[], database: string): void {
  let targetAllowed = false;
  for (const grant of grants) {
    if (/WITH GRANT OPTION/i.test(grant)) throw new Error('Destructive test identity has unrestricted privileges');
    if (/^GRANT USAGE ON \*\.\* TO /i.test(grant)) continue;
    const rawScope = /^GRANT [A-Z_, ]+ ON `([a-zA-Z0-9_\\]+)`\.\* TO /i.exec(grant)?.[1];
    const scope = rawScope?.replaceAll('\\_', '_');
    // MySQL database-level grants interpret unescaped underscores as wildcards.
    if (!scope?.startsWith('bsa_test_') || !rawScope || /(?<!\\)_/.test(rawScope) || scope.includes('\\') || /WITH GRANT OPTION/i.test(grant)) {
      throw new Error('Destructive test identity has unrestricted privileges');
    }
    if (scope === database) targetAllowed = true;
  }
  if (!targetAllowed) throw new Error('Destructive test database grant missing');
}

/** Re-check the connected identity before any destructive test SQL. */
export async function assertDestructiveTestDatabase(db: Kysely<DatabaseSchema>, source: EnvironmentSource): Promise<void> {
  const config = resolveDatabaseConfiguration(source, 'destructive-test');
  const result = await sql<{ database_name: string; account_name: string }>`SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name`.execute(db);
  const identity = result.rows[0];
  if (!identity || identity.database_name !== config.database || identity.account_name.split('@')[0] !== config.user
    || !['127.0.0.1', 'localhost', '::1'].includes(identity.account_name.split('@')[1] ?? '')) {
    throw new Error('Destructive test database identity mismatch');
  }
  const grants = await sql<Record<string, string>>`SHOW GRANTS`.execute(db);
  assertRestrictedTestGrants(grants.rows.flatMap((row) => Object.values(row)), config.database);
}
