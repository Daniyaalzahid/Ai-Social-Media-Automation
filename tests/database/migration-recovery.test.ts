import { BRAND_DROP_ORDER,MEDIA_DROP_ORDER,AI_DROP_ORDER } from '../../src/server/db/schema';
import { hashPassword } from '../../src/server/auth/passwords';
import { createAccessService, tokenHash } from '../../src/server/auth/access';
import { encryptMfa, newTotpSecret } from '../../src/server/auth/mfa-crypto';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { NetworkIdentity } from '../../src/server/security/identity';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { migrateDatabase, readMigrations } from '../../src/server/db/migrations';
import { seedCatalog } from '../../src/server/db/seeds';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { Migrator, type Migration } from 'kysely/migration';
import { randomBytes } from 'node:crypto';

const dropOrder = [...AI_DROP_ORDER,...MEDIA_DROP_ORDER,...BRAND_DROP_ORDER, 'audit_logs', 'security_events', 'mfa_recovery_codes', 'mfa_methods', 'auth_challenges', 'sessions',
  'password_reset_tokens', 'invitations', 'team_administration_guard', 'installation_state', 'user_roles', 'role_permissions', 'permissions', 'roles', 'users', 'auth_rate_limits',
  'kysely_migration', 'kysely_migration_lock', 'schema_migration_checksums'] as const;
function scratch(name: 'bsa_test_clean' | 'bsa_test_recovery') {
  const url = new URL(process.env.TEST_DATABASE_MIGRATION_URL!); url.pathname = `/${name}`;
  const source = { ...process.env, TEST_DATABASE_MIGRATION_URL: url.href };
  return { source, handle: createDatabase(resolveDatabaseConfiguration(source, 'destructive-test')) };
}
async function clearScratch(db: Kysely<DatabaseSchema>, source: Record<string, string | undefined>) {
  await assertDestructiveTestDatabase(db, source);
  for (const table of dropOrder) await sql`DROP TABLE IF EXISTS ${sql.id(table)}`.execute(db);
}

async function seedLegacyCatalog(db: Kysely<DatabaseSchema>) {
  await seedCatalog(db);
  for(const code of ['brand.read','media.read','media.manage']){const id=canonicalCatalogId('permission',code);await db.deleteFrom('role_permissions').where('permission_id','=',id).execute();await db.deleteFrom('permissions').where('id','=',id).execute();}
}

