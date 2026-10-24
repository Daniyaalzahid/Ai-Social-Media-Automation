import { createHash } from 'node:crypto';
import { z } from 'zod';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive';
import type { EnvironmentSource } from '../config/schema';
import { callbackURI } from '../social/policy';

export const LINKEDIN_CANDIDATE=Object.freeze({version:'202610',status:'REVIEWED_CANDIDATE',reviewedAt:Date.parse('2026-10-24T00:00:00Z'),reviewBy:Date.parse('2026-11-23T00:00:00Z'),supportEnd:Date.parse('2027-10-15T00:00:00Z'),productionVerified:false} as const);
export const LINKEDIN_DISABLED=Object.freeze({enabled:false,entitlementConfirmed:false,operationContractReviewed:false,identityContractReviewed:false,destinationContractReviewed:false});
const reviewSchema=z.object({enabled:z.boolean(),entitlementConfirmed:z.boolean(),operationContractReviewed:z.boolean(),identityContractReviewed:z.boolean(),destinationContractReviewed:z.boolean()}).strict();
export type LinkedInReview=z.infer<typeof reviewSchema>;
export type LinkedInSecrets={clientId:string;clientSecret:SensitiveValue};
export type LinkedInProfile=Readonly<{version:'202610';capability:'ORGANIZATION_TEXT_ONLY';redirectURI:string;assertReady:()=>void;secrets:()=>LinkedInSecrets;subject:(sub:string)=>string;acceptSubject:(subject:unknown)=>boolean}>;
const profiles=new WeakSet<object>();
export function reviewedLinkedInProfile(value:LinkedInProfile){if(!profiles.has(value))throw new SecurityOperationError();value.assertReady();return value;}
export function linkedinSecrets(source:EnvironmentSource):LinkedInSecrets{
 const id=source.LINKEDIN_CLIENT_ID,secret=source.LINKEDIN_CLIENT_SECRET;
 if(!id||!/^[A-Za-z0-9_-]{1,200}$/.test(id)||!secret||Buffer.byteLength(secret)>8192||/[\p{Cc}\p{Cs}]/u.test(secret))throw new SecurityOperationError();
 return{clientId:id,clientSecret:new SensitiveValue(secret)};
}
/** Server-only review input; never populated from browser, DB free text or env flags. */
export function createLinkedInProfile(options:{origin:string;secrets:()=>LinkedInSecrets;review?:LinkedInReview;now?:()=>number}):LinkedInProfile{
 const parsed=reviewSchema.safeParse(options.review??LINKEDIN_DISABLED);if(!parsed.success)throw new SecurityOperationError();const review=Object.freeze(parsed.data),now=options.now??Date.now;
 const uri=callbackURI(options.origin,'LINKEDIN');if(new URL(uri).protocol!=='https:')throw new SecurityOperationError();
 const ready=()=>{const t=now();if(!Number.isFinite(t)||t<LINKEDIN_CANDIDATE.reviewedAt||t>=LINKEDIN_CANDIDATE.reviewBy||t>=LINKEDIN_CANDIDATE.supportEnd-7*86400000||Object.values(review).some(v=>v!==true))throw new SecurityOperationError();};
 let clientId:string|undefined;
 const secrets=()=>{ready();const value=options.secrets();if(!value||!/^[A-Za-z0-9_-]{1,200}$/.test(value.clientId)||!(value.clientSecret instanceof SensitiveValue)||!value.clientSecret.reveal()||Buffer.byteLength(value.clientSecret.reveal())>8192||/[\p{Cc}\p{Cs}]/u.test(value.clientSecret.reveal()))throw new SecurityOperationError();if(clientId!==undefined&&value.clientId!==clientId)throw new SecurityOperationError();clientId=value.clientId;return value;};
 const prefix=()=> 'oidc:'+createHash('sha256').update(secrets().clientId).digest('base64url')+':';
 const profile:LinkedInProfile=Object.freeze({version:LINKEDIN_CANDIDATE.version,capability:'ORGANIZATION_TEXT_ONLY',redirectURI:uri,assertReady:ready,secrets,subject(sub){if(!/^[A-Za-z0-9_-]{1,151}$/.test(sub))throw new SecurityOperationError();return prefix()+sub;},acceptSubject(subject){return typeof subject==='string'&&subject.startsWith(prefix())&&/^[A-Za-z0-9_-]{1,151}$/.test(subject.slice(prefix().length));}});
 profiles.add(profile);return profile;
}
