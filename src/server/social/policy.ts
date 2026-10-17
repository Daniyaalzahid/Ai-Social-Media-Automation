import { createHash,randomBytes } from 'node:crypto';
import { mutationSchema,type IntegrationMutation,type SocialProviderId } from '../../features/connections/model.ts';
import { BRAND_ID } from '../../features/brand/model.ts';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive.ts';
export const STATE_LIFETIME_MS=600000;
export const PROVIDER_DEADLINE_MS=15000;
export function integrationAction(value:unknown):`INTEGRATION_${string}:${string}`{const input=mutationSchema.parse(value);return `INTEGRATION_${input.action.toUpperCase()}:${createHash('sha256').update(JSON.stringify([BRAND_ID,input])).digest('base64url')}`;}
export function integrationMutation(value:unknown):IntegrationMutation{return mutationSchema.parse(value);}
export function newOAuthSecret(){return new SensitiveValue(randomBytes(32).toString('base64url'));}
export function oauthHash(value:SensitiveValue){if(!/^[A-Za-z0-9_-]{43}$/.test(value.reveal()))throw new SecurityOperationError();return createHash('sha256').update('bsa/oauth-state/v1/').update(value.reveal()).digest();}
export function callbackURI(origin:string,provider:SocialProviderId){const base=new URL(origin);if(base.username||base.password||base.pathname!=='/'||base.search||base.hash||!['https:','http:'].includes(base.protocol))throw new SecurityOperationError();if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw new SecurityOperationError();return `${base.origin}/api/oauth/${provider.toLowerCase()}/callback`;}
export function callbackQuery(search:string){
 if(Buffer.byteLength(search)>4096||/%(?![a-f0-9]{2})/i.test(search))throw new SecurityOperationError();
 try{decodeURIComponent(search.replaceAll('+',' '));}catch{throw new SecurityOperationError();}
 const params=new URLSearchParams(search),keys=new Set<string>();for(const [key,value]of params){if(keys.has(key)||!['state','code','error','error_description','error_uri','scope'].includes(key)||value.length>2048||/[\p{Cc}\p{Cs}]/u.test(value))throw new SecurityOperationError();keys.add(key);}
 const state=params.get('state');if(!state||!/^[A-Za-z0-9_-]{43}$/.test(state))throw new SecurityOperationError();
 const code=params.get('code'),error=params.get('error');if(!!code===!!error)throw new SecurityOperationError();
 return{state:new SensitiveValue(state),code:code?new SensitiveValue(code):null,denied:!!error};
}
