import { readFileSync } from 'node:fs';
import { Kysely, MysqlDialect, type MysqlPool } from 'kysely';
import { createPool } from 'mysql2';
import type { DatabaseConfiguration } from './config.ts';
import type { DatabaseSchema } from './schema.ts';

/** Server/tooling implementation. Application callers use the server-only facade. */
export function createDatabase(configuration: DatabaseConfiguration) {
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
          } else callback(null, connection);
        });
      });
    },
    end(callback) { pool.end(callback); },
  };
  // No query logger: SQL values can contain credential hashes or MFA ciphertext.
  const db = new Kysely<DatabaseSchema>({ dialect: new MysqlDialect({ pool: boundedPool }) });
  return { db, close: () => db.destroy() };
}
