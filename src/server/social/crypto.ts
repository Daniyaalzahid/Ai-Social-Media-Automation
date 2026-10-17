import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { EnvironmentSource } from '../config/schema.ts';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive.ts';
import { providerSchema,type SocialProviderId } from '../../features/connections/model.ts';
export type TokenKey={key:Buffer;id:string};
export type Envelope={ciphertext:Buffer;iv:Buffer;tag:Buffer;key_id:string};
export function loadTokenKey(source:EnvironmentSource):TokenKey{
 const v=source.TOKEN_ENCRYPTION_KEY;if(!v||!/^[A-Za-z0-9+/]{43}=$/.test(v))throw new SecurityOperationError();const key=Buffer.from(v,'base64');if(key.length!==32||key.toString('base64')!==v||[source.SESSION_SECRET,source.MFA_ENCRYPTION_KEY,source.SECURITY_EVENT_HMAC_KEY].includes(v))throw new SecurityOperationError();return{key,id:'primary-v1'};
}
export type Binding={provider:SocialProviderId;id:string;purpose:'access'|'refresh'|'pkce';version:number};
function aad(key:TokenKey,b:Binding){providerSchema.parse(b.provider);z.uuid().parse(b.id);if(key.key.length!==32||key.id!=='primary-v1'||!Number.isSafeInteger(b.version)||b.version<1||!['access','refresh','pkce'].includes(b.purpose))throw new SecurityOperationError();return Buffer.from(JSON.stringify(['bsa/social/v1',key.id,b.provider,b.id,b.purpose,b.version]));}
export function encryptToken(value:SensitiveValue,key:TokenKey,b:Binding):Envelope{try{if(Buffer.byteLength(value.reveal())<1||Buffer.byteLength(value.reveal())>8192)throw new Error();const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key.key,iv);c.setAAD(aad(key,b));return{ciphertext:Buffer.concat([c.update(value.reveal(),'utf8'),c.final()]),iv,tag:c.getAuthTag(),key_id:key.id};}catch{throw new SecurityOperationError();}}
export function decryptToken(e:Envelope,key:TokenKey,b:Binding):SensitiveValue{try{if(e.key_id!==key.id||e.iv.length!==12||e.tag.length!==16||e.ciphertext.length<1||e.ciphertext.length>8192)throw new Error();const c=createDecipheriv('aes-256-gcm',key.key,e.iv);c.setAAD(aad(key,b));c.setAuthTag(e.tag);return new SensitiveValue(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat([c.update(e.ciphertext),c.final()])));}catch{throw new SecurityOperationError();}}
