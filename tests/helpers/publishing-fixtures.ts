import { randomUUID,randomBytes } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { BRAND_ID } from '../../src/features/brand/model';
import type { PublishCommand } from '../../src/features/publishing/model';
import type { PublishingProvider,ProviderIntent } from '../../src/server/publishing/provider';
import { publishAction,PublishingError } from '../../src/server/publishing/policy';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { tokenHash } from '../../src/server/auth/access';
export class FakePublishingProvider implements PublishingProvider{
 readonly mode='test' as const;readonly provider='META' as const;readonly platform='FACEBOOK' as const;readonly capabilityRef='synthetic-publish/v1';readonly requiredScopes=['synthetic.publish'];calls=0;statusCalls=0;seen:ProviderIntent[]=[];
 constructor(readonly scenario:'success'|'validation'|'accepted'|'processing'|'failure'|'unknown'|'revoked'|'scope'|'media'='success',private readonly gate?:()=>Promise<void>){}
 validate(intent:Parameters<PublishingProvider['validate']>[0]){if(['validation','revoked','scope','media'].includes(this.scenario)||intent.assets.length>4)throw new PublishingError('CAPABILITY_UNAVAILABLE');}
 async publish(intent:ProviderIntent,signal:AbortSignal){signal.throwIfAborted();this.calls++;this.seen.push(structuredClone(intent));await this.gate?.();if(this.scenario==='unknown')throw new Error('Synthetic provider body must never escape');if(this.scenario==='failure')return{status:'FAILED',category:'REMOTE_REJECTED',code:'REJECTED'};if(this.scenario==='accepted'||this.scenario==='processing')return{status:this.scenario==='accepted'?'ACCEPTED':'PROCESSING',publicationId:null,processingId:'synthetic-processing'};return{status:'PUBLISHED',publicationId:'synthetic-publication',processingId:null,publishedAt:new Date().toISOString()};}
 async status(){this.statusCalls++;return{status:'PUBLISHED',publicationId:'synthetic-publication',processingId:'synthetic-processing',publishedAt:new Date().toISOString()};}
}
export async function publishingDestination(db:Kysely<DatabaseSchema>,user:string){const now=new Date(),authorization=randomUUID(),destination=randomUUID();await db.insertInto('social_authorizations').values({id:authorization,brand_id:BRAND_ID,provider:'META',connected_by:user,subject:randomUUID(),status:'CONNECTED',version:1,scopes_json:'["synthetic.publish"]',selected_id:null,created_at:now,expires_at:new Date(+now+86400000),refresh_expires_at:null,refresh_lease:null}).execute();await db.insertInto('social_destinations').values({id:destination,authorization_id:authorization,brand_id:BRAND_ID,provider:'META',remote_id:'synthetic-'+randomUUID(),kind:'PAGE',display_name:'Synthetic destination',handle:null,active:1}).execute();await db.insertInto('social_credentials').values({authorization_id:authorization,purpose:'access',version:1,ciphertext:randomBytes(24),iv:randomBytes(12),tag:randomBytes(16),key_id:'primary-v1'}).execute();return{authorization,destination};}
/** Synthetic fixture seam; production always calls the existing password/MFA access service. */
export async function publishProof(db:Kysely<DatabaseSchema>,user:string,command:PublishCommand){const now=new Date(),raw=new SensitiveValue(randomBytes(32).toString('base64url')),session=await db.selectFrom('sessions').select('id').where('user_id','=',user).executeTakeFirstOrThrow();await db.insertInto('auth_challenges').values({id:randomUUID(),user_id:user,purpose:'reauthentication',action_code:publishAction(command),bound_session_id:session.id,auth_version:1,token_hash:tokenHash(raw),created_at:now,expires_at:new Date(+now+300000),consumed_at:null,revoked_at:null}).execute();return raw;}
