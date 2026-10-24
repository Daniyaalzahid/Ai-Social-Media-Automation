import { sql, type Kysely } from 'kysely';
import type { EnvironmentSource } from '../config/schema.ts';
import type { DatabaseSchema } from './schema.ts';
import { resolveDatabaseConfiguration } from './config.ts';
import { migrateDatabase, assertMigrationsComplete, readMigrations } from './migrations.ts';
import { seedCatalog, assertCanonicalAuthorization } from './seeds.ts';

const unavailable = () => new Error('Production database provisioning unavailable.');

/** Separate administrative admission; the ordinary migration purpose stays forbidden. */
export function productionProvisioningConfiguration(source: EnvironmentSource, confirmation: string) {
  try {
    if (source.APP_ENV !== 'production' || source.NODE_ENV !== 'production' || source.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw unavailable();
    // Validate BOTH complete URLs, including passwords/query/fragment/isolation guards.
    // Resolving runtime configuration does not open a runtime connection.
    const runtime = resolveDatabaseConfiguration(source, 'runtime');
    const admin = resolveDatabaseConfiguration(source, 'bootstrap');
    if (!runtime.tls || !admin.tls || runtime.host !== admin.host || runtime.port !== admin.port || runtime.database !== admin.database || runtime.user === admin.user || confirmation !== '--confirm-production-database=' + admin.database) throw unavailable();
    return admin;
  } catch { throw unavailable(); }
}

/** Trusted administrative core, also exercised against explicitly isolated test databases.
 * Only the separate CLI constructs a production pool; no web startup imports this module.
 */
export async function provisionDatabase(db: Kysely<DatabaseSchema>, expected: Readonly<{database:string;user:string}>) {
  try {
    await readMigrations(); // Verify reviewed files before any schema administration.
    const identity = (await sql<{database_name:string;account_name:string}>`SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name`.execute(db)).rows[0];
    if (!identity || identity.database_name !== expected.database || identity.account_name.split('@')[0] !== expected.user) throw unavailable();
    await migrateDatabase(db);
    await assertMigrationsComplete(db);
    await seedCatalog(db);
    await db.transaction().execute(tx => assertCanonicalAuthorization(tx));
  } catch { throw unavailable(); }
}
