import { createDatabase } from '../src/server/db/connection.ts';
import { resolveDatabaseConfiguration } from '../src/server/db/config.ts';
import { assertDestructiveTestDatabase } from '../src/server/db/test-guard.ts';
import { verifyBootstrapDatabase, bootstrapOwner } from '../src/server/auth/bootstrap.ts';
import { readProtectedLine } from '../src/server/auth/terminal.ts';

let handle;
try {
  if (process.argv.length !== 2 || !process.stdin.isTTY || !process.stderr.isTTY || typeof process.stdin.setRawMode !== 'function') throw new Error();
  const configuration = resolveDatabaseConfiguration(process.env, 'bootstrap');
  if (configuration.mode === 'test') resolveDatabaseConfiguration(process.env, 'destructive-test');
  const expected = `BOOTSTRAP ${configuration.mode} ${configuration.database}`;
  const confirmation = await readProtectedLine(process.stdin, process.stderr, `Database: ${configuration.mode} / ${configuration.host} / ${configuration.database}\nType ${expected} to continue: `, false);
  if (confirmation !== expected) throw new Error();
  handle = createDatabase(configuration);
  await verifyBootstrapDatabase(handle.db, configuration);
  if (configuration.mode === 'test') await assertDestructiveTestDatabase(handle.db, process.env);
  const email = await readProtectedLine(process.stdin, process.stderr, 'Owner email: ', false);
  const displayName = await readProtectedLine(process.stdin, process.stderr, 'Display name: ', false);
  let password = await readProtectedLine(process.stdin, process.stderr, 'Password (hidden): ', true);
  let repeated = await readProtectedLine(process.stdin, process.stderr, 'Confirm password (hidden): ', true);
  if (password !== repeated) throw new Error();
  const result = await bootstrapOwner(handle.db, { email, displayName, password }, configuration);
  password = ''; repeated = '';
  console.log(`Owner created in ${result.state}. No workspace access, session or MFA factor was issued.`);
} catch {
  console.error('Owner bootstrap unavailable. A secure interactive terminal, correct isolated/admin database configuration and an unused installation are required.');
  process.exitCode = 1;
} finally {
  if (handle) {
    try { await handle.close(); }
    catch { console.error('Owner bootstrap database cleanup unavailable.'); process.exitCode = 1; }
  }
}
