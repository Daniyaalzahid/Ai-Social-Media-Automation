import { createRequire } from 'node:module';
import path from 'node:path';
import { beforeEach, afterEach, afterAll } from 'vitest';
/** Worker-local diagnostics before production sanitization; never prints SQL, values or messages. */
export function installMySqlReviewDiagnostics() {
  const require = createRequire(import.meta.url);
  const connection = require(path.join(path.dirname(require.resolve('mysql2')), 'lib/base/connection.js')) as { prototype: { query: (...args: unknown[]) => unknown } };
  const original = connection.prototype.query;
  let failures: { code: string | null; errno: number | null; sqlState: string | null; command: string }[] = [];
  connection.prototype.query = function (this: unknown, ...args: unknown[]) {
    const callback = args.at(-1), text = typeof args[0] === 'string' ? args[0] : '';
    if (typeof callback === 'function') args[args.length - 1] = function (this: unknown, ...values: unknown[]) {
      const error = values[0];
      if (error && typeof error === 'object' && failures.length < 20) {
        const e = error as Record<string, unknown>;
        failures.push({ code: typeof e.code === 'string' && /^[A-Z0-9_]+$/.test(e.code) ? e.code : null, errno: typeof e.errno === 'number' ? e.errno : null,
          sqlState: typeof e.sqlState === 'string' && /^[A-Z0-9]{5}$/.test(e.sqlState) ? e.sqlState : null, command: /^\s*(SELECT|UPDATE|INSERT|DELETE|START|COMMIT|ROLLBACK)\b/i.exec(text)?.[1]?.toUpperCase() ?? 'OTHER' });
      }
      return Reflect.apply(callback, this, values);
    };
    return Reflect.apply(original, this, args);
  };
  beforeEach(() => { failures = []; });
  afterEach(({ task }) => { if (task.result?.state === 'fail' && failures.length) console.error(JSON.stringify({ redactedMySqlBoundary: failures })); });
  afterAll(() => { connection.prototype.query = original; });
}
