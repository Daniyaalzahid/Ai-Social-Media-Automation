import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type { KyselyPlugin } from 'kysely';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { bootstrapOwner as bootstrap, verifyBootstrapDatabase } from '../../src/server/auth/bootstrap';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { canonicalCatalogId, seedCatalog } from '../../src/server/db/seeds';
import * as events from '../../src/server/security/events';
import * as passwords from '../../src/server/auth/passwords';

const target = scratchDatabase('bsa_test_recovery'), db = target.handle.db;
const bootstrapOwner = (connection: typeof db, input: Parameters<typeof bootstrap>[1]) => bootstrap(connection, input, resolveDatabaseConfiguration(target.source, 'bootstrap'));
const input = () => ({ email: 'initial.owner@example.test', displayName: 'Synthetic Owner', password: randomBytes(24).toString('hex') });
beforeEach(() => resetScratch(target));
afterAll(() => target.handle.close());

describe('CLI-first bootstrap transaction primitive', () => {
  it('creates one canonical pending-MFA Owner and consumes the installation atomically', async () => {
    await verifyBootstrapDatabase(db, resolveDatabaseConfiguration(target.source, 'bootstrap'));
    const result = await bootstrapOwner(db, input());
    expect(result.state).toBe('MFA_ENROLLMENT_REQUIRED');
    const user = await db.selectFrom('users').select(['status', 'id']).executeTakeFirstOrThrow();
    expect(user.status).toBe('pending_mfa');
    const role = await db.selectFrom('user_roles').innerJoin('roles', 'roles.id', 'user_roles.role_id').select('roles.code').executeTakeFirstOrThrow();
    expect(role.code).toBe('OWNER');
    const state = await db.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow();
    expect(state.initial_owner_id).toBe(user.id); expect(state.bootstrap_consumed_at).not.toBeNull();
    expect(await db.selectFrom('audit_logs').select('action').execute()).toHaveLength(1);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('mfa_methods').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('mfa_recovery_codes').select('id').execute()).toHaveLength(0);
    await expect(bootstrapOwner(db, input())).rejects.toThrow('Security operation unavailable');
  });
  it('does not reopen after Owner disable or demotion', async () => {
    const owner = await bootstrapOwner(db, input());
    await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', owner.userId).execute();
    await db.deleteFrom('user_roles').where('user_id', '=', owner.userId).execute();
    await expect(bootstrapOwner(db, input())).rejects.toThrow();
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(1);
  });
  it('rejects an existing inactive Owner even with an unconsumed singleton', async () => {
    await makeUser(db, randomBytes(24).toString('hex'), 'disabled', 'OWNER');
    await expect(bootstrapOwner(db, input())).rejects.toThrow();
    expect((await db.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow()).bootstrap_consumed_at).toBeNull();
  });
  it('serializes concurrent bootstrap attempts under the singleton lock', async () => {
    const encoded = await passwords.hashPassword(randomBytes(24).toString('hex'));
    const spy = vi.spyOn(passwords, 'hashPassword').mockResolvedValue(encoded);
    const results = await Promise.allSettled([bootstrapOwner(db, input()), bootstrapOwner(db, { ...input(), email: 'second.owner@example.test' })]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(1); spy.mockRestore();
  });
  it('rolls back Owner, role, marker and success event when required audit fails', async () => {
    const spy = vi.spyOn(events, 'appendAudit').mockRejectedValueOnce(new Error('Synthetic storage failure'));
    await expect(bootstrapOwner(db, input())).rejects.toThrow('Security operation unavailable');
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('user_roles').select('user_id').execute()).toHaveLength(0);
    expect((await db.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow()).bootstrap_consumed_at).toBeNull();
    expect(await db.selectFrom('security_events').select('id').where('type', '=', 'bootstrap.success').execute()).toHaveLength(0); spy.mockRestore();
  });
  it('rejects a mismatched database identity before bootstrap', async () => {
    const configuration = resolveDatabaseConfiguration(target.source, 'bootstrap');
    await expect(verifyBootstrapDatabase(db, { ...configuration, database: 'bsa_test_wrong' })).rejects.toThrow();
    await expect(bootstrap(db, input(), { ...configuration, database: 'bsa_test_wrong' })).rejects.toThrow();
    await expect(verifyBootstrapDatabase(db, { ...configuration, user: 'bsa_test_runtime' })).rejects.toThrow();
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('security_events').select('id').execute()).toHaveLength(0);
  });
  it('runs two actual interactive CLI processes with exactly one winner and no password echo', async () => {
    const password = randomBytes(24).toString('hex');
    const result = spawnSync('python3', ['tests/helpers/secure-terminal-probe.py', path.resolve('.'), process.execPath, 'cli_race'], {
      input: JSON.stringify({ source: target.source, password }), encoding: 'utf8', timeout: 25000,
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ successes: 1, safeFailures: 0, restored: true, leaked: false, unexpectedSuccess: false });
    const owner = await db.selectFrom('users').select(['status', 'password_hash']).executeTakeFirstOrThrow();
    expect(owner.status).toBe('pending_mfa');
    const { SensitiveValue } = await import('../../src/server/security/sensitive');
    expect(await passwords.verifyPassword(new SensitiveValue(owner.password_hash!), password)).toBe(true);
    expect(await db.selectFrom('sessions').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('auth_challenges').select('id').execute()).toHaveLength(0);
  });
  it.each(['active', 'disabled'] as const)('rejects any pre-existing %s Owner', async (status) => {
    await makeUser(db, randomBytes(24).toString('hex'), status, 'OWNER');
    await expect(bootstrapOwner(db, input())).rejects.toThrow('Security operation unavailable');
    expect((await db.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow()).bootstrap_consumed_at).toBeNull();
  });
  it('rejects missing/malformed installation state without relaxing SQL constraints', async () => {
    await expect(db.updateTable('installation_state').set({ bootstrap_consumed_at: new Date(), initial_owner_id: null }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await db.deleteFrom('installation_state').execute();
    await expect(bootstrapOwner(db, input())).rejects.toThrow();
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);
  });
  it.each(['missing_owner', 'wrong_owner_id', 'wrong_owner_code', 'missing_permission', 'wrong_permission_code', 'missing_owner_grant', 'extra_admin_grant'] as const)('fails closed for unexpected authorization seeds: %s', async (kind) => {
    const ownerId = canonicalCatalogId('role', 'OWNER'), securityId = canonicalCatalogId('permission', 'security.manage');
    if (kind === 'missing_owner' || kind === 'wrong_owner_id') {
      await db.deleteFrom('role_permissions').where('role_id', '=', ownerId).execute();
      await db.deleteFrom('roles').where('id', '=', ownerId).execute();
      if (kind === 'wrong_owner_id') await db.insertInto('roles').values({ id: randomUUID(), code: 'OWNER', label: 'Corrupt fixture' }).execute();
    } else if (kind === 'wrong_owner_code') await db.updateTable('roles').set({ code: 'WRONG_CODE' }).where('id', '=', ownerId).execute();
    else if (kind === 'missing_permission') {
      await db.deleteFrom('role_permissions').where('permission_id', '=', securityId).execute();
      await db.deleteFrom('permissions').where('id', '=', securityId).execute();
    } else if (kind === 'wrong_permission_code') await db.updateTable('permissions').set({ code: 'wrong.code' }).where('id', '=', securityId).execute();
    else if (kind === 'missing_owner_grant') await db.deleteFrom('role_permissions').where('role_id', '=', ownerId).where('permission_id', '=', securityId).execute();
    else await db.insertInto('role_permissions').values({ role_id: canonicalCatalogId('role', 'MARKETING_ADMIN'), permission_id: securityId }).execute();
    await expect(bootstrapOwner(db, input())).rejects.toThrow('Security operation unavailable');
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);
    expect((await db.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow()).bootstrap_consumed_at).toBeNull();
  });
  it.each(['users', 'user_roles', 'installation_state', 'audit_logs', 'security_events'])('rolls back after %s and permits a clean retry', async (table) => {
    const injected = new Set<unknown>();
    let securityInserts = 0, fired = false;
    const plugin: KyselyPlugin = {
      transformQuery({ node, queryId }) {
        const changed = node.kind === 'InsertQueryNode' ? node.into?.table.identifier.name : node.kind === 'UpdateQueryNode'
          ? (node.table as { table?: { identifier?: { name?: string } } }).table?.identifier?.name : undefined;
        if (changed === 'security_events') securityInserts++;
        if (changed === table && (table !== 'security_events' || securityInserts === 2)) injected.add(queryId);
        return node;
      },
      async transformResult({ result, queryId }) {
        if (injected.has(queryId)) { fired = true; throw new Error('Synthetic post-write transaction failure'); }
        return result;
      },
    };
    await expect(bootstrapOwner(db.withPlugin(plugin), input())).rejects.toThrow('Security operation unavailable');
    expect(fired).toBe(true);
    expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('user_roles').select('user_id').execute()).toHaveLength(0);
    expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(0);
    expect(await db.selectFrom('security_events').select('id').where('type', '=', 'bootstrap.success').execute()).toHaveLength(0);
    const state = await db.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow();
    expect(state.bootstrap_consumed_at).toBeNull(); expect(state.initial_owner_id).toBeNull();
    await seedCatalog(db);
    expect((await bootstrapOwner(db, input())).state).toBe('MFA_ENROLLMENT_REQUIRED');
  });
});
