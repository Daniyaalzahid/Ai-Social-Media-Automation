import { randomUUID,createHash } from 'node:crypto';
import { sql,type Kysely } from 'kysely';
import type { DatabaseSchema } from '../db/schema.ts';
import { authorizationContext,requireAuthenticatedUser,requirePermission,can,AuthorizationError } from '../authorization/authorization.ts';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive.ts';
import { tokenHash } from '../auth/access.ts';
import { BRAND_ID } from '../../features/brand/model.ts';
import { PROVIDERS,providerSchema,type SocialProviderId,type ConnectionsView,type SafeDestination } from '../../features/connections/model.ts';
import { integrationAction,integrationMutation,newOAuthSecret,oauthHash,callbackURI,callbackQuery,STATE_LIFETIME_MS } from './policy.ts';
import { encryptToken,decryptToken,type TokenKey } from './crypto.ts';
import { validateGrant,providerDeadline,type SocialProvider,type Grant } from './provider.ts';
import { integrationEvent } from './events.ts';
export class IntegrationError extends Error{constructor(readonly reason:'SETUP_REQUIRED'|'CONFLICT'|'INVALID_FLOW'|'RATE_LIMITED'|'UNAVAILABLE'){super('Unable to complete this connection request.');this.name='IntegrationError';}}
const clock=async(db:Kysely<DatabaseSchema>)=>(await sql<{now:Date}>`SELECT CURRENT_TIMESTAMP(3) AS now`.execute(db)).rows[0]!.now;
async function guard(db:Kysely<DatabaseSchema>){if(!await db.selectFrom('social_guard').select('id').where('id','=',1).forUpdate().executeTakeFirst())throw new SecurityOperationError();}
export function createConnectionsService(db:Kysely<DatabaseSchema>,options:{origin:string;key:()=>TokenKey;providers:ReadonlyMap<SocialProviderId,SocialProvider>;environment:'production'|'development'|'test'}){
 const providers=new Map(options.providers);
 for(const [id,p]of providers){if(id!==p.id||p.mode==='test'&&options.environment!=='test')throw new SecurityOperationError();}
 function provider(id:SocialProviderId){const p=providers.get(id);if(!p)throw new IntegrationError('SETUP_REQUIRED');return p;}
 async function transaction<T>(fn:(tx:Kysely<DatabaseSchema>)=>Promise<T>){try{return await db.transaction().execute(fn);}catch(e){if(e instanceof AuthorizationError||e instanceof IntegrationError)throw e;throw new IntegrationError('UNAVAILABLE');}}
 async function authority(tx:Kysely<DatabaseSchema>,raw:SensitiveValue,manage=true){const auth=await requireAuthenticatedUser(tx,raw);requirePermission(auth.context,manage?'integrations.manage':'integrations.read');return auth;}
 async function clean(tx:Kysely<DatabaseSchema>,now:Date){
  const rows=await tx.selectFrom('social_transactions').select('id').where('expires_at','<=',now).orderBy('expires_at').orderBy('id').limit(100).execute();
  for(const r of rows)await tx.deleteFrom('social_transactions').where('id','=',r.id).where('expires_at','<=',now).execute();
 }
 async function rate(tx:Kysely<DatabaseSchema>,scope:string,identity:string,limit:number,now:Date){
  const hash=createHash('sha256').update(`bsa/social-rate/v1/${scope}/${identity}`).digest();
  await tx.insertInto('auth_rate_limits').values({scope,subject_hash:hash,window_started_at:now,attempts:0,blocked_until:null,expires_at:new Date(+now+600000)}).onDuplicateKeyUpdate({scope}).execute();
  const row=await tx.selectFrom('auth_rate_limits').selectAll().where('scope','=',scope).where('subject_hash','=',hash).forUpdate().executeTakeFirstOrThrow(),reset=row.expires_at<=now,count=reset?0:row.attempts;
  if(count>=limit)return false;
  await tx.updateTable('auth_rate_limits').set({attempts:count+1,...(reset?{window_started_at:now,expires_at:new Date(+now+600000)}:{})}).where('scope','=',scope).where('subject_hash','=',hash).execute();return true;
 }
 async function authRow(tx:Kysely<DatabaseSchema>,id:string,p:SocialProviderId,version:number){const a=await tx.selectFrom('social_authorizations').selectAll().where('id','=',id).where('brand_id','=',BRAND_ID).where('provider','=',p).forUpdate().executeTakeFirst();if(!a||a.version!==version)throw new IntegrationError('CONFLICT');return a;}
 async function store(tx:Kysely<DatabaseSchema>,id:string,p:SocialProviderId,version:number,grant:Grant){
  const key=options.key();await tx.deleteFrom('social_credentials').where('authorization_id','=',id).execute();
  for(const [purpose,value]of [['access',grant.access],['refresh',grant.refresh]] as const)if(value)await tx.insertInto('social_credentials').values({authorization_id:id,purpose,version,...encryptToken(value,key,{id,provider:p,purpose,version})}).execute();
 }
 async function discover(tx:Kysely<DatabaseSchema>,authorizationId:string,p:SocialProviderId,data:ReturnType<typeof validateGrant>){
     await tx.updateTable('social_destinations').set({active:0}).where('authorization_id','=',authorizationId).execute();
     for(const d of data.destinations){const existing=await tx.selectFrom('social_destinations').select('id').where('authorization_id','=',authorizationId).where('kind','=',d.type).where('remote_id','=',d.remoteId).forUpdate().executeTakeFirst();if(existing)await tx.updateTable('social_destinations').set({active:1,display_name:d.displayName,handle:d.handle}).where('id','=',existing.id).execute();else await tx.insertInto('social_destinations').values({id:randomUUID(),authorization_id:authorizationId,brand_id:BRAND_ID,provider:p,kind:d.type,remote_id:d.remoteId,display_name:d.displayName,handle:d.handle,active:1}).execute();}
 }
 async function load(tx:Kysely<DatabaseSchema>,id:string,p:SocialProviderId,version:number){
  const rows=await tx.selectFrom('social_credentials').selectAll().where('authorization_id','=',id).forUpdate().execute(),key=options.key();
  function read(purpose:'access'|'refresh'){const r=rows.find(r=>r.purpose===purpose);if(!r)return null;if(r.version!==version)throw new SecurityOperationError();return decryptToken(r,key,{id,provider:p,purpose,version});}
  const access=read('access');if(!access)throw new SecurityOperationError();return{access,refresh:read('refresh')};
 }
 return{
  async read(raw:SensitiveValue):Promise<ConnectionsView>{return transaction(async tx=>{
   const{context,state}=await authority(tx,raw,false),manage=can(context,'integrations.manage');await guard(tx);
   const rows=await tx.selectFrom('social_authorizations').selectAll().where('brand_id','=',BRAND_ID).orderBy('provider').orderBy('id').limit(21).forShare().execute();if(rows.length>20)throw new SecurityOperationError();
   const view:ConnectionsView={destinations:[],canManage:manage,management:[],setup:manage?PROVIDERS.filter(p=>!providers.has(p)):[]};
   for(const row of rows){const status=row.status==='DISCONNECTED'?'DISCONNECTED':row.expires_at<=state.now||row.refresh_lease!==null&&row.refresh_lease<=state.now?'RECONNECT_REQUIRED':row.status;
    const destinations=await tx.selectFrom('social_destinations').select(['id','provider','kind','display_name','handle']).where('authorization_id','=',row.id).where('active','=',1).orderBy('kind').orderBy('remote_id').limit(21).execute();if(destinations.length>20)throw new SecurityOperationError();
    const safe:SafeDestination[]=destinations.map(d=>({id:d.id,provider:d.provider,type:d.kind,displayName:d.display_name,handle:d.handle,status,publishing:'UNVERIFIED'}));
    if(status!=='DISCONNECTED')view.destinations.push(...safe.filter(d=>d.id===row.selected_id));
    if(manage)view.management.push({id:row.id,provider:row.provider,version:row.version,status,destinations:status==='DISCONNECTED'?[]:safe,selectedId:row.selected_id});
   }return view;
  });},
  async authorizeStepUp(raw:SensitiveValue,value:unknown){const input=integrationMutation(value),context=await authorizationContext(db,raw);requirePermission(context,'integrations.manage');return integrationAction(input);},
  async mutate(raw:SensitiveValue,proof:SensitiveValue,value:unknown){
   const input=integrationMutation(value);let revoke:{p:SocialProvider;access:SensitiveValue;refresh:SensitiveValue|null}|null=null;
   const result=await transaction(async tx=>{
    const{context,state}=await authority(tx,raw);await guard(tx);await clean(tx,state.now);
    const action=integrationAction(input),bound=await tx.selectFrom('auth_challenges').selectAll().where('token_hash','=',tokenHash(proof)).forUpdate().executeTakeFirst();
    if(!bound||bound.purpose!=='reauthentication'||bound.action_code!==action||bound.user_id!==context.userId||bound.bound_session_id!==state.row.id||bound.auth_version!==state.identity.user.auth_version||bound.expires_at<=state.now||bound.consumed_at||bound.revoked_at||+state.now-+bound.created_at>300000)throw new AuthorizationError();
    await tx.updateTable('auth_challenges').set({consumed_at:state.now}).where('id','=',bound.id).execute();
    if(input.action==='connect'||input.action==='reconnect'){
     const p=provider(input.provider);if(input.action==='reconnect')await authRow(tx,input.authorizationId,input.provider,input.version);
     const recent=await tx.selectFrom('social_transactions').select(['actor_id','created_at']).where('created_at','>',new Date(+state.now-600000)).limit(101).forUpdate().execute();if(recent.length>=100||recent.filter(r=>r.actor_id===context.userId).length>=6)throw new IntegrationError('RATE_LIMITED');
     const count=await tx.selectFrom('social_authorizations').select('id').where('brand_id','=',BRAND_ID).forUpdate().execute();if(count.length>=20&&input.action==='connect')throw new IntegrationError('RATE_LIMITED');
     const id=randomUUID(),target=input.action==='reconnect'?input.authorizationId:randomUUID(),secret=newOAuthSecret(),verifier=p.pkce?newOAuthSecret():null,uri=callbackURI(options.origin,input.provider),encrypted=verifier?encryptToken(verifier,options.key(),{id,provider:input.provider,purpose:'pkce',version:1}):null;
     const url=p.authorizationURL({state:secret,challenge:verifier?createHash('sha256').update(verifier.reveal()).digest('base64url'):null,redirectURI:uri});
     const parsed=new URL(url);if(parsed.protocol!=='https:'&&!(p.mode==='test'&&parsed.origin===new URL(options.origin).origin))throw new SecurityOperationError();
     await tx.insertInto('social_transactions').values({id,brand_id:BRAND_ID,provider:input.provider,actor_id:context.userId,session_id:state.row.id,auth_version:state.identity.user.auth_version,state_hash:oauthHash(secret),status:'PENDING',target_id:target,target_version:input.action==='reconnect'?input.version:null,redirect_uri:uri,requested_json:JSON.stringify(p.requestedScopes),pkce_ciphertext:encrypted?.ciphertext??null,pkce_iv:encrypted?.iv??null,pkce_tag:encrypted?.tag??null,key_id:encrypted?.key_id??null,created_at:state.now,expires_at:new Date(+state.now+STATE_LIFETIME_MS),finished_at:null}).execute();
     await integrationEvent(tx,context.userId,'started',id);return{redirect:url};
    }
    const row=await authRow(tx,input.authorizationId,input.provider,input.version);
    if(input.action==='select'){
     if(!['CONNECTED','LIMITED'].includes(row.status)||row.expires_at<=state.now)throw new IntegrationError('INVALID_FLOW');
     const d=await tx.selectFrom('social_destinations').select('id').where('id','=',input.destinationId).where('authorization_id','=',row.id).where('brand_id','=',BRAND_ID).where('provider','=',input.provider).where('active','=',1).forUpdate().executeTakeFirst();if(!d)throw new AuthorizationError();
     // Selection changes the optimistic version; re-encrypt with the new AAD version.
     const credentials=await load(tx,row.id,row.provider,row.version);await store(tx,row.id,row.provider,row.version+1,{...credentials,metadata:{subject:row.subject,scopes:[],expiresIn:1,refreshExpiresIn:null,destinations:[]}});
     await tx.updateTable('social_authorizations').set({selected_id:d.id,version:row.version+1,refresh_lease:null}).where('id','=',row.id).execute();await integrationEvent(tx,context.userId,'destination_changed',row.id);return{redirect:null};
    }
    if(row.status==='DISCONNECTED')throw new IntegrationError('CONFLICT');
    const p=providers.get(row.provider);if(p?.revoke)revoke={p,...await load(tx,row.id,row.provider,row.version)};
    await tx.deleteFrom('social_credentials').where('authorization_id','=',row.id).execute();await tx.updateTable('social_authorizations').set({status:'DISCONNECTED',selected_id:null,version:row.version+1,refresh_lease:null}).where('id','=',row.id).execute();
    await tx.updateTable('social_destinations').set({active:0}).where('authorization_id','=',row.id).execute();
    await tx.updateTable('social_transactions').set({status:'FAILED',finished_at:state.now,pkce_ciphertext:null,pkce_iv:null,pkce_tag:null,key_id:null}).where('target_id','=',row.id).where('status','in',['PENDING','EXCHANGING']).execute();
    await integrationEvent(tx,context.userId,'disconnected',row.id);return{redirect:null};
   });
   const revocation=revoke as {p:SocialProvider;access:SensitiveValue;refresh:SensitiveValue|null}|null;
   if(revocation){let confirmed=false;try{await providerDeadline(signal=>revocation.p.revoke!({...revocation,signal}));confirmed=true;}catch{/* Local revocation remains authoritative. */}await transaction(tx=>integrationEvent(tx,null,confirmed?'revocation_confirmed':'revocation_unconfirmed'));}
   return result;
  },
  async callback(raw:SensitiveValue,id:SocialProviderId,search:string){
   providerSchema.parse(id);const p=provider(id);
   const admitted=await transaction(async tx=>{const{context,state}=await authority(tx,raw);await guard(tx);if(!await rate(tx,'social_cb_global','global',100,state.now))return false;return rate(tx,'social_cb_actor',context.userId,20,state.now);});if(!admitted)throw new IntegrationError('RATE_LIMITED');
   const query=callbackQuery(search);
   const claimed=await transaction(async tx=>{
    const{context,state}=await authority(tx,raw);await guard(tx);
    const t=await tx.selectFrom('social_transactions').selectAll().where('state_hash','=',oauthHash(query.state)).where('provider','=',id).where('brand_id','=',BRAND_ID).forUpdate().executeTakeFirst();
    if(!t||t.status!=='PENDING'||t.expires_at<=state.now||t.actor_id!==context.userId||t.session_id!==state.row.id||t.auth_version!==state.identity.user.auth_version||t.redirect_uri!==callbackURI(options.origin,id))throw new IntegrationError('INVALID_FLOW');
    if(query.denied){await tx.updateTable('social_transactions').set({status:'FAILED',finished_at:state.now,pkce_ciphertext:null,pkce_iv:null,pkce_tag:null,key_id:null}).where('id','=',t.id).execute();await integrationEvent(tx,context.userId,'failed');return null;}
    const verifier=t.pkce_ciphertext&&t.pkce_iv&&t.pkce_tag&&t.key_id?decryptToken({ciphertext:t.pkce_ciphertext,iv:t.pkce_iv,tag:t.pkce_tag,key_id:t.key_id},options.key(),{id:t.id,provider:id,purpose:'pkce',version:1}):null;
    if(p.pkce!==!!verifier)throw new SecurityOperationError();
    await tx.updateTable('social_transactions').set({status:'EXCHANGING',pkce_ciphertext:null,pkce_iv:null,pkce_tag:null,key_id:null}).where('id','=',t.id).execute();return{t,verifier};
   });
   if(!claimed)return false;
   try{
    const grant=await providerDeadline(signal=>p.exchange({code:query.code!,verifier:claimed.verifier,redirectURI:claimed.t.redirect_uri,signal})),data=validateGrant(p,grant);
    await transaction(async tx=>{
     const{context,state}=await authority(tx,raw);await guard(tx);
     const t=await tx.selectFrom('social_transactions').selectAll().where('id','=',claimed.t.id).forUpdate().executeTakeFirst();
     if(!t||t.status!=='EXCHANGING'||t.expires_at<=state.now||t.actor_id!==context.userId||t.session_id!==state.row.id||t.auth_version!==state.identity.user.auth_version)throw new IntegrationError('INVALID_FLOW');
     const version=t.target_version===null?1:t.target_version+1;
     if(t.target_version!==null){const old=await authRow(tx,t.target_id,id,t.target_version);if(old.subject!==data.subject)throw new IntegrationError('INVALID_FLOW');}
     else{const count=await tx.selectFrom('social_authorizations').select('id').where('brand_id','=',BRAND_ID).forUpdate().execute();if(count.length>=20)throw new IntegrationError('RATE_LIMITED');}
     const status=data.scopes.length===p.requestedScopes.length?'CONNECTED':'LIMITED',values={status,version,scopes_json:JSON.stringify(data.scopes),expires_at:new Date(+state.now+data.expiresIn*1000),refresh_expires_at:data.refreshExpiresIn===null?null:new Date(+state.now+data.refreshExpiresIn*1000),refresh_lease:null,selected_id:null} as const;
     if(t.target_version===null)await tx.insertInto('social_authorizations').values({id:t.target_id,brand_id:BRAND_ID,provider:id,connected_by:context.userId,subject:data.subject,created_at:state.now,...values}).execute();
     else await tx.updateTable('social_authorizations').set(values).where('id','=',t.target_id).execute();
     await store(tx,t.target_id,id,version,grant);
     await discover(tx,t.target_id,id,data);
     await tx.updateTable('social_transactions').set({status:'COMPLETED',finished_at:state.now}).where('id','=',t.id).execute();await integrationEvent(tx,context.userId,t.target_version===null?'completed':'reconnected',t.target_id);
    });return true;
   }catch{
    await transaction(async tx=>{await guard(tx);await tx.updateTable('social_transactions').set({status:'FAILED',finished_at:await clock(tx)}).where('id','=',claimed.t.id).where('status','=','EXCHANGING').execute();await integrationEvent(tx,null,'failed');});return false;
   }
  },
  async cleanup(){return transaction(async tx=>{await guard(tx);await clean(tx,await clock(tx));});},
  /** Internal service boundary only. Never exposed as a browser action. */
  async refresh(id:string){
   const lease=await transaction(async tx=>{await guard(tx);const a=await tx.selectFrom('social_authorizations').selectAll().where('id','=',id).where('brand_id','=',BRAND_ID).forUpdate().executeTakeFirst(),now=await clock(tx);if(!a||!['CONNECTED','LIMITED'].includes(a.status)||a.refresh_lease!==null)throw new IntegrationError('CONFLICT');const p=provider(a.provider);if(!p.refresh)throw new IntegrationError('SETUP_REQUIRED');if(!await rate(tx,'social_refresh',id,6,now))throw new IntegrationError('RATE_LIMITED');const credentials=await load(tx,id,a.provider,a.version);if(!credentials.refresh||a.refresh_expires_at&&a.refresh_expires_at<=now)throw new IntegrationError('INVALID_FLOW');const until=new Date(+now+30000);await tx.updateTable('social_authorizations').set({refresh_lease:until}).where('id','=',id).execute();await integrationEvent(tx,null,'refresh_started',id);return{a,p,refresh:credentials.refresh,until};});
   try{
    const grant=await providerDeadline(signal=>lease.p.refresh!({refresh:lease.refresh,signal})),data=validateGrant(lease.p,grant);
    await transaction(async tx=>{await guard(tx);const a=await authRow(tx,id,lease.a.provider,lease.a.version),now=await clock(tx);if(a.status==='DISCONNECTED'||!a.refresh_lease||a.refresh_lease<=now||+a.refresh_lease!==+lease.until||data.subject!==a.subject)throw new IntegrationError('CONFLICT');await store(tx,id,a.provider,a.version+1,{...grant,refresh:grant.refresh??lease.refresh});await discover(tx,id,a.provider,data);const selected=a.selected_id?await tx.selectFrom('social_destinations').select('id').where('id','=',a.selected_id).where('authorization_id','=',id).where('active','=',1).executeTakeFirst():null;await tx.updateTable('social_authorizations').set({selected_id:selected?.id??null,version:a.version+1,scopes_json:JSON.stringify(data.scopes),status:data.scopes.length===lease.p.requestedScopes.length?'CONNECTED':'LIMITED',expires_at:new Date(+now+data.expiresIn*1000),refresh_expires_at:data.refreshExpiresIn===null?a.refresh_expires_at:new Date(+now+data.refreshExpiresIn*1000),refresh_lease:null}).where('id','=',id).execute();await integrationEvent(tx,null,'refreshed',id);});return true;
   }catch{
    await transaction(async tx=>{await guard(tx);await tx.updateTable('social_authorizations').set({status:'RECONNECT_REQUIRED',refresh_lease:null}).where('id','=',id).where('version','=',lease.a.version).where('refresh_lease','=',lease.until).where('status','!=','DISCONNECTED').execute();await integrationEvent(tx,null,'refresh_failed',id);});return false;
   }
  },
 };
}
