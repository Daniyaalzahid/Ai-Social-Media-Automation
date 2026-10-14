import 'server-only';
import { resolveDatabaseConfiguration } from './config';
import { createDatabase } from './connection';

type DatabaseHandle = ReturnType<typeof createDatabase>;
const processState = globalThis as typeof globalThis & { bismillahDatabase?: DatabaseHandle };

/** Lazy singleton: importing/building does not open connections or run migrations. */
export function getDatabase() {
  processState.bismillahDatabase ??= createDatabase(resolveDatabaseConfiguration(process.env));
  return processState.bismillahDatabase.db;
}
