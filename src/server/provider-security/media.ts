import { createHash } from 'node:crypto';
import type { MediaStorage } from '../media/storage';
import { binding,sameBinding,type Binding } from './context';
import { LIMITS,Budget,fault } from './policy';
import { inspect } from 'node:util';
import { PUBLISH_LIMITS } from '../../features/publishing/model';
export type ApprovedAsset={id:string;storageKey:string;mime:'image/jpeg'|'image/png'|'image/webp'|'video/mp4';size:number;sha256:string;protectedUntil:number;status:'temporary'|'attached'};
export type ApprovedMedia={binding:Binding;approved:true;assets:readonly ApprovedAsset[]};
type CaptureData={binding:Readonly<Binding>;assets:Map<string,{metadata:Readonly<ApprovedAsset>;bytes:Buffer}>;valid:()=>Promise<ApprovedMedia>;disposed:boolean;capturing:boolean;released:boolean;deadline:number};
const captures=new WeakMap<ApprovedCapture,CaptureData>();let active=0;
export class ApprovedCapture {
 constructor(){Object.freeze(this);}
 toJSON(){return '[private approved media]';}toString(){return '[private approved media]';}[inspect.custom](){return this.toString();}
 dispose(){const data=captures.get(this);if(data&&!data.disposed){data.disposed=true;for(const a of data.assets.values())a.bytes.fill(0);data.assets.clear();if(!data.capturing&&!data.released){active--;data.released=true;}}}
}
async function check(data:CaptureData,b:Binding,budget:Budget){
 budget.check();if(budget.end>data.deadline)fault('MEDIA_INVALID');if(data.disposed||!sameBinding(data.binding,b))fault('MEDIA_INVALID');const current=await budget.phase(LIMITS.mediaMs,()=>data.valid());
 if(current.approved!==true||!sameBinding(binding(current.binding),b)||current.assets.length!==data.assets.size)fault('MEDIA_INVALID');
 for(const a of current.assets){const old=data.assets.get(a.id);if(!old||a.protectedUntil<=Date.now()||a.protectedUntil!==old.metadata.protectedUntil||a.size!==old.metadata.size||a.sha256!==old.metadata.sha256||a.storageKey!==old.metadata.storageKey||a.mime!==old.metadata.mime||!['temporary','attached'].includes(a.status))fault('MEDIA_INVALID');}
}
/** Broker resolver is server-owned: no browser-supplied file key or expected hash. */
export function approvedMediaBroker(storage:Pick<MediaStorage,'open'>,resolve:(binding:Binding)=>Promise<ApprovedMedia>){
 return{async capture(raw:Binding,budget:Budget):Promise<ApprovedCapture>{
  const b=binding(raw);budget.check();if(!b.media)fault('MEDIA_INVALID');if(active)fault('BUSY');active++;
  const cap=new ApprovedCapture();const data:CaptureData={binding:b,assets:new Map(),valid:()=>resolve(b),disposed:false,capturing:true,released:false,deadline:budget.end};captures.set(cap,data);
  const work=(async()=>{try{
   const approved=await budget.phase(LIMITS.mediaMs,()=>resolve(b));budget.check();if(approved.approved!==true||!sameBinding(binding(approved.binding),b)||approved.assets.length<1||approved.assets.length>4)fault('MEDIA_INVALID');
   let total=0;for(const a of approved.assets){if(!Number.isSafeInteger(a.size)||a.size<1||a.mime!=='video/mp4'&&a.size>8388608||(total+=a.size)>LIMITS.media||! /^[a-f0-9]{64}$/.test(a.sha256)||! /^[a-f0-9]{64}$/.test(a.storageKey)||! /^[a-zA-Z0-9-]{1,64}$/.test(a.id)||data.assets.has(a.id)||!['image/jpeg','image/png','image/webp','video/mp4'].includes(a.mime)||!['temporary','attached'].includes(a.status)||!Number.isFinite(a.protectedUntil)||a.protectedUntil<=Date.now()||a.protectedUntil>Date.now()+PUBLISH_LIMITS.holdMs)fault('MEDIA_INVALID');}
   for(const a of approved.assets){budget.check();if(data.disposed)fault('MEDIA_INVALID');
    const bytes=Buffer.alloc(a.size);data.assets.set(a.id,{metadata:Object.freeze({...a}),bytes});const handle=await storage.open(a.storageKey);
    try{budget.check();if(data.disposed)fault('MEDIA_INVALID');const stat=await handle.stat();if(stat.size!==a.size)fault('MEDIA_INVALID');let at=0;const hash=createHash('sha256');
     while(at<a.size){budget.check();if(a.protectedUntil<=Date.now())fault('MEDIA_INVALID');const n=await handle.read(bytes,at,Math.min(LIMITS.chunk,a.size-at),at);if(!n.bytesRead)fault('MEDIA_INVALID');hash.update(bytes.subarray(at,at+n.bytesRead));at+=n.bytesRead;}
     const extra=Buffer.alloc(1);if((await handle.read(extra,0,1,a.size)).bytesRead||hash.digest('hex')!==a.sha256||(await handle.stat()).size!==a.size)fault('MEDIA_INVALID');
    }finally{await handle.close();}
   }
   await check(data,b,budget);return cap;
  }catch{cap.dispose();fault('MEDIA_INVALID');}finally{data.capturing=false;if(data.disposed&&!data.released){active--;data.released=true;}}})();
  try{return await budget.phase(LIMITS.mediaMs,()=>work);}catch{cap.dispose();fault('MEDIA_INVALID');}
 }};
}
export async function validateCapture(cap:ApprovedCapture|undefined,b:Binding,budget:Budget){
 if(!b.media){if(cap)fault('MEDIA_INVALID');return;}
 if(!cap)fault('MEDIA_INVALID');const data=captures.get(cap);if(!data)fault('MEDIA_INVALID');await check(data,b,budget);
}
export type MediaRequest={capture:ApprovedCapture;assetId:string;start:number;end:number;prefix:Uint8Array;suffix:Uint8Array};
/** Only the trusted transport consumes copies; backing capture is never exposed. */
export async function sendApprovedMedia(input:MediaRequest,b:Binding,budget:Budget,write:(bytes:Uint8Array,media:boolean)=>Promise<void>){
 const data=captures.get(input.capture);if(!data)fault('MEDIA_INVALID');await check(data,b,budget);const asset=data.assets.get(input.assetId);
 if(!asset||!Number.isSafeInteger(input.start)||!Number.isSafeInteger(input.end)||input.start<0||input.end<=input.start||input.end>asset.bytes.length||input.end-input.start>LIMITS.media||input.prefix.byteLength+input.suffix.byteLength>LIMITS.framing)fault('MEDIA_INVALID');
 const expected=createHash('sha256').update(asset.bytes.subarray(input.start,input.end)).digest();const hash=createHash('sha256');
 await write(Buffer.from(input.prefix),false);let count=0;
 for(let at=input.start;at<input.end;at+=LIMITS.chunk){await check(data,b,budget);const copy=Buffer.from(asset.bytes.subarray(at,Math.min(input.end,at+LIMITS.chunk)));count+=copy.length;hash.update(copy);await write(copy,true);}
 if(count!==input.end-input.start||!hash.digest().equals(expected))fault('MEDIA_INVALID');await write(Buffer.from(input.suffix),false);
}
export function mediaRequestLength(input:MediaRequest){const data=captures.get(input.capture);const a=data?.assets.get(input.assetId);if(!a||data?.disposed||!Number.isSafeInteger(input.start)||!Number.isSafeInteger(input.end)||input.start<0||input.end<=input.start||input.end>a.bytes.length||input.prefix.byteLength+input.suffix.byteLength>LIMITS.framing)fault('MEDIA_INVALID');return input.end-input.start+input.prefix.byteLength+input.suffix.byteLength;}

export function approvedHoldExpiry(cap:ApprovedCapture|undefined){const d=cap&&captures.get(cap);return d&&!d.disposed?Math.min(...[...d.assets.values()].map(a=>a.metadata.protectedUntil)):Infinity;}
