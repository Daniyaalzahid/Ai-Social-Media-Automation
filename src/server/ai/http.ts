import { decodeBrowserJson } from '../auth/browser-security';
import { AI_LIMITS } from '../../features/ai/model';
import { AiError } from './provider';
/** Shared strict JSON decoder, with a domain-local byte/deadline bound. */
export async function generationBody(request:Request):Promise<unknown>{
 if(request.headers.get('content-type')!=='application/json'||request.headers.has('content-encoding'))throw new AiError('INPUT_INVALID');
 const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>AI_LIMITS.inputBytes))throw new AiError('INPUT_INVALID');
 const reader=request.body?.getReader();if(!reader)throw new AiError('INPUT_INVALID');const signal=AbortSignal.any([request.signal,AbortSignal.timeout(5000)]);
 const abort=()=>{void reader.cancel().catch(()=>undefined);};signal.addEventListener('abort',abort,{once:true});const chunks:Uint8Array[]=[];let size=0;
 try{while(true){signal.throwIfAborted();const{done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.byteLength;if(size>AI_LIMITS.inputBytes)throw new AiError('INPUT_INVALID');chunks.push(value);}return decodeBrowserJson(Buffer.concat(chunks));}
 catch{throw new AiError('INPUT_INVALID');}finally{signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>undefined);reader.releaseLock();}
}
