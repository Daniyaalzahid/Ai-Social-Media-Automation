import { z } from 'zod';
import { decodeBrowserJson } from '../auth/browser-security';
import { LIMITS,fault,TransportFault } from './policy';
export type ResponseClass='SMALL_JSON_RESPONSE'|'PROVIDER_ERROR_RESPONSE'|'STATUS_RESPONSE'|'UPLOAD_INITIALIZATION_RESPONSE';
export const responseMaximum=(kind:ResponseClass)=>({SMALL_JSON_RESPONSE:LIMITS.smallResponse,PROVIDER_ERROR_RESPONSE:LIMITS.errorResponse,STATUS_RESPONSE:LIMITS.statusResponse,UPLOAD_INITIALIZATION_RESPONSE:LIMITS.initResponse})[kind];
export function ingestJson<T>(bytes:Uint8Array,schema:z.ZodType<T>,kind:ResponseClass):T{
 if(bytes.byteLength>responseMaximum(kind))fault('BODY_LIMIT');
 let value:unknown;try{value=decodeBrowserJson(bytes);}catch{fault('BODY_INVALID');}
 const pending:{v:unknown;depth:number}[]=[{v:value,depth:0}];let nodes=0,members=0;
 while(pending.length){const {v,depth}=pending.pop()!;if(++nodes>LIMITS.nodes)fault('BODY_LIMIT');
  if(typeof v==='string'&&(!v.isWellFormed()||Buffer.byteLength(v)>LIMITS.string))fault('BODY_INVALID');
  if(typeof v==='number'&&!Number.isFinite(v))fault('BODY_INVALID');
  if(v&&typeof v==='object'){
   if(depth+1>LIMITS.depth)fault('BODY_LIMIT');
   if(Array.isArray(v)){if(v.length>LIMITS.array)fault('BODY_LIMIT');for(const item of v)pending.push({v:item,depth:depth+1});}
   else{const entries=Object.entries(v);members+=entries.length;if(entries.length>LIMITS.members||members>LIMITS.totalMembers)fault('BODY_LIMIT');for(const [key,item]of entries){if(!key.isWellFormed()||Buffer.byteLength(key)>LIMITS.key||['__proto__','constructor','prototype'].includes(key))fault('BODY_INVALID');pending.push({v:item,depth:depth+1});}}
  }
 }
 try{return schema.parse(value);}catch(e){if(e instanceof TransportFault)throw e;fault('BODY_INVALID');}
}
export function structuredBody(value:unknown,schema:z.ZodType):Buffer{
 try{const parsed=schema.parse(value);const encoded=Buffer.from(JSON.stringify(parsed));if(encoded.length>LIMITS.structured)fault('BODY_LIMIT');return encoded;}catch(e){if(e instanceof TransportFault)throw e;fault('BODY_INVALID');}
}
