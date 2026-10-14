import { spawnSync } from 'node:child_process';
import { resolveDatabaseConfiguration } from '../src/server/db/config.ts';
import { createDatabase } from '../src/server/db/connection.ts';
import { migrateDatabase } from '../src/server/db/migrations.ts';
import { seedCatalog } from '../src/server/db/seeds.ts';
import { assertDestructiveTestDatabase } from '../src/server/db/test-guard.ts';

const command = process.argv[2];
try {
  if (command === 'test') {
    resolveDatabaseConfiguration(process.env, 'destructive-test');
    resolveDatabaseConfiguration(process.env, 'runtime');
    const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.database.config.ts'], { stdio: 'inherit', env: process.env });
    process.exitCode = result.status ?? 1;
  } else if (command === 'migrate' || command === 'seed') {
    const configuration = resolveDatabaseConfiguration(process.env, 'migration');
    if (configuration.mode === 'test') resolveDatabaseConfiguration(process.env, 'destructive-test');
    const handle = createDatabase(configuration);
    try {
      if (configuration.mode === 'test') await assertDestructiveTestDatabase(handle.db, process.env);
      if (command === 'migrate') await migrateDatabase(handle.db);
      else await seedCatalog(handle.db);
      console.log(`Isolated database ${command} completed.`);
    } finally { await handle.close(); }
  } else throw new Error('Unknown database command');
} catch {
  // Do not print driver errors, credentials, SQL values or environment contents.
  console.error('Database command failed. Check isolated configuration and migration recovery documentation.');
  process.exitCode = 1;
}
