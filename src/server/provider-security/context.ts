import { z } from 'zod';
import type { PublishErrorCode } from '../publishing/schema';
import { LIMITS,fault } from './policy';
const uuid=z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const bindingSchema=z.object({workspaceId:uuid,operationId:uuid,snapshotId:uuid,authorizationId:uuid,authorizationVersion:z.number().int().min(1).max(4294967295),destinationId:uuid,destination:z.string().regex(/^[A-Za-z0-9._:/-]{1,200}$/),provider:z.enum(['META','TIKTOK','YOUTUBE','LINKEDIN']),capabilityRef:z.string().regex(/^[A-Za-z0-9._:/-]{1,64}$/),intentHash:z.string().regex(/^[a-f0-9]{64}$/),media:z.boolean()}).strict();
export type Binding=z.infer<typeof bindingSchema>;
export type Authority={binding:Binding;status:string;expiresAt:number;refreshLease:boolean;scopes:readonly string[]};
export function binding(value:unknown):Readonly<Binding>{const b=bindingSchema.safeParse(value);if(!b.success)fault('INVALID');return Object.freeze(b.data);}
export function sameBinding(a:Binding,b:Binding){return Object.keys(bindingSchema.shape).every(k=>a[k as keyof Binding]===b[k as keyof Binding]);}
export function authority(expected:Binding,current:Authority,scopes:readonly string[]=[],now=Date.now()){
 if(!sameBinding(expected,binding(current.binding))||current.status!=='CONNECTED'||current.refreshLease||!Number.isFinite(current.expiresAt)||current.expiresAt<=now||scopes.some(s=>!current.scopes.includes(s)))fault('AUTHORIZATION_STALE');
}
export type Reference={kind:'SAFE_PROVIDER_ID';role:'CONTENT'|'PROCESSING';binding:Readonly<Binding>;id:string};
export type AuthorizationVersionReference={kind:'AUTHORIZATION_VERSION_REFERENCE';authorizationId:string;version:number};
/** Secret/session classes cannot be passed to ID persistence, logs or reconciliation. */
export type SecretReferenceKind='SENSITIVE_PROVIDER_CAPABILITY'|'EPHEMERAL_UPLOAD_DESTINATION'|'RESUMABLE_SESSION_REFERENCE';
export function providerReference(b:Binding,role:Reference['role'],id:unknown):Readonly<Reference>{
 if(typeof id!=='string'||id.length>LIMITS.id||/^[a-z][a-z0-9+.-]*:\/\//i.test(id)||id.startsWith('//')||! /^[A-Za-z0-9._:/-]+$/.test(id))fault('INVALID');
 return Object.freeze({kind:'SAFE_PROVIDER_ID',role,binding:binding(b),id});
}
export function recoverReference(b:Binding,events:readonly {binding:Binding;reference:Reference|null}[],role:Reference['role']){
 if(events.length>100)fault('REFERENCE_UNAVAILABLE');let result:Readonly<Reference>|null=null;
 for(const event of events){if(!sameBinding(binding(event.binding),b))fault('REFERENCE_UNAVAILABLE');if(event.reference){const ref=event.reference;if(ref.kind!=='SAFE_PROVIDER_ID'||!sameBinding(binding(ref.binding),b))fault('REFERENCE_UNAVAILABLE');if(ref.role!==role)continue;const next=providerReference(b,role,ref.id);if(result&&result.id!==next.id)fault('REFERENCE_UNAVAILABLE');result=next;}}
 if(!result)fault('REFERENCE_UNAVAILABLE');return result;
}
export type ReconciliationObservation={state:'ACCEPTED'|'PROCESSING'|'PUBLISHED'|'FAILED'|'UNKNOWN';reference:Reference|null;observedAt:Date;publishedAt:Date|null;safeCode:PublishErrorCode|null};
/** Observation only: no init/upload/finalize/retry/refresh method. */
export interface ReadOnlyReconciliation {observe(input:{binding:Binding;reference:Reference;signal:AbortSignal}):Promise<ReconciliationObservation>}
const LABELS=['API','CAPABILITY','DNS','CONNECT','TLS','HEADERS','BODY','MEDIA','COMPLETE','DENIED'] as const;
export function safeDiagnostic(input:unknown){
 const safe:{stage:string;code:string;operationId?:string;status?:number;durationMs?:number;sentBytes?:number;receivedBytes?:number}={stage:'DENIED',code:'INVALID'};
 try{if(!input||typeof input!=='object')return safe;
 const own=(key:string)=>Object.getOwnPropertyDescriptor(input,key)?.value;
 const stage=own('stage');if(LABELS.some(v=>v===stage))safe.stage=stage;
 const code=own('code');if(typeof code==='string'&&['INVALID','UNCONFIGURED','AUTHORIZATION_STALE','ADDRESS_DENIED','DNS_FAILED','PEER_DENIED','TLS_FAILED','REDIRECT_DENIED','ENCODING_DENIED','BODY_LIMIT','BODY_INVALID','MEDIA_INVALID','BUSY','EXPIRED','ABORTED','TIMEOUT','NETWORK_AMBIGUOUS','REFERENCE_UNAVAILABLE'].includes(code))safe.code=code;
 const id=own('operationId');if(uuid.safeParse(id).success)safe.operationId=id;
 const status=own('status');if(Number.isInteger(status)&&status>=100&&status<=599)safe.status=status;
 for(const key of ['durationMs','sentBytes','receivedBytes'] as const){const v=own(key);if(typeof v==='number'&&Number.isFinite(v))safe[key]=Math.max(0,Math.min(Math.floor(v),key==='durationMs'?LIMITS.duration:LIMITS.count));}
 return safe;}catch{return{stage:'DENIED',code:'INVALID'};}
}

export function normalizeObservation(expected:Binding,value:unknown,now=new Date()):ReconciliationObservation{
 const safeId=z.string().max(LIMITS.id).regex(/^[A-Za-z0-9._:/-]+$/).refine(v=>! /^[a-z][a-z0-9+.-]*:\/\//i.test(v)&&!v.startsWith('//'));
 const schema=z.object({state:z.enum(['ACCEPTED','PROCESSING','PUBLISHED','FAILED','UNKNOWN']),reference:z.object({kind:z.literal('SAFE_PROVIDER_ID'),role:z.enum(['CONTENT','PROCESSING']),binding:bindingSchema,id:safeId}).strict().nullable(),observedAt:z.date(),publishedAt:z.date().nullable(),safeCode:z.enum(['INVALID','UNAVAILABLE','ACCESS_LOST','UNSUPPORTED','RATE_LIMITED','REJECTED','PROCESSING_FAILED','OUTCOME_UNKNOWN']).nullable()}).strict();
 let parsed:ReturnType<typeof schema.safeParse>;try{parsed=schema.safeParse(value);}catch{fault('INVALID');}if(!parsed.success)fault('INVALID');const v=parsed.data;
 if(v.observedAt>now||v.reference&&!sameBinding(v.reference.binding,expected)||v.state==='PUBLISHED'&&(!v.reference||v.reference.role!=='CONTENT'||!v.publishedAt||v.publishedAt>v.observedAt)||['ACCEPTED','PROCESSING'].includes(v.state)&&!v.reference||v.state==='FAILED'&&!v.safeCode||v.state==='UNKNOWN'&&v.safeCode!=='OUTCOME_UNKNOWN')fault('INVALID');
 return v;
}

export type SensitiveProviderReference={readonly kind:SecretReferenceKind;readonly binding:Readonly<Binding>;readonly capability:import('./transport').ProviderCapability};
export type ProviderOperationReference=Reference|SensitiveProviderReference|AuthorizationVersionReference;
