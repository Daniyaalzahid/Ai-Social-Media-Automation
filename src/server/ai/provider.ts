import { z } from 'zod';
import { AI_LIMITS,type AiFailure } from '../../features/ai/model';
import { SensitiveValue } from '../security/sensitive';
import { decodeBrowserJson } from '../auth/browser-security';

export class AiError extends Error {constructor(readonly reason:AiFailure){super('AI generation could not be completed.');this.name='AiError';}}
export interface ProviderRequest {system:string;data:string;schema:Record<string,unknown>}
export interface ProviderResult {content:SensitiveValue;usage:{prompt:number;completion:number;total:number}|null}
export interface AiGenerationProvider {readonly id:string;readonly model:string;generate(request:ProviderRequest,signal:AbortSignal):Promise<ProviderResult>}
export function parseModelJson(value:SensitiveValue):unknown {
 try{const raw=value.reveal();if(Buffer.byteLength(raw)>AI_LIMITS.responseBytes)throw new AiError('RESPONSE_TOO_LARGE');return decodeBrowserJson(Buffer.from(raw));}
 catch(error){if(error instanceof AiError)throw error;throw new AiError('RESPONSE_MALFORMED');}
}
export async function boundedBody(response:Response,signal:AbortSignal):Promise<Uint8Array>{
 const declared=response.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>AI_LIMITS.responseBytes)){await response.body?.cancel();throw new AiError('RESPONSE_TOO_LARGE');}
 if(response.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json'){await response.body?.cancel();throw new AiError('RESPONSE_MALFORMED');}
 const reader=response.body?.getReader();if(!reader)throw new AiError('RESPONSE_MALFORMED');const chunks:Uint8Array[]=[];let size=0;
 const abort=()=>{void reader.cancel().catch(()=>undefined);};signal.addEventListener('abort',abort,{once:true});
 try{while(true){signal.throwIfAborted();const r=await reader.read();signal.throwIfAborted();if(r.done)break;size+=r.value.byteLength;if(size>AI_LIMITS.responseBytes)throw new AiError('RESPONSE_TOO_LARGE');chunks.push(r.value);}return Buffer.concat(chunks);}
 finally{signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>undefined);reader.releaseLock();}
}
const usageSchema=z.object({prompt_tokens:z.number().int().min(0).max(1000000),completion_tokens:z.number().int().min(0).max(1000000),total_tokens:z.number().int().min(0).max(2000000)});
/** Fixed official endpoint; transport injection is constructor-only for tests, never browser/environment configuration. */
export class OpenRouterGenerationProvider implements AiGenerationProvider {
 readonly id='openrouter';
 readonly model:string;#key:SensitiveValue;
 constructor(source:Readonly<Record<string,string|undefined>>,private readonly transport:typeof fetch=fetch){
  const model=source.OPENROUTER_MODEL,key=source.OPENROUTER_API_KEY;
  if(!model||!/^[-a-zA-Z0-9_.]+\/[-a-zA-Z0-9_.:]+$/.test(model)||model.length>160||!key||key.length>512||/\s/u.test(key))throw new AiError('PROVIDER_UNAVAILABLE');
  this.model=model;this.#key=new SensitiveValue(key);
 }
 async generate(request:ProviderRequest,signal:AbortSignal):Promise<ProviderResult>{
  const secret=this.#key.reveal(),escaped=JSON.stringify(secret).slice(1,-1);
  if([request.system,request.data].some(value=>value.includes(secret)||value.includes(escaped)))throw new AiError('INPUT_INVALID');
  const payload=JSON.stringify({model:this.model,messages:[{role:'system',content:request.system},{role:'user',content:request.data}],stream:false,max_tokens:4096,temperature:0.2,response_format:{type:'json_schema',json_schema:{name:'social_safe_plan_v1',strict:true,schema:request.schema}},provider:{require_parameters:true,allow_fallbacks:false,data_collection:'deny'}});
  if(Buffer.byteLength(payload)>AI_LIMITS.promptBytes)throw new AiError('INPUT_INVALID');
  try{signal.throwIfAborted();const response=await this.transport('https://openrouter.ai/api/v1/chat/completions',{method:'POST',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+this.#key.reveal()},body:payload,signal});
   if(!response.ok){await response.body?.cancel();throw new AiError(response.status===429?'PROVIDER_RATE_LIMITED':[401,402,403].includes(response.status)?'PROVIDER_AUTH_ERROR':response.status===404?'MODEL_UNAVAILABLE':response.status===408?'PROVIDER_TIMEOUT':'PROVIDER_UNAVAILABLE');}
   let body:unknown;try{body=decodeBrowserJson(await boundedBody(response,signal));}catch(error){if(error instanceof AiError)throw error;throw new AiError('RESPONSE_MALFORMED');}
   const parsed=z.object({choices:z.array(z.object({finish_reason:z.literal('stop'),message:z.object({role:z.literal('assistant'),content:z.string().max(AI_LIMITS.responseBytes),tool_calls:z.array(z.never()).optional()})})).length(1),usage:z.unknown().optional()}).safeParse(body);
   if(!parsed.success)throw new AiError('RESPONSE_MALFORMED');const usage=usageSchema.safeParse(parsed.data.usage);
   return{content:new SensitiveValue(parsed.data.choices[0]!.message.content),usage:usage.success?{prompt:usage.data.prompt_tokens,completion:usage.data.completion_tokens,total:usage.data.total_tokens}:null};
  }catch(error){if(signal.aborted)throw new AiError(signal.reason?.name==='TimeoutError'?'PROVIDER_TIMEOUT':'CANCELLED');if(error instanceof AiError)throw error;throw new AiError('PROVIDER_UNAVAILABLE');}
 }
}
