import {foundationTables,check,foreignKey,installedChecks,installedForeignKeys,sortContracts} from '../helpers/schema-contract';
import { randomBytes, randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import { migrateDatabase } from '../../src/server/db/migrations';
import type { DatabaseSchema } from '../../src/server/db/schema';

const handle = createDatabase(resolveDatabaseConfiguration(process.env, 'destructive-test'));
const db = handle.db;
const rollback = Symbol('check-test-rollback');
beforeAll(async () => { await assertDestructiveTestDatabase(db, process.env); await migrateDatabase(db); });
afterAll(() => handle.close());
async function isolated(test: (transaction: Kysely<DatabaseSchema>) => Promise<void>) {
  try { await db.transaction().execute(async (transaction) => { await fixtures(transaction); await test(transaction); throw rollback; }); }
  catch (error) { if (error !== rollback) throw error; }
}

async function fixtures(transaction: Kysely<DatabaseSchema>) {
  const now = new Date(Date.now() - 5000), expires = new Date(now.getTime() + 60000);
  const user = randomUUID(), method = randomUUID(), session = randomUUID();
  await transaction.insertInto('users').values({ id: user, email_normalized: `${user}@example.test`, display_name: 'Synthetic fixture', status: 'invited', password_hash: null,
    created_at: now, password_changed_at: null, last_login_at: null }).execute();
  const role = await transaction.selectFrom('roles').select('id').where('code', '=', 'VIEWER').executeTakeFirstOrThrow();
  await transaction.insertInto('user_roles').values({ user_id: user, role_id: role.id, assigned_by: null }).execute();
  await transaction.insertInto('sessions').values({ id: session, user_id: user, token_hash: randomBytes(32), auth_version: 1, created_at: now,
    last_activity_at: now, authenticated_at: now, idle_expires_at: expires, absolute_expires_at: expires,
    mfa_verified_at: null, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null }).execute();
  await transaction.insertInto('auth_challenges').values({ id: randomUUID(), user_id: user, token_hash: randomBytes(32), purpose: 'login_mfa', auth_version: 1,
    created_at: now, expires_at: expires, action_code: null, consumed_at: null, revoked_at: null }).execute();
  await transaction.insertInto('password_reset_tokens').values({ id: randomUUID(), user_id: user, issued_by: user, token_hash: randomBytes(32),
    created_at: now, expires_at: expires, consumed_at: null, revoked_at: null }).execute();
  await transaction.insertInto('invitations').values({ id: randomUUID(), user_id: user, issued_by: user, token_hash: randomBytes(32),
    created_at: now, expires_at: expires, accepted_at: null, revoked_at: null, intended_role_id: role.id, recipient_auth_version: 1, issuer_auth_version: 1 }).execute();
  await transaction.insertInto('mfa_methods').values({ id: method, user_id: user, type: 'totp', state: 'pending', seed_ciphertext: randomBytes(20), iv: randomBytes(12),
    tag: randomBytes(16), key_id: 'synthetic', created_at: now, enrollment_expires_at: expires, confirmed_at: null, last_accepted_step: null }).execute();
  await transaction.insertInto('mfa_recovery_codes').values({ id: randomUUID(), method_id: method, batch_id: randomUUID(), code_hash: randomBytes(32), created_at: now, used_at: null, revoked_at: null }).execute();
  await transaction.insertInto('auth_rate_limits').values({ scope: 'synthetic', subject_hash: randomBytes(32), window_started_at: now, blocked_until: null, expires_at: expires }).execute();
  await transaction.insertInto('audit_logs').values({ id: randomUUID(), actor_user_id: user, target_user_id: user, session_id: session, action: 'synthetic', outcome: 'success', correlation_id: randomUUID(), metadata_safe_json: null, ip_hash: null }).execute();
  await transaction.insertInto('security_events').values({ id: randomUUID(), user_id: user, type: 'synthetic', severity: 'info', outcome: 'success', correlation_id: randomUUID(), metadata_safe_json: null, ip_hash: null }).execute();
}

// Independent violating writes for EVERY live security CHECK, asserting its actual
// MySQL name/error, not merely looking for SQL text or accepting any rejection.
const cases = [
  ['audit_logs_ip_hash_length', sql`UPDATE audit_logs SET ip_hash=${randomBytes(31)}`],
  ['audit_logs_metadata_keys', sql`UPDATE audit_logs SET metadata_safe_json=${JSON.stringify({ password: 'synthetic' })}`],
  ['auth_challenges_expiry', sql`UPDATE auth_challenges SET expires_at=created_at`],
  ['auth_challenges_auth_version_positive', sql`UPDATE auth_challenges SET auth_version=0`],
  ['auth_challenges_token_hash_length', sql`UPDATE auth_challenges SET token_hash=${randomBytes(31)}`],
  ['auth_challenges_lifecycle', sql`UPDATE auth_challenges SET consumed_at=DATE_SUB(created_at, INTERVAL 1 SECOND)`],
  ['auth_rate_limits_expiry', sql`UPDATE auth_rate_limits SET expires_at=window_started_at`],
  ['auth_rate_limits_subject_hash_length', sql`UPDATE auth_rate_limits SET subject_hash=${randomBytes(31)}`],
  ['installation_state_singleton', sql`UPDATE installation_state SET id=2`],
  ['installation_state_bootstrap_integrity', sql`UPDATE installation_state SET bootstrap_consumed_at=CURRENT_TIMESTAMP(3)`],
  ['team_administration_guard_singleton', sql`UPDATE team_administration_guard SET id=2`],
  ['invitations_binding', sql`UPDATE invitations SET recipient_auth_version=NULL`],
  ['invitations_expiry', sql`UPDATE invitations SET expires_at=created_at`],
  ['invitations_token_hash_length', sql`UPDATE invitations SET token_hash=${randomBytes(31)}`],
  ['invitations_lifecycle', sql`UPDATE invitations SET accepted_at=DATE_ADD(expires_at, INTERVAL 1 SECOND)`],
  ['mfa_methods_active_binding', sql`UPDATE mfa_methods SET state='active', confirmed_at=CURRENT_TIMESTAMP(3), enrollment_expires_at=NULL, enrollment_challenge_id=(SELECT id FROM auth_challenges LIMIT 1)`],
  ['mfa_methods_state_integrity', sql`UPDATE mfa_methods SET state='active'`],
  ['mfa_methods_seed_not_empty', sql`UPDATE mfa_methods SET seed_ciphertext=${Buffer.alloc(0)}`],
  ['mfa_methods_iv_length', sql`UPDATE mfa_methods SET iv=${randomBytes(11)}`],
  ['mfa_methods_tag_length', sql`UPDATE mfa_methods SET tag=${randomBytes(15)}`],
  ['mfa_methods_timeline', sql`UPDATE mfa_methods SET last_accepted_step=1`],
  ['mfa_recovery_codes_code_hash_length', sql`UPDATE mfa_recovery_codes SET code_hash=${randomBytes(31)}`],
  ['mfa_recovery_codes_lifecycle', sql`UPDATE mfa_recovery_codes SET used_at=DATE_SUB(created_at, INTERVAL 1 SECOND)`],
  ['password_reset_tokens_expiry', sql`UPDATE password_reset_tokens SET expires_at=created_at`],
  ['password_reset_tokens_token_hash_length', sql`UPDATE password_reset_tokens SET token_hash=${randomBytes(31)}`],
  ['password_reset_tokens_lifecycle', sql`UPDATE password_reset_tokens SET consumed_at=DATE_ADD(expires_at, INTERVAL 1 SECOND)`],
  ['security_events_ip_hash_length', sql`UPDATE security_events SET ip_hash=${randomBytes(31)}`],
  ['security_events_metadata_keys', sql`UPDATE security_events SET metadata_safe_json=${JSON.stringify({ authorization: 'synthetic' })}`],
  ['sessions_valid_times', sql`UPDATE sessions SET idle_expires_at=last_activity_at`],
  ['sessions_auth_version_positive', sql`UPDATE sessions SET auth_version=0`],
  ['sessions_token_hash_length', sql`UPDATE sessions SET token_hash=${randomBytes(31)}`],
  ['sessions_ip_hash_length', sql`UPDATE sessions SET ip_hash=${randomBytes(31)}`],
  ['sessions_revocation_integrity', sql`UPDATE sessions SET revocation_reason='synthetic'`],
  ['users_auth_version_positive', sql`UPDATE users SET auth_version=0`],
  ['users_email_canonical', sql`UPDATE users SET email_normalized='UPPER@example.test'`],
  ['users_active_password', sql`UPDATE users SET status='active'`],
] as const;

describe('direct MySQL enforcement of every security CHECK', () => {
  it.each(cases)('%s rejects its violating write', (name, statement) => isolated(async (transaction) => {
    await expect(statement.execute(transaction)).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED', sqlMessage: expect.stringContaining(name) });
  }));
  it('covers exactly every CHECK currently installed in the security schema', async () => {
    const expected=[
      check('audit_logs','audit_logs_ip_hash_length',['ip_hash']),
      check('audit_logs','audit_logs_metadata_keys',['metadata_safe_json']),
      check('auth_challenges','auth_challenges_expiry',['created_at', 'expires_at']),
      check('auth_challenges','auth_challenges_auth_version_positive',['auth_version']),
      check('auth_challenges','auth_challenges_token_hash_length',['token_hash']),
      check('auth_challenges','auth_challenges_lifecycle',['created_at', 'expires_at', 'consumed_at', 'revoked_at']),
      check('auth_rate_limits','auth_rate_limits_expiry',['expires_at', 'window_started_at']),
      check('auth_rate_limits','auth_rate_limits_subject_hash_length',['subject_hash']),
      check('installation_state','installation_state_singleton',['id']),
      check('installation_state','installation_state_bootstrap_integrity',['bootstrap_consumed_at', 'initial_owner_id']),
      check('invitations','invitations_binding',['intended_role_id', 'recipient_auth_version', 'issuer_auth_version']),
      check('invitations','invitations_expiry',['created_at', 'expires_at']),
      check('invitations','invitations_token_hash_length',['token_hash']),
      check('invitations','invitations_lifecycle',['created_at', 'expires_at', 'accepted_at', 'revoked_at']),
      check('mfa_methods','mfa_methods_active_binding',['state', 'enrollment_challenge_id']),
      check('mfa_methods','mfa_methods_state_integrity',['state', 'confirmed_at', 'enrollment_expires_at']),
      check('mfa_methods','mfa_methods_seed_not_empty',['seed_ciphertext']),
      check('mfa_methods','mfa_methods_iv_length',['iv']),
      check('mfa_methods','mfa_methods_tag_length',['tag']),
      check('mfa_methods','mfa_methods_timeline',['created_at', 'confirmed_at', 'last_accepted_step', 'enrollment_expires_at', 'state']),
      check('mfa_recovery_codes','mfa_recovery_codes_code_hash_length',['code_hash']),
      check('mfa_recovery_codes','mfa_recovery_codes_lifecycle',['created_at', 'used_at', 'revoked_at']),
      check('password_reset_tokens','password_reset_tokens_expiry',['created_at', 'expires_at']),
      check('password_reset_tokens','password_reset_tokens_token_hash_length',['token_hash']),
      check('password_reset_tokens','password_reset_tokens_lifecycle',['created_at', 'expires_at', 'consumed_at', 'revoked_at']),
      check('security_events','security_events_ip_hash_length',['ip_hash']),
      check('security_events','security_events_metadata_keys',['metadata_safe_json']),
      check('sessions','sessions_valid_times',['created_at', 'last_activity_at', 'idle_expires_at', 'absolute_expires_at']),
      check('sessions','sessions_auth_version_positive',['auth_version']),
      check('sessions','sessions_token_hash_length',['token_hash']),
      check('sessions','sessions_ip_hash_length',['ip_hash']),
      check('sessions','sessions_revocation_integrity',['created_at', 'revoked_at', 'revocation_reason']),
      check('users','users_auth_version_positive',['auth_version']),
      check('users','users_email_canonical',['email_normalized']),
      check('users','users_active_password',['status', 'password_hash']),
      check('team_administration_guard','team_administration_guard_singleton',['id']),
    ];
    expect(expected.map(r=>r.name).sort()).toEqual(cases.map(([name])=>name).sort());
    expect(await installedChecks(db,foundationTables)).toEqual(sortContracts(expected));
  });
  it.each(['pending_mfa', 'active', 'disabled'] as const)('%s cannot retain a null/empty hash', (status) => isolated(async (transaction) => {
    for (const password of [null, '']) await expect(transaction.updateTable('users').set({ status, password_hash: password }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  }));
  it('keeps canonical enums strict even if the hosting default was permissive', () => isolated(async (transaction) => {
    const mode = await sql<{ mode: string }>`SELECT @@session.sql_mode AS mode`.execute(transaction);
    expect(mode.rows[0]?.mode.split(',')).toContain('STRICT_ALL_TABLES');
    await expect(sql`UPDATE users SET status='unrecognized'`.execute(transaction)).rejects.toMatchObject({ code: 'WARN_DATA_TRUNCATED' });
  }));
  it('preserves installation state when its initial Owner is disabled or demoted', () => isolated(async (transaction) => {
    const user = await transaction.selectFrom('users').select('id').executeTakeFirstOrThrow();
    const owner = await transaction.selectFrom('roles').select('id').where('code', '=', 'OWNER').executeTakeFirstOrThrow();
    await transaction.updateTable('user_roles').set({ role_id: owner.id }).where('user_id', '=', user.id).execute();
    await transaction.updateTable('installation_state').set({ bootstrap_consumed_at: new Date(), initial_owner_id: user.id }).where('id', '=', 1).execute();
    const original = await transaction.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow();
    await transaction.updateTable('users').set({ status: 'disabled', password_hash: 'synthetic-hash-placeholder' }).where('id', '=', user.id).execute();
    const role = await transaction.selectFrom('roles').select('id').where('code', '=', 'VIEWER').executeTakeFirstOrThrow();
    await transaction.updateTable('user_roles').set({ role_id: role.id }).where('user_id', '=', user.id).execute();
    expect(await transaction.selectFrom('installation_state').selectAll().executeTakeFirstOrThrow()).toEqual(original);
    await expect(transaction.deleteFrom('users').where('id', '=', user.id).execute()).rejects.toMatchObject({ code: 'ER_ROW_IS_REFERENCED_2' });
  }));
  it('shows expiry is independent of unconsumed state; there is no stored active flag', () => isolated(async (transaction) => {
    await sql`UPDATE auth_challenges SET created_at=DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 2 MINUTE), expires_at=DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 MINUTE)`.execute(transaction);
    expect(await transaction.selectFrom('auth_challenges').select('id').where('consumed_at', 'is', null).execute()).toHaveLength(1);
    const valid = await sql<{ count: number }>`SELECT COUNT(*) AS count FROM auth_challenges WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)`.execute(transaction);
    expect(Number(valid.rows[0]?.count)).toBe(0);
  }));
});

const foreignKeys = [
  ['audit_logs', 'actor_user_id', 'users'], ['audit_logs', 'target_user_id', 'users'], ['audit_logs', 'session_id', 'sessions'],
  ['auth_challenges', 'bound_session_id', 'sessions'], ['mfa_methods', 'enrollment_challenge_id', 'auth_challenges'],
  ['auth_challenges', 'user_id', 'users'], ['installation_state', 'initial_owner_id', 'users'],
  ['invitations', 'intended_role_id', 'roles'], ['invitations', 'user_id', 'users'], ['invitations', 'issued_by', 'users'],
  ['mfa_methods', 'user_id', 'users'], ['mfa_recovery_codes', 'method_id', 'mfa_methods'],
  ['password_reset_tokens', 'user_id', 'users'], ['password_reset_tokens', 'issued_by', 'users'],
  ['role_permissions', 'role_id', 'roles'], ['role_permissions', 'permission_id', 'permissions'],
  ['security_events', 'user_id', 'users'], ['sessions', 'user_id', 'users'],
  ['user_roles', 'user_id', 'users'], ['user_roles', 'role_id', 'roles'], ['user_roles', 'assigned_by', 'users'],
] as const;
function foreignKeyName(table: string, column: string, parent: string) {
  if (table === 'invitations' && column === 'intended_role_id') return 'invitations_role_fk';
  if (table === 'auth_challenges' && column === 'bound_session_id') return 'auth_challenges_bound_session_fk';
  if (table === 'mfa_methods' && column === 'enrollment_challenge_id') return 'mfa_methods_enrollment_challenge_fk';
  return `${table}_${column}_${parent}_id_fk`;
}
describe('every security foreign key', () => {
  it.each(foreignKeys)('%s.%s rejects an orphan reference to %s', (table, column, parent) => isolated(async (transaction) => {
    const changes = table === 'installation_state' ? sql`, bootstrap_consumed_at=CURRENT_TIMESTAMP(3)` : sql``;
    await expect(sql`UPDATE ${sql.id(table)} SET ${sql.id(column)}=${randomUUID()} ${changes} LIMIT 1`.execute(transaction)).rejects.toMatchObject({
      code: 'ER_NO_REFERENCED_ROW_2', sqlMessage: expect.stringContaining(foreignKeyName(table, column, parent)),
    });
  }));
  it('matches all deployed security relationships with RESTRICT for delete AND update', async () => {
    const expected=foreignKeys.map(([table,column,parent])=>foreignKey(foreignKeyName(table,column,parent),table,[column],parent,['id']));
    expect(await installedForeignKeys(db,foundationTables)).toEqual(sortContracts(expected));
  });
});
