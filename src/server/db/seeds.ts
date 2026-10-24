import { createHash } from 'node:crypto';
import type { Kysely } from 'kysely';
import { SecurityOperationError } from '../security/sensitive.ts';
import { PERMISSION_CODES, ROLE_CODES, ROLE_PERMISSIONS } from './catalog.ts';
import type { DatabaseSchema } from './schema.ts';

export function canonicalCatalogId(kind: string, code: string): string {
  const hex = createHash('sha256').update(`bismillah-social-ai/catalog/v1/${kind}/${code}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Explicit administrative tooling only. Never seeds users, passwords or secrets. */
export async function seedCatalog(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    for (const code of ROLE_CODES) {
      const label = code === 'OWNER' ? 'Owner / Super Admin' : code.toLowerCase().replaceAll('_', ' ');
      const id = canonicalCatalogId('role', code);
      const existing = await transaction.selectFrom('roles').select(['id', 'code']).where((expression) => expression.or([expression('code', '=', code), expression('id', '=', id)])).execute();
      if (existing.some((row) => row.id !== id || row.code !== code)) throw new Error('Canonical role catalog conflict');
      await transaction.insertInto('roles').values({ id, code, label }).onDuplicateKeyUpdate({ label }).execute();
    }
    for (const code of PERMISSION_CODES) {
      const id = canonicalCatalogId('permission', code);
      const existing = await transaction.selectFrom('permissions').select(['id', 'code']).where((expression) => expression.or([expression('code', '=', code), expression('id', '=', id)])).execute();
      if (existing.some((row) => row.id !== id || row.code !== code)) throw new Error('Canonical permission catalog conflict');
      await transaction.insertInto('permissions').values({ id, code }).onDuplicateKeyUpdate({ code }).execute();
    }
    for (const code of ROLE_CODES) {
      const roleId = canonicalCatalogId('role', code);
      await transaction.deleteFrom('role_permissions').where('role_id', '=', roleId).execute();
      await transaction.insertInto('role_permissions').values(ROLE_PERMISSIONS[code].map((permission) => ({ role_id: roleId, permission_id: canonicalCatalogId('permission', permission) }))).execute();
    }
  });
}

/** Lock and verify the whole authorization catalog; never repair corrupt seeds here. */
export async function assertCanonicalAuthorization(db: Kysely<DatabaseSchema>): Promise<void> {
  const roles = await db.selectFrom('roles').select(['id', 'code']).orderBy('id').forUpdate().execute();
  const permissions = await db.selectFrom('permissions').select(['id', 'code']).orderBy('id').forUpdate().execute();
  const assignments = await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').forUpdate().execute();
  const actualRoles = roles.map((row) => `${row.id}:${row.code}`).sort();
  const expectedRoles = ROLE_CODES.map((code) => `${canonicalCatalogId('role', code)}:${code}`).sort();
  const actualPermissions = permissions.map((row) => `${row.id}:${row.code}`).sort();
  const expectedPermissions = PERMISSION_CODES.map((code) => `${canonicalCatalogId('permission', code)}:${code}`).sort();
  const actualAssignments = assignments.map((row) => `${row.role_id}:${row.permission_id}`).sort();
  const expectedAssignments = ROLE_CODES.flatMap((role) => ROLE_PERMISSIONS[role].map((permission) => `${canonicalCatalogId('role', role)}:${canonicalCatalogId('permission', permission)}`)).sort();
  if (JSON.stringify(actualRoles) !== JSON.stringify(expectedRoles) || JSON.stringify(actualPermissions) !== JSON.stringify(expectedPermissions)
    || JSON.stringify(actualAssignments) !== JSON.stringify(expectedAssignments)) throw new SecurityOperationError();
}
