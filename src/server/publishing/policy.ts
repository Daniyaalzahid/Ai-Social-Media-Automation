import { createHash } from 'node:crypto';
import { z } from 'zod';
import { publishCommandSchema,type PublishCommand } from '../../features/publishing/model';
import type { PublishState } from './schema';
export class PublishingError extends Error{constructor(readonly reason:'INVALID'|'CONFLICT'|'UNAVAILABLE'|'CAPABILITY_UNAVAILABLE'|'POLICY_CHANGED'|'MEDIA_UNAVAILABLE'|'STEP_UP_REQUIRED'|'OUTCOME_UNKNOWN',readonly status=409){super(reason==='CAPABILITY_UNAVAILABLE'?'Publishing is unavailable: this provider capability has not been verified.':reason==='OUTCOME_UNKNOWN'?'Publication outcome is unconfirmed. Do not resend this operation.':reason==='STEP_UP_REQUIRED'?'Confirm your identity before publishing.':'Unable to complete this publishing operation. Reload the exact approved revision before continuing.');this.name='PublishingError';}}
/** Canonical keys only; values, code points, newlines and array order are unchanged. */
export function canonical(value:unknown):string{
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
 throw new PublishingError('INVALID',400);
}
export function publishHash(value:unknown){return createHash('sha256').update('bsa/publish-intent/v1\0').update(canonical(value)).digest();}
export function publishAction(value:unknown):`PUBLISH_DISPATCH:${string}`{const command=publishCommandSchema.parse(value);return `PUBLISH_DISPATCH:${publishHash(command).toString('base64url')}`;}
export function commandDigest(value:PublishCommand){return publishHash(publishCommandSchema.parse(value));}
const transitions:Readonly<Record<PublishState,readonly PublishState[]>>={CREATED:['DISPATCHING','FAILED'],DISPATCHING:['ACCEPTED','PROCESSING','PUBLISHED','FAILED','UNKNOWN'],ACCEPTED:['PROCESSING','PUBLISHED','FAILED','UNKNOWN'],PROCESSING:['PROCESSING','PUBLISHED','FAILED','UNKNOWN'],UNKNOWN:['ACCEPTED','PROCESSING','PUBLISHED','FAILED','UNKNOWN'],PUBLISHED:[],FAILED:[]};
export function requireTransition(from:PublishState,to:PublishState){if(!transitions[from].includes(to))throw new PublishingError('CONFLICT');}
export const safeId=z.string().min(1).max(256).regex(/^[A-Za-z0-9._:/-]+$/);
