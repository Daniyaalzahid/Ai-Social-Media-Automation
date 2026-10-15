import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { CompiledQuery, type Kysely, type DatabaseConnection } from 'kysely';
import { expect, it, vi } from 'vitest';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { HashCapacity } from '../../src/server/auth/passwords';
import { appendSecurityEvent } from '../../src/server/security/events';
import { passwordAttemptDiagnostic } from '../helpers/password-attempt-diagnostic';

function fixtureDatabase(fault?: Error) {
  const connection = { async executeQuery() { if (fault) throw fault; return { rows: [] }; } };
  const executor = { async provideConnection(consumer: (value: DatabaseConnection) => Promise<unknown>) { return consumer(connection as unknown as DatabaseConnection); } };
  return { getExecutor: () => executor, insertInto: () => ({ values: () => ({ execute: async () => [] }) }) } as unknown as Kysely<DatabaseSchema>;
}
it('retains only safe diagnostic fields for success, not verification inputs or identities', async () => {
  const canary = randomBytes(32).toString('hex'), identity = randomUUID();
  const native = vi.spyOn(argon2, 'verify').mockResolvedValue(true), db = fixtureDatabase(), diagnostic = passwordAttemptDiagnostic(db);
  try {
    await diagnostic.run(1, () => new HashCapacity(1, 2, 750).run(async () => {
      await argon2.verify(canary, canary);
      await appendSecurityEvent(db, { type: 'auth.password_verified', outcome: 'success', userId: identity, correlationId: randomUUID(), ipHash: randomBytes(32), metadata: { reasonCode: 'PASSWORD_VERIFIED' } });
    }));
    const report = diagnostic.report(), encoded = JSON.stringify(report);
    expect(report.attempts[0]?.classification).toBe('PASSWORD_VERIFIED'); expect(report.maximumActive).toBe(1);
    expect(Object.keys(report.attempts[0]!).sort()).toEqual(['request', 'classification', 'admitted', 'queued', 'queueWaitMs', 'nativeMs', 'rateAdmitted', 'queueDepth'].sort());
    expect(encoded.includes(canary) || encoded.includes(identity)).toBe(false);
  } finally { diagnostic.close(); native.mockRestore(); }
});
it('preserves controlled CAPACITY in the failing assertion without retaining result contents', async () => {
  const canary = randomBytes(32).toString('hex'), db = fixtureDatabase(), diagnostic = passwordAttemptDiagnostic(db);
  try {
    await diagnostic.run(2, async () => {
      await appendSecurityEvent(db, { type: 'auth.failure', outcome: 'failure', userId: null, correlationId: randomUUID(), ipHash: null, metadata: { reasonCode: 'CAPACITY' } });
      return { ok: false, message: canary };
    });
    const encoded = JSON.stringify(diagnostic.report()); let message = '';
    try { expect(false, encoded).toBe(true); } catch (error) { message = error instanceof Error ? error.message : ''; }
    expect(message.includes('CAPACITY')).toBe(true); expect(message.includes(canary)).toBe(false);
    expect(diagnostic.report().attempts[0]?.admitted).toBe(false);
  } finally { diagnostic.close(); }
});
it('bounds driver evidence to codes/SQLSTATE and restores every replaced boundary', async () => {
  const canary = randomBytes(32).toString('hex');
  const fault = Object.assign(new Error(canary), { code: 'ER_LOCK_DEADLOCK', sqlState: '40001', sql: canary, parameters: [canary] });
  const db = fixtureDatabase(fault), executor = db.getExecutor(), provide = executor.provideConnection;
  const capacityRun = HashCapacity.prototype.run, native = argon2.verify, diagnostic = passwordAttemptDiagnostic(db);
  try {
    await diagnostic.run(1, async () => {
      for (let i = 0; i < 10; i++) await executor.provideConnection((connection) => connection.executeQuery(CompiledQuery.raw('SELECT 1'))).catch(() => undefined);
    });
    const report = diagnostic.report(); expect(report.databaseErrors).toHaveLength(8);
    expect(report.databaseErrors.every((error) => error.request === 1 && error.code === 'ER_LOCK_DEADLOCK' && error.sqlState === '40001')).toBe(true);
    expect(JSON.stringify(report).includes(canary)).toBe(false);
  } finally { diagnostic.close(); }
  expect(executor.provideConnection === provide && HashCapacity.prototype.run === capacityRun && argon2.verify === native).toBe(true);
});
