import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { installMySqlReviewDiagnostics } from '../helpers/mysql-review-diagnostics';
import { insertPasswordChallenge } from '../../src/server/auth/challenges';
import { generate } from 'otplib';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { scratchDatabase, resetScratch, makeUser } from './phase2b-helpers';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { createAccessService, tokenHash } from '../../src/server/auth/access';
import { createTeamService, invitationHash, INVITATION_FAILURE } from '../../src/server/team/service';
import { parseMutation, teamAction, type TeamMutation } from '../../src/server/team/policy';
import { authorizationContext, can, AuthorizationError } from '../../src/server/authorization/authorization';
import { canonicalCatalogId, seedCatalog } from '../../src/server/db/seeds';
import { ROLE_CODES, ROLE_PERMISSIONS } from '../../src/server/db/catalog';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { NetworkIdentity } from '../../src/server/security/identity';
import { newTotpSecret, encryptMfa } from '../../src/server/auth/mfa-crypto';
import { recordTeamEvent } from '../../src/server/team/events';

installMySqlReviewDiagnostics();
const target = scratchDatabase('bsa_test_recovery'), db = target.handle.db;
const second = createDatabase({ ...resolveDatabaseConfiguration(target.source, 'destructive-test'), connectionLimit: 2 });
const key = { key: randomBytes(32), id: 'team-tests' }, hmac = randomBytes(32), network = NetworkIdentity.fromSocketAddress('::');
const access = createAccessService(db, key, hmac, network), service = createTeamService(db, hmac, network), other = createTeamService(second.db, hmac, network);
const password = 'public synthetic team phrase only';
beforeAll(async () => resetScratch(target));
beforeEach(async () => {
  for (const table of ['audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions', 'invitations', 'user_roles', 'users', 'auth_rate_limits'] as const) await db.deleteFrom(table).execute();
  await seedCatalog(db);
});
afterAll(async () => { await second.close(); await target.handle.close(); });
async function authenticated(role = 'OWNER') {
  const user = await makeUser(db, password, 'active', role), raw = new SensitiveValue(randomBytes(32).toString('base64url')), id = randomUUID(), secret = newTotpSecret();
  const now = (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;
  if (['OWNER', 'MARKETING_ADMIN'].includes(role)) await db.insertInto('mfa_methods').values({ user_id: user.id, type: 'totp', state: 'active', ...encryptMfa(secret, key, user.id, id), id, confirmed_at: now, created_at: now, enrollment_expires_at: null, last_accepted_step: null }).execute();
  const sessionId = randomUUID();
  await db.insertInto('sessions').values({ id: sessionId, user_id: user.id, token_hash: tokenHash(raw), auth_version: 1, created_at: now, last_activity_at: now, idle_expires_at: new Date(+now + 1800000), absolute_expires_at: new Date(+now + 86400000), authenticated_at: now, mfa_verified_at: ['OWNER', 'MARKETING_ADMIN'].includes(role) ? now : null, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null }).execute();
  return { ...user, raw, sessionId, secret };
}
async function proof(actor: Awaited<ReturnType<typeof authenticated>>, input: TeamMutation, overrides = {}) {
  const raw = new SensitiveValue(randomBytes(32).toString('base64url')), now = new Date();
  await db.insertInto('auth_challenges').values({ id: randomUUID(), user_id: actor.id, token_hash: tokenHash(raw), purpose: 'reauthentication', action_code: teamAction(input), auth_version: 1, bound_session_id: actor.sessionId, created_at: now, expires_at: new Date(+now + 300000), consumed_at: null, revoked_at: null, ...overrides }).execute();
  return raw;
}
async function invite(actor: Awaited<ReturnType<typeof authenticated>>, role: typeof ROLE_CODES[number] = 'VIEWER', email = `${randomUUID()}@example.test`) {
  const input = parseMutation({ action: 'invite', email, displayName: 'Invited colleague', role });
  const result = await service.mutate(actor.raw, await proof(actor, input), input);
  if (!('invitation' in result)) throw new Error('Synthetic invitation failed');
  return { token: result.invitation, email, input };
}
async function accept(link: Awaited<ReturnType<typeof invite>>) { return service.acceptInvitation({ token: link.token.reveal(), email: link.email, password }); }

describe('current canonical authorization', () => {
  it.each(ROLE_CODES)('enforces exact %s mapping and denies Team for non-Owners', async (role) => {
    const actor = await authenticated(role), context = await authorizationContext(db, actor.raw);
    expect(context.permissions).toEqual(ROLE_PERMISSIONS[role]); expect(can(context, 'unknown')).toBe(false);
    if (role === 'OWNER') expect(await service.members(actor.raw)).toHaveLength(1);
    else await expect(service.members(actor.raw)).rejects.toBeInstanceOf(AuthorizationError);
  });
  it.each(['missing-grant', 'extra-grant', 'unknown-permission', 'wrong-role-code', 'missing-role'] as const)('fails closed on %s', async (variant) => {
    const actor = await authenticated('VIEWER');
    if (variant === 'missing-grant') await db.deleteFrom('role_permissions').where('role_id', '=', canonicalCatalogId('role', 'VIEWER')).execute();
    if (variant === 'extra-grant') await db.insertInto('role_permissions').values({ role_id: canonicalCatalogId('role', 'VIEWER'), permission_id: canonicalCatalogId('permission', 'users.manage') }).execute();
    if (variant === 'unknown-permission') await db.insertInto('permissions').values({ id: randomUUID(), code: 'unexpected.code' }).execute();
    if (variant === 'wrong-role-code') await db.updateTable('roles').set({ code: 'MALFORMED' }).where('code', '=', 'VIEWER').execute();
    if (variant === 'missing-role') await db.deleteFrom('user_roles').where('user_id', '=', actor.id).execute();
    await expect(authorizationContext(db, actor.raw)).rejects.toBeInstanceOf(AuthorizationError);
    if (variant === 'wrong-role-code') await db.updateTable('roles').set({ code: 'VIEWER' }).where('code', '=', 'MALFORMED').execute();
    if (variant === 'unknown-permission') await db.deleteFrom('permissions').where('code', '=', 'unexpected.code').execute();
  });
  it('returns only the explicit bounded member DTO and supports detail lookup', async () => {
    const actor = await authenticated(), rows = await service.members(actor.raw, 0, actor.id);
    expect(Object.keys(rows[0]!).sort()).toEqual(['activeSessions','displayName','email','id','mfaEnabled','role','status'].sort());
    expect(JSON.stringify(rows).includes('hash')).toBe(false);
    await expect(service.members(actor.raw, -1)).rejects.toThrow('Access denied');
    await expect(service.members(actor.raw, 0, 'malformed')).rejects.toThrow('Access denied');
  });
});
describe('target-aware team mutations and recent authentication', () => {
  it.each(['VIEWER', 'CONTENT_CREATOR', 'REVIEWER', 'MARKETING_ADMIN'] as const)('denies %s direct Owner-target role escalation', async (role) => {
    const owner = await authenticated(), actor = await authenticated(role), input = parseMutation({ action: 'role', targetId: owner.id, role: 'OWNER' });
    await expect(service.mutate(actor.raw, await proof(actor, input), input)).rejects.toBeInstanceOf(AuthorizationError);
    expect((await db.selectFrom('user_roles').select('role_id').where('user_id', '=', actor.id).executeTakeFirstOrThrow()).role_id).toBe(canonicalCatalogId('role', role));
  });
  it.each(['target', 'guard'] as const)('denies unauthorized traffic before waiting for a locked %s', async (locked) => {
    const victim = await authenticated(), actor = await authenticated('VIEWER');
    const input = parseMutation({ action: 'role', targetId: victim.id, role: 'OWNER' });
    const raw = new SensitiveValue(randomBytes(32).toString('base64url'));
    let deniedBeforeRelease = false;
    let result: 'DENIED' | 'WAITING' = 'WAITING', attempt: Promise<void> | undefined;
    await second.db.transaction().execute(async (tx) => {
      if (locked === 'target') await tx.selectFrom('users').select('id').where('id', '=', victim.id).forUpdate().execute();
      else await tx.selectFrom('team_administration_guard').select('id').where('id', '=', 1).forUpdate().execute();
      attempt = service.mutate(actor.raw, raw, input).then(() => { throw new Error('Unauthorized mutation accepted'); }, (error: unknown) => { if (!(error instanceof AuthorizationError)) throw error; result = 'DENIED'; });
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([attempt, new Promise<void>((resolve) => { timer = setTimeout(resolve, 250); })]);
      if (timer) clearTimeout(timer);
      deniedBeforeRelease = String(result) === 'DENIED';
    });
    await attempt;
    expect(deniedBeforeRelease).toBe(true);
  });
  it('uses the real Phase 2C password/MFA step-up, rotates session and consumes the exact action once', async () => {
    const actor = await authenticated(), target = await authenticated('VIEWER'), input = parseMutation({ action: 'role', targetId: target.id, role: 'CONTENT_CREATOR' });
    const action = await service.authorizeStepUp(actor.raw, input);
    const otp = await generate({ secret: actor.secret.reveal() });
    const step = await access.recentAuthentication(actor.raw, password, otp, action);
    expect(step.ok).toBe(true); if (!step.ok) throw new Error('Synthetic step-up failed');
    expect(await access.validateSession(actor.raw)).toBeNull();
    expect((await service.mutate(step.session, step.proof, input)).ok).toBe(true);
    await expect(service.mutate(step.session, step.proof, input)).rejects.toThrow('Access denied');
  });
  it.each(['expired', 'revoked', 'consumed', 'wrong-purpose', 'wrong-version', 'wrong-session', 'wrong-target', 'wrong-action'] as const)('rejects %s proof', async (variant) => {
    const actor = await authenticated(), victim = await authenticated('VIEWER');
    const input = parseMutation({ action: 'status', targetId: victim.id, enabled: false });
    const overrides = variant === 'expired' ? { created_at: new Date(Date.now() - 600000), expires_at: new Date(Date.now() - 1000) } : variant === 'revoked' ? { created_at: new Date(Date.now() - 1000), revoked_at: new Date() } : variant === 'consumed' ? { created_at: new Date(Date.now() - 1000), consumed_at: new Date() } : variant === 'wrong-purpose' ? { purpose: 'password_verified' as const } : variant === 'wrong-version' ? { auth_version: 2 } : variant === 'wrong-session' ? { bound_session_id: victim.sessionId } : {};
    const raw = await proof(actor, input, overrides);
    const mutation = variant === 'wrong-target' ? { ...input, targetId: randomUUID() } : variant === 'wrong-action' ? { action: 'sessions', targetId: victim.id } : input;
    await expect(service.mutate(actor.raw, raw, mutation)).rejects.toThrow('Access denied');
    expect((await db.selectFrom('users').select('status').where('id', '=', victim.id).executeTakeFirstOrThrow()).status).toBe('active');
  });
  it('rejects self role/status/invite and malformed/extra permission inputs', async () => {
    const actor = await authenticated();
    for (const input of [parseMutation({ action: 'role', targetId: actor.id, role: 'VIEWER' }), parseMutation({ action: 'status', targetId: actor.id, enabled: false }), parseMutation({ action: 'invite', email: actor.email, displayName: 'Self', role: 'OWNER' })]) await expect(service.mutate(actor.raw, await proof(actor, input), input)).rejects.toThrow('Access denied');
    for (const input of [{ action: 'role', targetId: actor.id, role: 'ADMIN' }, { action: 'role', targetId: actor.id, role: 'OWNER', permissions: ['*'] }, { action: 'status', targetId: 'bad', enabled: false }]) await expect(service.mutate(actor.raw, new SensitiveValue('x'), input)).rejects.toThrow('Access denied');
  });
  it('promotes with mandatory MFA and invalidates old sessions/proofs; demotion also revokes', async () => {
    const actor = await authenticated(), victim = await authenticated('CONTENT_CREATOR');
    const oldProof = await proof(victim, parseMutation({ action: 'sessions', targetId: actor.id }));
    const input = parseMutation({ action: 'role', targetId: victim.id, role: 'MARKETING_ADMIN' });
    await service.mutate(actor.raw, await proof(actor, input), input);
    const user = await db.selectFrom('users').select(['auth_version', 'status']).where('id', '=', victim.id).executeTakeFirstOrThrow();
    expect(user).toEqual({ auth_version: 2, status: 'pending_mfa' }); expect(await access.validateSession(victim.raw)).toBeNull();
    expect((await db.selectFrom('auth_challenges').select('revoked_at').where('token_hash', '=', tokenHash(oldProof)).executeTakeFirstOrThrow()).revoked_at !== null).toBe(true);
  });
  it('disable/re-enable never restores old access and disabled actor cannot mutate', async () => {
    const actor = await authenticated(), victim = await authenticated('VIEWER');
    for (const enabled of [false, true]) { const input = parseMutation({ action: 'status', targetId: victim.id, enabled }); await service.mutate(actor.raw, await proof(actor, input), input); expect(await access.validateSession(victim.raw)).toBeNull(); }
    const input = parseMutation({ action: 'sessions', targetId: victim.id }), raw = await proof(actor, input);
    await db.updateTable('users').set({ status: 'disabled', auth_version: 2 }).where('id', '=', actor.id).execute();
    await expect(service.mutate(actor.raw, raw, input)).rejects.toBeInstanceOf(AuthorizationError);
  });
  it('mutation and audit roll back together on required event insertion failure', async () => {
    const actor = await authenticated(), victim = await authenticated('VIEWER'), input = parseMutation({ action: 'status', targetId: victim.id, enabled: false }), raw = await proof(actor, input);
    // Isolated DDL fault injection only; no runtime/production schema modification.
    await sql`RENAME TABLE audit_logs TO held_audit_logs`.execute(db);
    try { await expect(service.mutate(actor.raw, raw, input)).rejects.toThrow('Security operation unavailable'); }
    finally { await sql`RENAME TABLE held_audit_logs TO audit_logs`.execute(db); }
    expect((await db.selectFrom('users').select('status').where('id', '=', victim.id).executeTakeFirstOrThrow()).status).toBe('active');
    expect((await db.selectFrom('auth_challenges').select('consumed_at').where('token_hash', '=', tokenHash(raw)).executeTakeFirstOrThrow()).consumed_at).toBeNull();
  });
});
describe('administrative concurrency across independent pools', () => {
  it.each(['role', 'status'] as const)('cross-Owner concurrent %s changes retain an active Owner', async (action) => {
    const a = await authenticated(), b = await authenticated();
    const left = parseMutation(action === 'role' ? { action, targetId: b.id, role: 'VIEWER' } : { action, targetId: b.id, enabled: false });
    const right = parseMutation(action === 'role' ? { action, targetId: a.id, role: 'VIEWER' } : { action, targetId: a.id, enabled: false });
    const pa = await proof(a, left), pb = await proof(b, right);
    const results = await Promise.allSettled([service.mutate(a.raw, pa, left), other.mutate(b.raw, pb, right)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const owners = await db.selectFrom('users').innerJoin('user_roles', 'users.id', 'user_roles.user_id').select('users.id').where('users.status', '=', 'active').where('role_id', '=', canonicalCatalogId('role', 'OWNER')).execute();
    expect(owners).toHaveLength(1);
    for (const result of results) if (result.status === 'rejected') expect(result.reason instanceof AuthorizationError).toBe(true);
  });
  it('same target changes serialize, version advances twice, stale session cannot survive', async () => {
    const a = await authenticated(), b = await authenticated(), victim = await authenticated('VIEWER');
    const left = parseMutation({ action: 'role', targetId: victim.id, role: 'CONTENT_CREATOR' }), right = parseMutation({ action: 'role', targetId: victim.id, role: 'REVIEWER' });
    const pa = await proof(a, left), pb = await proof(b, right);
    expect((await Promise.all([service.mutate(a.raw, pa, left), other.mutate(b.raw, pb, right)])).every((r) => r.ok)).toBe(true);
    expect((await db.selectFrom('users').select('auth_version').where('id', '=', victim.id).executeTakeFirstOrThrow()).auth_version).toBe(3);
    expect(await access.validateSession(victim.raw)).toBeNull();
  });
  it.each(['status', 'sessions'] as const)('%s racing authenticated session use denies subsequent use', async (action) => {
    const actor = await authenticated(), victim = await authenticated('VIEWER'), input = parseMutation(action === 'status' ? { action, targetId: victim.id, enabled: false } : { action, targetId: victim.id });
    const p = await proof(actor, input);
    await Promise.all([service.mutate(actor.raw, p, input), createAccessService(second.db, key, hmac, network).validateSession(victim.raw)]);
    expect(await access.validateSession(victim.raw)).toBeNull();
  });
});
describe('one-time invitations', () => {
  it.each(['VIEWER','OWNER','MARKETING_ADMIN'] as const)('accepts %s invitation without any session/proof or plaintext token persistence', async (role) => {
    const actor = await authenticated(), link = await invite(actor, role), before = await db.selectFrom('sessions').select('id').execute();
    expect((await accept(link)).ok).toBe(true);
    const user = await db.selectFrom('users').select(['id', 'status', 'password_hash']).where('email_normalized', '=', link.email).executeTakeFirstOrThrow();
    expect(user.status).toBe(role === 'VIEWER' ? 'active' : 'pending_mfa'); expect(user.password_hash?.startsWith('$argon2id$')).toBe(true);
    expect(await db.selectFrom('sessions').select('id').execute()).toEqual(before);
    expect(await db.selectFrom('auth_challenges').select('id').where('user_id', '=', user.id).execute()).toHaveLength(0);
    const row = await db.selectFrom('invitations').selectAll().where('user_id', '=', user.id).executeTakeFirstOrThrow();
    expect(row.token_hash.length).toBe(32); expect(row.token_hash.equals(invitationHash(link.token))).toBe(true);
    expect(JSON.stringify(row).includes(link.token.reveal())).toBe(false);
    expect((await accept(link)).ok).toBe(false);
  });
  it('same-token concurrent acceptance has exactly one winner across pools', async () => {
    const link = await invite(await authenticated());
    const results = await Promise.all([accept(link), other.acceptInvitation({ token: link.token.reveal(), email: link.email, password })]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it('same-account concurrent invitations supersede safely; exactly the latest is live', async () => {
    const a = await authenticated(), b = await authenticated(), email = `${randomUUID()}@example.test`, input = parseMutation({ action: 'invite', email, displayName: 'Synthetic', role: 'VIEWER' });
    const pa = await proof(a, input), pb = await proof(b, input);
    const results = await Promise.all([service.mutate(a.raw, pa, input), other.mutate(b.raw, pb, input)]);
    expect(results.every((r) => r.ok)).toBe(true);
    const users = await db.selectFrom('users').select('id').where('email_normalized', '=', email).execute(); expect(users).toHaveLength(1);
    const rows = await db.selectFrom('invitations').selectAll().where('user_id', '=', users[0]!.id).execute();
    expect(rows.filter((r) => !r.revoked_at)).toHaveLength(1); expect(rows.filter((r) => r.revoked_at)).toHaveLength(1);
  });
  it.each(['expired', 'revoked', 'wrong-email', 'recipient-role', 'recipient-version', 'issuer-version', 'issuer-disabled', 'issuer-demoted', 'weak-password', 'unknown-token', 'missing-bindings'] as const)('rejects %s invitation with generic result', async (variant) => {
    const actor = await authenticated(), link = await invite(actor), row = await db.selectFrom('invitations').selectAll().executeTakeFirstOrThrow();
    if (variant === 'expired') await db.updateTable('invitations').set({ created_at: new Date(Date.now() - 120000), expires_at: new Date(Date.now() - 1000) }).execute();
    if (variant === 'revoked') await db.updateTable('invitations').set({ revoked_at: new Date() }).execute();
    if (variant === 'recipient-role') await db.updateTable('user_roles').set({ role_id: canonicalCatalogId('role', 'OWNER') }).where('user_id', '=', row.user_id).execute();
    if (variant === 'recipient-version') await db.updateTable('users').set({ auth_version: 99 }).where('id', '=', row.user_id).execute();
    if (variant === 'issuer-version') await db.updateTable('users').set({ auth_version: 99 }).where('id', '=', actor.id).execute();
    if (variant === 'issuer-disabled') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', actor.id).execute();
    if (variant === 'issuer-demoted') await db.updateTable('user_roles').set({ role_id: canonicalCatalogId('role', 'VIEWER') }).where('user_id', '=', actor.id).execute();
    if (variant === 'missing-bindings') await db.updateTable('invitations').set({ intended_role_id: null, recipient_auth_version: null, issuer_auth_version: null }).execute();
    const result = await service.acceptInvitation({ token: variant === 'unknown-token' ? randomBytes(32).toString('base64url') : link.token.reveal(), email: variant === 'wrong-email' ? 'wrong@example.test' : link.email, password: variant === 'weak-password' ? 'weak' : password });
    expect(result).toEqual(INVITATION_FAILURE);
    expect((await db.selectFrom('users').select('status').where('id', '=', row.user_id).executeTakeFirstOrThrow()).status).toBe('invited');
  });
  it('corrects an invited role without activating the account; reissue is explicit and old links reject', async () => {
    const actor = await authenticated(), original = await invite(actor, 'OWNER');
    const user = await db.selectFrom('users').select('id').where('email_normalized', '=', original.email).executeTakeFirstOrThrow();
    const input = parseMutation({ action: 'role', targetId: user.id, role: 'VIEWER' });
    await service.mutate(actor.raw, await proof(actor, input), input);
    const current = await db.selectFrom('users').select(['status', 'password_hash']).where('id', '=', user.id).executeTakeFirstOrThrow();
    expect(current).toEqual({ status: 'invited', password_hash: null }); expect((await accept(original)).ok).toBe(false);
    const corrected = await invite(actor, 'VIEWER', original.email); expect((await accept(corrected)).ok).toBe(true);
  });
  it('revoke invalidates link and normalized email variants share one intended identity', async () => {
    const actor = await authenticated(), email = `${randomUUID()}@example.test`, link = await invite(actor, 'VIEWER', `  ${email.toUpperCase()}  `);
    const recipient = await db.selectFrom('users').select('id').where('email_normalized', '=', email).executeTakeFirstOrThrow();
    const input = parseMutation({ action: 'revoke-invitation', targetId: recipient.id });
    await service.mutate(actor.raw, await proof(actor, input), input);
    expect((await accept({ ...link, email })).ok).toBe(false);
  });
  it('enforces migration 0005 CHECKs and role FK in real MySQL', async () => {
    await expect(sql`INSERT INTO team_administration_guard(id) VALUES(2)`.execute(db)).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await invite(await authenticated());
    await expect(db.updateTable('invitations').set({ recipient_auth_version: null }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(db.updateTable('invitations').set({ issuer_auth_version: 0 }).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await expect(db.updateTable('invitations').set({ intended_role_id: randomUUID() }).execute()).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });
  it('rejects arbitrary secret-like event metadata and free-form state values', async () => {
    for (const extra of [{ password: 'synthetic' }, { token: 'synthetic' }, { request: {} }, { error: new Error('synthetic') }, { before: 'arbitrary secret dumping channel' }]) {
      await expect(recordTeamEvent(db, { type: 'team.denied', actorId: null, targetId: null, outcome: 'denied', ...extra } as Parameters<typeof recordTeamEvent>[1])).rejects.toThrow('Security operation unavailable');
    }
    expect(await db.selectFrom('security_events').select('id').execute()).toHaveLength(0);
  });
});

// Final targeted review: real service calls, real MySQL, independent pools.
async function activeOwners() {
  return db.selectFrom('users').innerJoin('user_roles', 'users.id', 'user_roles.user_id').select('users.id').where('users.status', '=', 'active').where('role_id', '=', canonicalCatalogId('role', 'OWNER')).execute();
}
async function securitySnapshot() {
  // Compare inside the process only; assertions never serialize password/hash/token-bearing rows.
  const rows = await Promise.all(['users','user_roles','sessions','auth_challenges','invitations','audit_logs'].map((name) => sql`SELECT * FROM ${sql.id(name)} ORDER BY 1`.execute(db)));
  return JSON.stringify(rows.map((r) => r.rows));
}
describe('final review: Owner invariants and stale authority', () => {
  it.each(['disable-disable','demote-demote','disable-demote'] as const)('one Owner survives concurrent self %s', async (race) => {
    const actor = await authenticated();
    const inputs = race.split('-').map((kind) => parseMutation(kind === 'disable' ? { action: 'status', targetId: actor.id, enabled: false } : { action: 'role', targetId: actor.id, role: 'VIEWER' }));
    const proofs = await Promise.all(inputs.map((input) => proof(actor, input)));
    const results = await Promise.allSettled(inputs.map((input, i) => (i ? other : service).mutate(actor.raw, proofs[i]!, input)));
    expect(results.every((r) => r.status === 'rejected' && r.reason instanceof AuthorizationError)).toBe(true);
    expect(await activeOwners()).toHaveLength(1); expect((await access.validateSession(actor.raw)) !== null).toBe(true);
  });
  it('two Owners survive mixed cross-disable/demotion with exactly one remaining active Owner', async () => {
    const a = await authenticated(), b = await authenticated();
    const left = parseMutation({ action: 'status', targetId: b.id, enabled: false }), right = parseMutation({ action: 'role', targetId: a.id, role: 'VIEWER' });
    const pa = await proof(a, left), pb = await proof(b, right);
    const results = await Promise.allSettled([service.mutate(a.raw, pa, left), other.mutate(b.raw, pb, right)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1); expect(await activeOwners()).toHaveLength(1);
    expect(results.every((r) => r.status === 'fulfilled' || r.reason instanceof AuthorizationError)).toBe(true);
  });
  it.each(['role','status','sessions'] as const)('non-last Owner still rejects self %s and target-case manipulation', async (action) => {
    const actor = await authenticated(); await authenticated();
    for (const targetId of [actor.id, actor.id.toUpperCase()]) {
      const input = parseMutation(action === 'role' ? { action, targetId, role: 'VIEWER' } : action === 'status' ? { action, targetId, enabled: false } : { action, targetId });
      await expect(service.mutate(actor.raw, await proof(actor, input), input)).rejects.toBeInstanceOf(AuthorizationError);
    }
    expect(await activeOwners()).toHaveLength(2);
  });
  it.each(['role','disabled','version','mfa-state'] as const)('revalidates %s after preliminary authorization but before guard acquisition', async (change) => {
    const actor = await authenticated(), victim = await authenticated('VIEWER'), input = parseMutation({ action: 'role', targetId: victim.id, role: 'CONTENT_CREATOR' });
    const raw = await proof(actor, input); let reached!: () => void;
    const waiting = new Promise<void>((resolve) => { reached = resolve; });
    const observed = db.withPlugin({ transformQuery(args) {
      if (args.node.kind === 'SelectQueryNode' && JSON.stringify(args.node.from).includes('team_administration_guard')) reached();
      return args.node;
    }, async transformResult(args) { return args.result; } });
    let outcome: Promise<PromiseSettledResult<unknown>[]> | undefined;
    await second.db.transaction().execute(async (tx) => {
      await tx.selectFrom('team_administration_guard').select('id').where('id', '=', 1).forUpdate().execute();
      outcome = Promise.allSettled([createTeamService(observed, hmac, network).mutate(actor.raw, raw, input)]);
      await waiting; // Exact query-boundary latch: preliminary transaction has committed.
      await tx.selectFrom('users').select('id').where('id', '=', actor.id).forUpdate().execute();
      if (change === 'role') await tx.updateTable('user_roles').set({ role_id: canonicalCatalogId('role', 'VIEWER') }).where('user_id', '=', actor.id).execute();
      if (change === 'disabled') await tx.updateTable('users').set({ status: 'disabled' }).where('id', '=', actor.id).execute();
      if (change === 'version') await tx.updateTable('users').set({ auth_version: 2 }).where('id', '=', actor.id).execute();
      if (change === 'mfa-state') await tx.updateTable('users').set({ status: 'pending_mfa' }).where('id', '=', actor.id).execute();
    });
    const result = (await outcome!)[0]!;
    expect(result.status === 'rejected' && result.reason instanceof AuthorizationError).toBe(true);
    expect((await db.selectFrom('user_roles').select('role_id').where('user_id', '=', victim.id).executeTakeFirstOrThrow()).role_id).toBe(canonicalCatalogId('role', 'VIEWER'));
    expect((await db.selectFrom('auth_challenges').select('consumed_at').where('token_hash', '=', tokenHash(raw)).executeTakeFirstOrThrow()).consumed_at).toBeNull();
  });
  it('Owner demotion racing their invitation administration cannot leave stale authority or zero Owners', async () => {
    const a = await authenticated(), b = await authenticated();
    const demote = parseMutation({ action: 'role', targetId: b.id, role: 'VIEWER' }), invitation = parseMutation({ action: 'invite', email: `${randomUUID()}@example.test`, displayName: 'Race recipient', role: 'OWNER' });
    const pa = await proof(a, demote), pb = await proof(b, invitation);
    const results = await Promise.allSettled([service.mutate(a.raw, pa, demote), other.mutate(b.raw, pb, invitation)]);
    expect(results[0]!.status).toBe('fulfilled'); expect(await activeOwners()).toHaveLength(1);
    if (results[1]!.status === 'fulfilled') {
      const r = results[1]!.value;
      expect('invitation' in r).toBe(true);
      if ('invitation' in r && invitation.action === 'invite') expect((await service.acceptInvitation({ token: r.invitation.reveal(), email: invitation.email, password })).ok).toBe(false);
    } else expect(results[1]!.reason instanceof AuthorizationError).toBe(true);
  });
});

describe('final review: every administration action and target', () => {
  const attacks = ['invite-owner','promote-self','promote-other','owner-disable','owner-sessions','invitation-revoke'] as const;
  it.each(['VIEWER','CONTENT_CREATOR','REVIEWER','MARKETING_ADMIN'] as const)('%s cannot perform any Team mutation or Owner elevation', async (role) => {
    const actor = await authenticated(role), owner = await authenticated(), victim = await authenticated('VIEWER');
    for (const attack of attacks) {
      const input = parseMutation(attack === 'invite-owner' ? { action: 'invite', email: `${randomUUID()}@example.test`, displayName: 'Unauthorized', role: 'OWNER' }
        : attack.startsWith('promote') ? { action: 'role', targetId: attack === 'promote-self' ? actor.id : victim.id, role: 'OWNER' }
        : attack === 'owner-disable' ? { action: 'status', targetId: owner.id, enabled: false }
        : { action: attack === 'owner-sessions' ? 'sessions' : 'revoke-invitation', targetId: owner.id });
      await expect(service.authorizeStepUp(actor.raw, input)).rejects.toBeInstanceOf(AuthorizationError);
      await expect(service.mutate(actor.raw, await proof(actor, input), input)).rejects.toBeInstanceOf(AuthorizationError);
    }
    expect(await activeOwners()).toHaveLength(1);
    expect((await db.selectFrom('user_roles').select('role_id').where('user_id', '=', actor.id).executeTakeFirstOrThrow()).role_id).toBe(canonicalCatalogId('role', role));
    expect(await db.selectFrom('invitations').select('id').execute()).toHaveLength(0);
  });
  it.each(['role','status','sessions','revoke-invitation'] as const)('Owner %s rejects nonexistent/malformed targets without mutations', async (action) => {
    const actor = await authenticated();
    for (const targetId of [randomUUID(), 'not-a-uuid']) {
      const input = action === 'role' ? { action, targetId, role: 'VIEWER' } : action === 'status' ? { action, targetId, enabled: false } : { action, targetId };
      const raw = targetId === 'not-a-uuid' ? new SensitiveValue(randomBytes(32).toString('base64url')) : await proof(actor, parseMutation(input));
      await expect(service.mutate(actor.raw, raw, input)).rejects.toBeInstanceOf(AuthorizationError);
    }
    expect(await activeOwners()).toHaveLength(1);
  });
  it('Marketing Admin demotion revokes sessions, recent proof and password proof in committed DB state', async () => {
    const actor = await authenticated(), victim = await authenticated('MARKETING_ADMIN'), oldProof = await proof(victim, parseMutation({ action: 'sessions', targetId: actor.id }));
    const stage = await db.transaction().execute((tx) => insertPasswordChallenge(tx, victim.id, 1));
    const input = parseMutation({ action: 'role', targetId: victim.id, role: 'VIEWER' });
    await service.mutate(actor.raw, await proof(actor, input), input);
    expect((await db.selectFrom('users').select('auth_version').where('id', '=', victim.id).executeTakeFirstOrThrow()).auth_version).toBe(2);
    expect((await db.selectFrom('sessions').select('revoked_at').where('id', '=', victim.sessionId).executeTakeFirstOrThrow()).revoked_at !== null).toBe(true);
    for (const raw of [oldProof, stage.token]) expect((await db.selectFrom('auth_challenges').select('revoked_at').where('token_hash', '=', tokenHash(raw)).executeTakeFirstOrThrow()).revoked_at !== null).toBe(true);
    expect(await access.validateSession(victim.raw)).toBeNull(); expect((await access.continuePassword(stage.token)).ok).toBe(false);
  });
  it.each(['issuance','proof-consumption','admin-mutation'] as const)('disable racing %s leaves no usable disabled authority; enable never resurrects proofs', async (race) => {
    const actor = await authenticated(), victim = await authenticated(race === 'issuance' ? 'VIEWER' : 'OWNER'), targetUser = await authenticated('VIEWER');
    const disable = parseMutation({ action: 'status', targetId: victim.id, enabled: false }), change = parseMutation({ action: 'role', targetId: targetUser.id, role: 'CONTENT_CREATOR' });
    const dp = await proof(actor, disable), vp = await proof(victim, change);
    const stage = await db.transaction().execute((tx) => insertPasswordChallenge(tx, victim.id, 1));
    const competing = race === 'issuance' ? access.continuePassword(stage.token) : other.mutate(victim.raw, vp, change);
    const results = await Promise.allSettled([service.mutate(actor.raw, dp, disable), competing]);
    expect(results[0]!.status).toBe('fulfilled');
    if (results[1]!.status === 'rejected') expect(results[1]!.reason instanceof AuthorizationError).toBe(true);
    expect((await db.selectFrom('users').select('status').where('id', '=', victim.id).executeTakeFirstOrThrow()).status).toBe('disabled');
    expect(await access.validateSession(victim.raw)).toBeNull();
    const active = await db.selectFrom('sessions').select('id').where('user_id', '=', victim.id).where('revoked_at', 'is', null).execute(); expect(active).toHaveLength(0);
    const enable = parseMutation({ action: 'status', targetId: victim.id, enabled: true }); await service.mutate(actor.raw, await proof(actor, enable), enable);
    expect(await access.validateSession(victim.raw)).toBeNull(); expect((await access.continuePassword(stage.token)).ok).toBe(false);
    await expect(service.mutate(victim.raw, vp, change)).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe('final review: atomic audit, proof replay and redaction', () => {
  it.each(['invite','revoke-invitation','accept','role','disable','enable','sessions'] as const)('%s rolls back entirely on required audit failure and then succeeds once', async (action) => {
    const actor = await authenticated(), victim = await authenticated('VIEWER');
    let input = parseMutation({ action: 'sessions', targetId: victim.id });
    let link: Awaited<ReturnType<typeof invite>> | undefined;
    if (action === 'accept' || action === 'revoke-invitation') link = await invite(actor);
    if (action === 'invite') input = parseMutation({ action: 'invite', email: `${randomUUID()}@example.test`, displayName: 'Fault test', role: 'OWNER' });
    if (action === 'revoke-invitation') { const recipient = await db.selectFrom('users').select('id').where('email_normalized', '=', link!.email).executeTakeFirstOrThrow(); input = parseMutation({ action, targetId: recipient.id }); }
    if (action === 'role') input = parseMutation({ action, targetId: victim.id, role: 'MARKETING_ADMIN' });
    if (action === 'disable' || action === 'enable') { if (action === 'enable') await db.updateTable('users').set({ status: 'disabled' }).where('id', '=', victim.id).execute(); input = parseMutation({ action: 'status', targetId: victim.id, enabled: action === 'enable' }); }
    const raw = await proof(actor, input), before = await securitySnapshot();
    const successfulEvents = await db.selectFrom('security_events').select('id').where('outcome', '=', 'success').execute(); let injected = false;
    const faulty = db.withPlugin({ transformQuery(args) {
      if (args.node.kind === 'InsertQueryNode' && JSON.stringify(args.node.into).includes('audit_logs')) { injected = true; throw new Error('Intentional isolated required-audit failure'); }
      return args.node;
    }, async transformResult(args) { return args.result; } });
    const fault = createTeamService(faulty, hmac, network);
    if (action === 'accept') expect((await fault.acceptInvitation({ token: link!.token.reveal(), email: link!.email, password })).ok).toBe(false);
    else await expect(fault.mutate(actor.raw, raw, input)).rejects.toThrow('Security operation unavailable');
    expect(injected).toBe(true); expect((await securitySnapshot()) === before).toBe(true);
    expect((await db.selectFrom('security_events').select('id').where('outcome', '=', 'success').execute()).length).toBe(successfulEvents.length);
    const success = action === 'accept' ? await accept(link!) : await service.mutate(actor.raw, raw, input); expect(success.ok).toBe(true);
    const committed = await securitySnapshot();
    if (action === 'accept') expect((await accept(link!)).ok).toBe(false);
    else await expect(service.mutate(actor.raw, raw, input)).rejects.toBeInstanceOf(AuthorizationError);
    expect((await securitySnapshot()) === committed).toBe(true); // Denial telemetry is separate, never another successful audit/mutation.
  });
  it.each(['role','status','sessions','revoke-invitation','invite'] as const)('%s action commitment rejects a different action/target and a rotated session', async (action) => {
    const actor = await authenticated(), victim = await authenticated('VIEWER');
    const input = parseMutation(action === 'invite' ? { action, email: `${randomUUID()}@example.test`, displayName: 'Bound', role: 'VIEWER' } : action === 'role' ? { action, targetId: victim.id, role: 'OWNER' } : action === 'status' ? { action, targetId: victim.id, enabled: false } : { action, targetId: victim.id });
    const raw = await proof(actor, input), changed = parseMutation({ action: 'sessions', targetId: randomUUID() });
    await expect(service.mutate(actor.raw, raw, changed)).rejects.toBeInstanceOf(AuthorizationError);
    const rotated = await access.rotateSession(actor.raw); expect(rotated !== null).toBe(true);
    await expect(service.mutate(rotated!.token, raw, input)).rejects.toBeInstanceOf(AuthorizationError);
  });
  it('an action proof cannot move to a second valid session of the same Owner', async () => {
    const actor = await authenticated(), victim = await authenticated('VIEWER'), input = parseMutation({ action: 'status', targetId: victim.id, enabled: false });
    const raw = await proof(actor, input), replacement = new SensitiveValue(randomBytes(32).toString('base64url'));
    const row = await db.selectFrom('sessions').selectAll().where('id', '=', actor.sessionId).executeTakeFirstOrThrow();
    await db.insertInto('sessions').values({ ...row, id: randomUUID(), token_hash: tokenHash(replacement) }).execute();
    expect((await access.validateSession(replacement)) !== null).toBe(true);
    await expect(service.mutate(replacement, raw, input)).rejects.toBeInstanceOf(AuthorizationError);
    expect((await db.selectFrom('users').select('status').where('id', '=', victim.id).executeTakeFirstOrThrow()).status).toBe('active');
    expect((await service.mutate(actor.raw, raw, input)).ok).toBe(true);
  });
  it('successful and denied metadata cannot contain any operation credential material', async () => {
    const actor = await authenticated(), link = await invite(actor);
    expect((await accept(link)).ok).toBe(true); expect((await accept(link)).ok).toBe(false);
    const records = await Promise.all([db.selectFrom('audit_logs').select('metadata_safe_json').execute(), db.selectFrom('security_events').select('metadata_safe_json').execute()]);
    const output = JSON.stringify(records);
    for (const secret of [password, actor.raw.reveal(), link.token.reveal(), invitationHash(link.token).toString('hex'), tokenHash(actor.raw).toString('hex'), actor.secret.reveal()]) expect(output.includes(secret)).toBe(false);
    for (const keyName of ['password','password_hash','session_token','session_hash','invitation_hash','proof','csrf','mfa_secret','recovery','request','authorization','cookie']) {
      await expect(recordTeamEvent(db, { type: 'team.denied', actorId: null, targetId: null, outcome: 'denied', [keyName]: 'public synthetic prohibited metadata' } as Parameters<typeof recordTeamEvent>[1])).rejects.toThrow('Security operation unavailable');
    }
  });
});

describe('final review: invitation races and identity binding', () => {
  it('invitation A cannot accept account B and never grants recipient-chosen roles', async () => {
    const actor = await authenticated(), a = await invite(actor), b = await invite(actor);
    expect((await service.acceptInvitation({ token: a.token.reveal(), email: b.email, password })).ok).toBe(false);
    expect((await accept(a)).ok).toBe(true);
    const user = await db.selectFrom('users').select('id').where('email_normalized', '=', a.email).executeTakeFirstOrThrow();
    expect((await db.selectFrom('user_roles').select('role_id').where('user_id', '=', user.id).executeTakeFirstOrThrow()).role_id).toBe(canonicalCatalogId('role', 'VIEWER'));
    for (const token of ['malformed', randomBytes(32).toString('base64url')]) expect((await service.acceptInvitation({ token, email: b.email, password })).ok).toBe(false);
    expect((await db.selectFrom('users').select('status').where('email_normalized', '=', b.email).executeTakeFirstOrThrow()).status).toBe('invited');
  });
  it.each(['revoke','supersede','recipient-role','issuer-disable'] as const)('acceptance racing %s is serialized with a single coherent committed account', async (race) => {
    const actor = await authenticated(), secondOwner = await authenticated(), link = await invite(actor, 'MARKETING_ADMIN');
    const recipient = await db.selectFrom('users').select('id').where('email_normalized', '=', link.email).executeTakeFirstOrThrow();
    const input = parseMutation(race === 'revoke' ? { action: 'revoke-invitation', targetId: recipient.id } : race === 'supersede' ? { action: 'invite', email: link.email, displayName: 'Replacement', role: 'MARKETING_ADMIN' } : race === 'recipient-role' ? { action: 'role', targetId: recipient.id, role: 'OWNER' } : { action: 'status', targetId: actor.id, enabled: false });
    const administrator = race === 'issuer-disable' ? secondOwner : actor, raw = await proof(administrator, input);
    const results = await Promise.allSettled([service.acceptInvitation({ token: link.token.reveal(), email: link.email, password }), other.mutate(administrator.raw, raw, input)]);
    for (const r of results) if (r.status === 'rejected') expect(r.reason instanceof AuthorizationError).toBe(true);
    const user = await db.selectFrom('users').select(['status','password_hash','auth_version']).where('id', '=', recipient.id).executeTakeFirstOrThrow();
    const accepted = results[0]!.status === 'fulfilled' && results[0]!.value.ok;
    if (accepted) expect(user.password_hash !== null && user.status === 'pending_mfa').toBe(true);
    else expect(user.password_hash === null && user.status === 'invited').toBe(true);
    expect(await db.selectFrom('user_roles').select('role_id').where('user_id', '=', recipient.id).execute()).toHaveLength(1);
    expect(await db.selectFrom('sessions').select('id').where('user_id', '=', recipient.id).execute()).toHaveLength(0);
    expect(await db.selectFrom('mfa_methods').select('id').where('user_id', '=', recipient.id).execute()).toHaveLength(0);
    const invitations = await db.selectFrom('invitations').select(['accepted_at','revoked_at']).where('user_id', '=', recipient.id).execute();
    expect(invitations.filter((row) => !row.accepted_at && !row.revoked_at).length).toBeLessThanOrEqual(1);
    expect(await activeOwners()).toHaveLength(race === 'issuer-disable' ? 1 : 2);
  });
});
