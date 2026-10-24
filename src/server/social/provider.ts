import { z } from 'zod';
import type { SocialProviderId } from '../../features/connections/model.ts';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive.ts';
export const destinationSchema=z.object({remoteId:z.string().min(1).max(200).regex(/^[A-Za-z0-9:_-]+$/),type:z.enum(['PAGE','INSTAGRAM_PROFESSIONAL','TIKTOK_ACCOUNT','YOUTUBE_CHANNEL','LINKEDIN_ORGANIZATION']),displayName:z.string().min(1).max(160).regex(/^[^\p{Cc}\p{Cs}]+$/u),handle:z.string().max(100).regex(/^[^\p{Cc}\p{Cs}]*$/u).nullable()}).strict();
export const grantSchema=z.object({subject:z.string().min(1).max(200).regex(/^[A-Za-z0-9:_-]+$/),scopes:z.array(z.string().regex(/^[a-zA-Z0-9._:/-]{1,150}$/)).max(30),expiresIn:z.number().int().min(1).max(31536000),refreshExpiresIn:z.number().int().min(1).max(63072000).nullable(),destinations:z.array(destinationSchema).min(1).max(20)}).strict();
export type Grant={metadata:z.infer<typeof grantSchema>;access:SensitiveValue;refresh:SensitiveValue|null};
export type OAuthAttempt=Readonly<{id:string;authorizationId:string;provider:SocialProviderId;stateHash:string;expiresAt:number;check:()=>Promise<void>}>;
export interface SocialProvider{
 readonly id:SocialProviderId;readonly mode:'official'|'test';readonly pkce:boolean;readonly requestedScopes:readonly string[];
 authorizationURL(input:{state:SensitiveValue;challenge:string|null;redirectURI:string}):string;
 exchange(input:{code:SensitiveValue;verifier:SensitiveValue|null;redirectURI:string;signal:AbortSignal;attempt?:OAuthAttempt}):Promise<Grant>;
 refresh?(input:{refresh:SensitiveValue;signal:AbortSignal}):Promise<Grant>;
 revoke?(input:{access:SensitiveValue;refresh:SensitiveValue|null;signal:AbortSignal}):Promise<void>;
}
export function validateGrant(provider:SocialProvider,value:Grant){
 const data=grantSchema.parse(value.metadata);if(!(value.access instanceof SensitiveValue)||value.refresh!==null&&!(value.refresh instanceof SensitiveValue)||!data.scopes.length||new Set(data.scopes).size!==data.scopes.length||data.scopes.some(s=>!provider.requestedScopes.includes(s)))throw new SecurityOperationError();
 const types={META:['PAGE','INSTAGRAM_PROFESSIONAL'],TIKTOK:['TIKTOK_ACCOUNT'],YOUTUBE:['YOUTUBE_CHANNEL'],LINKEDIN:['LINKEDIN_ORGANIZATION']}[provider.id];if(data.destinations.some(d=>!types.includes(d.type))||new Set(data.destinations.map(d=>`${d.type}/${d.remoteId}`)).size!==data.destinations.length)throw new SecurityOperationError();
 return data;
}
/** No guessed protocol adapters. Only a verified official adapter may be registered by production runtime. */
export function productionProviders():ReadonlyMap<SocialProviderId,SocialProvider>{return new Map();}
export async function providerDeadline<T>(work:(signal:AbortSignal)=>Promise<T>,ms=15000):Promise<T>{const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work(controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new SecurityOperationError());},ms);})]);}finally{clearTimeout(timer);controller.abort();}}
