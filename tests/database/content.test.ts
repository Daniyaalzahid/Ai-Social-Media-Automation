import { randomUUID,randomBytes } from 'node:crypto';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql,type KyselyPlugin } from 'kysely';
import { beforeAll,afterAll,it,expect } from 'vitest';
import { scratchDatabase,resetScratch } from './phase2b-helpers';
import { contentActor,contentDraft,fullContent,removeContentActorFixture } from '../helpers/content-fixtures';
import { createContentService } from '../../src/server/content/service';
import { createMediaService } from '../../src/server/media/service';
import { LocalPrivateMediaStorage } from '../../src/server/media/storage';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { createAiGenerationService } from '../../src/server/ai/service';
import { aiInput,FakeAiProvider } from '../helpers/ai-fixtures';
import { CLAIMS,BRAND_ID,type BrandData } from '../../src/features/brand/model';
import { CREATIVE } from '../../src/server/ai/policy';
import { createBrandService } from '../../src/server/brand/service';
import { sample } from '../helpers/brand-review-fixtures';
import { imageFixture,mediaStream } from '../helpers/media-fixtures';
import { contentDatabaseDiagnostic } from '../helpers/content-database-diagnostic';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
const target=scratchDatabase('bsa_test_recovery'),db=target.handle.db,second=createDatabase(resolveDatabaseConfiguration(target.source,'destructive-test'));
let root:string,storage:LocalPrivateMediaStorage;
const service=(connection=db)=>createContentService(connection,storage);
beforeAll(async()=>{await resetScratch(target);root=await mkdtemp(join(tmpdir(),'bsa-content-'));storage=new LocalPrivateMediaStorage(root);});
afterAll(async()=>{await second.close();await target.handle.close();await rm(root,{recursive:true,force:true});});
const create=async(a:Awaited<ReturnType<typeof contentActor>>,draft=contentDraft())=>fullContent(await service().mutate(a.raw,{action:'create',requestId:randomUUID(),draft}));
async function submit(a:Awaited<ReturnType<typeof contentActor>>,d:Awaited<ReturnType<typeof create>>){return fullContent(await service().mutate(a.raw,{action:'submit',requestId:randomUUID(),postId:d.id,revisionId:d.latestRevisionId}));}
async function decide(a:Awaited<ReturnType<typeof contentActor>>,d:Awaited<ReturnType<typeof create>>,decision='APPROVED',connection=db){const s=d.reviews.find(r=>r.state==='PENDING')!;return fullContent(await service(connection).mutate(a.raw,{action:'decide',requestId:randomUUID(),postId:d.id,revisionId:s.revisionId,submissionId:s.id,decision,note:decision==='APPROVED'?'':'Bounded synthetic review note'}));}
async function save(a:Awaited<ReturnType<typeof contentActor>>,d:Awaited<ReturnType<typeof create>>,draft=contentDraft(),connection=db){return fullContent(await service(connection).mutate(a.raw,{action:'save',requestId:randomUUID(),postId:d.id,expectedRevisionId:d.latestRevisionId,draft}));}
async function upload(a:Awaited<ReturnType<typeof contentActor>>){return createMediaService(db,storage).upload(a.raw,{name:'synthetic.png',mime:'image/png'},mediaStream(await imageFixture()));}
it.each(['OWNER','MARKETING_ADMIN','CONTENT_CREATOR','REVIEWER','VIEWER'] as const)('%s direct create/edit/submit/review rules are independent of UI',async role=>{
 const a=await contentActor(db,role),owner=await contentActor(db,'OWNER');
 if(['OWNER','MARKETING_ADMIN','CONTENT_CREATOR'].includes(role)){
  const d=await create(a);expect(d.revisions[0]!.validated).toBe(true);const next=await save(a,d);expect(next.revisions[0]!.sequence).toBe(2);const queued=await submit(a,next);
  if(role==='CONTENT_CREATOR')await expect(decide(a,queued)).rejects.toThrow();else{const approved=await decide(a,queued);expect(approved.reviews[0]!.selfApproval).toBe(true);const audit=await db.selectFrom('audit_logs').select('metadata_safe_json').where('actor_user_id','=',a.id).where('action','=','content.approved').executeTakeFirstOrThrow();expect(JSON.stringify(audit)).toContain('count');}
 }else await expect(create(a)).rejects.toThrow();
 const privateDraft=await create(owner);
 if(role==='OWNER'||role==='MARKETING_ADMIN')expect((await service().get(a.raw,privateDraft.id)).id).toBe(privateDraft.id);
 else await expect(service().get(a.raw,privateDraft.id)).rejects.toThrow();
});
it('Viewer sees approved text only, never newer draft/history/notes/media or generation provenance',async()=>{
 const a=await contentActor(db),reviewer=await contentActor(db,'REVIEWER'),viewer=await contentActor(db,'VIEWER');let d=await submit(a,await create(a));await decide(reviewer,d);d=fullContent(await service().get(a.raw,d.id));const approvedId=d.approvedRevisionId;
 d=await save(a,d,contentDraft({title:'Private newer title',content:{FACEBOOK:{caption:'Private rejected prose',hashtags:[]}}}));
 const visible=await service().get(viewer.raw,d.id);expect(visible.viewer).toBe(true);if(!visible.viewer)throw new Error();expect(visible.approved.id).toBe(approvedId);expect(JSON.stringify(visible)).not.toContain('Private');expect(Object.keys(visible).sort()).toEqual(['approved','id','viewer']);
 await expect(service().get(viewer.raw,d.id,2)).rejects.toThrow();await expect(service().binary(viewer.raw,d.id,approvedId,randomUUID())).rejects.toThrow();
 for(const scope of ['review','unknown'])await expect(service().list(viewer.raw,{scope})).rejects.toThrow();
});
it('Creator cannot enumerate/read/edit/submit another Creator’s draft or substitute nested IDs',async()=>{
 const a=await contentActor(db),b=await contentActor(db),one=await create(a),two=await create(b);
 expect((await service().list(a.raw)).items.every(i=>i.id!==two.id)).toBe(true);await expect(service().get(a.raw,two.id)).rejects.toMatchObject({status:404});await expect(save(a,two)).rejects.toThrow();
 await expect(service().mutate(a.raw,{action:'submit',requestId:randomUUID(),postId:one.id,revisionId:two.latestRevisionId})).rejects.toThrow();
 await expect(service().get(a.raw,randomUUID())).rejects.toMatchObject({status:404});
});
it('Reviewer gets only submitted revisions and cannot edit, generate AI or browse general media',async()=>{
 const a=await contentActor(db),r=await contentActor(db,'REVIEWER');const queued=await submit(a,await create(a));await save(a,queued,contentDraft({title:'Hidden working revision'}));
 const view=fullContent(await service().get(r.raw,queued.id));expect(view.latestRevisionId).toBeNull();expect(view.revisions).toHaveLength(1);expect(JSON.stringify(view)).not.toContain('Hidden working');expect(view.canEdit).toBe(false);
 await expect(save(r,view)).rejects.toThrow();await expect(createMediaService(db,storage).list(r.raw)).rejects.toThrow();const fake=new FakeAiProvider();await expect(createAiGenerationService(db,{providerId:fake.id,model:fake.model,provider:()=>fake}).generate(r.raw,aiInput())).rejects.toThrow();expect(fake.calls).toBe(0);
});
it.each(['disabled','stale','expired','revoked','anonymous'] as const)('%s actor fails closed',async mode=>{
 const a=await contentActor(db),d=await create(a);if(mode==='disabled')await db.updateTable('users').set({status:'disabled'}).where('id','=',a.id).execute();if(mode==='stale')await db.updateTable('users').set({auth_version:2}).where('id','=',a.id).execute();if(mode==='expired')await db.updateTable('sessions').set({idle_expires_at:new Date(Date.now()-1000),last_activity_at:new Date(Date.now()-3600000),created_at:new Date(Date.now()-7200000)}).where('user_id','=',a.id).execute();if(mode==='revoked')await db.updateTable('sessions').set({revoked_at:new Date(),revocation_reason:'logout'}).where('user_id','=',a.id).execute();await expect(service().get(mode==='anonymous'?new SensitiveValue(randomBytes(32).toString('base64url')):a.raw,d.id)).rejects.toThrow();
});
it('role change preserves complete authorship lineage and prevents Reviewer self-approval',async()=>{
 const a=await contentActor(db),admin=await contentActor(db,'MARKETING_ADMIN');let d=await create(a);d=await save(admin,d);d=await submit(admin,d);
 await db.updateTable('user_roles').set({role_id:canonicalCatalogId('role','REVIEWER')}).where('user_id','=',a.id).execute();
 await expect(decide(a,d)).rejects.toThrow();expect((await db.selectFrom('content_revision_authors').select('user_id').where('revision_id','=',d.latestRevisionId!).execute()).map(r=>r.user_id)).toContain(a.id);
});
it('two edits from one base have exactly one winner across independent pools',async()=>{
 const a=await contentActor(db),d=await create(a);const traceA=contentDatabaseDiagnostic(db),traceB=contentDatabaseDiagnostic(second.db);let outcomes;try{outcomes=await Promise.allSettled([save(a,d,contentDraft({title:'A'})),save(a,d,contentDraft({title:'B'}),second.db)]);}finally{traceA.close();traceB.close();}const evidence=JSON.stringify({a:traceA.report(),b:traceB.report()});expect(outcomes.filter(r=>r.status==='fulfilled'),evidence).toHaveLength(1);expect((outcomes.find(r=>r.status==='rejected') as PromiseRejectedResult).reason,evidence).toMatchObject({reason:'CONFLICT'});expect((await db.selectFrom('content_revisions').select('sequence').where('post_id','=',d.id).orderBy('sequence').execute()).map(r=>r.sequence)).toEqual([1,2]);
});
it('double save with the same explicit request ID is idempotent, changed payload rejects',async()=>{
 const a=await contentActor(db),command={action:'create',requestId:randomUUID(),draft:contentDraft()};const one=fullContent(await service().mutate(a.raw,command)),two=fullContent(await service().mutate(a.raw,command));expect(one.id).toBe(two.id);expect(two.revisions).toHaveLength(1);await expect(service().mutate(a.raw,{...command,draft:contentDraft({title:'Different'})})).rejects.toMatchObject({reason:'CONFLICT'});
});
it('one active review and exactly one terminal decision survive separate-pool races',async()=>{
 const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),r2=await contentActor(db,'REVIEWER'),d=await create(a);
 const requests=[db,second.db].map(connection=>service(connection).mutate(a.raw,{action:'submit',requestId:randomUUID(),postId:d.id,revisionId:d.latestRevisionId}));const submits=await Promise.allSettled(requests);expect(submits.filter(s=>s.status==='fulfilled')).toHaveLength(1);
 const queued=fullContent(await service().get(a.raw,d.id));const decisions=await Promise.allSettled([decide(r,queued,'APPROVED'),decide(r2,queued,'CHANGES_REQUESTED',second.db)]);expect(decisions.filter(s=>s.status==='fulfilled')).toHaveLength(1);expect((decisions.find(s=>s.status==='rejected') as PromiseRejectedResult).reason).toMatchObject({reason:'CONFLICT'});expect(await db.selectFrom('content_decisions').select('id').where('post_id','=',d.id).execute()).toHaveLength(1);
});
it('approval of an older submitted revision never approves newer working text',async()=>{
 const a=await contentActor(db),r=await contentActor(db,'REVIEWER');const submitted=await submit(a,await create(a));const revised=await save(a,submitted,contentDraft({title:'New unsubmitted text'}));const reviewed=await decide(r,submitted);expect(reviewed.approvedRevisionId).toBe(submitted.latestRevisionId);const state=fullContent(await service().get(a.raw,revised.id));expect(state.latestRevisionId).toBe(revised.latestRevisionId);expect(state.state).toBe('DRAFT');expect(state.latestRevisionId).not.toBe(state.approvedRevisionId);
});
it('concurrent approval and a new revision preserve distinct exact identities',async()=>{const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),d=await submit(a,await create(a));const outcomes=await Promise.all([decide(r,d,'APPROVED',second.db),save(a,d,contentDraft({title:'Separate working edit'}))]);expect(outcomes).toHaveLength(2);const current=fullContent(await service().get(a.raw,d.id));expect(current.approvedRevisionId).toBe(d.latestRevisionId);expect(current.revisions[0]!.sequence).toBe(2);expect(current.state).toBe('DRAFT');});
it('cross-administrator edits preserve authorship without cross-user FK lock inversion',async()=>{
 const a=await contentActor(db,'OWNER'),b=await contentActor(db,'MARKETING_ADMIN'),one=await create(a),two=await create(b),release=Promise.withResolvers<void>();let entered=0;
 const boundary=():KyselyPlugin=>{const pending=new Set<object>();return{transformQuery({node,queryId}){if(node.kind==='SelectQueryNode'&&JSON.stringify(node).includes('"name":"content_items"'))pending.add(queryId);return node;},async transformResult({result,queryId}){if(pending.delete(queryId)){if(++entered===2)release.resolve();await release.promise;}return result;}};};
 const first=db.withPlugin(boundary()),other=second.db.withPlugin(boundary()),traceA=contentDatabaseDiagnostic(first),traceB=contentDatabaseDiagnostic(other);let results;
 try{results=await Promise.allSettled([save(a,two,contentDraft(),first),save(b,one,contentDraft(),other)]);}finally{release.resolve();traceA.close();traceB.close();}
 expect(results.every(r=>r.status==='fulfilled'),JSON.stringify({a:traceA.report(),b:traceB.report(),outcomes:results.map(r=>r.status)})).toBe(true);
});
it('eight controlled two-editor scenarios preserve one winner and one explicit conflict each',async()=>{
 const a=await contentActor(db);let winners=0,conflicts=0;const otherErrors:string[]=[];
 for(let i=0;i<8;i++){const d=await create(a),outcomes=await Promise.allSettled([save(a,d,contentDraft({title:`A ${i}`})),save(a,d,contentDraft({title:`B ${i}`}),second.db)]);for(const r of outcomes){if(r.status==='fulfilled')winners++;else if(r.reason?.reason==='CONFLICT')conflicts++;else otherErrors.push(r.reason instanceof Error?r.reason.name:'unexpected');}expect((await db.selectFrom('content_items').select('revision_sequence').where('id','=',d.id).executeTakeFirstOrThrow()).revision_sequence).toBe(2);}
 expect({scenarios:8,attempts:16,winners,conflicts,otherErrors}).toEqual({scenarios:8,attempts:16,winners:8,conflicts:8,otherErrors:[]});
});
it.each(['CHANGES_REQUESTED','REJECTED'])('%s is preserved and continuing requires a new revision',async decision=>{const a=await contentActor(db),r=await contentActor(db,'REVIEWER');let d=await submit(a,await create(a));await decide(r,d,decision);d=fullContent(await service().get(a.raw,d.id));expect(d.state).toBe(decision);await expect(submit(a,d)).rejects.toMatchObject({reason:'CONFLICT'});d=await save(a,d);d=await submit(a,d);expect(d.reviews.some(s=>s.state===decision)).toBe(true);expect(d.revisions).toHaveLength(2);});
it.each(CLAIMS)('human %s claim can be saved unvalidated but never submitted without deterministic authority',async category=>{const a=await contentActor(db),text=`Human unsupported ${category}: 50% OFF مفت ڈیلیوری`,d=await create(a,contentDraft({content:{FACEBOOK:{caption:text,hashtags:[]}}}));expect(d.revisions[0]!.validated).toBe(false);expect(d.revisions[0]!.content.FACEBOOK!.caption).toBe(text);await expect(submit(a,d)).rejects.toMatchObject({reason:'VALIDATION_FAILED'});expect(await db.selectFrom('content_submissions').select('id').where('post_id','=',d.id).execute()).toHaveLength(0);});
it('AI import is owned, exact and server-derived; human edits change provenance',async()=>{
 const a=await contentActor(db),b=await contentActor(db),fake=new FakeAiProvider(),brand=await createBrandService(db).context(a.raw);const g=await createAiGenerationService(db,{providerId:fake.id,model:fake.model,provider:()=>fake}).generate(a.raw,aiInput({expectedBrandRevision:brand.revision}));
 const command={action:'import',requestId:randomUUID(),generationId:g.id,title:'Imported source',facts:[],mediaIds:[]};const d=fullContent(await service().mutate(a.raw,command));expect(d.revisions[0]!.content).toEqual(g.output);expect(d.revisions[0]!.source).toBe('AI_GENERATED');await expect(service().mutate(b.raw,{...command,requestId:randomUUID()})).rejects.toThrow();await expect(service().mutate(a.raw,{...command,requestId:randomUUID(),content:{}})).rejects.toThrow();const edited=await save(a,d,contentDraft());expect(edited.revisions[0]!.source).toBe('AI_EDITED');expect(edited.revisions[0]!.generationId).toBe(g.id);
});
function failWrite(table:string,kind:string):KyselyPlugin{return{transformQuery({node}){const record=node as unknown as Record<string,unknown>;if(node.kind===kind&&JSON.stringify(record).includes(`"name":"${table}"`))throw new Error('Synthetic workflow write failure');return node;},async transformResult({result}){return result;}};}
it.each([['content_variants','InsertQueryNode'],['content_items','UpdateQueryNode'],['audit_logs','InsertQueryNode']])('failure at %s rolls back data, revision and required audit',async(table,kind)=>{const a=await contentActor(db),d=await create(a),before=await db.selectFrom('audit_logs').select('id').where('actor_user_id','=',a.id).execute();await expect(save(a,d,contentDraft(),db.withPlugin(failWrite(table!,kind!)))).rejects.toMatchObject({reason:'UNAVAILABLE'});expect((await db.selectFrom('content_items').select('revision_sequence').where('id','=',d.id).executeTakeFirstOrThrow()).revision_sequence).toBe(1);expect(await db.selectFrom('content_revisions').select('id').where('post_id','=',d.id).execute()).toHaveLength(1);expect(await db.selectFrom('audit_logs').select('id').where('actor_user_id','=',a.id).execute()).toEqual(before);});
it('required decision audit failure cannot commit approval or terminal submission',async()=>{const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),d=await submit(a,await create(a));await expect(decide(r,d,'APPROVED',db.withPlugin(failWrite('audit_logs','InsertQueryNode')))).rejects.toThrow();expect(await db.selectFrom('content_decisions').select('id').where('post_id','=',d.id).execute()).toHaveLength(0);expect((await db.selectFrom('content_submissions').select('state').where('post_id','=',d.id).executeTakeFirstOrThrow()).state).toBe('PENDING');});
it('review notes and content never become audit payloads',async()=>{const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),d=await submit(a,await create(a,contentDraft({title:'public-content-audit-canary'})));await decide(r,d,'REJECTED');const rows=await db.selectFrom('audit_logs').select('metadata_safe_json').where('actor_user_id','in',[a.id,r.id]).execute();expect(JSON.stringify(rows)).not.toContain('public-content-audit-canary');expect(JSON.stringify(rows)).not.toContain('Bounded synthetic review note');expect(rows.every(r=>JSON.stringify(r).length<500)).toBe(true);});
it('Creator attaches only own media; Reviewer gets contextual binary while Viewer gets none',async()=>{
 const a=await contentActor(db),b=await contentActor(db),r=await contentActor(db,'REVIEWER'),v=await contentActor(db,'VIEWER'),one=await upload(a),other=await upload(b);await expect(create(a,contentDraft({mediaIds:[other.id]}))).rejects.toThrow();
 const d=await submit(a,await create(a,contentDraft({mediaIds:[one.id]})));const binary=await service().binary(r.raw,d.id,d.latestRevisionId,one.id);await binary.handle.close();
 await expect(service().binary(r.raw,d.id,d.latestRevisionId,other.id)).rejects.toThrow();await expect(service().binary(v.raw,d.id,d.latestRevisionId,one.id)).rejects.toThrow();await expect(createMediaService(db,storage).binary(r.raw,one.id)).rejects.toThrow();await expect(createMediaService(db,storage).remove(a.raw,one.id)).rejects.toMatchObject({status:409});
});
it('workspace administrators may attach eligible workspace media',async()=>{const a=await contentActor(db),m=await upload(a);for(const role of ['OWNER','MARKETING_ADMIN'] as const){const admin=await contentActor(db,role),d=await create(admin,contentDraft({mediaIds:[m.id]}));expect(d.revisions[0]!.mediaIds).toEqual([m.id]);}});
it('contextual review access survives creator disablement while disabled actors lose access',async()=>{const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),m=await upload(a),d=await submit(a,await create(a,contentDraft({mediaIds:[m.id]})));await db.updateTable('users').set({status:'disabled'}).where('id','=',a.id).execute();await expect(service().get(a.raw,d.id)).rejects.toThrow();const result=await service().binary(r.raw,d.id,d.latestRevisionId,m.id);await result.handle.close();});
it.each(['save','submit','approve'] as const)('%s renews a hold discovered by cleanup on an independent connection',async action=>{
 const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),m=await upload(a);let d=await create(a,contentDraft({mediaIds:[m.id]}));if(action==='approve')d=await submit(a,d);await db.updateTable('content_media_protection').set({protected_until:new Date(Date.now()-1000)}).where('media_id','=',m.id).execute();
 const discovered=Promise.withResolvers<void>(),release=Promise.withResolvers<void>();let observed=false;
 const held=db.withPlugin({transformQuery({node}){return node;},async transformResult({result}){if(!observed&&result.rows.some(r=>typeof r==='object'&&r!==null&&'media_id'in r&&(r as {media_id:unknown}).media_id===m.id)){observed=true;discovered.resolve();await release.promise;}return result;}});
 const cleanup=createMediaService(held,storage).cleanup();await discovered.promise;
 try{if(action==='save')await save(a,d,contentDraft({mediaIds:[m.id]}),second.db);else if(action==='submit')await service(second.db).mutate(a.raw,{action:'submit',requestId:randomUUID(),postId:d.id,revisionId:d.latestRevisionId});else await decide(r,d,'APPROVED',second.db);}finally{release.resolve();}const result=await cleanup;expect(result.failed).toBe(0);
 const asset=await db.selectFrom('media_assets').selectAll().where('id','=',m.id).executeTakeFirstOrThrow();expect(asset.status).toBe('attached');expect(await storage.exists(asset.storage_key)).toBe(true);
});
it('expired Composer attachments are unavailable on both general and contextual delivery before cleanup',async()=>{
 const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),m=await upload(a),d=await submit(a,await create(a,contentDraft({mediaIds:[m.id]})));
 await db.updateTable('media_assets').set({created_at:new Date(Date.now()-86400000),expires_at:new Date(Date.now()-1000)}).where('id','=',m.id).execute();
 await db.updateTable('content_media_protection').set({protected_until:new Date(Date.now()-1000)}).where('media_id','=',m.id).execute();
 await expect(service().binary(r.raw,d.id,d.latestRevisionId,m.id)).rejects.toThrow();
 await expect(createMediaService(db,storage).get(a.raw,m.id)).rejects.toMatchObject({status:404});
 expect((await createMediaService(db,storage).list(a.raw)).some(row=>row.id===m.id)).toBe(false);
});
it('expired temporary assets cannot be attached while separate-pool cleanup deletes them',async()=>{const a=await contentActor(db),m=await upload(a);await db.updateTable('media_assets').set({created_at:new Date(Date.now()-86400000),expires_at:new Date(Date.now()-1000)}).where('id','=',m.id).execute();const traceA=contentDatabaseDiagnostic(db),traceB=contentDatabaseDiagnostic(second.db);let outcomes;try{outcomes=await Promise.allSettled([create(a,contentDraft({mediaIds:[m.id]})),createMediaService(second.db,storage).cleanup()]);}finally{traceA.close();traceB.close();}const evidence=JSON.stringify({databaseA:traceA.report(),databaseB:traceB.report(),cleanup:outcomes[1]!.status==='fulfilled'?outcomes[1]!.value:null});expect(outcomes[0]!.status,evidence).toBe('rejected');expect(outcomes[1]!.status,evidence).toBe('fulfilled');expect((await db.selectFrom('media_assets').select('status').where('id','=',m.id).executeTakeFirstOrThrow()).status,evidence).toBe('deleted');});
it('detach creates immutable attachment history with bounded protection, expiry cleanup tombstones exactly once',async()=>{const a=await contentActor(db),m=await upload(a),d=await create(a,contentDraft({mediaIds:[m.id]}));const next=await save(a,d);expect(next.revisions.find(r=>r.sequence===1)!.mediaIds).toEqual([m.id]);expect(next.revisions[0]!.mediaIds).toEqual([]);
 await db.updateTable('content_media_protection').set({protected_until:new Date(Date.now()-1000)}).where('media_id','=',m.id).execute();await createMediaService(db,storage).cleanup();const row=await db.selectFrom('media_assets').selectAll().where('id','=',m.id).executeTakeFirstOrThrow();expect(row.status).toBe('deleted');expect(row.display_name).toBe('');expect(await storage.exists(row.storage_key)).toBe(false);const quota=await db.selectFrom('media_storage_guard').select('allocated_bytes').executeTakeFirstOrThrow();await createMediaService(db,storage).cleanup();expect((await db.selectFrom('media_storage_guard').select('allocated_bytes').executeTakeFirstOrThrow()).allocated_bytes).toBe(quota.allocated_bytes);
});
it('attachment and orphan cleanup race has one consistent lifecycle outcome',async()=>{const a=await contentActor(db),m=await upload(a);const outcomes=await Promise.allSettled([create(a,contentDraft({mediaIds:[m.id]})),createMediaService(second.db,storage).cleanup()]);expect(outcomes[0]!.status).toBe('fulfilled');const row=await db.selectFrom('media_assets').selectAll().where('id','=',m.id).executeTakeFirstOrThrow();expect(row.status).toBe('attached');expect(await storage.exists(row.storage_key)).toBe(true);});
it('manual remove versus attach cannot commit an attachment to a deleted asset',async()=>{const a=await contentActor(db),m=await upload(a);const results=await Promise.allSettled([create(a,contentDraft({mediaIds:[m.id]})),createMediaService(second.db,storage).remove(a.raw,m.id)]);const row=await db.selectFrom('media_assets').selectAll().where('id','=',m.id).executeTakeFirstOrThrow();if(results[0]!.status==='fulfilled'){expect(row.status).toBe('attached');expect(results[1]!.status).toBe('rejected');expect(await storage.exists(row.storage_key)).toBe(true);}else expect(['deletion_pending','deleted']).toContain(row.status);});
it('typed stable contact snapshot rejects later replacement/value change and preserves historical value',async()=>{
 const owner=await contentActor(db,'OWNER'),a=await contentActor(db),r=await contentActor(db,'REVIEWER');const brand=createBrandService(db);let state=await brand.read(owner.raw);
 state=await brand.mutate(owner.raw,{brandId:BRAND_ID,expectedRevision:state.revision,kind:'contacts',id:null,data:sample('contacts')});const contact=state.records.find(row=>row.kind==='contacts')!;
 const claim=state.records.find(row=>row.kind==='claims'&&'category'in row.data&&row.data.category==='CONTACT')!;
 state=await brand.mutate(owner.raw,{brandId:BRAND_ID,expectedRevision:state.revision,kind:'claims',id:claim.id,data:{...claim.data,policy:'APPROVED_FACT_OR_INPUT'}});
 const d=await submit(a,await create(a,contentDraft({facts:[{category:'CONTACT',source:'BRAND_CONTACT',recordId:contact.id}],content:{FACEBOOK:{caption:CREATIVE.ENGLISH.FACEBOOK[0]+'\n\n+12025550123',hashtags:[]}}})));
 await brand.mutate(owner.raw,{brandId:BRAND_ID,expectedRevision:state.revision,kind:'contacts',id:contact.id,data:{...contact.data,normalized_value:'+12025550124'} as BrandData});
 await expect(decide(r,d)).rejects.toMatchObject({reason:'POLICY_CHANGED'});const old=(await service().get(a.raw,d.id));expect(JSON.stringify(old)).toContain('+12025550123');expect(JSON.stringify(old)).not.toContain('+12025550124');
});
it('database constraints reject duplicate revision sequence, cross-post submissions and invalid enum/position',async()=>{const a=await contentActor(db),d=await create(a),other=await create(a),revision=await db.selectFrom('content_revisions').selectAll().where('id','=',d.latestRevisionId!).executeTakeFirstOrThrow();await expect(db.insertInto('content_revisions').values({...revision,id:randomUUID(),request_id:randomUUID()}).execute()).rejects.toMatchObject({code:'ER_DUP_ENTRY'});await expect(db.insertInto('content_submissions').values({id:randomUUID(),post_id:other.id,revision_id:revision.id,submitted_by:a.id,request_id:randomUUID(),state:'PENDING',submitted_at:new Date(),validation_brand_revision:1}).execute()).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});await expect(sql`UPDATE content_revisions SET source='UNKNOWN' WHERE id=${revision.id}`.execute(db)).rejects.toThrow();const m=await upload(a);await expect(db.insertInto('content_revision_media').values({revision_id:revision.id,media_id:m.id,position:4}).execute()).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});});
it('inherited-author origin is a same-post immutable contribution, not an unchecked user UUID',async()=>{const a=await contentActor(db),b=await contentActor(db),one=await create(a),two=await create(b);await expect(db.insertInto('content_revision_authors').values({post_id:one.id,revision_id:one.latestRevisionId!,user_id:b.id,authored_revision_id:two.latestRevisionId!}).execute()).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});await expect(db.insertInto('content_revision_authors').values({post_id:one.id,revision_id:one.latestRevisionId!,user_id:b.id,authored_revision_id:one.latestRevisionId!}).execute()).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});});
it('real MySQL enforces every Phase 6 CHECK constraint',async()=>{
 const a=await contentActor(db),r=await contentActor(db,'REVIEWER'),d=await create(a),revision=d.latestRevisionId!,m=await upload(a),queued=await submit(a,d),submission=queued.reviews.find(s=>s.state==='PENDING')!.id;
 const cases=[
  ['content_revision_bounds',sql`UPDATE content_revisions SET sequence=0 WHERE id=${revision}`],
  ['content_source',sql`UPDATE content_revisions SET source='AI_GENERATED' WHERE id=${revision}`],
  ['content_variant_value',sql`UPDATE content_variants SET content_json='[]' WHERE revision_id=${revision}`],
  ['content_fact_identity',sql`INSERT INTO content_revision_facts(revision_id,category,source,source_record_id,resolved_value) VALUES(${revision},'PRICE','USER_INPUT',${randomUUID()},'PKR 98900')`],
  ['content_fact_value',sql`INSERT INTO content_revision_facts(revision_id,category,source,source_record_id,resolved_value) VALUES(${revision},'PRICE','USER_INPUT',NULL,'')`],
  ['content_media_position',sql`INSERT INTO content_revision_media(revision_id,media_id,position) VALUES(${revision},${m.id},4)`],
  ['content_submission_policy',sql`UPDATE content_submissions SET validation_brand_revision=0 WHERE id=${submission}`],
  ['content_decision_bounds',sql`INSERT INTO content_decisions(id,submission_id,post_id,revision_id,decided_by,request_id,decision,note,self_approval,brand_revision,created_at) VALUES(${randomUUID()},${submission},${d.id},${revision},${r.id},${randomUUID()},'REJECTED','',0,1,NOW(3))`],
 ] as const;
 for(const[name,statement]of cases)await expect(statement.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED',sqlMessage:expect.stringContaining(name)});
 const checks=await sql<{name:string}>`SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'content%' AND CONSTRAINT_TYPE='CHECK' AND ENFORCED='YES'`.execute(db);expect(checks.rows.map(r=>r.name).sort()).toEqual(cases.map(c=>c[0]).sort());
});
it('bounded history pagination and sorting cannot become unrestricted or injected queries',async()=>{const a=await contentActor(db);let d=await create(a);for(let i=0;i<21;i++)d=await save(a,d,contentDraft({title:'Revision '+i}));expect(d.revisions).toHaveLength(20);expect(d.historyCursor).not.toBeNull();const older=fullContent(await service().get(a.raw,d.id,d.historyCursor!));expect(older.revisions.map(r=>r.sequence)).toEqual([2,1]);expect(older.canEdit).toBe(false);for(const input of [{limit:100000},{sort:'id; DROP TABLE users'},{cursor:'not-a-uuid'}])await expect(service().list(a.raw,input)).rejects.toThrow();});
it('actual restricted runtime can append workflow but cannot mutate/delete immutable history or ownership',async()=>{
 const admin=createDatabase(resolveDatabaseConfiguration(process.env,'destructive-test')),runtime=createDatabase(resolveDatabaseConfiguration(process.env,'runtime')),fixtureId=randomUUID();
 const before=await admin.db.selectFrom('users').select('id').execute();
 try{await assertDestructiveTestDatabase(admin.db,process.env);const a=await contentActor(admin.db,'CONTENT_CREATOR',fixtureId),d=fullContent(await createContentService(runtime.db).mutate(a.raw,{action:'create',requestId:randomUUID(),draft:contentDraft()}));
  for(const table of ['content_revisions','content_variants','content_revision_authors','content_revision_facts','content_revision_media','content_decisions']){
   for(const statement of [sql`UPDATE ${sql.id(table)} SET ${sql.id(table==='content_revisions'?'title':table==='content_decisions'?'note':'revision_id')}=${'not-allowed'}`,sql`DELETE FROM ${sql.id(table)}`])await expect(statement.execute(runtime.db)).rejects.toMatchObject({code:expect.stringMatching(/ACCESS_DENIED/)});
  }
  await expect(runtime.db.updateTable('content_items').set({created_by:randomUUID()}).where('id','=',d.id).execute()).rejects.toMatchObject({code:'ER_COLUMNACCESS_DENIED_ERROR'});
  const submitted=fullContent(await createContentService(runtime.db).mutate(a.raw,{action:'submit',requestId:randomUUID(),postId:d.id,revisionId:d.latestRevisionId}));
  for(const statement of [sql`UPDATE content_submissions SET revision_id=${randomUUID()} WHERE post_id=${submitted.id}`,sql`UPDATE content_submissions SET submitted_by=${randomUUID()} WHERE post_id=${submitted.id}`,sql`DELETE FROM content_submissions WHERE post_id=${submitted.id}`])await expect(statement.execute(runtime.db)).rejects.toMatchObject({code:expect.stringMatching(/ACCESS_DENIED/)});
  await expect(sql`CREATE TABLE content_forbidden(id int)`.execute(runtime.db)).rejects.toMatchObject({code:'ER_TABLEACCESS_DENIED_ERROR'});
  await expect(runtime.db.deleteFrom('audit_logs').execute()).rejects.toThrow();
 }finally{try{await removeContentActorFixture(admin.db,process.env,fixtureId);expect(await admin.db.selectFrom('users').select('id').where('id','=',fixtureId).execute()).toHaveLength(0);expect(await admin.db.selectFrom('users').select('id').execute()).toHaveLength(before.length);}finally{await runtime.close();await admin.close();}}
});

const provenanceCases=(['MANUAL','HUMAN_EDITED','AI_GENERATED','AI_EDITED'] as const).flatMap(source=>Array.from({length:16},(_,mask)=>({source,mask,brandRevision:1}))).concat((['AI_GENERATED','AI_EDITED'] as const).map(source=>({source,mask:15,brandRevision:0})));
it.each(provenanceCases)('MySQL enforces NULL-safe $source provenance mask $mask with Brand revision $brandRevision',async({source,mask,brandRevision})=>{
 const a=await contentActor(db),d=await create(a),base=await db.selectFrom('content_revisions').selectAll().where('id','=',d.latestRevisionId!).executeTakeFirstOrThrow(),rollback=Symbol('owned provenance rollback');
 try{await db.transaction().execute(async tx=>{
  const generation=randomUUID(),time=new Date();
  await tx.insertInto('ai_generations').values({id:generation,created_by:a.id,request_id:randomUUID(),input_digest:randomBytes(32),brand_id:BRAND_ID,brand_revision:1,provider:'openrouter',model:'test/model:free',prompt_version:'social-safe-assembly-v1',platforms_json:'["FACEBOOK"]',provenance_json:'[]',language:'ENGLISH',status:'COMPLETED',failure:null,output_json:JSON.stringify(contentDraft().content),usage_json:null,created_at:time,lease_expires_at:new Date(+time+45000),completed_at:time}).execute();
  const statement=tx.insertInto('content_revisions').values({...base,id:randomUUID(),sequence:2,request_id:randomUUID(),source,generation_id:mask&1?generation:null,generation_provider:mask&2?'openrouter':null,generation_model:mask&4?'test/model:free':null,generation_brand_revision:mask&8?brandRevision:null}).execute();
  const valid=source==='MANUAL'||source==='HUMAN_EDITED'?mask===0:mask===15&&brandRevision>0;
  if(valid)await statement;else await expect(statement).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED',sqlMessage:expect.stringContaining('content_source')});
  throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
});
