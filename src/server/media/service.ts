import { activePublishHold } from '../publishing/media-hold.ts';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import { sql,type Kysely,type Selectable } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema,MediaAssetsTable } from '../db/schema.ts';
import { requireAuthenticatedUser,requirePermission,can,type AuthorizationContext,AuthorizationError } from '../authorization/authorization.ts';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive.ts';
import { cleanupExpiredRateLimits } from '../security/rate-limits.ts';
import { MEDIA_LIMITS,uploadSchema,mediaViewSchema } from '../../features/media/model.ts';
import { MediaError,type MediaStorage,LocalPrivateMediaStorage } from './storage.ts';
import { inspectMedia } from './parser.ts';
export type MediaDatabase=Kysely<DatabaseSchema>;
const eligible=(row:Selectable<MediaAssetsTable>)=>row.status==='receiving'||row.status==='temporary';
const workspace=(context:AuthorizationContext)=>context.role==='OWNER'||context.role==='MARKETING_ADMIN';
function own(context:AuthorizationContext,row:Selectable<MediaAssetsTable>){if(!workspace(context)&&row.created_by!==context.userId)throw new AuthorizationError();}
function view(row:Selectable<MediaAssetsTable>,context:AuthorizationContext){return mediaViewSchema.parse({id:row.id,name:row.display_name,kind:row.kind,mime:row.mime,bytes:row.byte_size,width:row.width,height:row.height,duration:row.duration_ms,status:row.status,expiresAt:row.expires_at.toISOString(),createdAt:row.created_at.toISOString(),canRemove:row.status==='temporary'&&(can(context,'media.manage')||row.created_by===context.userId&&can(context,'media.upload'))});}
async function clock(db:MediaDatabase){return (await sql<{now:Date}>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;}
async function guard(db:MediaDatabase){return db.selectFrom('media_storage_guard').selectAll().where('id','=',1).forUpdate().executeTakeFirstOrThrow();}
async function audit(db:MediaDatabase,id:string,action:'uploaded'|'removal_requested'|'deleted'|'cleanup_failed'|'protection_released',context:AuthorizationContext|null){
 await db.insertInto('audit_logs').values({id:randomUUID(),actor_user_id:context?.userId??null,target_user_id:null,session_id:context?.sessionId??null,action:`media.${action}`,outcome:action==='cleanup_failed'?'failure':'success',correlation_id:randomUUID(),metadata_safe_json:JSON.stringify({reasonCode:`media.${action}`,changedFields:[`record:${z.uuid().parse(id)}`]}),ip_hash:null}).execute();
}
export function createMediaService(db:MediaDatabase,storage:MediaStorage){
 async function transaction<T>(work:(tx:MediaDatabase)=>Promise<T>){try{return await db.transaction().execute(work);}catch(error){if(error instanceof MediaError||error instanceof AuthorizationError)throw error;throw new SecurityOperationError();}}
 async function claim(id:string,reason:'manual'|'expired'|'upload_failed',raw?:SensitiveValue){
  const parents=await transaction(async(tx)=>{
   let actor:AuthorizationContext|null=null;if(raw){actor=(await requireAuthenticatedUser(tx,raw)).context;requirePermission(actor,'media.upload');}
   const hint=await tx.selectFrom('media_assets').selectAll().where('id','=',id).executeTakeFirst();if(!hint){if(raw)throw new MediaError(404,'Media not found.');return null;}
   if(actor){own(actor,hint);if(hint.created_by!==actor.userId)requirePermission(actor,'media.manage');}
   return [...new Set([hint.created_by,...(actor?[actor.userId]:[])])].sort();
  });if(!parents)return false;
  return transaction(async(tx)=>{
  for(const parent of parents){const query=tx.selectFrom('users').select('id').where('id','=',parent);if(!await(raw?query.forUpdate():query.forShare()).executeTakeFirst())throw new MediaError(503,'Media is unavailable.');}
  let context:AuthorizationContext|null=null;
  if(raw){context=(await requireAuthenticatedUser(tx,raw)).context;requirePermission(context,'media.upload');}
  await guard(tx);const row=await tx.selectFrom('media_assets').selectAll().where('id','=',id).forUpdate().executeTakeFirst();if(!row){if(raw)throw new MediaError(404,'Media not found.');return false;}
  if(!parents.includes(row.created_by))throw new MediaError(409,'Media changed.');
  if(context){own(context,row);if(row.created_by!==context.userId)requirePermission(context,'media.manage');if(row.status!=='temporary'&&row.status!=='deletion_pending'&&row.status!=='deleted')throw new MediaError(409,'Only temporary media can be removed.');}
  if(row.status==='deleted')return false;if(row.status==='deletion_pending')return true;
  const now=await clock(tx);if(await activePublishHold(tx,row.id,now)){if(raw)throw new MediaError(409,'This media is protected from removal.');return false;}if(!eligible(row)||reason==='expired'&&row.expires_at>now){if(raw)throw new MediaError(409,'This media is protected from removal.');return false;}
  await tx.updateTable('media_assets').set({status:'deletion_pending',deletion_reason:reason}).where('id','=',id).execute();
  if(row.status==='receiving')await tx.updateTable('media_storage_guard').set({receiving_count:sql`receiving_count-1`}).where('id','=',1).execute();
  await audit(tx,id,'removal_requested',context);return true;
 });}
 async function finishDeletion(id:string){
  const row=await db.selectFrom('media_assets').selectAll().where('id','=',id).executeTakeFirst();if(!row||row.status!=='deletion_pending')return false;
  await storage.delete(row.storage_key);
  return transaction(async(tx)=>{await tx.selectFrom('users').select('id').where('id','=',row.created_by).forShare().executeTakeFirstOrThrow();await guard(tx);const current=await tx.selectFrom('media_assets').selectAll().where('id','=',id).forUpdate().executeTakeFirstOrThrow();if(current.status!=='deletion_pending')return false;if(current.created_by!==row.created_by)throw new MediaError(409,'Media changed.');
   await tx.updateTable('media_assets').set({status:'deleted',deleted_at:await clock(tx),display_name:''}).where('id','=',id).execute();
   await tx.updateTable('media_storage_guard').set({allocated_bytes:sql`allocated_bytes-${current.reserved_bytes}`}).where('id','=',1).execute();await audit(tx,id,'deleted',null);return true;});
 }
 return {
  async list(raw:SensitiveValue){return transaction(async(tx)=>{const{context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'media.read');const rows:Selectable<MediaAssetsTable>[]=[];
   for(const status of ['temporary','attached','retained'] as const){let query=tx.selectFrom('media_assets').selectAll().where('status','=',status);if(status!=='retained')query=query.where('expires_at','>',await clock(tx));if(!workspace(context))query=query.where('created_by','=',context.userId);rows.push(...await query.orderBy('expires_at','desc').orderBy('id').limit(MEDIA_LIMITS.queryBatch).execute());}
   return rows.sort((a,b)=>+b.expires_at-+a.expires_at||a.id.localeCompare(b.id)).slice(0,MEDIA_LIMITS.queryBatch).map((r)=>view(r,context));});},
  async get(raw:SensitiveValue,id:unknown){const parsed=z.uuid().safeParse(id);if(!parsed.success)throw new MediaError(404,'Media not found.');return transaction(async(tx)=>{const{context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'media.read');const row=await tx.selectFrom('media_assets').selectAll().where('id','=',parsed.data).forShare().executeTakeFirst();if(!row)throw new MediaError(404,'Media not found.');own(context,row);if(!['temporary','attached','retained'].includes(row.status)||row.status!=='retained'&&row.expires_at<=await clock(tx))throw new MediaError(404,'Media is no longer available.');return{record:row,view:view(row,context)};});},
  async binary(raw:SensitiveValue,id:unknown){const result=await this.get(raw,id);try{const handle=await storage.open(result.record.storage_key);const stat=await handle.stat();if(stat.size!==result.record.byte_size){await handle.close();throw new Error();}return{handle,view:result.view};}catch{throw new MediaError(404,'Media is no longer available.');}},
  async upload(raw:SensitiveValue,value:unknown,body:ReadableStream<Uint8Array>){
   const parsed=uploadSchema.safeParse(value);if(!parsed.success)throw new MediaError(400,'Use a supported filename and media type.');const info=parsed.data,maximum=info.mime==='video/mp4'?MEDIA_LIMITS.videoBytes:MEDIA_LIMITS.imageBytes;
   await transaction(async(tx)=>{requirePermission((await requireAuthenticatedUser(tx,raw)).context,'media.upload');});
   await cleanupExpiredRateLimits(db);
   const id=randomUUID(),key=randomBytes(32).toString('hex');
   await transaction(async(tx)=>{const{context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'media.upload');const capacity=await guard(tx),now=await clock(tx);
    // Reuse the database-backed rate table with a phase-specific namespace; existing auth policies are untouched.
    const hash=createHash('sha256').update(context.userId).digest();
    await tx.insertInto('auth_rate_limits').values({scope:'media_upload',subject_hash:hash,attempts:0,window_started_at:now,expires_at:new Date(+now+600000),blocked_until:null}).onDuplicateKeyUpdate({scope:'media_upload'}).execute();
    const rate=await tx.selectFrom('auth_rate_limits').selectAll().where('scope','=','media_upload').where('subject_hash','=',hash).forUpdate().executeTakeFirstOrThrow();
    const attempts=rate.expires_at<=now?0:rate.attempts;if(attempts>=12)throw new MediaError(429,'Upload limit reached. Try again later.');
    if(capacity.receiving_count>=2||capacity.allocated_bytes+maximum>MEDIA_LIMITS.quota)throw new MediaError(429,'Temporary storage is busy or full. Try again after cleanup.');
    await tx.updateTable('auth_rate_limits').set({attempts:attempts+1,...(rate.expires_at<=now?{window_started_at:now,expires_at:new Date(+now+600000)}:{})}).where('scope','=','media_upload').where('subject_hash','=',hash).execute();
    await tx.updateTable('media_storage_guard').set({allocated_bytes:capacity.allocated_bytes+maximum,receiving_count:capacity.receiving_count+1}).where('id','=',1).execute();
    await tx.insertInto('media_assets').values({id,storage_key:key,created_by:context.userId,display_name:info.name,kind:info.mime==='video/mp4'?'video':'image',mime:info.mime,byte_size:0,reserved_bytes:maximum,sha256:null,width:null,height:null,duration_ms:null,status:'receiving',created_at:now,expires_at:new Date(+now+MEDIA_LIMITS.receivingMs),deleted_at:null,deletion_reason:null}).execute();
   });
   try{const result=await storage.write(key,body,maximum),handle=await storage.open(key);let metadata;try{metadata=await inspectMedia(handle,info.mime);}finally{await handle.close();}
    return await transaction(async(tx)=>{const{context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'media.upload');await guard(tx);const row=await tx.selectFrom('media_assets').selectAll().where('id','=',id).forUpdate().executeTakeFirstOrThrow();const now=await clock(tx);if(row.status!=='receiving'||row.expires_at<=now||row.created_by!==context.userId)throw new MediaError(409,'Upload expired.');
     await tx.updateTable('media_assets').set({status:'temporary',byte_size:result.bytes,reserved_bytes:result.bytes,sha256:result.sha256,width:metadata.width,height:metadata.height,duration_ms:metadata.duration,expires_at:new Date(+now+MEDIA_LIMITS.orphanMs)}).where('id','=',id).execute();
     await tx.updateTable('media_storage_guard').set({allocated_bytes:sql`allocated_bytes-${maximum-result.bytes}`,receiving_count:sql`receiving_count-1`}).where('id','=',1).execute();await audit(tx,id,'uploaded',context);return view(await tx.selectFrom('media_assets').selectAll().where('id','=',id).executeTakeFirstOrThrow(),context);
    });
   }catch(error){try{if(await claim(id,'upload_failed'))await finishDeletion(id);}catch{/* Durable receiving/pending reservation remains for explicit cleanup. */}if(error instanceof MediaError)throw error;throw new MediaError(503,'Upload could not be completed.');}
  },
  async remove(raw:SensitiveValue,id:unknown){if(!z.uuid().safeParse(id).success)throw new MediaError(404,'Media not found.');if(await claim(id as string,'manual',raw))await finishDeletion(id as string);},
  /** Trusted CLI only. Never exposed by a browser route; callers must verify DB/environment first. */
  async cleanup(){const now=await clock(db),rows:{id:string}[]=[];
   // Composer protection is bounded. Only known Composer-owned holds can release
   // an attached asset; unrelated/future attached or retained states stay protected.
   const releases=await db.selectFrom('content_media_protection as p').innerJoin('media_assets as m','m.id','p.media_id').select(['p.media_id','m.created_by']).where('m.status','=','attached').where('p.protected_until','<=',now).where('p.media_id','in',db.selectFrom('content_revision_media').select('media_id')).orderBy('p.protected_until').orderBy('p.media_id').limit(MEDIA_LIMITS.cleanupBatch).execute();
   let releaseFailures=0;
   for(const release of releases)try{await transaction(async(tx)=>{await tx.selectFrom('users').select('id').where('id','=',release.created_by).forShare().executeTakeFirstOrThrow();await guard(tx);const row=await tx.selectFrom('media_assets').selectAll().where('id','=',release.media_id).forUpdate().executeTakeFirst();const hold=await tx.selectFrom('content_media_protection').select('protected_until').where('media_id','=',release.media_id).forUpdate().executeTakeFirst();if(row?.status==='attached'&&row.created_by===release.created_by&&hold&&hold.protected_until<=await clock(tx)&&!await activePublishHold(tx,row.id,await clock(tx))){await tx.updateTable('media_assets').set({status:'temporary',expires_at:now}).where('id','=',row.id).execute();await audit(tx,row.id,'protection_released',null);}});}catch{releaseFailures++;}

   for(const status of ['deletion_pending','receiving','temporary'] as const){if(rows.length>=MEDIA_LIMITS.cleanupBatch)break;let query=db.selectFrom('media_assets').select('id').where('status','=',status);if(status!=='deletion_pending')query=query.where('expires_at','<=',now);rows.push(...await query.orderBy('expires_at').orderBy('id').limit(MEDIA_LIMITS.cleanupBatch-rows.length).execute());}
   let deleted=0,failed=releaseFailures;
   for(const row of rows){try{if(await claim(row.id,'expired')&&await finishDeletion(row.id))deleted++;}catch{failed++;try{await audit(db,row.id,'cleanup_failed',null);}catch{/* CLI reports the failure even if logging is unavailable. */}}}
   // Every normal file write has a committed reservation first. Reconcile only old untracked keys, bounded per call.
   if(storage instanceof LocalPrivateMediaStorage)for(const file of await storage.abandonedCandidates()){if(+file.mtime>+now-MEDIA_LIMITS.receivingMs)continue;try{await transaction(async(tx)=>{await guard(tx);const record=await tx.selectFrom('media_assets').select('id').where('storage_key','=',file.key).forShare().executeTakeFirst();if(!record)await storage.delete(file.key);});}catch{failed++;}}
   return{selected:rows.length,deleted,failed};
  },
 };
}
