import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import { ROLE_CODES, type RoleCode } from '../db/catalog.ts';
import { canonicalCatalogId } from '../db/seeds.ts';
import { authorizationContext, requireAuthenticatedUser, requirePermission, requireOwner, validateCatalog, AuthorizationError, type AuthorizationContext } from '../authorization/authorization.ts';
import { tokenHash } from '../auth/access.ts';
import { hashPassword } from '../auth/passwords.ts';
import { normalizeEmail, pseudonym, NetworkIdentity } from '../security/identity.ts';
import { admitAuthentication } from '../security/rate-limits.ts';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';
import { parseMutation, permissionFor, teamAction, type TeamMutation } from './policy.ts';
import { recordTeamEvent } from './events.ts';

export const INVITATION_FAILURE = Object.freeze({ ok: false as const, message: 'Unable to accept this invitation. Check the link and password requirements, or request a new invitation.' });
export type MemberDTO = { id: string; displayName: string; email: string; role: RoleCode; status: 'invited' | 'pending_mfa' | 'active' | 'disabled'; mfaEnabled: boolean; activeSessions: number };
export function invitationHash(token: SensitiveValue) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token.reveal())) throw new SecurityOperationError();
  return createHash('sha256').update('bsa/invitation/v1/').update(token.reveal()).digest();
}
const nowFrom = async (db: Kysely<DatabaseSchema>) => (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;
async function guard(db: Kysely<DatabaseSchema>) {
  if (!(await db.selectFrom('team_administration_guard').select('id').where('id', '=', 1).forUpdate().executeTakeFirst())) throw new SecurityOperationError();
}
async function lockUsers(db: Kysely<DatabaseSchema>, ids: string[]) {
  // Individual equality locks have deterministic ordering; no optimizer-dependent IN order.
  for (const id of [...new Set(ids)].sort()) if (!await db.selectFrom('users').select('id').where('id', '=', id).forUpdate().executeTakeFirst()) throw new AuthorizationError();
}
async function roleFor(db: Kysely<DatabaseSchema>, id: string): Promise<RoleCode> {
  const row = await db.selectFrom('user_roles').innerJoin('roles', 'roles.id', 'user_roles.role_id').select(['roles.code', 'roles.id']).where('user_id', '=', id).forShare().executeTakeFirst();
  if (!row || !ROLE_CODES.some((r) => r === row.code) || row.id !== canonicalCatalogId('role', row.code)) throw new AuthorizationError();
  return row.code as RoleCode;
}
async function invalidate(db: Kysely<DatabaseSchema>, id: string, now: Date, version: boolean) {
  if (version) await db.updateTable('users').set({ auth_version: sql`auth_version + 1`, updated_at: now }).where('id', '=', id).execute();
  await db.updateTable('sessions').set({ revoked_at: now, revocation_reason: 'team_administration' }).where('user_id', '=', id).where('revoked_at', 'is', null).execute();
  await db.updateTable('auth_challenges').set({ revoked_at: now }).where('user_id', '=', id).where('consumed_at', 'is', null).where('revoked_at', 'is', null).execute();
  await db.updateTable('invitations').set({ revoked_at: now }).where('user_id', '=', id).where('accepted_at', 'is', null).where('revoked_at', 'is', null).execute();
}
function authorizeMutation(context: AuthorizationContext, input: TeamMutation) {
  requireOwner(context); requirePermission(context, permissionFor(input));
  if (input.action === 'invite') requirePermission(context, 'roles.assign');
}
export function createTeamService(db: Kysely<DatabaseSchema>, rateKey: Buffer, network: NetworkIdentity) {
  async function transaction<T>(fn: (tx: Kysely<DatabaseSchema>) => Promise<T>) {
    try { return await db.transaction().execute(fn); }
    catch (error) { if (error instanceof AuthorizationError) {
      try { await recordTeamEvent(db, { type: 'team.denied', actorId: null, targetId: null, outcome: 'denied' }); } catch { /* Denial is authoritative even if telemetry is unavailable. */ }
      throw error;
    } throw new SecurityOperationError(); }
  }
  async function preauthorize(raw: SensitiveValue, input: TeamMutation) {
    try { authorizeMutation(await authorizationContext(db, raw), input); }
    catch (error) {
      if (error instanceof AuthorizationError) {
        try { await recordTeamEvent(db, { type: 'team.denied', actorId: null, targetId: null, outcome: 'denied' }); } catch { /* Remains denied. */ }
      }
      throw error;
    }
  }
  return {
    async members(raw: SensitiveValue, page = 0, targetId?: string): Promise<MemberDTO[]> {
      if (!Number.isSafeInteger(page) || page < 0 || page > 1000 || (targetId !== undefined && !z.uuid().safeParse(targetId).success)) throw new AuthorizationError();
      return transaction(async (tx) => {
        const { context } = await requireAuthenticatedUser(tx, raw); requirePermission(context, 'users.manage');
        let query = tx.selectFrom('users').select(['id', 'display_name', 'email_normalized', 'status', 'auth_version']);
        if (targetId) query = query.where('id', '=', targetId);
        const users = await query.orderBy('created_at').orderBy('id').limit(50).offset(page * 50).execute(), now = await nowFrom(tx);
        const dto: MemberDTO[] = [];
        for (const user of users) {
          const role = await roleFor(tx, user.id);
          const factor = await tx.selectFrom('mfa_methods').select(['state', 'confirmed_at']).where('user_id', '=', user.id).executeTakeFirst();
          const sessions = await tx.selectFrom('sessions').select('id').where('user_id', '=', user.id).where('auth_version', '=', user.auth_version).where('revoked_at', 'is', null).where('idle_expires_at', '>', now).where('absolute_expires_at', '>', now).execute();
          dto.push({ id: user.id, displayName: user.display_name, email: user.email_normalized, status: user.status, role, mfaEnabled: factor?.state === 'active', activeSessions: user.status === 'active' ? sessions.length : 0 });
        }
        return dto;
      });
    },
    async authorizeStepUp(raw: SensitiveValue, value: unknown) {
      const input = parseMutation(value);
      await preauthorize(raw, input);
      return teamAction(input);
    },
    async mutate(raw: SensitiveValue, proofToken: SensitiveValue, value: unknown) {
      let input; try { input = parseMutation(value); } catch { throw new AuthorizationError(); }
      // Deny unauthorized traffic before it can contend on the global guard or another user's row.
      await preauthorize(raw, input);
      return transaction(async (tx) => {
        await guard(tx);
        const actorHint = await tx.selectFrom('sessions').select('user_id').where('token_hash', '=', tokenHash(raw)).executeTakeFirst();
        if (!actorHint) throw new AuthorizationError(401);
        const existing = input.action === 'invite' ? await tx.selectFrom('users').select('id').where('email_normalized', '=', input.email).executeTakeFirst() : { id: input.targetId };
        await lockUsers(tx, [actorHint.user_id, ...(existing ? [existing.id] : [])]);
        const { context, state } = await requireAuthenticatedUser(tx, raw);
        authorizeMutation(context, input);
        const now = state.now;
        const proof = await tx.selectFrom('auth_challenges').selectAll().where('token_hash', '=', tokenHash(proofToken)).forUpdate().executeTakeFirst();
        if (!proof || proof.purpose !== 'reauthentication' || proof.action_code !== teamAction(input) || proof.user_id !== context.userId || proof.bound_session_id !== state.row.id || proof.auth_version !== state.identity.user.auth_version || proof.consumed_at || proof.revoked_at || proof.expires_at <= now || now.getTime() - proof.created_at.getTime() > 300000) throw new AuthorizationError();
        if (existing?.id === context.userId) throw new AuthorizationError();
        await tx.updateTable('auth_challenges').set({ consumed_at: now }).where('id', '=', proof.id).execute();
        if (input.action === 'invite') {
          const id = existing?.id ?? randomUUID();
          if (existing) {
            const user = await tx.selectFrom('users').select(['status', 'password_hash']).where('id', '=', id).forUpdate().executeTakeFirstOrThrow();
            if (user.status !== 'invited' || user.password_hash !== null || await roleFor(tx, id) !== input.role) throw new AuthorizationError();
          } else {
            await tx.insertInto('users').values({ id, email_normalized: input.email, display_name: input.displayName, password_hash: null, status: 'invited', password_changed_at: null, last_login_at: null }).execute();
            await tx.insertInto('user_roles').values({ user_id: id, role_id: canonicalCatalogId('role', input.role), assigned_by: context.userId }).execute();
          }
          await invalidate(tx, id, now, true);
          const recipient = await tx.selectFrom('users').select('auth_version').where('id', '=', id).forUpdate().executeTakeFirstOrThrow();
          const invitation = new SensitiveValue(randomBytes(32).toString('base64url'));
          await tx.insertInto('invitations').values({ id: randomUUID(), user_id: id, issued_by: context.userId, token_hash: invitationHash(invitation), intended_role_id: canonicalCatalogId('role', input.role), recipient_auth_version: recipient.auth_version, issuer_auth_version: state.identity.user.auth_version, created_at: now, expires_at: new Date(now.getTime() + 86400000), accepted_at: null, revoked_at: null }).execute();
          await recordTeamEvent(tx, { type: 'team.invitation_created', actorId: context.userId, targetId: id, outcome: 'success', after: input.role });
          return { ok: true as const, invitation };
        }
        const target = await tx.selectFrom('users').select(['id', 'status', 'password_hash']).where('id', '=', input.targetId).forUpdate().executeTakeFirstOrThrow(), oldRole = await roleFor(tx, target.id);
        if (input.action === 'revoke-invitation') {
          if (target.status !== 'invited') throw new AuthorizationError();
          await invalidate(tx, target.id, now, true);
          await recordTeamEvent(tx, { type: 'team.invitation_revoked', actorId: context.userId, targetId: target.id, outcome: 'success' });
        } else if (input.action === 'sessions') {
          await invalidate(tx, target.id, now, false);
          await recordTeamEvent(tx, { type: 'team.sessions_revoked', actorId: context.userId, targetId: target.id, outcome: 'success' });
        } else {
          const removesOwner = oldRole === 'OWNER' && target.status === 'active' && (input.action === 'role' ? input.role !== 'OWNER' : !input.enabled);
          if (removesOwner) {
            const owners = await tx.selectFrom('users').innerJoin('user_roles', 'user_roles.user_id', 'users.id').select('users.id').where('user_roles.role_id', '=', canonicalCatalogId('role', 'OWNER')).where('users.status', '=', 'active').forUpdate().execute();
            if (owners.length <= 1) throw new AuthorizationError();
          }
          if (input.action === 'role') {
            if (oldRole === input.role) throw new AuthorizationError();
            const factor = await tx.selectFrom('mfa_methods').select('state').where('user_id', '=', target.id).forUpdate().executeTakeFirst();
            const pending = ['OWNER', 'MARKETING_ADMIN'].includes(input.role) && factor?.state !== 'active';
            await tx.updateTable('user_roles').set({ role_id: canonicalCatalogId('role', input.role), assigned_by: context.userId }).where('user_id', '=', target.id).execute();
            if (target.status !== 'disabled' && target.status !== 'invited') await tx.updateTable('users').set({ status: pending ? 'pending_mfa' : 'active', updated_at: now }).where('id', '=', target.id).execute();
            await recordTeamEvent(tx, { type: 'team.role_changed', actorId: context.userId, targetId: target.id, outcome: 'success', before: oldRole, after: input.role });
          } else {
            if (!target.password_hash || (input.enabled ? target.status !== 'disabled' : target.status === 'disabled' || target.status === 'invited')) throw new AuthorizationError();
            const factor = await tx.selectFrom('mfa_methods').select('state').where('user_id', '=', target.id).forUpdate().executeTakeFirst();
            const status = input.enabled ? (['OWNER', 'MARKETING_ADMIN'].includes(oldRole) && factor?.state !== 'active' ? 'pending_mfa' : 'active') : 'disabled';
            await tx.updateTable('users').set({ status, updated_at: now }).where('id', '=', target.id).execute();
            await recordTeamEvent(tx, { type: input.enabled ? 'team.account_enabled' : 'team.account_disabled', actorId: context.userId, targetId: target.id, outcome: 'success', before: target.status, after: status });
          }
          await invalidate(tx, target.id, now, true);
        }
        return { ok: true as const };
      });
    },
    async acceptInvitation(value: { token: unknown; email: unknown; password: unknown }) {
      // Always rate-admit before hashing; malformed/unknown identities receive the same public result.
      let email = 'invalid-invitation@example.invalid'; try { email = normalizeEmail(value.email); } catch { /* Safe fixed admission bucket. */ }
      try {
        if (!await admitAuthentication(db, [{ scope: 'auth_global', hash: pseudonym(rateKey, 'global', 'password-stage') }, { scope: 'auth_network', hash: network.pseudonym(rateKey) }, { scope: 'auth_account', hash: pseudonym(rateKey, 'account', email) }])) return INVITATION_FAILURE;
        if (typeof value.token !== 'string') return INVITATION_FAILURE;
        const hash = invitationHash(new SensitiveValue(value.token));
        const encoded = await hashPassword(value.password);
        return await transaction(async (tx) => {
          await guard(tx);
          const hint = await tx.selectFrom('invitations').select(['user_id', 'issued_by']).where('token_hash', '=', hash).executeTakeFirst();
          if (!hint) return INVITATION_FAILURE;
          await lockUsers(tx, [hint.user_id, hint.issued_by]); await validateCatalog(tx);
          const invitation = await tx.selectFrom('invitations').selectAll().where('token_hash', '=', hash).forUpdate().executeTakeFirstOrThrow(), now = await nowFrom(tx);
          const user = await tx.selectFrom('users').selectAll().where('id', '=', hint.user_id).forUpdate().executeTakeFirstOrThrow();
          const issuer = await tx.selectFrom('users').select(['status', 'auth_version']).where('id', '=', hint.issued_by).forUpdate().executeTakeFirstOrThrow();
          const role = await roleFor(tx, user.id), issuerRole = await roleFor(tx, hint.issued_by);
          if (invitation.expires_at <= now || invitation.accepted_at || invitation.revoked_at || !invitation.intended_role_id || invitation.intended_role_id !== canonicalCatalogId('role', role) || invitation.recipient_auth_version !== user.auth_version || invitation.issuer_auth_version !== issuer.auth_version || issuer.status !== 'active' || issuerRole !== 'OWNER' || user.status !== 'invited' || user.password_hash !== null || user.email_normalized !== email) {
            await recordTeamEvent(tx, { type: 'team.invitation_invalid', actorId: null, targetId: null, outcome: 'denied' }); return INVITATION_FAILURE;
          }
          await tx.updateTable('users').set({ password_hash: encoded.reveal(), status: ['OWNER', 'MARKETING_ADMIN'].includes(role) ? 'pending_mfa' : 'active', password_changed_at: now, updated_at: now, auth_version: user.auth_version + 1 }).where('id', '=', user.id).execute();
          await tx.updateTable('invitations').set({ accepted_at: now }).where('id', '=', invitation.id).execute();
          await recordTeamEvent(tx, { type: 'team.invitation_accepted', actorId: user.id, targetId: user.id, outcome: 'success' });
          return { ok: true as const };
        });
      } catch { return INVITATION_FAILURE; }
    },
  };
}
