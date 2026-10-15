import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../db/schema.ts';
import { PERMISSION_CODES, ROLE_CODES, ROLE_PERMISSIONS, type PermissionCode, type RoleCode } from '../db/catalog.ts';
import { canonicalCatalogId } from '../db/seeds.ts';
import { lockedSession } from '../auth/access.ts';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';

export class AuthorizationError extends Error {
  constructor(readonly status: 401 | 403 = 403) { super('Access denied'); this.name = 'AuthorizationError'; }
}
/** Must run inside the same transaction as an authorized mutation. No cross-request cache. */
export async function validateCatalog(db: Kysely<DatabaseSchema>): Promise<void> {
  const roles = await db.selectFrom('roles').select(['id', 'code']).forShare().execute();
  const permissions = await db.selectFrom('permissions').select(['id', 'code']).forShare().execute();
  const grants = await db.selectFrom('role_permissions').selectAll().forShare().execute();
  if (roles.length !== ROLE_CODES.length || permissions.length !== PERMISSION_CODES.length
    || ROLE_CODES.some((code) => !roles.some((r) => r.code === code && r.id === canonicalCatalogId('role', code)))
    || PERMISSION_CODES.some((code) => !permissions.some((p) => p.code === code && p.id === canonicalCatalogId('permission', code)))) throw new AuthorizationError();
  const expected = ROLE_CODES.flatMap((role) => ROLE_PERMISSIONS[role].map((permission) => `${canonicalCatalogId('role', role)}/${canonicalCatalogId('permission', permission)}`)).sort();
  if (JSON.stringify(grants.map((g) => `${g.role_id}/${g.permission_id}`).sort()) !== JSON.stringify(expected)) throw new AuthorizationError();
}
export type AuthorizationContext = { userId: string; sessionId: string; displayName: string; role: RoleCode; permissions: readonly PermissionCode[] };
export function can(context: AuthorizationContext, permission: string): boolean {
  return PERMISSION_CODES.some((p) => p === permission) && context.permissions.some((p) => p === permission);
}
export function requirePermission(context: AuthorizationContext, permission: PermissionCode): void { if (!can(context, permission)) throw new AuthorizationError(); }
export function requireAnyPermission(context: AuthorizationContext, permissions: readonly PermissionCode[]): void { if (!permissions.length || !permissions.some((p) => can(context, p))) throw new AuthorizationError(); }
export function requireAllPermissions(context: AuthorizationContext, permissions: readonly PermissionCode[]): void { if (!permissions.length || !permissions.every((p) => can(context, p))) throw new AuthorizationError(); }
export function requireOwner(context: AuthorizationContext): void { if (context.role !== 'OWNER') throw new AuthorizationError(); }
export async function requireAuthenticatedUser(db: Kysely<DatabaseSchema>, raw: SensitiveValue) {
  const state = await lockedSession(db, raw);
  if (!state) throw new AuthorizationError(401);
  await validateCatalog(db);
  const role = state.identity.role as RoleCode;
  const context: AuthorizationContext = { userId: state.identity.user.id, sessionId: state.row.id, displayName: state.identity.user.display_name, role, permissions: ROLE_PERMISSIONS[role] };
  return { context, state };
}
export async function authorizationContext(db: Kysely<DatabaseSchema>, raw: SensitiveValue): Promise<AuthorizationContext> {
  try { return await db.transaction().execute(async (tx) => (await requireAuthenticatedUser(tx, raw)).context); }
  catch (error) { if (error instanceof AuthorizationError) throw error; throw new SecurityOperationError(); }
}
