import type { Authority,Binding } from '../provider-security/context';
import type { CredentialGrant } from '../provider-security/transport';
import { z } from 'zod';
import type { ApprovedCopy } from '../../features/publishing/model';
import type { SocialProviderId } from '../../features/connections/model';
import type { SocialPack } from '../../features/ai/model';
import { safeId,PublishingError } from './policy';
export type PublishAsset={id:string;position:number;mime:'image/jpeg'|'image/png'|'image/webp'|'video/mp4';bytes:number;sha256:string;width:number;height:number;durationMs:number|null};
export type ProviderIntent={operationId:string;provider:SocialProviderId;platform:keyof SocialPack;destination:string;content:ApprovedCopy;assets:readonly PublishAsset[];intentHash:string};
const remote=z.object({publicationId:safeId.nullable(),processingId:safeId.nullable()});
export const providerResultSchema=z.discriminatedUnion('status',[
 remote.extend({status:z.literal('PUBLISHED'),publicationId:safeId,publishedAt:z.iso.datetime()}).strict(),
 remote.extend({status:z.literal('ACCEPTED')}).strict().refine(v=>v.publicationId!==null||v.processingId!==null),
 remote.extend({status:z.literal('PROCESSING')}).strict().refine(v=>v.publicationId!==null||v.processingId!==null),
 z.object({status:z.literal('FAILED'),category:z.enum(['REMOTE_REJECTED','REMOTE_PROCESSING','PROVIDER_RATE_LIMIT']),code:z.enum(['REJECTED','PROCESSING_FAILED','RATE_LIMITED'])}).strict(),
 z.object({status:z.literal('UNKNOWN')}).strict(),
]);
export type ProviderResult=z.infer<typeof providerResultSchema>;
/** Trusted server bridge, never supplied by browser/post data. */
export type PublishingConnection={binding:Readonly<Binding>;subject?:string;personURN:string|null;authority:()=>Promise<Authority>;credentials:()=>Promise<CredentialGrant>;now:()=>Promise<Date>};
export type PreparedPublication={publish:(signal:AbortSignal)=>Promise<unknown>;dispose:()=>void};
export class PreDispatchFailure extends Error {
 constructor(readonly category:'VALIDATION'|'AUTHORIZATION'|'CAPABILITY'|'TRANSPORT'='AUTHORIZATION',readonly code:'INVALID'|'ACCESS_LOST'|'UNSUPPORTED'|'UNAVAILABLE'='UNAVAILABLE'){super('Publication was not dispatched.');this.name='PreDispatchFailure';this.stack='PreDispatchFailure: Publication was not dispatched.';}
}
export interface PublishingProvider{
 readonly mode:'official'|'test';readonly provider:SocialProviderId;readonly platform:keyof SocialPack;readonly capabilityRef:string;readonly requiredScopes:readonly string[];
 /** LinkedIn-only prepared dispatch seam; production registry stays empty by default. */
 prepare?(intent:ProviderIntent,connection:PublishingConnection):Promise<PreparedPublication>;
 validate(intent:Omit<ProviderIntent,'operationId'|'intentHash'>):void;
 publish(intent:ProviderIntent,signal:AbortSignal):Promise<unknown>;
 /** Read-only remote observation. It must never upload, finalize, create or resend. */
 status(intent:ProviderIntent,reference:{publicationId:string|null;processingId:string|null},signal:AbortSignal):Promise<unknown>;
}
export function productionPublishingProviders():ReadonlyMap<keyof SocialPack,PublishingProvider>{return new Map();}
export function normalizedResult(value:unknown,now:Date):ProviderResult{const result=providerResultSchema.parse(value);if(result.status==='PUBLISHED'&&new Date(result.publishedAt)>now)throw new PublishingError('INVALID');return result;}
export async function boundedProvider(work:(signal:AbortSignal)=>Promise<unknown>,ms:number){const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work(controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new PublishingError('OUTCOME_UNKNOWN'));},ms);})]);}finally{clearTimeout(timer);controller.abort();}}
