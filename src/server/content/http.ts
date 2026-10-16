import { decodeBrowserJson } from '../auth/browser-security';
import { CONTENT_LIMITS } from '../../features/content/model';
import { ContentError } from './policy';
export async function contentBody(request:Request){
 if(request.headers.get('content-type')!=='application/json'||request.headers.has('content-encoding'))throw new ContentError('VALIDATION_FAILED');
 const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>CONTENT_LIMITS.body))throw new ContentError('VALIDATION_FAILED');
 const reader=request.body?.getReader();if(!reader)throw new ContentError('VALIDATION_FAILED');const signal=AbortSignal.any([request.signal,AbortSignal.timeout(5000)]),chunks:Uint8Array[]=[];let size=0;
 const abort=()=>{void reader.cancel().catch(()=>undefined);};signal.addEventListener('abort',abort,{once:true});
 try{while(true){signal.throwIfAborted();const r=await reader.read();signal.throwIfAborted();if(r.done)break;size+=r.value.byteLength;if(size>CONTENT_LIMITS.body)throw new ContentError('VALIDATION_FAILED');chunks.push(r.value);}const value=decodeBrowserJson(Buffer.concat(chunks));const valid=(v:unknown):boolean=>typeof v==='string'?v.isWellFormed():Array.isArray(v)?v.every(valid):v!==null&&typeof v==='object'?Object.entries(v).every(([k,item])=>k.isWellFormed()&&valid(item)):true;if(!valid(value))throw new ContentError('VALIDATION_FAILED');return value;}catch{throw new ContentError('VALIDATION_FAILED');}finally{signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>undefined);reader.releaseLock();}
}
export function queryFields(params:URLSearchParams){const result:Record<string,string>={};for(const[k,v]of params){if(Object.hasOwn(result,k))throw new ContentError('VALIDATION_FAILED');Object.defineProperty(result,k,{value:v,enumerable:true});}return result;}
