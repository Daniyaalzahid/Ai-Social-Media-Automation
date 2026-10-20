import { observePublishingWrite as result } from '../helpers/publishing-database-diagnostic';
import { beforeAll,afterAll,it,expect } from 'vitest';
import { sql } from 'kysely';
import { scratchDatabase,resetScratch } from './phase2b-helpers';
const target=scratchDatabase('bsa_test_clean'),db=target.handle.db;
beforeAll(()=>resetScratch(target));
afterAll(()=>target.handle.close());
it('applies the approved four-table schema with twelve enforced CHECKs and eleven restrictive foreign keys',async()=>{
 const checks=await sql<{name:string;enforced:string}>`SELECT CONSTRAINT_NAME AS name,ENFORCED AS enforced FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN('publish_snapshots','publish_operations','publish_events','publish_assets') AND CONSTRAINT_TYPE='CHECK' ORDER BY CONSTRAINT_NAME`.execute(db);
 expect(checks.rows).toEqual(['publish_asset_hold','publish_asset_ids','publish_asset_value','publish_event_bounds','publish_event_outcome','publish_event_references','publish_operation_bounds','publish_operation_dispatch','publish_snapshot_binding','publish_snapshot_confirmation','publish_snapshot_ids','publish_snapshot_value'].map(name=>({name,enforced:'YES'})));
 const fks=await sql<{name:string;child:string;parent:string;update_rule:string;delete_rule:string}>`SELECT CONSTRAINT_NAME AS name,TABLE_NAME AS child,REFERENCED_TABLE_NAME AS parent,UPDATE_RULE AS update_rule,DELETE_RULE AS delete_rule FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN('publish_snapshots','publish_operations','publish_events','publish_assets') ORDER BY CONSTRAINT_NAME`.execute(db);
 const expected=[['publish_asset_revision_fk','publish_assets','content_revision_media'],['publish_asset_snapshot_fk','publish_assets','publish_snapshots'],['publish_event_operation_fk','publish_events','publish_operations'],['publish_operation_snapshot_fk','publish_operations','publish_snapshots'],['publish_snapshot_actor_fk','publish_snapshots','users'],['publish_snapshot_authorization_fk','publish_snapshots','social_authorizations'],['publish_snapshot_brand_fk','publish_snapshots','brands'],['publish_snapshot_decision_fk','publish_snapshots','content_decisions'],['publish_snapshot_destination_fk','publish_snapshots','social_destinations'],['publish_snapshot_revision_fk','publish_snapshots','content_revisions'],['publish_snapshot_variant_fk','publish_snapshots','content_variants']];
 expect(fks.rows).toEqual(expected.map(([name,child,parent])=>({name,child,parent,update_rule:'RESTRICT',delete_rule:'RESTRICT'})));
});

