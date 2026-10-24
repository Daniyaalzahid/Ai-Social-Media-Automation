import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import type { DatabaseConfiguration } from '../db/config.ts';
import { canonicalCatalogId, assertCanonicalAuthorization } from '../db/seeds.ts';
import { assertMigrationsComplete } from '../db/migrations.ts';
import { normalizeEmail } from '../security/identity.ts';
import { appendAudit, appendSecurityEvent, type SecurityEventInput } from '../security/events.ts';
import { SecurityOperationError } from '../security/sensitive.ts';
import { hashPassword } from './passwords.ts';
import { validatePassword } from './password-policy.ts';

export async function verifyBootstrapDatabase(db: Kysely<DatabaseSchema>, configuration: DatabaseConfiguration): Promise<void> {
  try {
  if ((configuration.mode !== 'production' && !configuration.user.endsWith('_migration')) || (configuration.mode === 'production' && !configuration.tls)) throw new SecurityOperationError();
  const identity = (await sql<{ database_name: string; account_name: string }>`SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name`.execute(db)).rows[0];
  if (!identity || identity.database_name !== configuration.database || identity.account_name.split('@')[0] !== configuration.user) throw new SecurityOperationError();
  if (configuration.mode === 'production') await assertMigrationsComplete(db);
  } catch { throw new SecurityOperationError(); }
}

const ownerInput = z.object({ email: z.string().max(320), displayName: z.string().min(1).max(120).refine((value) => value.trim().length > 0 && [...value].every((character) => character.codePointAt(0)! >= 32 && character.codePointAt(0) !== 127)), password: z.unknown() }).strict();

/** Administrative tooling only. Never accepts an HTTP request or creates a session/factor. */
export async function bootstrapOwner(db: Kysely<DatabaseSchema>, input: { email: string; displayName: string; password: unknown }, configuration: DatabaseConfiguration): Promise<{ userId: string; state: 'MFA_ENROLLMENT_REQUIRED' }> {
  // Validate again at the mutation boundary, before even writing an attempt event.
  await verifyBootstrapDatabase(db, configuration);
  const correlationId = randomUUID();
  let reasonCode: SecurityEventInput['metadata']['reasonCode'] = 'BOOTSTRAP_FAILED';
  try {
    const parsed = ownerInput.safeParse(input);
    if (!parsed.success) throw new SecurityOperationError();
    const email = normalizeEmail(parsed.data.email);
    validatePassword(parsed.data.password);
    await appendSecurityEvent(db, { type: 'bootstrap.attempt', outcome: 'success', userId: null, correlationId, ipHash: null, metadata: { reasonCode: 'BOOTSTRAP_ATTEMPT' } });
    // Expensive work outside the critical transaction; gate rechecked under lock.
    const encoded = await hashPassword(parsed.data.password);
    return await db.transaction().execute(async (transaction) => {
      const installation = await transaction.selectFrom('installation_state').selectAll().where('id', '=', 1).forUpdate().executeTakeFirst();
      if (!installation || installation.bootstrap_consumed_at || installation.initial_owner_id) { reasonCode = 'BOOTSTRAP_CONSUMED'; throw new SecurityOperationError(); }
      await assertCanonicalAuthorization(transaction);
      const roleId = canonicalCatalogId('role', 'OWNER');
      const role = await transaction.selectFrom('roles').select(['id', 'code']).where('code', '=', 'OWNER').executeTakeFirst();
      if (!role || role.id !== roleId) throw new SecurityOperationError();
      const existing = await transaction.selectFrom('user_roles').innerJoin('roles', 'roles.id', 'user_roles.role_id').select('user_roles.user_id').where('roles.code', '=', 'OWNER').executeTakeFirst();
      if (existing) { reasonCode = 'OWNER_EXISTS'; throw new SecurityOperationError(); }
      const userId = randomUUID(), now = (await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(transaction)).rows[0]!.now;
      await transaction.insertInto('users').values({ id: userId, email_normalized: email, display_name: parsed.data.displayName, password_hash: encoded.reveal(),
        status: 'pending_mfa', auth_version: 1, password_changed_at: now, last_login_at: null, created_at: now, updated_at: now }).execute();
      await transaction.insertInto('user_roles').values({ user_id: userId, role_id: roleId, assigned_by: null, created_at: now }).execute();
      await transaction.updateTable('installation_state').set({ bootstrap_consumed_at: now, initial_owner_id: userId }).where('id', '=', 1).execute();
      await appendAudit(transaction, { action: 'owner.bootstrap', actorUserId: userId, targetUserId: userId, correlationId, metadata: { reasonCode: 'BOOTSTRAP_CREATED' } });
      await appendSecurityEvent(transaction, { type: 'bootstrap.success', outcome: 'success', userId, correlationId, ipHash: null, metadata: { reasonCode: 'BOOTSTRAP_CREATED' } });
      return { userId, state: 'MFA_ENROLLMENT_REQUIRED' as const };
    });
  } catch {
    try { await appendSecurityEvent(db, { type: 'bootstrap.failure', outcome: 'failure', userId: null, correlationId, ipHash: null, metadata: { reasonCode } }); } catch { /* No mutation succeeds without required records. */ }
    throw new SecurityOperationError();
  }
}