describe('isolated clean migration and recovery', () => {
  it('upgrades the actual Phase 2A SQL/journal to 0003, preserves old enum rows and rejects checksum tampering', async () => {
    const { source, handle } = scratch('bsa_test_clean');
    const db = handle.db;
    try {
      await clearScratch(db, source);
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64) NOT NULL, state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const phase2a = (await readMigrations()).slice(0, 3);
      const migrations: Record<string, Migration> = Object.fromEntries(phase2a.map((entry) => [entry.name, { up: async (connection) => {
        await sql`INSERT INTO schema_migration_checksums (name,sha256,state) VALUES (${entry.name},${entry.sha256},'applying')`.execute(connection);
        for (const statement of entry.statements) await sql.raw(statement).execute(connection);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(connection);
      } }]));
      const result = await new Migrator({ db, provider: { getMigrations: async () => migrations } }).migrateToLatest();
      expect(result.error === undefined).toBe(true);
      await seedLegacyCatalog(db);
      const userId = randomUUID();
      await db.insertInto('users').values({ id: userId, email_normalized: `${userId}@example.test`, display_name: 'Synthetic upgrade', status: 'invited', password_hash: null, password_changed_at: null, last_login_at: null }).execute();
      const oldProof = randomUUID();
      await db.insertInto('auth_challenges').values({ id: oldProof, user_id: userId, purpose: 'login_mfa', token_hash: randomBytes(32), auth_version: 1, action_code: null, consumed_at: null, revoked_at: null,
        created_at: new Date(), expires_at: new Date(Date.now() + 300000) }).execute();
      await migrateDatabase(db); await migrateDatabase(db);
      expect((await db.selectFrom('auth_challenges').select('purpose').where('id', '=', oldProof).executeTakeFirstOrThrow()).purpose).toBe('login_mfa');
      await db.insertInto('auth_challenges').values({ id: randomUUID(), user_id: userId, purpose: 'password_verified', token_hash: randomBytes(32), auth_version: 1, action_code: 'PASSWORD_VERIFIED', consumed_at: null, revoked_at: null,
        created_at: new Date(), expires_at: new Date(Date.now() + 300000) }).execute();
      expect((await sql`SELECT name FROM schema_migration_checksums`.execute(db)).rows).toHaveLength(9);
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0003_password_verified_challenges.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    } finally { await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close(); }
  });
  it('upgrades Phase 2B to 0004, enforces binding FK/CHECK and rejects 0004 tampering', async () => {
    const { source, handle } = scratch('bsa_test_clean'); const db = handle.db;
    try {
      await clearScratch(db, source);
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64) NOT NULL, state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const phase2b = (await readMigrations()).slice(0, 4);
      const migrations: Record<string, Migration> = Object.fromEntries(phase2b.map((entry) => [entry.name, { up: async (connection) => {
        await sql`INSERT INTO schema_migration_checksums (name,sha256,state) VALUES (${entry.name},${entry.sha256},'applying')`.execute(connection);
        for (const statement of entry.statements) await sql.raw(statement).execute(connection);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(connection);
      } }]));
      expect((await new Migrator({ db, provider: { getMigrations: async () => migrations } }).migrateToLatest()).error === undefined).toBe(true);
      await seedLegacyCatalog(db);
      const userId = randomUUID(), methodId = randomUUID();
      await db.insertInto('users').values({ id: userId, email_normalized: `${userId}@example.test`, display_name: 'Synthetic upgrade', status: 'invited', password_hash: null, password_changed_at: null, last_login_at: null }).execute();
      await db.insertInto('mfa_methods').values({ id: methodId, user_id: userId, type: 'totp', state: 'active', created_at: new Date(Date.now() - 1000), seed_ciphertext: randomBytes(20), iv: randomBytes(12), tag: randomBytes(16), key_id: 'test-only', confirmed_at: new Date(), enrollment_expires_at: null, last_accepted_step: 1 }).execute();
      await migrateDatabase(db); await migrateDatabase(db);
      expect((await db.selectFrom('mfa_methods').select('enrollment_challenge_id').where('id', '=', methodId).executeTakeFirstOrThrow()).enrollment_challenge_id).toBeNull();
      const challengeId = randomUUID();
      await db.insertInto('auth_challenges').values({ id: challengeId, user_id: userId, token_hash: randomBytes(32), purpose: 'password_verified', auth_version: 1, action_code: 'PASSWORD_VERIFIED', consumed_at: null, revoked_at: null, expires_at: new Date(Date.now() + 60000) }).execute();
      await expect(db.updateTable('mfa_methods').set({ enrollment_challenge_id: challengeId }).where('id', '=', methodId).execute()).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
      await expect(db.updateTable('auth_challenges').set({ bound_session_id: randomUUID() }).where('id', '=', challengeId).execute()).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0004_phase2c_access_bindings.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    } finally { await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close(); }
  });
  it('upgrades exact Phase 2C to 0005, preserves legacy invitations and rejects checksum tampering', async () => {
    const { source, handle } = scratch('bsa_test_clean'), db = handle.db;
    try {
      await clearScratch(db, source);
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64) NOT NULL, state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const entries = (await readMigrations()).slice(0, 5);
      const migrations: Record<string, Migration> = Object.fromEntries(entries.map((entry) => [entry.name, { up: async (c) => {
        await sql`INSERT INTO schema_migration_checksums(name,sha256,state) VALUES(${entry.name},${entry.sha256},'applying')`.execute(c);
        for (const statement of entry.statements) await sql.raw(statement).execute(c);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(c);
      } }]));
      expect((await new Migrator({ db, provider: { getMigrations: async () => migrations } }).migrateToLatest()).error === undefined).toBe(true);
      await seedLegacyCatalog(db);
      const id = randomUUID(); await db.insertInto('users').values({ id, email_normalized: `${id}@example.test`, display_name: 'Synthetic legacy invitation', password_hash: null, status: 'invited', password_changed_at: null, last_login_at: null }).execute();
      await db.insertInto('invitations').values({ id: randomUUID(), user_id: id, issued_by: id, token_hash: randomBytes(32), expires_at: new Date(Date.now() + 60000), accepted_at: null, revoked_at: null }).execute();
      // Preserve a genuinely usable Phase 2C identity, encrypted factor and session across 0005.
      const existingId = randomUUID(), factorId = randomUUID(), sessionId = randomUUID(), now = new Date();
      const key = { key: randomBytes(32), id: 'migration-review' }, secret = newTotpSecret(), raw = new SensitiveValue(randomBytes(32).toString('base64url'));
      await db.insertInto('users').values({ id: existingId, email_normalized: `${existingId}@example.test`, display_name: 'Existing Phase 2C account', password_hash: (await hashPassword('public synthetic migration phrase')).reveal(), status: 'active', password_changed_at: now, last_login_at: null }).execute();
      await db.insertInto('user_roles').values({ user_id: existingId, role_id: canonicalCatalogId('role','VIEWER'), assigned_by: null }).execute();
      await db.insertInto('mfa_methods').values({ id: factorId, user_id: existingId, type: 'totp', state: 'active', ...encryptMfa(secret,key,existingId,factorId), created_at: now, confirmed_at: now, enrollment_expires_at: null, last_accepted_step: null }).execute();
      await db.insertInto('sessions').values({ id: sessionId, user_id: existingId, token_hash: tokenHash(raw), auth_version: 1, created_at: now, last_activity_at: now, idle_expires_at: new Date(+now + 1800000), absolute_expires_at: new Date(+now + 86400000), authenticated_at: now, mfa_verified_at: now, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null }).execute();
      const snapshot = async () => JSON.stringify(await Promise.all([db.selectFrom('users').selectAll().orderBy('id').execute(), db.selectFrom('user_roles').selectAll().orderBy('user_id').execute(), db.selectFrom('mfa_methods').selectAll().orderBy('id').execute(), db.selectFrom('sessions').selectAll().orderBy('id').execute()]));
      const before = await snapshot();
      await migrateDatabase(db); await migrateDatabase(db);
      expect((await snapshot()) === before).toBe(true);
      expect((await createAccessService(db,key,randomBytes(32),NetworkIdentity.fromSocketAddress('::')).validateSession(raw)) !== null).toBe(true);
      expect((await db.selectFrom('invitations').select('intended_role_id').executeTakeFirstOrThrow()).intended_role_id).toBeNull();
      expect(await db.selectFrom('team_administration_guard').selectAll().execute()).toEqual([{ id: 1 }]);
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0005_phase2d_administration.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    } finally { await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close(); }
  });
  it('upgrades exact Phase 2D with only brand.read grants and preserves existing data', async () => {
    const { source, handle }=scratch('bsa_test_clean'), db=handle.db;
    try {
      await clearScratch(db,source);
      await sql`CREATE TABLE schema_migration_checksums(name varchar(150) PRIMARY KEY,sha256 char(64) NOT NULL,state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const entries=(await readMigrations()).slice(0,6);
      const migrations:Record<string,Migration>=Object.fromEntries(entries.map((entry)=>[entry.name,{up:async(c)=>{
        await sql`INSERT INTO schema_migration_checksums(name,sha256,state) VALUES(${entry.name},${entry.sha256},'applying')`.execute(c);
        for(const statement of entry.statements)await sql.raw(statement).execute(c);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(c);
      }}]));
      expect((await new Migrator({db,provider:{getMigrations:async()=>migrations}}).migrateToLatest()).error===undefined).toBe(true);
      await seedLegacyCatalog(db);
      const before=await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute();
      expect(await db.selectFrom('permissions').selectAll().execute()).toHaveLength(28);
      const id=randomUUID();await db.insertInto('users').values({id,email_normalized:`${id}@example.test`,display_name:'Legacy identity',password_hash:null,status:'invited',password_changed_at:null,last_login_at:null}).execute();
      const user=await db.selectFrom('users').selectAll().where('id','=',id).executeTakeFirstOrThrow();
      const ownerId=randomUUID(),methodId=randomUUID(),sessionId=randomUUID(),now=new Date(),key={key:randomBytes(32),id:'phase2d-upgrade-review'},raw=new SensitiveValue(randomBytes(32).toString('base64url'));
      await db.insertInto('users').values({id:ownerId,email_normalized:`${ownerId}@example.test`,display_name:'Existing Owner',password_hash:(await hashPassword('public synthetic upgrade review phrase')).reveal(),status:'active',password_changed_at:now,last_login_at:null}).execute();
      await db.insertInto('user_roles').values([{user_id:ownerId,role_id:canonicalCatalogId('role','OWNER'),assigned_by:null},{user_id:id,role_id:canonicalCatalogId('role','VIEWER'),assigned_by:ownerId}]).execute();
      await db.insertInto('mfa_methods').values({id:methodId,user_id:ownerId,type:'totp',state:'active',...encryptMfa(newTotpSecret(),key,ownerId,methodId),created_at:now,confirmed_at:now,enrollment_expires_at:null,last_accepted_step:null}).execute();
      await db.insertInto('sessions').values({id:sessionId,user_id:ownerId,token_hash:tokenHash(raw),auth_version:1,created_at:now,last_activity_at:now,idle_expires_at:new Date(+now+1800000),absolute_expires_at:new Date(+now+86400000),authenticated_at:now,mfa_verified_at:now,reauthenticated_at:null,revoked_at:null,revocation_reason:null,ip_hash:null,device_class:null}).execute();
      await db.insertInto('auth_challenges').values({id:randomUUID(),user_id:ownerId,token_hash:randomBytes(32),purpose:'reauthentication',action_code:'REVOKE_SESSIONS',bound_session_id:sessionId,auth_version:1,created_at:now,expires_at:new Date(+now+300000),consumed_at:null,revoked_at:null}).execute();
      await db.insertInto('invitations').values({id:randomUUID(),user_id:id,issued_by:ownerId,token_hash:randomBytes(32),intended_role_id:canonicalCatalogId('role','VIEWER'),recipient_auth_version:1,issuer_auth_version:1,created_at:now,expires_at:new Date(+now+86400000),accepted_at:null,revoked_at:null}).execute();
      await db.updateTable('installation_state').set({bootstrap_consumed_at:now,initial_owner_id:ownerId}).where('id','=',1).execute();
      await db.insertInto('audit_logs').values({id:randomUUID(),actor_user_id:ownerId,target_user_id:id,session_id:sessionId,action:'team.invitation_created',outcome:'success',correlation_id:randomUUID(),metadata_safe_json:JSON.stringify({reasonCode:'team.invitation_created'}),ip_hash:null}).execute();
      const oldState=async()=>JSON.stringify(await Promise.all([db.selectFrom('users').selectAll().orderBy('id').execute(),db.selectFrom('user_roles').selectAll().orderBy('user_id').execute(),db.selectFrom('sessions').selectAll().orderBy('id').execute(),db.selectFrom('mfa_methods').selectAll().orderBy('id').execute(),db.selectFrom('auth_challenges').selectAll().orderBy('id').execute(),db.selectFrom('invitations').selectAll().orderBy('id').execute(),db.selectFrom('installation_state').selectAll().execute(),db.selectFrom('team_administration_guard').selectAll().execute(),db.selectFrom('audit_logs').selectAll().orderBy('id').execute()]));
      const originalState=await oldState();
      await migrateDatabase(db);await migrateDatabase(db);
      expect((await oldState())===originalState).toBe(true);expect((await createAccessService(db,key,randomBytes(32),NetworkIdentity.fromSocketAddress('::')).validateSession(raw))!==null).toBe(true);
      expect(await db.selectFrom('users').selectAll().where('id','=',id).executeTakeFirstOrThrow()).toEqual(user);
      expect(await db.selectFrom('permissions').selectAll().execute()).toHaveLength(31);
      const permission=canonicalCatalogId('permission','brand.read');
      const after=await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute();
      expect(after.filter((r)=>![permission,canonicalCatalogId('permission','media.read'),canonicalCatalogId('permission','media.manage')].includes(r.permission_id))).toEqual(before);
      expect(after.filter((r)=>r.permission_id===permission).map((r)=>r.role_id).sort()).toEqual(['OWNER','MARKETING_ADMIN','CONTENT_CREATOR','REVIEWER'].map((r)=>canonicalCatalogId('role',r)).sort());
      const seeded=await db.selectFrom('brand_claims').selectAll().execute();expect(seeded).toHaveLength(13);const {z}=await import('zod');expect(seeded.every((row)=>z.uuid().safeParse(row.id).success)).toBe(true);
      const snapshot=await db.selectFrom('brands').selectAll().execute();await seedCatalog(db);await seedCatalog(db);expect(await db.selectFrom('brands').selectAll().execute()).toEqual(snapshot);
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0006_brand_brain.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    }finally{await clearScratch(db,source);await migrateDatabase(db);await seedCatalog(db);await handle.close();}
  });
  it('upgrades exact Phase 3 to 0007, preserves records/grants and rejects new checksum tampering', async () => {
    const {source,handle}=scratch('bsa_test_clean'),db=handle.db;
    try{
      await clearScratch(db,source);
      await sql`CREATE TABLE schema_migration_checksums(name varchar(150) PRIMARY KEY,sha256 char(64) NOT NULL,state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const entries=(await readMigrations()).slice(0,7);
      const migrations:Record<string,Migration>=Object.fromEntries(entries.map(entry=>[entry.name,{up:async(c)=>{
        await sql`INSERT INTO schema_migration_checksums(name,sha256,state) VALUES(${entry.name},${entry.sha256},'applying')`.execute(c);
        for(const statement of entry.statements)await sql.raw(statement).execute(c);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(c);
      }}]));
      expect((await new Migrator({db,provider:{getMigrations:async()=>migrations}}).migrateToLatest()).error===undefined).toBe(true);
      await seedCatalog(db);for(const code of ['media.read','media.manage']){const id=canonicalCatalogId('permission',code);await db.deleteFrom('role_permissions').where('permission_id','=',id).execute();await db.deleteFrom('permissions').where('id','=',id).execute();}
      const before=await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute(),id=randomUUID();
      await db.insertInto('users').values({id,email_normalized:id+'@example.test',display_name:'Phase 3 preserved',status:'invited',password_hash:null,password_changed_at:null,last_login_at:null}).execute();
      const users=await db.selectFrom('users').selectAll().execute(),brand=await db.selectFrom('brands').selectAll().execute();
      await migrateDatabase(db);await migrateDatabase(db);
      expect(await db.selectFrom('users').selectAll().execute()).toEqual(users);expect(await db.selectFrom('brands').selectAll().execute()).toEqual(brand);
      expect(await db.selectFrom('permissions').selectAll().execute()).toHaveLength(31);
      const added=['media.read','media.manage'].map(code=>canonicalCatalogId('permission',code));
      expect((await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute()).filter(r=>!added.includes(r.permission_id))).toEqual(before);
      expect(await db.selectFrom('media_assets').select('id').execute()).toEqual([]);
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0007_temporary_media.sql'`.execute(db);await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    }finally{await clearScratch(db,source);await migrateDatabase(db);await seedCatalog(db);await handle.close();}
  });
  it('upgrades exact Phase 4 through 0008, preserves media/users/grants and rejects tampering',async()=>{
    const {source,handle}=scratch('bsa_test_clean'),db=handle.db;
    try{
      await clearScratch(db,source);
      await sql`CREATE TABLE schema_migration_checksums(name varchar(150) PRIMARY KEY,sha256 char(64) NOT NULL,state enum('applying','applied') NOT NULL) ENGINE=InnoDB`.execute(db);
      const entries=(await readMigrations()).slice(0,8);
      const migrations:Record<string,Migration>=Object.fromEntries(entries.map(entry=>[entry.name,{up:async(c)=>{
        await sql`INSERT INTO schema_migration_checksums(name,sha256,state) VALUES(${entry.name},${entry.sha256},'applying')`.execute(c);
        for(const statement of entry.statements)await sql.raw(statement).execute(c);
        await sql`UPDATE schema_migration_checksums SET state='applied' WHERE name=${entry.name}`.execute(c);
      }}]));
      expect((await new Migrator({db,provider:{getMigrations:async()=>migrations}}).migrateToLatest()).error===undefined).toBe(true);
      await seedCatalog(db);const id=randomUUID(),time=new Date();
      await db.insertInto('users').values({id,email_normalized:id+'@example.test',display_name:'Phase 4 preserved',status:'invited',password_hash:null,password_changed_at:null,last_login_at:null}).execute();
      await db.insertInto('media_assets').values({id:randomUUID(),created_by:id,storage_key:randomBytes(32).toString('hex'),display_name:'preserved.png',kind:'image',mime:'image/png',byte_size:0,reserved_bytes:8388608,sha256:null,width:null,height:null,duration_ms:null,status:'receiving',created_at:time,expires_at:new Date(+time+1800000),deleted_at:null,deletion_reason:null}).execute();
      const users=await db.selectFrom('users').selectAll().execute(),media=await db.selectFrom('media_assets').selectAll().execute(),grants=await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute();
      await migrateDatabase(db);await migrateDatabase(db);
      expect(await db.selectFrom('users').selectAll().execute()).toEqual(users);expect(await db.selectFrom('media_assets').selectAll().execute()).toEqual(media);expect(await db.selectFrom('role_permissions').selectAll().orderBy('role_id').orderBy('permission_id').execute()).toEqual(grants);
      expect(await db.selectFrom('permissions').select('id').execute()).toHaveLength(31);expect(await db.selectFrom('ai_generations').selectAll().execute()).toEqual([]);
      await sql`UPDATE schema_migration_checksums SET sha256=${'0'.repeat(64)} WHERE name='0008_ai_generations.sql'`.execute(db);await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
    }finally{await clearScratch(db,source);await migrateDatabase(db);await seedCatalog(db);await handle.close();}
  });
  it('migrates a completely clean database and permits a repeat without changes', async () => {
    const { source, handle } = scratch('bsa_test_clean');
    try {
      await clearScratch(handle.db, source);
      await migrateDatabase(handle.db); await seedCatalog(handle.db); await migrateDatabase(handle.db);
      expect(await handle.db.selectFrom('roles').select('id').execute()).toHaveLength(5);
      expect(await handle.db.selectFrom('users').select('id').execute()).toHaveLength(0);
      expect((await handle.db.selectFrom('installation_state').selectAll().execute())[0]?.bootstrap_consumed_at).toBeNull();
    } finally { await handle.close(); }
  });
  it('rejects changed applied checksums and incomplete DDL, then restores an isolated logical snapshot', async () => {
    const { source, handle } = scratch('bsa_test_recovery');
    const db = handle.db;
    try {
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db);
      const id = randomUUID();
      await db.insertInto('users').values({ id, email_normalized: `${id}@example.test`, display_name: 'Synthetic restore fixture', status: 'invited',
        password_hash: null, password_changed_at: null, last_login_at: null }).execute();
      const snapshot = await db.selectFrom('users').selectAll().execute();
      await sql`UPDATE schema_migration_checksums SET sha256 = ${'0'.repeat(64)} WHERE name = '0000_phase2a_security_foundation.sql'`.execute(db);
      await expect(migrateDatabase(db)).rejects.toThrow('checksum mismatch');
      await clearScratch(db, source);
      const migration = (await readMigrations())[0]!;
      await sql`CREATE TABLE schema_migration_checksums (name varchar(150) PRIMARY KEY, sha256 char(64), state enum('applying','applied'))`.execute(db);
      await sql`INSERT INTO schema_migration_checksums (name, sha256, state) VALUES (${migration.name}, ${migration.sha256}, 'applying')`.execute(db);
      await sql.raw(migration.statements[0]!).execute(db);
      await expect(sql`CREATE TABLE audit_logs (id int)`.execute(db)).rejects.toMatchObject({ code: 'ER_TABLE_EXISTS_ERROR' });
      const partial = await sql<{ count: number }>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs'`.execute(db);
      expect(Number(partial.rows[0]?.count)).toBe(1);
      await expect(migrateDatabase(db)).rejects.toThrow('restoration');
      // DDL has implicit commits: do not claim transaction rollback. Recreate ONLY
      // this explicitly guarded scratch schema, then restore its synthetic data.
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db);
      await db.insertInto('users').values(snapshot).execute();
      expect(await db.selectFrom('users').selectAll().execute()).toEqual(snapshot);
      expect(await db.selectFrom('roles').select('id').execute()).toHaveLength(5);
    } finally { await handle.close(); }
  });
  it('rejects an empty checksum ledger when the migration journal still records applied SQL', async () => {
    const { source, handle } = scratch('bsa_test_recovery');
    try {
      await clearScratch(handle.db, source); await migrateDatabase(handle.db);
      await sql`DELETE FROM schema_migration_checksums`.execute(handle.db);
      await expect(migrateDatabase(handle.db)).rejects.toThrow('ledger inconsistent');
      await clearScratch(handle.db, source); await migrateDatabase(handle.db);
    } finally { await handle.close(); }
  });
  it.each(['role_id', 'role_code', 'permission_id', 'permission_code'] as const)('fails closed for a conflicting canonical %s without adding privileges', async (conflict) => {
    const { source, handle } = scratch('bsa_test_clean');
    const db = handle.db;
    try {
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db);
      const role = await db.selectFrom('roles').selectAll().where('code', '=', 'OWNER').executeTakeFirstOrThrow();
      const permission = await db.selectFrom('permissions').selectAll().where('code', '=', 'security.manage').executeTakeFirstOrThrow();
      await db.deleteFrom('role_permissions').execute();
      await db.deleteFrom('roles').execute(); await db.deleteFrom('permissions').execute();
      if (conflict.startsWith('role')) await db.insertInto('roles').values({
        id: conflict === 'role_id' ? role.id : randomUUID(), code: conflict === 'role_code' ? 'OWNER' : 'WRONG_CODE', label: 'Untrusted catalog fixture',
      }).execute();
      else await db.insertInto('permissions').values({
        id: conflict === 'permission_id' ? permission.id : randomUUID(), code: conflict === 'permission_code' ? permission.code : 'wrong.code',
      }).execute();
      const beforeRoles = await db.selectFrom('roles').selectAll().execute(), beforePermissions = await db.selectFrom('permissions').selectAll().execute();
      await expect(seedCatalog(db)).rejects.toThrow('catalog conflict');
      expect(await db.selectFrom('roles').selectAll().execute()).toEqual(beforeRoles);
      expect(await db.selectFrom('permissions').selectAll().execute()).toEqual(beforePermissions);
      expect(await db.selectFrom('role_permissions').selectAll().execute()).toHaveLength(0);
    } finally {
      await clearScratch(db, source); await migrateDatabase(db); await seedCatalog(db); await handle.close();
    }
  });
});