import { randomUUID,randomBytes } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { BRAND_ID } from '../../src/features/brand/model';
const rollback=Symbol('owned publishing schema fixture');
async function owned(fn:(tx:Kysely<DatabaseSchema>,f:Awaited<ReturnType<typeof fixture>>)=>Promise<void>){try{await db.transaction().execute(async tx=>{await fn(tx,await fixture(tx));throw rollback;});}catch(e){if(e!==rollback)throw e;}}
async function fixture(tx:Kysely<DatabaseSchema>){
 const user=randomUUID(),post=randomUUID(),revision=randomUUID(),submission=randomUUID(),decision=randomUUID(),authorization=randomUUID(),destination=randomUUID(),id=randomUUID(),media=randomUUID(),now=new Date('2026-10-17T00:00:00Z');
 await tx.insertInto('users').values({id:user,email_normalized:user+'@example.test',display_name:'Owned publishing constraint fixture',password_hash:null,status:'invited',password_changed_at:null,last_login_at:null}).execute();
 await tx.insertInto('content_items').values({id:post,created_by:user,assigned_to:user,revision_sequence:1,created_at:now}).execute();
 await tx.insertInto('content_revisions').values({id:revision,post_id:post,sequence:1,created_by:user,request_id:randomUUID(),request_digest:randomBytes(32),title:'Synthetic approved copy',language:'ENGLISH',source:'MANUAL',generation_id:null,generation_provider:null,generation_model:null,generation_brand_revision:null,brand_revision:1,validated:1,created_at:now}).execute();
 await tx.insertInto('content_variants').values({revision_id:revision,platform:'FACEBOOK',content_json:'{"caption":"Synthetic approved copy","hashtags":[]}'}).execute();
 await tx.insertInto('content_submissions').values({id:submission,post_id:post,revision_id:revision,submitted_by:user,request_id:randomUUID(),state:'APPROVED',submitted_at:now,validation_brand_revision:1}).execute();
 await tx.insertInto('content_decisions').values({id:decision,submission_id:submission,post_id:post,revision_id:revision,decided_by:user,request_id:randomUUID(),decision:'APPROVED',note:'',self_approval:1,brand_revision:1,created_at:now}).execute();
 await tx.insertInto('social_authorizations').values({id:authorization,brand_id:BRAND_ID,provider:'META',connected_by:user,subject:randomUUID(),status:'CONNECTED',version:1,scopes_json:'[]',selected_id:null,created_at:now,expires_at:new Date(+now+86400000),refresh_expires_at:null,refresh_lease:null}).execute();
 await tx.insertInto('social_destinations').values({id:destination,authorization_id:authorization,brand_id:BRAND_ID,provider:'META',remote_id:'synthetic-destination',kind:'PAGE',display_name:'Synthetic destination',handle:null,active:1}).execute();
 await tx.insertInto('media_assets').values({id:media,storage_key:randomBytes(32).toString('hex'),created_by:user,display_name:'synthetic.png',kind:'image',mime:'image/png',byte_size:8,reserved_bytes:8,sha256:randomBytes(32),width:1,height:1,duration_ms:null,status:'attached',created_at:now,expires_at:new Date(+now+86400000),deleted_at:null,deletion_reason:null}).execute();
 await tx.insertInto('content_revision_media').values({revision_id:revision,media_id:media,position:0}).execute();
 await tx.insertInto('publish_snapshots').values({id,brand_id:BRAND_ID,post_id:post,revision_id:revision,approval_decision_id:decision,actor_id:user,request_id:randomUUID(),authorization_id:authorization,destination_id:destination,provider:'META',platform:'FACEBOOK',operation_type:'PUBLISH',approval_decision:'APPROVED',authorization_version:1,validation_brand_revision:1,destination_remote_id:Buffer.from('synthetic-destination'),capability_ref:Buffer.from('fake/v1'),content_json:'{"caption":"Synthetic approved copy","hashtags":[]}',options_json:'{}',copy_hash:randomBytes(32),intent_hash:randomBytes(32),request_digest:randomBytes(32),created_at:now,confirmation_expires_at:new Date(+now+600000)}).execute();
 await tx.insertInto('publish_operations').values({id,state:'CREATED',version:1,last_event_sequence:1,updated_at:now,dispatch_started_at:null,dispatch_deadline:null,dispatch_claim_hash:null,last_status_check_at:null}).execute();
 await tx.insertInto('publish_events').values({operation_id:id,sequence:1,state:'CREATED',boundary:'LOCAL',observed_at:now,error_category:null,safe_error_code:null,remote_publication_id:null,remote_processing_id:null,published_at:null}).execute();
 await tx.insertInto('publish_assets').values({snapshot_id:id,revision_id:revision,media_id:media,position:0,mime:'image/png',byte_size:8,sha256:randomBytes(32),width:1,height:1,duration_ms:null,created_at:now,protected_until:new Date(+now+86400000)}).execute();return{id,user,post,revision,media,now};
}
const violations=[
 ['publish_snapshot_ids','publish_snapshots',"request_id='NOT-A-UUID'"],
 ['publish_snapshot_binding','publish_snapshots','authorization_version=0'],
 ['publish_snapshot_value','publish_snapshots',"capability_ref='bad value'"],
 ['publish_snapshot_confirmation','publish_snapshots','confirmation_expires_at=created_at'],
 ['publish_operation_bounds','publish_operations','version=0'],
 ['publish_operation_dispatch','publish_operations',"state='DISPATCHING'"],
 ['publish_event_bounds','publish_events','sequence=0'],
 ['publish_event_references','publish_events',"state='PROCESSING',boundary='REMOTE',remote_processing_id='bad value'"],
 ['publish_event_outcome','publish_events',"state='PUBLISHED'"],
 ['publish_asset_ids','publish_assets','position=4'],
 ['publish_asset_value','publish_assets','byte_size=0'],
 ['publish_asset_hold','publish_assets','protected_until=DATE_ADD(created_at,INTERVAL 25 HOUR)'],
] as const;
it.each(violations)('%s rejects its independent direct violating write',(name,table,change)=>owned(async(tx,f)=>{const key=table==='publish_events'?'operation_id':table==='publish_assets'?'snapshot_id':'id';expect(await result(()=>sql`UPDATE ${sql.table(table)} SET ${sql.raw(change)} WHERE ${sql.id(key)}=${f.id}`.execute(tx))).toEqual({accepted:false,code:'ER_CHECK_CONSTRAINT_VIOLATED',constraint:name});}));
for(let mask=0;mask<8;mask++)it(`dispatch nullable group ${mask} has explicit all-or-none semantics`,()=>owned(async(tx,f)=>{
 const change={state:'DISPATCHING' as const,dispatch_started_at:mask&1?f.now:null,dispatch_deadline:mask&2?new Date(+f.now+30000):null,dispatch_claim_hash:mask&4?randomBytes(32):null};
 const r=await result(()=>tx.updateTable('publish_operations').set(change).where('id','=',f.id).execute());if(mask===7)expect(r.accepted).toBe(true);else expect(r).toMatchObject({accepted:false,constraint:'publish_operation_dispatch'});
}));
for(let mask=0;mask<16;mask++)it(`published nullable evidence group ${mask} rejects partial proof`,()=>owned(async(tx,f)=>{
 const r=await result(()=>tx.updateTable('publish_events').set({state:'PUBLISHED',boundary:'REMOTE',remote_publication_id:mask&1?Buffer.from('synthetic-post'):null,published_at:mask&2?f.now:null,error_category:mask&4?'UNCONFIRMED':null,safe_error_code:mask&8?'OUTCOME_UNKNOWN':null}).where('operation_id','=',f.id).execute());if(mask===3)expect(r.accepted).toBe(true);else expect(r).toMatchObject({accepted:false,constraint:'publish_event_outcome'});
}));
it.each(['','fake/v1 ',' fake/v1','fake/v1\t','fake/v1\n','fake/v1\0','fake/v1\u00a0','é','x'.repeat(65)])('rejects byte-distinct invalid capability identity %#',value=>owned(async(tx,f)=>{
 const bytes=Buffer.from(value);const probe=await sql<{hex:string;length:number}>`SELECT HEX(${bytes}) AS hex,OCTET_LENGTH(${bytes}) AS length`.execute(tx);expect(probe.rows[0]).toEqual({hex:bytes.toString('hex').toUpperCase(),length:bytes.length});
 expect((await result(()=>tx.updateTable('publish_snapshots').set({capability_ref:bytes}).where('id','=',f.id).execute())).accepted).toBe(false);
}));
it('preserves case as byte-distinct capability identity rather than conflating lookup keys',()=>owned(async(tx,f)=>{await tx.updateTable('publish_snapshots').set({capability_ref:Buffer.from('FAKE/v1')}).where('id','=',f.id).execute();const r=await tx.selectFrom('publish_snapshots').select('capability_ref').where('id','=',f.id).executeTakeFirstOrThrow();expect(r.capability_ref.equals(Buffer.from('fake/v1'))).toBe(false);}));
it('publish hold cannot renew past its immutable admission bound',()=>owned(async(tx,f)=>{expect(await result(()=>tx.updateTable('publish_assets').set({protected_until:new Date(+f.now+86400001)}).where('snapshot_id','=',f.id).execute())).toMatchObject({accepted:false,constraint:'publish_asset_hold'});}));

