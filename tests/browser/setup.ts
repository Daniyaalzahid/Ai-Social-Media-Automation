import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { migrateDatabase } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { hashPassword } from '../../src/server/auth/passwords';
import { loadMfaKey } from '../../src/server/auth/mfa-crypto';
import { browserConfiguration } from '../../src/server/auth/browser-security';

/** Explicit isolated development DB only. No production or env fallback. */
export default async function setup() {
  const configuration = resolveDatabaseConfiguration(process.env, 'migration');
  if (configuration.mode !== 'development' || configuration.database !== 'bsa_dev_browser_tests' || configuration.user !== 'bsa_dev_browser_migration') throw new Error('Isolated browser database required');
  browserConfiguration(process.env); loadMfaKey(process.env);
  const handle = createDatabase(configuration);
  try {
    const identity = (await sql<{ database_name: string; account_name: string }>`SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name`.execute(handle.db)).rows[0];
    if (identity?.database_name !== configuration.database || identity.account_name.split('@')[0] !== configuration.user) throw new Error('Isolated browser identity mismatch');
    const grants = await sql<Record<string, string>>`SHOW GRANTS FOR CURRENT_USER()`.execute(handle.db);
    for (const row of grants.rows) for (const value of Object.values(row)) {
      if (/WITH GRANT OPTION|ON \*\.\*/i.test(value) && !/^GRANT USAGE ON \*\.\*/.test(value)) throw new Error('Unsafe browser fixture grants');
      if (!/^GRANT USAGE ON \*\.\*/.test(value) && !value.includes('`bsa\\_dev\\_browser\\_tests`')) throw new Error('Unsafe browser fixture grants');
    }
    await migrateDatabase(handle.db); await seedCatalog(handle.db);
    const password = randomBytes(32).toString('hex'), encoded = await hashPassword(password);
    const fixtures = [];
    for (const role of ['VIEWER', 'VIEWER', 'VIEWER', 'VIEWER', 'VIEWER', 'VIEWER', 'VIEWER', 'OWNER', 'MARKETING_ADMIN']) {
      const id = randomUUID(), email = `${id}@example.test`;
      await handle.db.insertInto('users').values({ id, email_normalized: email, display_name: 'Isolated browser test', status: role === 'VIEWER' ? 'active' : 'pending_mfa', password_hash: encoded.reveal(), password_changed_at: null, last_login_at: null }).execute();
      await handle.db.insertInto('user_roles').values({ user_id: id, role_id: canonicalCatalogId('role', role), assigned_by: null }).execute();
      fixtures.push({ id, email, role });
    }
    // Playwright propagates global-setup environment to test workers. Keep
    // ephemeral credentials out of artifacts, files and reporter attachments.
    process.env.BSA_BROWSER_FIXTURE = JSON.stringify({ password, users: fixtures });
  } catch { throw new Error('Isolated browser fixture setup failed'); }
  finally { await handle.close(); }
}
