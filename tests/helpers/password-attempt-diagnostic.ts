import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import argon2 from 'argon2';
import { vi } from 'vitest';
import type { Kysely, DatabaseConnection, CompiledQuery, QueryResult } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { HashCapacity } from '../../src/server/auth/passwords';
import * as events from '../../src/server/security/events';
import * as rates from '../../src/server/security/rate-limits';

const reasons = ['PASSWORD_VERIFIED', 'CAPACITY', 'RATE_LIMITED', 'INVALID_CREDENTIALS', 'INCOMPLETE', 'DISABLED', 'AUTH_VERSION_CHANGED', 'UNAVAILABLE'] as const;
type Reason = typeof reasons[number] | 'UNKNOWN';
type Attempt = { request: number; classification: Reason; admitted: boolean; queued: boolean; queueWaitMs: number | null; nativeMs: number | null; rateAdmitted: boolean | null; queueDepth: number | null };

/** Scoped test instrumentation only. Never retain invocation arguments/results/errors. */
export function passwordAttemptDiagnostic(db: Kysely<DatabaseSchema>) {
  const labels = new AsyncLocalStorage<number>();
  const attempts = new Map<number, Attempt>();
  const databaseErrors: { request: number | null; code: string | null; sqlState: string | null }[] = [];
  let active = 0, maximumActive = 0, pending = 0;
  const current = () => attempts.get(labels.getStore() ?? 0);
  const restore: (() => void)[] = [];
  const run = HashCapacity.prototype.run;
  const native = argon2.verify;
  const append = events.appendSecurityEvent;
  const admit = rates.admitAuthentication;
  const executor = db.getExecutor(), provide = executor.provideConnection;
  HashCapacity.prototype.run = async function<T>(operation: () => Promise<T>): Promise<T> {
    const row = current(), start = performance.now();
    if (row) { row.queueDepth = pending; row.queued = active >= this.maximum; }
    pending++;
    let admitted = false;
    try { return await run.call(this, async () => {
      admitted = true; pending--; active++; maximumActive = Math.max(maximumActive, active);
      if (row) { row.admitted = true; row.queueWaitMs = performance.now() - start; }
      try { return await operation(); } finally { active--; }
    }) as T; }
    catch (error) {
      if (!admitted) { pending--; if (row) row.queueWaitMs = performance.now() - start; }
      if (row && error instanceof Error && error.name === 'HashCapacityError') row.classification = 'CAPACITY';
      throw error;
    }
  };
  restore.push(() => { HashCapacity.prototype.run = run; });
  argon2.verify = async (...args: Parameters<typeof native>) => {
    const row = current(), start = performance.now();
    try { return await native(...args); } finally { if (row) row.nativeMs = performance.now() - start; }
  };
  restore.push(() => { argon2.verify = native; });
  const eventSpy = vi.spyOn(events, 'appendSecurityEvent').mockImplementation(async (...args) => {
    const row = current(), reason = args[1].metadata.reasonCode;
    if (row && reasons.some((value) => value === reason)) row.classification = reason as Reason;
    return append(...args);
  });
  restore.push(() => eventSpy.mockRestore());
  const rateSpy = vi.spyOn(rates, 'admitAuthentication').mockImplementation(async (...args) => {
    const result = await admit(...args), row = current(); if (row) row.rateAdmitted = result; return result;
  });
  restore.push(() => rateSpy.mockRestore());
  const recordError = (error: unknown) => {
    if (databaseErrors.length >= 8) return;
    // Read allowlisted driver codes only; never stringify an Error, SQL or parameters.
    const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    databaseErrors.push({ request: labels.getStore() ?? null,
      code: typeof value.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(value.code) ? value.code : null,
      sqlState: typeof value.sqlState === 'string' && /^[A-Z0-9]{5}$/.test(value.sqlState) ? value.sqlState : null });
  };
  executor.provideConnection = async <T>(consumer: (connection: DatabaseConnection) => Promise<T>, options?: Parameters<typeof provide>[1]): Promise<T> => {
    try { return await provide.call(executor, async (connection) => {
      const execute = connection.executeQuery;
      connection.executeQuery = async <R>(query: CompiledQuery, queryOptions?: Parameters<typeof execute>[1]): Promise<QueryResult<R>> => {
        try { return await execute.call(connection, query, queryOptions) as QueryResult<R>; } catch (error) { recordError(error); throw error; }
      };
      try { return await consumer(connection); } finally { connection.executeQuery = execute; }
    }, options) as T; } catch (error) { if (!databaseErrors.some((item) => item.request === (labels.getStore() ?? null))) recordError(error); throw error; }
  };
  restore.push(() => { executor.provideConnection = provide; });
  return {
    run<T>(request: 1 | 2, work: () => Promise<T>): Promise<T> {
      attempts.set(request, { request, classification: 'UNKNOWN', admitted: false, queued: false, queueWaitMs: null, nativeMs: null, rateAdmitted: null, queueDepth: null });
      return labels.run(request, work);
    },
    report() { return { attempts: [...attempts.values()].map((row) => ({ ...row })), maximumActive, databaseErrors: databaseErrors.map((row) => ({ ...row })) }; },
    resources() {
      const read = (path: string, pattern: RegExp) => { try { return readFileSync(path, 'utf8').split('\n').filter((line) => pattern.test(line)).join(';'); } catch { return 'unavailable'; } };
      return { rssBytes: process.memoryUsage().rss, cpuQuota: read('/sys/fs/cgroup/cpu.max', /^\d+ \d+$/), cpuScheduling: read('/sys/fs/cgroup/cpu.stat', /^(nr_periods|nr_throttled|throttled_usec) \d+$/) };
    },
    close() { for (const undo of restore.reverse()) undo(); },
  };
}
