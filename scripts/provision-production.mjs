import { productionProvisioningConfiguration, provisionDatabase } from '../src/server/db/provision.ts';
import { createDatabase } from '../src/server/db/connection.ts';

let handle;
try {
  if (process.argv.length !== 3) throw new Error();
  const configuration = productionProvisioningConfiguration(process.env, process.argv[2]);
  // Only the admitted DATABASE_MIGRATION_URL identity ever opens a connection.
  handle = createDatabase(configuration);
  await provisionDatabase(handle.db, configuration);
  console.log('Production database provisioning completed. Owner bootstrap remains a separate action.');
} catch {
  console.error('Production database provisioning unavailable. Verify explicit production intent, private configuration, database identity and migration integrity.');
  process.exitCode = 1;
} finally {
  if (handle) {
    try { await handle.close(); }
    catch { console.error('Production provisioning database cleanup unavailable.'); process.exitCode = 1; }
  }
}