it('binds the exact ordered child and parent FK columns, without count-only contracts',async()=>{
 const r=await sql<{name:string;child:string;columns:string;parent:string;references:string;updateRule:string;deleteRule:string}>`SELECT k.CONSTRAINT_NAME AS name,k.TABLE_NAME AS child,GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION SEPARATOR ',') AS columns,k.REFERENCED_TABLE_NAME AS parent,GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION SEPARATOR ',') AS \`references\`,r.UPDATE_RULE AS updateRule,r.DELETE_RULE AS deleteRule FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.TABLE_NAME IN('publish_snapshots','publish_operations','publish_events','publish_assets') AND k.REFERENCED_TABLE_NAME IS NOT NULL GROUP BY k.CONSTRAINT_NAME,k.TABLE_NAME,k.REFERENCED_TABLE_NAME,r.UPDATE_RULE,r.DELETE_RULE ORDER BY k.CONSTRAINT_NAME`.execute(db);
 const entries=[
 ['publish_asset_revision_fk','publish_assets','revision_id,media_id','content_revision_media','revision_id,media_id'],['publish_asset_snapshot_fk','publish_assets','snapshot_id,revision_id','publish_snapshots','id,revision_id'],['publish_event_operation_fk','publish_events','operation_id','publish_operations','id'],['publish_operation_snapshot_fk','publish_operations','id','publish_snapshots','id'],
 ['publish_snapshot_actor_fk','publish_snapshots','actor_id','users','id'],['publish_snapshot_authorization_fk','publish_snapshots','authorization_id,brand_id,provider','social_authorizations','id,brand_id,provider'],['publish_snapshot_brand_fk','publish_snapshots','brand_id','brands','id'],['publish_snapshot_decision_fk','publish_snapshots','approval_decision_id,post_id,revision_id,approval_decision','content_decisions','id,post_id,revision_id,decision'],['publish_snapshot_destination_fk','publish_snapshots','destination_id,authorization_id,brand_id,provider','social_destinations','id,authorization_id,brand_id,provider'],['publish_snapshot_revision_fk','publish_snapshots','post_id,revision_id','content_revisions','post_id,id'],['publish_snapshot_variant_fk','publish_snapshots','revision_id,platform','content_variants','revision_id,platform']];
 expect(r.rows).toEqual(entries.map(([name,child,columns,parent,references])=>({name,child,columns,parent,references,updateRule:'RESTRICT',deleteRule:'RESTRICT'})));
});
it('has the exact reviewed primary, unique and supporting indexes',async()=>{
 const r=await sql<{tableName:string;name:string;nonUnique:number;columns:string}>`SELECT TABLE_NAME AS tableName,INDEX_NAME AS name,NON_UNIQUE AS nonUnique,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS columns FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME IN('publish_snapshots','publish_operations','publish_events','publish_assets') OR INDEX_NAME IN('publish_decision_identity','publish_destination_identity')) GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE ORDER BY TABLE_NAME,INDEX_NAME`.execute(db);
 const e:[string,string,number,string][]=[
 ['content_decisions','publish_decision_identity',0,'id,post_id,revision_id,decision'],
 ['publish_assets','PRIMARY',0,'snapshot_id,media_id'],['publish_assets','publish_asset_hold',1,'media_id,protected_until,snapshot_id'],['publish_assets','publish_asset_order',0,'snapshot_id,position'],['publish_assets','publish_asset_revision',1,'revision_id,media_id'],['publish_assets','publish_asset_snapshot',1,'snapshot_id,revision_id'],
 ['publish_events','PRIMARY',0,'operation_id,sequence'],['publish_operations','PRIMARY',0,'id'],['publish_operations','publish_operations_state',1,'state,updated_at,id'],
 ['publish_snapshots','PRIMARY',0,'id'],['publish_snapshots','publish_request_once',0,'actor_id,request_id'],['publish_snapshots','publish_revision_destination_once',0,'revision_id,destination_id,platform,operation_type'],['publish_snapshots','publish_snapshot_auth',1,'authorization_id,brand_id,provider'],['publish_snapshots','publish_snapshot_decision',1,'approval_decision_id,post_id,revision_id,approval_decision'],['publish_snapshots','publish_snapshot_destination',1,'destination_id,authorization_id,brand_id,provider'],['publish_snapshots','publish_snapshot_post',1,'post_id,revision_id'],['publish_snapshots','publish_snapshot_revision',0,'id,revision_id'],['publish_snapshots','publish_snapshot_variant',1,'revision_id,platform'],['publish_snapshots','publish_snapshot_workspace',1,'brand_id,created_at,id'],['social_destinations','publish_destination_identity',0,'id,authorization_id,brand_id,provider']];
 expect(r.rows).toEqual(e.map(([tableName,name,nonUnique,columns])=>({tableName,name,nonUnique,columns})));
});
it.each([
 ['publish_snapshots','actor_id'],['publish_snapshots','brand_id'],['publish_snapshots','post_id'],['publish_snapshots','revision_id'],['publish_snapshots','approval_decision_id'],['publish_snapshots','authorization_id'],['publish_snapshots','destination_id'],['publish_events','operation_id'],['publish_assets','snapshot_id'],['publish_assets','revision_id'],['publish_assets','media_id'],
] as const)('%s.%s rejects a missing identity by direct SQL', (table,column)=>owned(async(tx,f)=>{
 const key=table==='publish_events'?'operation_id':table==='publish_assets'?'snapshot_id':'id';
 const snapshotRevision=table==='publish_snapshots'&&column==='revision_id';
 if(snapshotRevision){
  // Remove only this rollback-owned asset child so parent RESTRICT cannot mask the orphan write.
  const removed=await tx.deleteFrom('publish_assets').where('snapshot_id','=',f.id).where('revision_id','=',f.revision).where('media_id','=',f.media).executeTakeFirst();
  expect(Number(removed.numDeletedRows)).toBe(1);
  expect(await tx.selectFrom('publish_assets').select('media_id').where('snapshot_id','=',f.id).execute()).toEqual([]);
 }
 const observed=await result(()=>sql`UPDATE ${sql.table(table)} SET ${sql.id(column)}=${randomUUID()} WHERE ${sql.id(key)}=${f.id}`.execute(tx));
 // The composite approval-decision/revision binding is the exact first orphan boundary, not any FK error.
 expect(observed).toMatchObject({accepted:false,code:'ER_NO_REFERENCED_ROW_2',...(snapshotRevision?{constraint:'publish_snapshot_revision_fk'}:{})});
}));
it('an operation cannot reference a nonexistent snapshot',()=>owned(async(tx,f)=>{const op=await tx.selectFrom('publish_operations').selectAll().where('id','=',f.id).executeTakeFirstOrThrow();expect(await result(()=>tx.insertInto('publish_operations').values({...op,id:randomUUID()}).execute())).toMatchObject({accepted:false,code:'ER_NO_REFERENCED_ROW_2'});}));
it('the exact variant and APPROVED decision are required, not another platform or rejection',()=>owned(async(tx,f)=>{
 expect(await result(()=>tx.updateTable('publish_snapshots').set({platform:'INSTAGRAM'}).where('id','=',f.id).execute())).toMatchObject({accepted:false,code:'ER_NO_REFERENCED_ROW_2',constraint:'publish_snapshot_variant_fk'});
 expect(await result(()=>tx.updateTable('publish_snapshots').set({approval_decision:'REJECTED'}).where('id','=',f.id).execute())).toMatchObject({accepted:false,code:'ER_CHECK_CONSTRAINT_VIOLATED',constraint:'publish_snapshot_binding'});
}));
it.each([['publish_snapshots','id'],['publish_operations','id'],['content_revisions','id'],['content_decisions','id'],['social_destinations','id'],['social_authorizations','id']] as const)('%s parent cannot be deleted or replaced while publication history references it',(table,column)=>owned(async(tx,f)=>{
 const snapshot=await tx.selectFrom('publish_snapshots').selectAll().where('id','=',f.id).executeTakeFirstOrThrow();const id=table==='content_revisions'?f.revision:table==='content_decisions'?snapshot.approval_decision_id:table==='social_destinations'?snapshot.destination_id:table==='social_authorizations'?snapshot.authorization_id:f.id;
 expect(await result(()=>sql`DELETE FROM ${sql.table(table)} WHERE ${sql.id(column)}=${id}`.execute(tx))).toMatchObject({accepted:false,code:'ER_ROW_IS_REFERENCED_2'});
 expect(await result(()=>sql`UPDATE ${sql.table(table)} SET ${sql.id(column)}=${randomUUID()} WHERE ${sql.id(column)}=${id}`.execute(tx))).toMatchObject({accepted:false,code:'ER_ROW_IS_REFERENCED_2'});
}));
for(const state of ['CREATED','DISPATCHING','ACCEPTED','PROCESSING','PUBLISHED','FAILED','UNKNOWN'] as const)for(const category of [null,'UNCONFIRMED'] as const)for(const code of [null,'OUTCOME_UNKNOWN'] as const)it(`state ${state} with error metadata ${category!==null}/${code!==null} is NULL-safe`,()=>owned(async(tx,f)=>{
 const remote=['ACCEPTED','PROCESSING','PUBLISHED'].includes(state),failed=state==='FAILED',unknown=state==='UNKNOWN';
 const r=await result(()=>tx.updateTable('publish_events').set({state,boundary:unknown?'UNCONFIRMED':remote||failed?'REMOTE':'LOCAL',remote_publication_id:remote?Buffer.from('synthetic-post'):null,remote_processing_id:null,published_at:state==='PUBLISHED'?f.now:null,error_category:category,safe_error_code:code}).where('operation_id','=',f.id).execute());
 const valid=failed||unknown?category!==null&&code!==null:category===null&&code===null;if(valid)expect(r.accepted).toBe(true);else expect(r).toMatchObject({accepted:false,constraint:'publish_event_outcome'});
}));
it.each(['publish_snapshots','publish_operations','publish_events','publish_assets'] as const)('%s required identity cannot use NULL to evade its CHECK',table=>owned(async(tx,f)=>{const key=table==='publish_events'?'operation_id':table==='publish_assets'?'snapshot_id':'id';expect(await result(()=>sql`UPDATE ${sql.table(table)} SET ${sql.id(key)}=NULL WHERE ${sql.id(key)}=${f.id}`.execute(tx))).toMatchObject({accepted:false,code:'ER_BAD_NULL_ERROR'});}));
