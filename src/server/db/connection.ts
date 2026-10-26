import { readFileSync } from 'node:fs';
import { Kysely, MysqlDialect, MysqlQueryCompiler, type MysqlPool, type SelectModifierNode } from 'kysely';
import { admitEngine, engineSummary } from './engine.ts';
import { createPool } from 'mysql2';
import type { DatabaseConfiguration } from './config.ts';
import type { DatabaseSchema } from './schema.ts';

/** Equivalent shared row locks supported by both reviewed engines. */
class CompatibleCompiler extends MysqlQueryCompiler {
  protected override visitSelectModifier(node: SelectModifierNode): void {
    if (node.modifier === 'ForShare') {
      if (node.of) throw new Error('Unsupported shared-lock target.');
      this.append('lock in share mode');
    } else super.visitSelectModifier(node);
  }
}
class CompatibleDialect extends MysqlDialect {
  override createQueryCompiler() { return new CompatibleCompiler(); }
}

/** Server/tooling implementation. Application callers use the server-only facade. */
export function createDatabase(configuration: DatabaseConfiguration, reportEngine?: (summary:string)=>void) {
  if (configuration.hostingerLocal && (configuration.mode!=='production' || configuration.host!=='127.0.0.1' || configuration.port!==3306 || configuration.tls)) throw new Error('Invalid Hostinger local transport.');
  if (configuration.mode==='production' && !configuration.tls && !configuration.hostingerLocal) throw new Error('Verified production transport required.');
  const pool = createPool({
    host: configuration.host, port: configuration.port, user: configuration.user,
    password: configuration.password, database: configuration.database,
    connectionLimit: configuration.connectionLimit, maxIdle: configuration.connectionLimit,
    queueLimit: 20, waitForConnections: true, idleTimeout: 60000,
    connectTimeout: configuration.connectTimeout, timezone: 'Z', charset: 'utf8mb4_bin',
    multipleStatements: false, enableKeepAlive: true,
    ...(configuration.tls ? { ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2', ...(configuration.caCertPath ? { ca: readFileSync(configuration.caCertPath, 'utf8') } : {}) } } : {}),
  });
  const boundedPool: MysqlPool = {
    getConnection(callback) {
      let completed = false;
      const timer = setTimeout(() => {
        completed = true;
        Reflect.apply(callback, undefined, [new Error('Database connection acquisition timed out')]);
      }, configuration.acquireTimeout);
      pool.getConnection((error, connection) => {
        if (completed) { connection?.release(); return; }
        if (error) {
          clearTimeout(timer); completed = true;
          Reflect.apply(callback, undefined, [new Error('Database connection unavailable')]);
          return;
        }
        // Driver timezone controls serialization; SQL defaults also need UTC at
        // the server-session level, independent of the hosting machine timezone.
        connection.query("SET SESSION time_zone = '+00:00', sql_mode = CONCAT_WS(',', NULLIF(@@session.sql_mode, ''), 'STRICT_ALL_TABLES')", (initializationError) => {
          clearTimeout(timer);
          if (completed) { connection.release(); return; }
          completed = true;
          if (initializationError) {
            connection.release();
            Reflect.apply(callback, undefined, [new Error('Database session initialization failed')]);
          } else if (configuration.hostingerLocal) {
            connection.query({sql:'SELECT VERSION() AS version, @@version_comment AS vendor',timeout:configuration.acquireTimeout}, (engineError, rows) => {
              try {
                if (engineError || !Array.isArray(rows)) throw new Error();
                const version = (rows[0] as {version?:unknown} | undefined)?.version;
                if (typeof version !== 'string') throw new Error();
                reportEngine?.(engineSummary(version));
                const vendor = (rows[0] as {vendor?:unknown} | undefined)?.vendor;
                if (typeof vendor !== 'string') throw new Error();
                const engine = admitEngine(version,vendor);
                if (engine === 'mariadb') connection.query({sql:'SELECT @@SESSION.check_constraint_checks AS checks',timeout:configuration.acquireTimeout}, (checkError, checkRows) => {
                  if (checkError || !Array.isArray(checkRows) || Number((checkRows[0] as {checks?:unknown})?.checks) !== 1) { connection.release(); Reflect.apply(callback, undefined, [new Error('Database engine admission failed')]); }
                  else callback(null, connection);
                });
                else callback(null, connection);
              } catch { connection.release(); Reflect.apply(callback, undefined, [new Error('Database engine admission failed')]); }
            });
          } else callback(null, connection);
        });
      });
    },
    end(callback) { pool.end(callback); },
  };
  // No query logger: SQL values can contain credential hashes or MFA ciphertext.
  const db = new Kysely<DatabaseSchema>({ dialect: new CompatibleDialect({ pool: boundedPool }) });
  return { db, close: () => db.destroy() };
}
