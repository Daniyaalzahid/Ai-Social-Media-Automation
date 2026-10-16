import { createHash,randomUUID } from 'node:crypto';
import { sql,type Kysely,type Selectable } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema';
import { requireAuthenticatedUser,requirePermission,can,AuthorizationError,type AuthorizationContext } from '../authorization/authorization';
import { contentBrandSnapshot } from '../brand/service';
import { SensitiveValue } from '../security/sensitive';
import { socialPackSchema } from '../../features/ai/model';
import { CONTENT_LIMITS,commandSchema,listSchema,contentDetailSchema,contentListSchema,revisionViewSchema,factSnapshotSchema,type RevisionInput,type FactSnapshot,type ContentDetail } from '../../features/content/model';
import { PLATFORMS,CLAIMS } from '../../features/brand/model';
import { ContentError,preparedContent,representableContent,revalidateSnapshots } from './policy';
import type { MediaStorage } from '../media/storage';
type Db=Kysely<DatabaseSchema>;
type Item=Selectable<DatabaseSchema['content_items']>;
type Revision=Selectable<DatabaseSchema['content_revisions']>;
const workspace=(a:AuthorizationContext)=>a.role==='OWNER'||a.role==='MARKETING_ADMIN';
const parseJson=(v:unknown):unknown=>typeof v==='string'?JSON.parse(v) as unknown:v;
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest();
async function clock(tx:Db){return(await sql<{now:Date}>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(tx)).rows[0]!.now;}
async function mediaGuard(tx:Db){await tx.selectFrom('media_storage_guard').select('id').where('id','=',1).forUpdate().executeTakeFirstOrThrow();}
function editable(actor:AuthorizationContext,item:Item){return can(actor,'content.edit_any')||can(actor,'content.edit_assigned')&&item.created_by===actor.userId&&item.assigned_to===actor.userId;}
async function audit(tx:Db,a:AuthorizationContext,id:string,action:'created'|'revision_created'|'ai_imported'|'submitted'|'approved'|'changes_requested'|'rejected'|'media_attached'|'media_detached',self=false){
 await tx.insertInto('audit_logs').values({id:randomUUID(),actor_user_id:a.userId,target_user_id:null,session_id:a.sessionId,action:`content.${action}`,outcome:'success',correlation_id:randomUUID(),metadata_safe_json:JSON.stringify({reasonCode:`content.${action}`,changedFields:[`record:${z.uuid().parse(id)}`],count:self?1:0}),ip_hash:null}).execute();
}
async function approved(tx:Db,postId:string){return tx.selectFrom('content_revisions as r').innerJoin('content_decisions as d','d.revision_id','r.id').selectAll('r').where('r.post_id','=',postId).where('d.decision','=','APPROVED').orderBy('r.sequence','desc').limit(1).executeTakeFirst();}
async function pack(tx:Db,id:string){const rows=await tx.selectFrom('content_variants').selectAll().where('revision_id','=',id).execute();const value=Object.fromEntries(PLATFORMS.flatMap(p=>{const row=rows.find(r=>r.platform===p);return row?[[p,parseJson(row.content_json)]]:[];}));const parsed=socialPackSchema.parse(value);if(!Object.keys(parsed).length)throw new ContentError('UNAVAILABLE',503);return parsed;}
async function facts(tx:Db,id:string):Promise<FactSnapshot[]>{const rows=await tx.selectFrom('content_revision_facts').selectAll().where('revision_id','=',id).execute();return rows.map(r=>factSnapshotSchema.parse({category:r.category,source:r.source,recordId:r.source_record_id,value:r.resolved_value})).sort((a,b)=>CLAIMS.indexOf(a.category)-CLAIMS.indexOf(b.category));}
async function revisionView(tx:Db,r:Revision){return revisionViewSchema.parse({id:r.id,sequence:r.sequence,title:r.title,language:r.language,content:await pack(tx,r.id),source:r.source,brandRevision:r.brand_revision,validated:r.validated===1,createdAt:r.created_at.toISOString(),author:(await tx.selectFrom('users').select('display_name').where('id','=',r.created_by).executeTakeFirstOrThrow()).display_name,mediaIds:(await tx.selectFrom('content_revision_media').select('media_id').where('revision_id','=',r.id).orderBy('position').execute()).map(m=>m.media_id),facts:await facts(tx,r.id),generationId:r.generation_id,generationSource:r.generation_id?{provider:r.generation_provider,model:r.generation_model,brandRevision:r.generation_brand_revision}:null});}
async function readDetail(tx:Db,actor:AuthorizationContext,id:string,before?:number):Promise<ContentDetail>{
 requirePermission(actor,'content.read');const item=await tx.selectFrom('content_items').selectAll().where('id','=',id).executeTakeFirst();if(!item)throw new ContentError('NOT_FOUND',404);
 if(actor.role==='VIEWER'){
  if(before!==undefined)throw new ContentError('NOT_FOUND',404);const r=await approved(tx,id);if(!r)throw new ContentError('NOT_FOUND',404);
  return contentDetailSchema.parse({id,viewer:true,approved:{id:r.id,sequence:r.sequence,title:r.title,content:await pack(tx,r.id)}});
 }
 if(!workspace(actor)&&actor.role!=='REVIEWER'&&item.created_by!==actor.userId)throw new ContentError('NOT_FOUND',404);
 let query=tx.selectFrom('content_revisions as r').selectAll('r').where('r.post_id','=',id);
 if(actor.role==='REVIEWER')query=query.where('r.id','in',tx.selectFrom('content_submissions').select('revision_id').where('post_id','=',id));
 if(before!==undefined)query=query.where('r.sequence','<',before);
 const all=await query.orderBy('r.sequence','desc').limit(CONTENT_LIMITS.page+1).execute();if(!all.length)throw new ContentError('NOT_FOUND',404);
 const page=all.slice(0,CONTENT_LIMITS.page),revisions=await Promise.all(page.map(r=>revisionView(tx,r))),ids=page.map(r=>r.id);
 const submissions=await tx.selectFrom('content_submissions as s').leftJoin('content_decisions as d','d.submission_id','s.id').select(['s.id','s.revision_id','s.state','s.submitted_at','s.validation_brand_revision','d.note','d.self_approval','d.brand_revision']).where('s.revision_id','in',ids).orderBy('s.id','desc').limit(20).execute();
 const latest=page[0]!,pending=await tx.selectFrom('content_submissions').select(['revision_id','state']).where('post_id','=',id).where('state','=','PENDING').executeTakeFirst(),ap=await approved(tx,id);
 const currentSubmission=submissions.find(s=>s.revision_id===latest.id);
 const pendingRow=pending?await tx.selectFrom('content_revisions').selectAll().where('id','=',pending.revision_id).executeTakeFirstOrThrow():null;
 const pendingSubmission=pending?await tx.selectFrom('content_submissions').selectAll().where('post_id','=',id).where('state','=','PENDING').executeTakeFirstOrThrow():null;
 if(pendingSubmission&&!submissions.some(s=>s.id===pendingSubmission.id))submissions.unshift({...pendingSubmission,note:null,self_approval:0,brand_revision:null});
 const state=latest.id===ap?.id?'APPROVED':latest.id===pending?.revision_id?'IN_REVIEW':currentSubmission&&currentSubmission.state!=='PENDING'?currentSubmission.state:'DRAFT';
 return contentDetailSchema.parse({id,viewer:false,creator:(await tx.selectFrom('users').select('display_name').where('id','=',item.created_by).executeTakeFirstOrThrow()).display_name,state,latestRevisionId:actor.role==='REVIEWER'?null:(await tx.selectFrom('content_revisions').select('id').where('post_id','=',id).where('sequence','=',item.revision_sequence).executeTakeFirstOrThrow()).id,approvedRevisionId:ap?.id??null,revisions,historyCursor:all.length>20?page[page.length-1]!.sequence:null,reviews:submissions.map(s=>({id:s.id,revisionId:s.revision_id,state:s.state,note:s.note??null,selfApproval:s.self_approval===1,submittedAt:s.submitted_at.toISOString(),validationBrandRevision:s.validation_brand_revision,decisionBrandRevision:s.brand_revision??null})),activeReviewRevision:pendingRow?await revisionView(tx,pendingRow):null,canEdit:before===undefined&&editable(actor,item),canSubmit:before===undefined&&can(actor,'content.submit')&&(workspace(actor)||item.created_by===actor.userId)&&!pending,canReview:can(actor,'content.review')&&can(actor,'content.approve'),canApprove:!!pendingRow&&can(actor,'content.review')&&can(actor,'content.approve')&&(!await tx.selectFrom('content_revision_authors').select('user_id').where('revision_id','=',pendingRow.id).where('user_id','=',actor.userId).executeTakeFirst()||can(actor,'content.approve_self'))});
}
async function protectMedia(tx:Db,actor:AuthorizationContext,ids:string[],until:Date,time:Date,storage:MediaStorage|undefined,lockedParents:ReadonlySet<string>,revisionId?:string){
 if(!ids.length)return;await mediaGuard(tx);
 for(const id of [...ids].sort()){
  const row=await tx.selectFrom('media_assets').selectAll().where('id','=',id).forUpdate().executeTakeFirst();
  if(!row||!['temporary','attached'].includes(row.status)||row.expires_at<=time)throw new ContentError('MEDIA_UNAVAILABLE',409);
  if(!lockedParents.has(row.created_by))throw new ContentError('CONFLICT',409);
  if(!revisionId){requirePermission(actor,'media.read');requirePermission(actor,'media.upload');if(!workspace(actor)&&row.created_by!==actor.userId)throw new ContentError('MEDIA_UNAVAILABLE',404);}
  if(!storage)throw new ContentError('MEDIA_UNAVAILABLE',409);
  let available=false;try{const handle=await storage.open(row.storage_key);try{available=(await handle.stat()).size===row.byte_size;}finally{await handle.close();}}catch{/* Fail closed; never expose storage errors. */}
  if(!available)throw new ContentError('MEDIA_UNAVAILABLE',409);
  await tx.insertInto('content_media_protection').values({media_id:id,protected_until:until}).onDuplicateKeyUpdate({protected_until:sql`GREATEST(protected_until,${until})`}).execute();
  await tx.updateTable('media_assets').set({status:'attached',expires_at:sql`GREATEST(expires_at,${until})`}).where('id','=',id).execute();
 }
}
export function createContentService(db:Db,storage?:MediaStorage){
 async function transaction<T>(fn:(tx:Db)=>Promise<T>){try{return await db.transaction().execute(fn);}catch(e){if(e instanceof ContentError||e instanceof AuthorizationError)throw e;if(e&&typeof e==='object'&&'code'in e&&e.code==='ER_DUP_ENTRY')throw new ContentError('CONFLICT',409);throw new ContentError('UNAVAILABLE',503);}}
 async function actor(tx:Db,raw:SensitiveValue){return(await requireAuthenticatedUser(tx,raw)).context;}
 return{
  async get(raw:SensitiveValue,id:unknown,before?:number){if(!z.uuid().safeParse(id).success||before!==undefined&&(!Number.isSafeInteger(before)||before<1))throw new ContentError('NOT_FOUND',404);return transaction(async tx=>readDetail(tx,await actor(tx,raw),id as string,before));},
  async list(raw:SensitiveValue,value:unknown={}){const parsed=listSchema.safeParse(value);if(!parsed.success)throw new ContentError('VALIDATION_FAILED');const input=parsed.data;return transaction(async tx=>{
   const a=await actor(tx,raw);requirePermission(a,'content.read');if(input.scope==='review')requirePermission(a,'content.review');
   if(a.role==='VIEWER'&&(input.scope!=='content'||input.status&&input.status!=='APPROVED'))throw new ContentError('UNAUTHORIZED',403);
   let q=tx.selectFrom('content_items as p').select('p.id');
   if(a.role==='CONTENT_CREATOR')q=q.where('p.created_by','=',a.userId);
   if(a.role==='VIEWER')q=q.where('p.id','in',tx.selectFrom('content_decisions').select('post_id').where('decision','=','APPROVED'));
   else if(a.role==='REVIEWER'||input.scope==='review')q=q.where('p.id','in',tx.selectFrom('content_submissions').select('post_id').where('state','=','PENDING'));
   if(input.cursor)q=q.where('p.id','>',input.cursor);
   // Filter through bounded, server-owned state predicates; never browser SQL/sort.
   if(input.status&&a.role!=='VIEWER'){
    const state=sql<string>`CASE
     WHEN EXISTS(SELECT 1 FROM content_revisions r JOIN content_decisions d ON d.revision_id=r.id WHERE r.post_id=p.id AND r.sequence=p.revision_sequence AND d.decision='APPROVED') THEN 'APPROVED'
     WHEN EXISTS(SELECT 1 FROM content_revisions r JOIN content_submissions s ON s.revision_id=r.id WHERE r.post_id=p.id AND r.sequence=p.revision_sequence AND s.state='PENDING') THEN 'IN_REVIEW'
     ELSE COALESCE((SELECT s.state FROM content_submissions s JOIN content_revisions r ON r.id=s.revision_id WHERE r.post_id=p.id AND r.sequence=p.revision_sequence LIMIT 1),'DRAFT') END`;
    q=q.where(state,'=',input.status);
   }

   const rows=await q.orderBy('p.id').limit(21).execute(),items=[];
   for(const p of rows.slice(0,20)){const d=await readDetail(tx,a,p.id);if(d.viewer)items.push({id:d.id,title:d.approved.title,revisionId:d.approved.id,sequence:d.approved.sequence,state:'APPROVED',platforms:Object.keys(d.approved.content)});else{const review=input.scope==='review'?d.reviews.find(r=>r.state==='PENDING'):null;const r=review?d.activeReviewRevision??d.revisions[0]!:d.revisions[0]!;items.push({id:d.id,title:r.title,revisionId:r.id,sequence:r.sequence,state:review?'IN_REVIEW':d.state,creator:d.creator,...(review?{submittedAt:review.submittedAt}:{}),platforms:Object.keys(r.content)});}}
   return contentListSchema.parse({items,cursor:rows.length>20?rows[19]!.id:null});
  });},
  async mutate(raw:SensitiveValue,value:unknown){const parsed=commandSchema.safeParse(value);if(!parsed.success||Buffer.byteLength(JSON.stringify(parsed.data))>CONTENT_LIMITS.body)throw new ContentError('VALIDATION_FAILED');const c=parsed.data;
   // Preliminary authorization supplies only bounded lock hints. It cannot grant
   // the mutation; all authority and relationships are checked again below.
   const parentIds=await transaction(async tx=>{
    const a=await actor(tx,raw);requirePermission(a,'content.read');const parents=new Set([a.userId]);let mediaIds:string[];
    if(c.action==='create'||c.action==='import'){requirePermission(a,'content.create');if(c.action==='import')requirePermission(a,'ai.generate');mediaIds=c.action==='create'?c.draft.mediaIds:c.mediaIds;}
    else{
     if(c.action==='save'&&!can(a,'content.edit_any')&&!can(a,'content.edit_assigned'))throw new AuthorizationError();
     if(c.action==='submit')requirePermission(a,'content.submit');
     if(c.action==='decide'){requirePermission(a,'content.review');requirePermission(a,'content.approve');}
     const item=await tx.selectFrom('content_items').selectAll().where('id','=',c.postId).executeTakeFirst();if(!item)throw new ContentError('NOT_FOUND',404);
     if(c.action==='save'&&!editable(a,item)||c.action==='submit'&&!workspace(a)&&item.created_by!==a.userId)throw new ContentError('NOT_FOUND',404);
     parents.add(item.created_by);
     if(c.action==='save')mediaIds=c.draft.mediaIds;
     else{
      const revision=await tx.selectFrom('content_revisions').select('id').where('id','=',c.revisionId).where('post_id','=',item.id).executeTakeFirst();if(!revision)throw new ContentError('NOT_FOUND',404);
      if(c.action==='decide'&&!await tx.selectFrom('content_submissions').select('id').where('id','=',c.submissionId).where('post_id','=',item.id).where('revision_id','=',revision.id).executeTakeFirst())throw new ContentError('NOT_FOUND',404);
      mediaIds=(await tx.selectFrom('content_revision_media').select('media_id').where('revision_id','=',revision.id).limit(5).execute()).map(r=>r.media_id);if(mediaIds.length>4)throw new ContentError('UNAVAILABLE',503);
     }
    }
    if(mediaIds.length){
     const rows=await tx.selectFrom('media_assets').select(['id','created_by']).where('id','in',mediaIds).limit(4).execute();if(rows.length!==mediaIds.length)throw new ContentError('MEDIA_UNAVAILABLE',404);
     if(c.action==='create'||c.action==='import'||c.action==='save'){requirePermission(a,'media.read');requirePermission(a,'media.upload');if(!workspace(a)&&rows.some(r=>r.created_by!==a.userId))throw new ContentError('MEDIA_UNAVAILABLE',404);}
     for(const row of rows)parents.add(row.created_by);
    }
    return [...parents].sort();
   });
   const lockedParents=new Set(parentIds);
   const postId=await transaction(async tx=>{
    for(const id of parentIds)if(!await tx.selectFrom('users').select('id').where('id','=',id).forUpdate().executeTakeFirst())throw new ContentError('CONFLICT',409);
    const a=await actor(tx,raw);requirePermission(a,'content.read');
    if(c.action==='create'||c.action==='import')requirePermission(a,'content.create');
    if(c.action==='save'&&!can(a,'content.edit_any')&&!can(a,'content.edit_assigned'))throw new AuthorizationError();
    if(c.action==='submit')requirePermission(a,'content.submit');
    if(c.action==='decide'){requirePermission(a,'content.review');requirePermission(a,'content.approve');}
    // Brand row precedes content/media locks for every validation mutation.
    const policy=await contentBrandSnapshot(tx,a),time=await clock(tx);
    if(c.action==='create'||c.action==='import'||c.action==='save'){
     const prior=await tx.selectFrom('content_revisions').selectAll().where('created_by','=',a.userId).where('request_id','=',c.requestId).executeTakeFirst();
     if(prior){if(!prior.request_digest.equals(digest(c)))throw new ContentError('CONFLICT',409);return prior.post_id;}
     let item:Item,base:Revision|undefined,draft:RevisionInput,generationId:string|null=null,generationProvider:string|null=null,generationModel:string|null=null,generationBrandRevision:number|null=null;
     if(c.action==='save'){
      item=await tx.selectFrom('content_items').selectAll().where('id','=',c.postId).forUpdate().executeTakeFirstOrThrow();if(!editable(a,item))throw new ContentError('NOT_FOUND',404);
      base=await tx.selectFrom('content_revisions').selectAll().where('post_id','=',item.id).where('sequence','=',item.revision_sequence).forShare().executeTakeFirstOrThrow();if(base.id!==c.expectedRevisionId)throw new ContentError('CONFLICT',409);draft=c.draft;generationId=base.generation_id;generationProvider=base.generation_provider;generationModel=base.generation_model;generationBrandRevision=base.generation_brand_revision;
     }else{
      if(c.action==='import'){
       requirePermission(a,'ai.generate');const g=await tx.selectFrom('ai_generations').selectAll().where('id','=',c.generationId).where('created_by','=',a.userId).forShare().executeTakeFirst();if(!g||g.status!=='COMPLETED')throw new ContentError('NOT_FOUND',404);
       const content=socialPackSchema.parse(parseJson(g.output_json));if(!Object.keys(content).length)throw new ContentError('VALIDATION_FAILED');draft={title:c.title,language:g.language,content,facts:c.facts,mediaIds:c.mediaIds};generationId=g.id;generationProvider=g.provider;generationModel=g.model;generationBrandRevision=g.brand_revision;
      }else draft=c.draft;
      item={id:randomUUID(),created_by:a.userId,assigned_to:a.userId,revision_sequence:0,created_at:time};await tx.insertInto('content_items').values(item).execute();
     }
     if(Buffer.byteLength(JSON.stringify(draft.content))>CONTENT_LIMITS.pack)throw new ContentError('VALIDATION_FAILED');
     const prepared=preparedContent(policy,draft.language,Object.keys(draft.content) as typeof PLATFORMS[number][],draft.facts),valid=representableContent(draft.content,prepared.prepared);
     const id=randomUUID(),sequence=item.revision_sequence+1;
     await protectMedia(tx,a,draft.mediaIds,new Date(+time+CONTENT_LIMITS.draftProtectionMs),time,storage,lockedParents);
     await tx.insertInto('content_revisions').values({id,post_id:item.id,sequence,created_by:a.userId,request_id:c.requestId,request_digest:digest(c),title:draft.title,language:draft.language,source:generationId?(base?'AI_EDITED':'AI_GENERATED'):(base?'HUMAN_EDITED':'MANUAL'),generation_id:generationId,generation_provider:generationProvider,generation_model:generationModel,generation_brand_revision:generationBrandRevision,brand_revision:policy.revision,validated:valid?1:0,created_at:time}).execute();
     for(const platform of PLATFORMS){const data=draft.content[platform];if(data)await tx.insertInto('content_variants').values({revision_id:id,platform,content_json:JSON.stringify(data)}).execute();}
     const authors=new Map((base?await tx.selectFrom('content_revision_authors').select(['user_id','authored_revision_id']).where('revision_id','=',base.id).limit(201).execute():[]).map(r=>[r.user_id,r.authored_revision_id]));authors.set(a.userId,id);if(authors.size>200)throw new ContentError('VALIDATION_FAILED');for(const[user_id,authored_revision_id]of [...authors].sort(([a],[b])=>a.localeCompare(b)))await tx.insertInto('content_revision_authors').values({post_id:item.id,revision_id:id,user_id,authored_revision_id}).execute();
     for(const f of prepared.snapshots)await tx.insertInto('content_revision_facts').values({revision_id:id,category:f.category,source:f.source,source_record_id:f.recordId,resolved_value:f.value}).execute();
     for(const[position,media_id]of draft.mediaIds.entries()){await tx.insertInto('content_revision_media').values({revision_id:id,media_id,position}).execute();await audit(tx,a,id,'media_attached');}
     if(base){const old=await tx.selectFrom('content_revision_media').select('media_id').where('revision_id','=',base.id).execute();for(const r of old)if(!draft.mediaIds.includes(r.media_id))await audit(tx,a,id,'media_detached');}
     await tx.updateTable('content_items').set({revision_sequence:sequence}).where('id','=',item.id).execute();await audit(tx,a,id,base?'revision_created':c.action==='import'?'ai_imported':'created');return item.id;
    }
    const item=await tx.selectFrom('content_items').selectAll().where('id','=',c.postId).forUpdate().executeTakeFirst();if(!item)throw new ContentError('NOT_FOUND',404);
    const r=await tx.selectFrom('content_revisions').selectAll().where('post_id','=',item.id).where('id','=',c.revisionId).forShare().executeTakeFirst();if(!r)throw new ContentError('NOT_FOUND',404);
    if(c.action==='submit'){
     if(!workspace(a)&&item.created_by!==a.userId)throw new ContentError('NOT_FOUND',404);
     const duplicate=await tx.selectFrom('content_submissions').selectAll().where('submitted_by','=',a.userId).where('request_id','=',c.requestId).executeTakeFirst();if(duplicate){if(duplicate.post_id!==item.id||duplicate.revision_id!==r.id)throw new ContentError('CONFLICT',409);return item.id;}
     if(r.sequence!==item.revision_sequence)throw new ContentError('CONFLICT',409);
     if(await tx.selectFrom('content_submissions').select('id').where('post_id','=',item.id).where(eb=>eb.or([eb('state','=','PENDING'),eb('revision_id','=',r.id)])).executeTakeFirst())throw new ContentError('CONFLICT',409);
     const view=await revisionView(tx,r);revalidateSnapshots(policy,r.language,view.content,view.facts);
     await protectMedia(tx,a,view.mediaIds,new Date(+time+CONTENT_LIMITS.draftProtectionMs),time,storage,lockedParents,r.id);
     await tx.insertInto('content_submissions').values({id:randomUUID(),post_id:item.id,revision_id:r.id,submitted_by:a.userId,request_id:c.requestId,state:'PENDING',submitted_at:time,validation_brand_revision:policy.revision}).execute();await audit(tx,a,r.id,'submitted');return item.id;
    }
    const submission=await tx.selectFrom('content_submissions').selectAll().where('id','=',c.submissionId).where('post_id','=',item.id).where('revision_id','=',r.id).forUpdate().executeTakeFirst();if(!submission)throw new ContentError('NOT_FOUND',404);
    const duplicate=await tx.selectFrom('content_decisions').selectAll().where('decided_by','=',a.userId).where('request_id','=',c.requestId).executeTakeFirst();if(duplicate){if(duplicate.submission_id!==submission.id||duplicate.decision!==c.decision||duplicate.note!==c.note)throw new ContentError('CONFLICT',409);return item.id;}
    if(submission.state!=='PENDING')throw new ContentError('CONFLICT',409);if(c.decision!=='APPROVED'&&!c.note.trim())throw new ContentError('VALIDATION_FAILED');
    const self=c.decision==='APPROVED'&&!!await tx.selectFrom('content_revision_authors').select('user_id').where('revision_id','=',r.id).where('user_id','=',a.userId).executeTakeFirst();if(self)requirePermission(a,'content.approve_self');
    if(c.decision==='APPROVED'){const view=await revisionView(tx,r);revalidateSnapshots(policy,r.language,view.content,view.facts);await protectMedia(tx,a,view.mediaIds,new Date(+time+CONTENT_LIMITS.approvalProtectionMs),time,storage,lockedParents,r.id);}
    await tx.insertInto('content_decisions').values({id:randomUUID(),submission_id:submission.id,post_id:item.id,revision_id:r.id,decided_by:a.userId,request_id:c.requestId,decision:c.decision,note:c.note,self_approval:self?1:0,brand_revision:policy.revision,created_at:time}).execute();
    await tx.updateTable('content_submissions').set({state:c.decision}).where('id','=',submission.id).execute();await audit(tx,a,r.id,c.decision==='APPROVED'?'approved':c.decision==='REJECTED'?'rejected':'changes_requested',self);return item.id;
   });
   return transaction(async tx=>readDetail(tx,await actor(tx,raw),postId));
  },
  async binary(raw:SensitiveValue,postId:unknown,revisionId:unknown,mediaId:unknown){
   for(const id of [postId,revisionId,mediaId])if(!z.uuid().safeParse(id).success)throw new ContentError('NOT_FOUND',404);
   const row=await transaction(async tx=>{const a=await actor(tx,raw);if(a.role==='VIEWER')throw new ContentError('NOT_FOUND',404);const detail=await readDetail(tx,a,postId as string);if(detail.viewer)throw new ContentError('NOT_FOUND',404);
    const revision=await tx.selectFrom('content_revisions').selectAll().where('id','=',revisionId as string).where('post_id','=',postId as string).executeTakeFirst();if(!revision)throw new ContentError('NOT_FOUND',404);
    if(a.role==='REVIEWER'){requirePermission(a,'content.review');if(!await tx.selectFrom('content_submissions').select('id').where('post_id','=',postId as string).where('revision_id','=',revision.id).executeTakeFirst())throw new ContentError('NOT_FOUND',404);}
    if(!await tx.selectFrom('content_revision_media').select('media_id').where('revision_id','=',revision.id).where('media_id','=',mediaId as string).executeTakeFirst())throw new ContentError('NOT_FOUND',404);
    const asset=await tx.selectFrom('media_assets').selectAll().where('id','=',mediaId as string).forShare().executeTakeFirst();if(!asset||asset.status!=='attached'||asset.expires_at<=await clock(tx))throw new ContentError('MEDIA_UNAVAILABLE',404);return asset;});
   if(!storage)throw new ContentError('MEDIA_UNAVAILABLE',404);try{const handle=await storage.open(row.storage_key);if((await handle.stat()).size!==row.byte_size){await handle.close();throw new Error();}return{handle,mime:row.mime,bytes:row.byte_size};}catch{throw new ContentError('MEDIA_UNAVAILABLE',404);}
  },
 };
}
