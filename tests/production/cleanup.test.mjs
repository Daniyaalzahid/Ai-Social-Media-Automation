import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, copyFile, rm, rename, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { ReadableStream } from 'node:stream/web';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout, clearTimeout } from 'node:timers';
import { sql } from 'kysely';
import { createDatabase } from '../../src/server/db/connection.ts';
import { resolveDatabaseConfiguration } from '../../src/server/db/config.ts';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard.ts';
import { acquireDatabaseTestLease } from '../helpers/database-test-lease.ts';
import { LocalPrivateMediaStorage } from '../../src/server/media/storage.ts';

const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const built=path.join(repository,'.next/standalone');
const generic='Media cleanup unavailable; check private configuration and storage permissions.';
async function artifact(){
 const root=await mkdtemp(path.join(tmpdir(),'bsa-cleanup-runtime-')),directory=path.join(root,'app');
 try{
  const manifest=JSON.parse(await readFile(path.join(built,'scripts/media-cleanup.nft.json'),'utf8'));
  assert.equal(manifest.version,1);assert(manifest.files.length>0);
  assert(manifest.sha256['node_modules/kysely/package.json']);assert(manifest.sha256['node_modules/mysql2/package.json']);
  for(const relative of manifest.files){
   const file=path.normalize(path.join('scripts',relative));
   assert(!file.startsWith('..')&&!path.isAbsolute(file));assert(!/^\.env(?:\.|$)/.test(path.basename(file)));
   assert(!file.endsWith('.ts'),'CLI application code must be emitted JavaScript');
   const contents=await readFile(path.join(built,file));assert.equal(createHash('sha256').update(contents).digest('hex'),manifest.sha256[file]);
   const target=path.join(directory,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(built,file),target);
  }
  return {root,directory};
 }catch(error){await rm(root,{recursive:true,force:true});throw error;}
}
async function run(directory,env,argument='--environment=production'){
 return new Promise((resolve,reject)=>{
  // No NODE_PATH/NODE_OPTIONS, source directory, .env file or inherited secrets.
  const child=spawn(process.execPath,['scripts/media-cleanup.mjs',argument],{cwd:directory,env,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';const timer=setTimeout(()=>child.kill('SIGKILL'),15000);
  child.stdout.on('data',bytes=>{stdout+=bytes.toString();if(stdout.length>8192)child.kill('SIGKILL');});
  child.stderr.on('data',bytes=>{stderr+=bytes.toString();if(stderr.length>8192)child.kill('SIGKILL');});
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
 });
}
test('isolated emitted cleanup graph loads with plain node and fails production admission safely',async()=>{
 const fixture=await artifact();
 try{
  const result=await run(fixture.directory,{APP_ENV:'production',NODE_ENV:'production'});
  assert.equal(result.code,1);assert.equal(result.stdout,'');assert.equal(result.stderr.trim(),generic);
  // A missing packaged dependency must not be mistaken for safe admission failure.
  const dependency=path.join(fixture.directory,'node_modules/mysql2');await rename(dependency,dependency+'-missing');
  const missing=await run(fixture.directory,{APP_ENV:'production',NODE_ENV:'production'});
  assert.equal(missing.code,1);assert.notEqual(missing.stderr.trim(),generic);assert(missing.stderr.includes('ERR_MODULE_NOT_FOUND'));
 }finally{await rm(fixture.root,{recursive:true,force:true});}
});
test('emitted cleanup executes real isolated SQL/deletion and skips overlapping runs with a one-connection pool', {timeout:60000},async()=>{
 // Refuse any non-test or non-loopback configuration BEFORE connecting. Test
 // credentials come only from the established disposable MySQL test environment.
 const migration=resolveDatabaseConfiguration(process.env,'destructive-test');
 const runtime=resolveDatabaseConfiguration(process.env,'runtime');
 assert.equal(migration.mode,'test');assert.equal(runtime.mode,'test');
 assert.equal(migration.database,'bsa_test_phase2a');assert.equal(runtime.database,migration.database);
 const lease=await acquireDatabaseTestLease(process.env);
 const handle=createDatabase({...migration,connectionLimit:1});
 const fixture=await artifact(),media=path.join(fixture.root,'private-media');
 const storage=new LocalPrivateMediaStorage(media),id=randomUUID(),actor=randomUUID(),key=randomBytes(32).toString('hex');
 const bytes=Buffer.from('Synthetic expired private cleanup fixture');
 let inserted=false;
 try{
  await assertDestructiveTestDatabase(handle.db,process.env);
  const count=await handle.db.selectFrom('media_assets').select(sql`COUNT(*)`.as('count')).executeTakeFirst();
  assert.equal(Number(count?.count),0,'The disposable primary schema must have no existing media fixtures');
  await storage.write(key,new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}}),1024);
  await handle.db.insertInto('users').values({id:actor,email_normalized:`${actor}@example.test`,display_name:'Isolated cleanup fixture',status:'invited',password_hash:null,password_changed_at:null,last_login_at:null}).execute();
  const now=new Date(),created=new Date(+now-172800000),expired=new Date(+now-86400000);
  await handle.db.insertInto('media_assets').values({id,storage_key:key,created_by:actor,display_name:'expired.png',kind:'image',mime:'image/png',byte_size:bytes.length,reserved_bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest(),width:1,height:1,duration_ms:null,status:'temporary',created_at:created,expires_at:expired,deleted_at:null,deletion_reason:null}).execute();inserted=true;
  await handle.db.updateTable('media_storage_guard').set({allocated_bytes:bytes.length,receiving_count:0}).where('id','=',1).execute();
  const env={APP_ENV:'test',NODE_ENV:'test',TEST_DATABASE_URL:process.env.TEST_DATABASE_URL,TEST_MEDIA_STORAGE_ROOT:media,DB_POOL_MAX:'1'};
  const lock='bsa/media-cleanup/'+createHash('sha256').update(runtime.database).digest('hex').slice(0,40);
  await handle.db.connection().execute(async connection=>{
   const acquired=(await sql`SELECT GET_LOCK(${lock},0) AS acquired`.execute(connection)).rows[0]?.acquired;assert.equal(acquired,1);
   try{
    const busy=await run(fixture.directory,env,'--environment=test');assert.equal(busy.code,0);assert.equal(busy.stderr,'');
    assert.deepEqual(JSON.parse(busy.stdout),{skipped:true,reason:'cleanup_already_running'});
    assert.equal((await connection.selectFrom('media_assets').select('status').where('id','=',id).executeTakeFirst()).status,'temporary');
    assert.equal(await storage.exists(key),true);
   }finally{await sql`SELECT RELEASE_LOCK(${lock})`.execute(connection);}
  });
  const cleaned=await run(fixture.directory,env,'--environment=test');assert.equal(cleaned.code,0);assert.equal(cleaned.stderr,'');
  assert.deepEqual(JSON.parse(cleaned.stdout),{selected:1,deleted:1,failed:0});
  assert.equal((await handle.db.selectFrom('media_assets').select('status').where('id','=',id).executeTakeFirst()).status,'deleted');
  assert.equal(await storage.exists(key),false);
  assert.equal((await handle.db.selectFrom('media_storage_guard').select('allocated_bytes').where('id','=',1).executeTakeFirst()).allocated_bytes,0);
  const again=await run(fixture.directory,env,'--environment=test');assert.equal(again.code,0);assert.equal(again.stderr,'');
  assert.deepEqual(JSON.parse(again.stdout),{selected:0,deleted:0,failed:0});
  const wrong=await run(fixture.directory,env,'--environment=production');assert.equal(wrong.code,1);assert.equal(wrong.stdout,'');assert.equal(wrong.stderr.trim(),generic);
  await assert.rejects(stat(path.join(media,key+'.bin')));
 }finally{
  if(inserted){await handle.db.deleteFrom('media_assets').where('id','=',id).execute();await handle.db.deleteFrom('audit_logs').where('action','like','media.%').where('metadata_safe_json','like','%'+id+'%').execute();}
  await handle.db.deleteFrom('users').where('id','=',actor).execute();
  await handle.close();await lease.close();await rm(fixture.root,{recursive:true,force:true});
 }
});
