import { beforeAll,afterAll,it,expect } from 'vitest';
import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import { migrateDatabase,readMigrations,assertMigrationsComplete } from '../../src/server/db/migrations';
import { seedCatalog,assertCanonicalAuthorization } from '../../src/server/db/seeds';
import { detectEngine,engineSummary } from '../../src/server/db/engine';
import { provisionDatabase } from '../../src/server/db/provision';
import { emptyScratch } from '../database/phase2b-helpers';
import { acquireDatabaseTestLease } from '../helpers/database-test-lease';
import { contentActor } from '../helpers/content-fixtures';
import { requireAuthenticatedUser } from '../../src/server/authorization/authorization';
import { randomUUID } from 'node:crypto';
const config=resolveDatabaseConfiguration(process.env,'destructive-test');
if(config.database!=='bsa_test_maria_clean')throw new Error('Dedicated isolated MariaDB schema required.');
const handle=createDatabase(config),db=handle.db;
let lease:Awaited<ReturnType<typeof acquireDatabaseTestLease>>|undefined;
beforeAll(async()=>{lease=await acquireDatabaseTestLease(process.env);await assertDestructiveTestDatabase(db,process.env);const detected=await detectEngine(db);expect(detected.engine).toBe('mariadb');const logging=(await sql<{enabled:number}>`SELECT @@log_bin AS enabled`.execute(db)).rows[0];console.info('MariaDB compatibility engine',engineSummary(detected.version),'binaryLog',Number(logging?.enabled)===1);await emptyScratch({source:{...process.env,TEST_DATABASE_MIGRATION_URL:process.env.TEST_DATABASE_MIGRATION_URL!},handle});});
afterAll(async()=>{await handle.close();await lease?.close();});
it('applies all 12 canonical identities and seeds without users; rerun is idempotent',async()=>{
 await provisionDatabase(db,{database:config.database,user:config.user});await assertMigrationsComplete(db);await db.transaction().execute(assertCanonicalAuthorization);
 const journal=await sql<{name:string;sha256:string;state:string}>`SELECT name,sha256,state FROM schema_migration_checksums ORDER BY name`.execute(db).then(r=>r.rows);const canonical=await readMigrations();expect(journal.map(r=>[r.name,r.sha256,r.state])).toEqual(canonical.map(r=>[r.name,r.sha256,'applied']));
 expect(await db.selectFrom('permissions').select('id').execute()).toHaveLength(32);expect(await db.selectFrom('users').select('id').execute()).toHaveLength(0);expect(await db.selectFrom('social_authorizations').select('id').execute()).toHaveLength(0);
 await migrateDatabase(db);await seedCatalog(db);await assertMigrationsComplete(db);expect(await sql<{name:string;sha256:string;state:string}>`SELECT name,sha256,state FROM schema_migration_checksums ORDER BY name`.execute(db).then(r=>r.rows)).toEqual(journal);
});
it('enforces CHECK, JSON schema, case-sensitive regex and actual text-byte bounds',async()=>{
 await expect(db.insertInto('media_storage_guard').values({id:2,allocated_bytes:0,receiving_count:0}).execute()).rejects.toThrow();
 const value=(await sql<{schema_ok:number;regex_ok:number;bytes:number}>`SELECT JSON_SCHEMA_VALID('{"type":"array","uniqueItems":true}', '[1,1]') AS schema_ok, (BINARY 'ABC' REGEXP BINARY '^[a-z]+$') AS regex_ok, OCTET_LENGTH('{"a":1}') AS bytes`.execute(db)).rows[0];expect(value).toMatchObject({schema_ok:0,regex_ok:0,bytes:7});
});
it('uses working shared and exclusive row locks and verifies identity',async()=>{
 await db.transaction().execute(async tx=>{expect(await tx.selectFrom('installation_state').select('id').forShare().execute()).toHaveLength(1);expect(await tx.selectFrom('installation_state').select('id').forUpdate().execute()).toHaveLength(1);});await assertDestructiveTestDatabase(db,process.env);
});
it('rejects disabled CHECK enforcement before journal writes',async()=>{
 await db.connection().execute(async conn=>{await sql`SET SESSION check_constraint_checks=OFF`.execute(conn);try{await expect(detectEngine(conn)).rejects.toThrow('CHECK enforcement');}finally{await sql`SET SESSION check_constraint_checks=ON`.execute(conn);}});
});

it('preserves authenticated role queries, Unicode/JSON, timestamps, foreign keys and transaction rollback',async()=>{
 const rollback=new Error('Isolated transaction rollback');const users=(await db.selectFrom('users').select('id').execute()).length;
 await expect(db.transaction().execute(async tx=>{
  const actor=await contentActor(tx);expect((await requireAuthenticatedUser(tx,actor.raw)).context.userId).toBe(actor.id);
  const id=randomUUID(),metadata={reasonCode:'SYNTHETIC',changedFields:['اردو','🙂']};
  await tx.insertInto('audit_logs').values({id,actor_user_id:actor.id,target_user_id:null,session_id:null,action:'compatibility.fixture',outcome:'success',correlation_id:randomUUID(),metadata_safe_json:JSON.stringify(metadata),ip_hash:null}).execute();
  const row=await tx.selectFrom('audit_logs').selectAll().where('id','=',id).executeTakeFirstOrThrow();expect(typeof row.metadata_safe_json==='string'?JSON.parse(row.metadata_safe_json):row.metadata_safe_json).toEqual(metadata);expect(row.created_at).toBeInstanceOf(Date);
  const session=(await sql<{zone:string;mode:string}>`SELECT @@SESSION.time_zone AS zone,@@SESSION.sql_mode AS mode`.execute(tx)).rows[0]!;expect(session.zone).toBe('+00:00');expect(session.mode).toContain('STRICT_ALL_TABLES');
  await expect(tx.insertInto('role_permissions').values({role_id:randomUUID(),permission_id:randomUUID()}).execute()).rejects.toThrow();throw rollback;
 })).rejects.toBe(rollback);expect(await db.selectFrom('users').select('id').execute()).toHaveLength(users);
});
it('retains generated active-key uniqueness without blocking completed history',async()=>{
 await db.connection().execute(async conn=>{
  await sql`CREATE TEMPORARY TABLE compatibility_generated (state varchar(10),parent_id int,active_parent int GENERATED ALWAYS AS (CASE WHEN state='PENDING' THEN parent_id ELSE NULL END) STORED,UNIQUE KEY(active_parent)) ENGINE=InnoDB`.execute(conn);
  try{await sql`INSERT INTO compatibility_generated(state,parent_id) VALUES ('PENDING',1)`.execute(conn);await expect(sql`INSERT INTO compatibility_generated(state,parent_id) VALUES ('PENDING',1)`.execute(conn)).rejects.toThrow();await sql`INSERT INTO compatibility_generated(state,parent_id) VALUES ('APPROVED',1),('APPROVED',1)`.execute(conn);}finally{await sql`DROP TEMPORARY TABLE compatibility_generated`.execute(conn);}
 });
});
