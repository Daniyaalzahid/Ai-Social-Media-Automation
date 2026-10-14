import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { sql, type Kysely } from 'kysely';
import { Migrator, type Migration } from 'kysely/migration';
import { z } from 'zod';
import type { DatabaseSchema } from './schema.ts';

const folder = new URL('../../../migrations/', import.meta.url);
const manifestSchema = z.array(z.object({ name: z.string().regex(/^\d{4}_[a-z0-9_]+\.sql$/), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1);

export async function readMigrations() {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(new URL('manifest.json', folder), 'utf8')));
  const names = manifest.map((entry) => entry.name);
  const files = (await readdir(folder)).filter((name) => name.endsWith('.sql')).sort();
  if (new Set(names).size !== names.length || JSON.stringify(names) !== JSON.stringify(files)) throw new Error('Migration manifest mismatch');
  return Promise.all(manifest.map(async (entry) => {
    const content = await readFile(new URL(entry.name, folder), 'utf8');
    if (createHash('sha256').update(content).digest('hex') !== entry.sha256) throw new Error('Migration checksum mismatch');
    return { ...entry, statements: content.split('--> statement-breakpoint').map((value) => value.trim()).filter(Boolean) };
  }));
}

/** Explicit guarded CLI/test use only; never invoked on application startup. */
export async function migrateDatabase(db: Kysely<DatabaseSchema>): Promise<void> {
  const entries = await readMigrations();
  await sql`CREATE TABLE IF NOT EXISTS schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64) NOT NULL, state enum('applying','applied') NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`.execute(db);
  const applied = await sql<{ name: string; sha256: string; state: string }>`SELECT name, sha256, state FROM schema_migration_checksums`.execute(db);
  for (const row of applied.rows) {
    if (row.state !== 'applied') throw new Error('Incomplete migration requires isolated backup restoration');
    if (!entries.some((entry) => entry.name === row.name && entry.sha256 === row.sha256)) throw new Error('Applied migration checksum mismatch');
  }
  const exists = await sql<{ count: number }>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='kysely_migration'`.execute(db);
  const journal = Number(exists.rows[0]?.count) ? (await sql<{ name: string }>`SELECT name FROM kysely_migration ORDER BY name`.execute(db)).rows : [];
  const expectedNames = entries.slice(0, applied.rows.length).map((entry) => entry.name);
  if (journal.length !== applied.rows.length || JSON.stringify(journal.map((row) => row.name)) !== JSON.stringify(expectedNames)
    || applied.rows.some((entry) => !expectedNames.includes(entry.name))) {
    throw new Error('Migration ledger inconsistent; isolated restoration required');
  }
  const migrations: Record<string, Migration> = Object.fromEntries(entries.map((entry) => [entry.name, {
    up: async (connection) => {
      await sql`INSERT INTO schema_migration_checksums (name, sha256, state) VALUES (${entry.name}, ${entry.sha256}, 'applying')`.execute(connection);
      for (const statement of entry.statements) await sql.raw(statement).execute(connection);
      await sql`UPDATE schema_migration_checksums SET state = 'applied' WHERE name = ${entry.name}`.execute(connection);
    },
    // MySQL DDL is not transactionally reversible. Recovery uses backup restoration
    // or an explicitly reviewed forward migration, never an automatic destructive down.
  } satisfies Migration]));
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const result = await migrator.migrateToLatest();
  if (result.error) throw new Error('Database migration failed; inspect schema and restore isolated backup before retrying');
}
