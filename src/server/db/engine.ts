import { createHash } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import type { DatabaseSchema } from './schema.ts';

export type DatabaseEngine = 'mysql' | 'mariadb';
export function admitEngine(version: string, vendor?: string): DatabaseEngine {
  if (/^(?:5\.5\.5-)?11\.8\.9-MariaDB(?:-|$)/.test(version)) return 'mariadb';
  if (/^(?:5\.5\.5-)?11\.4\.(\d+)-MariaDB(?:-|$)/.test(version)) {
    const patch = Number(/11\.4\.(\d+)/.exec(version)![1]);
    if (patch >= 13) return 'mariadb';
  } else if (!/mariadb/i.test(version)) {
    const m = /^(8|9)\.(\d+)\.(\d+)(?:[-.]|$)/.exec(version);
    if (vendor !== undefined && !/^(MySQL (?:Community|Enterprise|Cluster) Server(?:.*)|Ubuntu|\(Ubuntu\))$/.test(vendor)) throw new Error('Unreviewed database vendor.');
    if (m && (m[1] === '9' || Number(m[2]) > 0 || Number(m[3]) >= 17)) return 'mysql';
  }
  throw new Error('Unsupported database engine/version; reviewed MySQL or MariaDB 11.4.13–11.4.x or exact 11.8.9 required.');
}
export function engineSummary(version:string) { return (/mariadb/i.test(version) ? 'MariaDB ' : 'MySQL/unknown ') + (version.replace(/^5\.5\.5-/, '').match(/\d+\.\d+\.\d+/)?.[0] ?? 'UNKNOWN'); }
export async function detectEngine(db: Kysely<DatabaseSchema>, report?: (summary:string)=>void) {
  const row = (await sql<{version:string;vendor:string}>`SELECT VERSION() AS version, @@version_comment AS vendor`.execute(db)).rows[0];
  if (!row || typeof row.version !== 'string') throw new Error('Database engine admission unavailable.');
  // Report only the numeric version/category, never an arbitrary server banner.
  report?.(engineSummary(row.version));
  if (typeof row.vendor !== 'string') throw new Error('Database vendor admission unavailable.');
  const engine = admitEngine(row.version,row.vendor);
  if (engine === 'mariadb') {
    const checks = (await sql<{checks:number}>`SELECT @@SESSION.check_constraint_checks AS checks`.execute(db)).rows[0];
    if (Number(checks?.checks) !== 1) throw new Error('Database CHECK enforcement required.');
  }
  return {engine,version:row.version};
}

// Reviewed canonical source identities. No arbitrary/new SQL is admitted to the
// MariaDB transformer. Future migrations require an explicit compatibility review.
const canonical: Readonly<Record<string,string>> = {
  "0000_phase2a_security_foundation.sql": "f1bd8bb9ec302a9e67c8a25d70dde8f7707fdbdfbe3e0d4e263ef88f4b33f799",
  "0001_security_invariants.sql": "6e3725de5e3eb5af2141e0e6d41e9269f607d8610c6c7e59153e38d4fec35e02",
  "0002_review_integrity.sql": "429a62df6842fd1bb0261baaf51b6121305cc1b3576682f51b9b5dce87f5a811",
  "0003_password_verified_challenges.sql": "978abcf2a7456c1259c5208442eebdeb9e78233b1d692c40f2ef2e2cded7a401",
  "0004_phase2c_access_bindings.sql": "48130cb75ecc20db6e1aec08fdb475f73b07e5a73eef6515cad3af2b7ca55925",
  "0005_phase2d_administration.sql": "9d973926b53e35a7721eacff046bbc347ff43b2a9a5558c6112ca28a2bbc716a",
  "0006_brand_brain.sql": "ac785551c2ca5070c2e62de90877788005c8f4a2ff02e5c74bb0cad50c895c37",
  "0007_temporary_media.sql": "01495fcf7d3945d951935f807c9f952eb149ef59b8449c9083884c85642a9d4a",
  "0008_ai_generations.sql": "d081f12d4575f5b9b1092fada7d761445f6dcaff90c364b0cd0d3f4566e0c7f1",
  "0009_content_workflow.sql": "f4c21f84c2127f6cced5d881151709fd4df55424f3a43b72d04f6efaa0fc0782",
  "0010_social_connections.sql": "b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce",
  "0011_publishing_foundation.sql": "4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652"
};
export function engineStatements(engine: DatabaseEngine, name: string, source: string) {
  const statements = source.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  if (engine === 'mysql') return statements;
  if (engine !== 'mariadb' || createHash('sha256').update(source).digest('hex') !== canonical[name]) throw new Error('Unreviewed engine-compatible migration source.');
  return statements.map(statement => {
    let result = statement;
    if (name === '0002_review_integrity.sql') result = result.replace('ALTER TABLE users DROP CHECK users_active_password,', 'ALTER TABLE users DROP CONSTRAINT users_active_password,');
    if (['0007_temporary_media.sql', '0011_publishing_foundation.sql'].includes(name)) {
      result = result.replace(/REGEXP_LIKE\(([a-z_]+|CONVERT\([a-z_]+ USING ascii\)),'([^']*)','c'\)/g, "(BINARY $1 REGEXP BINARY '$2')");
    }
    if (['0008_ai_generations.sql','0009_content_workflow.sql','0010_social_connections.sql','0011_publishing_foundation.sql'].includes(name)) {
      // MariaDB JSON is validated LONGTEXT, not MySQL binary JSON. Bound actual
      // stored UTF-8 text bytes, including whitespace; do not remove size checks.
      result = result.replace(/JSON_STORAGE_SIZE\(([a-z_]+)\)/g, 'OCTET_LENGTH($1)');
    }
    if (/DROP CHECK|REGEXP_LIKE|JSON_STORAGE_SIZE/.test(result)) throw new Error('Unresolved migration compatibility.');
    return result;
  });
}
