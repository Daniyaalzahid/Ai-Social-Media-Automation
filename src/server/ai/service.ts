import { createHash,randomUUID } from 'node:crypto';
import { sql,type Kysely,type Selectable } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema,AiGenerationsTable } from '../db/schema';
import { requireAuthenticatedUser,requirePermission,AuthorizationError,type AuthorizationContext } from '../authorization/authorization';
import { createBrandService } from '../brand/service';
import { BRAND_ID,PLATFORMS,CLAIMS } from '../../features/brand/model';
import { AI_LIMITS,generationInputSchema,generationViewSchema,socialPackSchema,type GenerationView } from '../../features/ai/model';
import { cleanupExpiredRateLimits } from '../security/rate-limits';
import { SensitiveValue } from '../security/sensitive';
import { prepareGeneration,validateDraft,PROMPT_VERSION } from './policy';
import { AiError,type AiGenerationProvider } from './provider';
type Db=Kysely<DatabaseSchema>;
async function now(db:Db){return(await sql<{now:Date}>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;}
async function guard(db:Db){await db.selectFrom('ai_generation_guard').select('id').where('id','=',1).forUpdate().executeTakeFirstOrThrow();}
async function audit(db:Db,id:string,status:'requested'|'completed'|'failed'|'rejected',actor:AuthorizationContext|null){await db.insertInto('audit_logs').values({id:randomUUID(),actor_user_id:actor?.userId??null,target_user_id:null,session_id:actor?.sessionId??null,action:`ai.generation.${status}`,outcome:status==='failed'||status==='rejected'?'failure':'success',correlation_id:randomUUID(),metadata_safe_json:JSON.stringify({reasonCode:`ai.generation.${status}`,changedFields:[`record:${z.uuid().parse(id)}`]}),ip_hash:null}).execute();}
function json(value:unknown){return typeof value==='string'?JSON.parse(value) as unknown:value;}
function view(row:Selectable<AiGenerationsTable>):GenerationView{
 const result=generationViewSchema.safeParse({id:row.id,createdAt:row.created_at.toISOString(),completedAt:row.completed_at?.toISOString()??null,brandRevision:row.brand_revision,provider:row.provider,model:row.model,platforms:json(row.platforms_json),language:row.language,status:row.status,failure:row.failure,output:json(row.output_json)});
 if(!result.success||result.data.output&&(Object.keys(result.data.output).sort().join()!==[...result.data.platforms].sort().join())||row.status==='COMPLETED'&&!result.data.output||row.status!=='COMPLETED'&&result.data.output)throw new AiError('UNAVAILABLE');return result.data;
}
export function createAiGenerationService(db:Db,options:{providerId:string;model:string;provider:()=>AiGenerationProvider}){
 async function transaction<T>(fn:(tx:Db)=>Promise<T>){try{return await db.transaction().execute(fn);}catch(e){if(e instanceof AiError||e instanceof AuthorizationError)throw e;throw new AiError('UNAVAILABLE');}}
 async function authority(tx:Db,raw:SensitiveValue){const{context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'ai.generate');return context;}
 async function rate(tx:Db,scope:string,subject:string,maximum:number,windowMs:number,time:Date){
  const hash=createHash('sha256').update('bsa/ai/'+subject).digest();
  await tx.insertInto('auth_rate_limits').values({scope,subject_hash:hash,attempts:0,window_started_at:time,expires_at:new Date(+time+windowMs),blocked_until:null}).onDuplicateKeyUpdate({scope}).execute();
  const r=await tx.selectFrom('auth_rate_limits').selectAll().where('scope','=',scope).where('subject_hash','=',hash).forUpdate().executeTakeFirstOrThrow();
  const count=r.expires_at<=time?0:r.attempts;if(count>=maximum)throw new AiError('RATE_LIMITED');
  await tx.updateTable('auth_rate_limits').set({attempts:count+1,...(count===0?{window_started_at:time,expires_at:new Date(+time+windowMs)}:{})}).where('scope','=',scope).where('subject_hash','=',hash).execute();
 }
 return{
  async list(raw:SensitiveValue){return transaction(async(tx)=>{const actor=await authority(tx,raw);const rows=await tx.selectFrom('ai_generations').selectAll().where('created_by','=',actor.userId).orderBy('created_at','desc').orderBy('id').limit(20).execute();return rows.map(view);});},
  async get(raw:SensitiveValue,id:unknown){if(!z.uuid().safeParse(id).success)throw new AiError('INPUT_INVALID');return transaction(async(tx)=>{const actor=await authority(tx,raw);const row=await tx.selectFrom('ai_generations').selectAll().where('id','=',id as string).where('created_by','=',actor.userId).executeTakeFirst();if(!row)throw new AiError('UNAUTHORIZED');return view(row);});},
  async generate(raw:SensitiveValue,value:unknown,clientSignal:AbortSignal=new AbortController().signal){
   await transaction(tx=>authority(tx,raw));
   if(!/^[a-z][a-z0-9_-]{0,39}$/.test(options.providerId))throw new AiError('PROVIDER_UNAVAILABLE');
   const parse=generationInputSchema.safeParse(value);if(!parse.success||Buffer.byteLength(JSON.stringify(parse.data))>AI_LIMITS.inputBytes)throw new AiError('INPUT_INVALID');
   const input={...parse.data,platforms:PLATFORMS.filter(p=>parse.data.platforms.includes(p)),facts:[...parse.data.facts].sort((a,b)=>CLAIMS.indexOf(a.category)-CLAIMS.indexOf(b.category))};
   const brand=await createBrandService(db).context(raw);
   const prepared=prepareGeneration(input,brand);
   const digest=createHash('sha256').update(JSON.stringify({...input,requestId:undefined})).digest();
   try{await cleanupExpiredRateLimits(db);}catch{throw new AiError('UNAVAILABLE');}
   const admission=await transaction(async(tx)=>{
    const actor=await authority(tx,raw);await guard(tx);const time=await now(tx);
    const existing=await tx.selectFrom('ai_generations').selectAll().where('created_by','=',actor.userId).where('request_id','=',input.requestId).forUpdate().executeTakeFirst();
    if(existing){if(!existing.input_digest.equals(digest))throw new AiError('INPUT_INVALID');return{existing:view(existing)};}
    const expired=await tx.selectFrom('ai_generations').select('id').where('status','=','IN_PROGRESS').where('lease_expires_at','<=',time).orderBy('lease_expires_at').orderBy('id').limit(2).forUpdate().execute();
    for(const r of expired){await tx.updateTable('ai_generations').set({status:'FAILED',failure:'PROVIDER_TIMEOUT',completed_at:time}).where('id','=',r.id).execute();await audit(tx,r.id,'failed',null);}
    const active=await tx.selectFrom('ai_generations').select('created_by').where('status','=','IN_PROGRESS').where('lease_expires_at','>',time).limit(2).execute();
    if(active.length>=AI_LIMITS.globalActive||active.some(r=>r.created_by===actor.userId))throw new AiError('BUSY');
    await rate(tx,'ai_global_day','global',AI_LIMITS.globalDaily,86400000,time);
    await rate(tx,'ai_actor_day',actor.userId,AI_LIMITS.actorDaily,86400000,time);
    await rate(tx,'ai_actor_minute',actor.userId,AI_LIMITS.actorMinute,60000,time);
    const id=randomUUID(),model=/^[-a-zA-Z0-9_.]+\/[-a-zA-Z0-9_.:]+$/.test(options.model)&&options.model.length<=160?options.model:'unconfigured';
    const provenance=prepared.claims.map((c,index)=>({id:c.id,category:c.category,source:c.source,sourceIndex:input.facts[index]!.source==='USER_INPUT'?null:(input.facts[index] as {index:number}).index}));
    await tx.insertInto('ai_generations').values({id,created_by:actor.userId,request_id:input.requestId,input_digest:digest,brand_id:BRAND_ID,brand_revision:brand.revision,provider:options.providerId,model,prompt_version:PROMPT_VERSION,platforms_json:JSON.stringify(input.platforms),provenance_json:JSON.stringify(provenance),language:prepared.language,status:'IN_PROGRESS',failure:null,output_json:null,usage_json:null,created_at:time,lease_expires_at:new Date(+time+AI_LIMITS.leaseMs),completed_at:null}).execute();
    await audit(tx,id,'requested',actor);return{id};
   });
   if('existing'in admission)return admission.existing!;
   const timeout=AbortSignal.timeout(AI_LIMITS.timeoutMs),signal=AbortSignal.any([clientSignal,timeout]);let output:ReturnType<typeof socialPackSchema.parse>|null=null,usage:unknown=null,failure:AiError|null=null;
   try{signal.throwIfAborted();const provider=options.provider();if(provider.id!==options.providerId||provider.model!==options.model)throw new AiError('PROVIDER_UNAVAILABLE');const response=await provider.generate(prepared.request,signal);signal.throwIfAborted();output=validateDraft(response.content,prepared);const checked=z.object({prompt:z.number().int().min(0).max(1000000),completion:z.number().int().min(0).max(1000000),total:z.number().int().min(0).max(2000000)}).strict().safeParse(response.usage);usage=checked.success?checked.data:null;}
   catch(e){failure=signal.aborted?new AiError(timeout.aborted?'PROVIDER_TIMEOUT':'CANCELLED'):e instanceof AiError?e:new AiError('PROVIDER_UNAVAILABLE');}
   // Revalidate authority after the external wait. If it changed, persist a safe
   // failed terminal state anonymously; never return validated content to it.
   try{return await transaction(async(tx)=>{const actor=await authority(tx,raw);await guard(tx);const row=await tx.selectFrom('ai_generations').selectAll().where('id','=',admission.id).forUpdate().executeTakeFirstOrThrow();const time=await now(tx);if(row.status!=='IN_PROGRESS'||row.lease_expires_at<=time)throw new AiError('PROVIDER_TIMEOUT');
    const rejected=failure&&['CLAIM_POLICY_REJECTED','RESPONSE_MALFORMED','RESPONSE_SCHEMA_INVALID','RESPONSE_TOO_LARGE'].includes(failure.reason);
    const status=failure?(rejected?'REJECTED':'FAILED'):'COMPLETED';
    await tx.updateTable('ai_generations').set({status,failure:failure?.reason??null,output_json:failure?null:JSON.stringify(output),usage_json:usage?JSON.stringify(usage):null,completed_at:time}).where('id','=',row.id).execute();await audit(tx,row.id,status==='COMPLETED'?'completed':status==='REJECTED'?'rejected':'failed',actor);return view(await tx.selectFrom('ai_generations').selectAll().where('id','=',row.id).executeTakeFirstOrThrow());
   });}catch(error){
    await transaction(async(tx)=>{await guard(tx);const row=await tx.selectFrom('ai_generations').select(['status']).where('id','=',admission.id).forUpdate().executeTakeFirstOrThrow();if(row.status==='IN_PROGRESS'){await tx.updateTable('ai_generations').set({status:'FAILED',failure:'UNAVAILABLE',output_json:null,completed_at:await now(tx)}).where('id','=',admission.id).execute();await audit(tx,admission.id!,'failed',null);}});
    throw error;
   }
  },
 };
}
