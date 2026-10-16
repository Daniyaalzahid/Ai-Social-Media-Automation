import { NextResponse } from 'next/server';
import { AuthorizationError } from '../authorization/authorization';
import { MediaError } from './storage';
export const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});
export function failure(error:unknown){return reply({ok:false,message:error instanceof MediaError?error.message:'Unable to complete this request.'},error instanceof MediaError||error instanceof AuthorizationError?error.status:503);}
/** Next may expose an empty stream for DELETE. Reject actual bytes, not stream presence. */
export async function requireEmptyRemovalBody(request:Request){
 if(request.headers.has('content-type')||Number(request.headers.get('content-length')??0)>0)throw new MediaError(400,'Removal takes no extra fields.');
 const reader=request.body?.getReader();if(!reader)return;
 let expired=false;const timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>undefined);},2000);
 try{const result=await reader.read();if(expired||!result.done||result.value?.length){void reader.cancel().catch(()=>undefined);throw new MediaError(400,'Removal takes no extra fields.');}}
 finally{clearTimeout(timer);reader.releaseLock();}
}
