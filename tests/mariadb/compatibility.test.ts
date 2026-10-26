import { beforeAll,afterAll,it,expect } from 'vitest';
import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import { migrateDatabase,readMigrations,assertMigrationsComplete } from '../../src/server/db/migrations';
import { seedCatalog,assertCanonicalAuthorization } from '../../src/server/db/seeds';
import { detectEngine } from '../../src/server/db/engine';
const config=resolveDatabaseConfiguration(process.env,'destructive-test');
if(config.database!=='bsa_test_maria_clean')throw new Error('Dedicated isolated MariaDB schema required.');
const handle=createDatabase(config),db=handle.db;
beforeAll(async()=>{await assertDestructiveTestDatabase(db,process.env);expect((await detectEngine(db)).engine).toBe('mariadb');});
afterAll(()=>handle.close());
it('applies all 12 canonical identities and seeds without users; rerun is idempotent',async()=>{
 await migrateDatabase(db);await seedCatalog(db);await assertMigrationsComplete(db);await db.transaction().execute(assertCanonicalAuthorization);
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
