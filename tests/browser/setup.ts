import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { migrateDatabase } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { hashPassword } from '../../src/server/auth/passwords';
import { newTotpSecret, encryptMfa } from '../../src/server/auth/mfa-crypto';
import { tokenHash } from '../../src/server/auth/access';
import { SensitiveValue } from '../../src/server/security/sensitive';
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
    // This guarded, disposable browser schema owns the AI fixtures. Previous
    // runs must not consume this run's global AI quota or crash-lease slots.
    await handle.db.deleteFrom('ai_generations').execute();
    await handle.db.deleteFrom('auth_rate_limits').where('scope','in',['ai_global_day','ai_actor_day','ai_actor_minute']).execute();
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
    const uiUsers = [], teamUsers = [];
    for (const role of ['OWNER','OWNER','OWNER','OWNER','OWNER','OWNER', 'OWNER','MARKETING_ADMIN','CONTENT_CREATOR','REVIEWER','VIEWER']) {
      const id = randomUUID(), methodId = randomUUID(), sessionId = randomUUID(), email = `${id}@example.test`, secret = newTotpSecret(), now = new Date();
      const raw = new SensitiveValue(randomBytes(32).toString('base64url'));
      await handle.db.insertInto('users').values({ id, email_normalized: email, display_name: 'Isolated administration test', status: 'active', password_hash: encoded.reveal(), password_changed_at: null, last_login_at: null }).execute();
      await handle.db.insertInto('user_roles').values({ user_id: id, role_id: canonicalCatalogId('role', role), assigned_by: null }).execute();
      if (['OWNER','MARKETING_ADMIN'].includes(role)) await handle.db.insertInto('mfa_methods').values({ id: methodId, user_id: id, type: 'totp', state: 'active', ...encryptMfa(secret, loadMfaKey(process.env), id, methodId), created_at: now, confirmed_at: now, enrollment_expires_at: null, last_accepted_step: null }).execute();
      await handle.db.insertInto('sessions').values({ id: sessionId, user_id: id, token_hash: tokenHash(raw), auth_version: 1, created_at: now, last_activity_at: now, idle_expires_at: new Date(+now + 1800000), absolute_expires_at: new Date(+now + 86400000), authenticated_at: now, mfa_verified_at: ['OWNER','MARKETING_ADMIN'].includes(role) ? now : null, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null }).execute();
      const fixture = { id, email, role, token: raw.reveal(), secret: secret.reveal() };
      if (uiUsers.length < 6) uiUsers.push(fixture); else teamUsers.push(fixture);
    }
    process.env.BSA_BROWSER_FIXTURE = JSON.stringify({ password, users: fixtures, uiUsers, teamUsers });
  } catch { throw new Error('Isolated browser fixture setup failed'); }
  finally { await handle.close(); }
}
