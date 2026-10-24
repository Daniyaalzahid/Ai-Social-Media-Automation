import { LINKEDIN_AUTH_PATH,LINKEDIN_POST_PATH,linkedinPostId,linkedinVersion,type LinkedInOperation } from './linkedin';
import { request } from 'node:https';
import { inspect } from 'node:util';
import { z } from 'zod';
import { SensitiveValue } from '../security/sensitive';
import { authority,binding,sameBinding,type Binding,type Authority } from './context';
import { LIMITS,Budget,fault,safeFault,TransportFault } from './policy';
import { checkedURL,secureAgent,assertTestHooks,type NetworkTestHooks } from './network';
import { ingestJson,structuredBody,responseMaximum,type ResponseClass } from './response';
import { validateCapture,sendApprovedMedia,mediaRequestLength,approvedHoldExpiry,type ApprovedCapture,type MediaRequest } from './media';
export type EndpointClass='STATIC_PROVIDER_API_ENDPOINT'|'PROVIDER_ISSUED_CAPABILITY_URL';
export type ReviewedProfile={
 key:string;provider:Binding['provider'];capabilityRef:string;endpointClass:EndpointClass;
 authorities:readonly string[];path:string;method:'GET'|'HEAD'|'POST'|'PUT';
 audience:string|null;requiredScopes:readonly string[];requestClass:'STRUCTURED'|'EMPTY'|'MEDIA';
 responseClass:ResponseClass;requestSchema:z.ZodType;responseSchema:z.ZodType;
 contentType:'application/json'|'application/octet-stream';version:Readonly<{kind:'PINNED';value:string}|{kind:'UNVERSIONED_VERIFIED'}>;
 /** Closed test-only LinkedIn protocol; never a caller header map. */
 linkedin?:LinkedInOperation;
 issue?:Readonly<{field:string;targetKey:string;expiresAtField?:string}>;
};
export type CredentialGrant={binding:Binding;audience:string;requestClass:EndpointClass;expiresAt:number;access:SensitiveValue};
type CapabilityData={owner:object;binding:Readonly<Binding>;profile:string;url:string;expiresAt:number;disposed:boolean};
const capabilities=new WeakMap<ProviderCapability,CapabilityData>();
export class ProviderCapability {
 constructor(){Object.freeze(this);}toJSON(){return '[redacted provider capability]';}toString(){return this.toJSON();}[inspect.custom](){return this.toJSON();}
 dispose(){const d=capabilities.get(this);if(d){d.disposed=true;d.url='';capabilities.delete(this);}}
}
export type SafeTransportResult={status:number;data:unknown;capability:ProviderCapability|null;linkedin?:Readonly<{kind:'POST_CREATED';postId:string}>};
/** Server-owned factory: no production profiles are registered anywhere in this phase. */
export function createReviewedOperationTransport(options:{binding:Binding;budget:Budget;authority:()=>Promise<Authority>;profiles:readonly ReviewedProfile[];credentials?:()=>Promise<CredentialGrant>;testNetwork?:NetworkTestHooks}){
 const b=binding(options.binding),owner=Object.freeze({});const profiles=new Map<string,Readonly<ReviewedProfile>>();const owned=new Set<ProviderCapability>();let disposed=false,operationPossible=false;
 assertTestHooks(options.testNetwork);
 for(const input of options.profiles){
  if(!/^[A-Za-z0-9_-]{1,64}$/.test(input.key)||profiles.has(input.key)||input.provider!==b.provider||input.capabilityRef!==b.capabilityRef||!['GET','HEAD','POST','PUT'].includes(input.method)||!['STRUCTURED','EMPTY','MEDIA'].includes(input.requestClass)||!['STATIC_PROVIDER_API_ENDPOINT','PROVIDER_ISSUED_CAPABILITY_URL'].includes(input.endpointClass)||!['SMALL_JSON_RESPONSE','PROVIDER_ERROR_RESPONSE','STATUS_RESPONSE','UPLOAD_INITIALIZATION_RESPONSE'].includes(input.responseClass)||input.authorities.length<1||input.authorities.length>16||!input.path.startsWith('/')||input.path.startsWith('//')||input.path.includes('#')||input.requiredScopes.length>30)fault('INVALID');
  if(!['PINNED','UNVERSIONED_VERIFIED'].includes(input.version.kind))fault('INVALID');
  if(input.version.kind==='PINNED'&&(!/^[A-Za-z0-9._-]{1,64}$/.test(input.version.value)||input.version.value.toLowerCase()==='latest'))fault('INVALID');
  for(const host of input.authorities)checkedURL('https://'+host+input.path,[host]);
  if(input.linkedin!==undefined){
   if(process.env.NODE_ENV!=='test'||process.env.APP_ENV!=='test'||options.testNetwork?.dialAddress!=='127.0.0.1')fault('UNCONFIGURED');
   if(input.provider!=='LINKEDIN'||b.media||input.endpointClass!=='STATIC_PROVIDER_API_ENDPOINT'||input.authorities.length!==1||input.authorities[0]!=='api.linkedin.com'||input.audience!=='api.linkedin.com'||input.version.kind!=='PINNED'||input.issue)fault('INVALID');
   linkedinVersion(input.version.value);
   if(input.linkedin==='AUTHORIZATION'){if(input.method!=='GET'||input.path!==LINKEDIN_AUTH_PATH||input.requestClass!=='EMPTY'||input.responseClass!=='STATUS_RESPONSE')fault('INVALID');}
   else if(input.linkedin==='CREATE'){if(input.method!=='POST'||input.path!==LINKEDIN_POST_PATH||input.requestClass!=='STRUCTURED'||input.responseClass!=='SMALL_JSON_RESPONSE')fault('INVALID');}
   else fault('INVALID');
   if(input.contentType!=='application/json'||Object.keys(input).some(k=>!['key','provider','capabilityRef','endpointClass','authorities','path','method','audience','requiredScopes','requestClass','responseClass','requestSchema','responseSchema','contentType','version','linkedin'].includes(k)))fault('INVALID');
  }
  if(input.issue&&(!/^[a-zA-Z0-9_]{1,128}$/.test(input.issue.field)||! /^[A-Za-z0-9_-]{1,64}$/.test(input.issue.targetKey)))fault('INVALID');
  profiles.set(input.key,Object.freeze({...input,authorities:Object.freeze([...input.authorities]),requiredScopes:Object.freeze([...input.requiredScopes]),version:Object.freeze({...input.version}),...(input.issue?{issue:Object.freeze({...input.issue})}:{})}));
 }
 async function current(profile:Readonly<ReviewedProfile>){authority(b,await options.budget.phase(LIMITS.smallMs,()=>options.authority()),profile.requiredScopes);options.budget.check();if(disposed)fault('EXPIRED');}
 return Object.freeze({
  async request(key:string,input:{body?:unknown;capture?:ApprovedCapture;media?:MediaRequest;capability?:ProviderCapability}={}):Promise<SafeTransportResult>{
   let sent=operationPossible;let cap:ProviderCapability|undefined;let requestBudget:Budget|undefined;
   try{
    const profile=profiles.get(key);if(!profile)fault('UNCONFIGURED');await current(profile);
    if(profile.linkedin&&Object.keys(input).some(k=>!['body'].includes(k)))fault('INVALID');
    await validateCapture(input.capture,b,options.budget);
    let raw='https://'+profile.authorities[0]+profile.path;
    if(profile.endpointClass==='PROVIDER_ISSUED_CAPABILITY_URL'){
     cap=input.capability;const c=cap&&capabilities.get(cap);if(!c||c.owner!==owner||c.disposed||c.profile!==key||!sameBinding(c.binding,b)||c.expiresAt<=Date.now())fault('EXPIRED');raw=c.url;
    }else if(input.capability)fault('INVALID');
    const url=checkedURL(raw,profile.authorities);if(profile.endpointClass==='PROVIDER_ISSUED_CAPABILITY_URL'&&url.pathname!==profile.path)fault('INVALID');let leaseEnd=Math.min(options.budget.end,performance.now()+approvedHoldExpiry(input.capture)-Date.now());
    if(cap){const c=capabilities.get(cap)!;leaseEnd=Math.min(leaseEnd,performance.now()+c.expiresAt-Date.now());}
    const media=input.media?{...input.media,prefix:Buffer.from(input.media.prefix),suffix:Buffer.from(input.media.suffix)}:undefined;
    let body:Buffer|undefined;let length=0;
    if(profile.requestClass==='STRUCTURED'){if(input.media)fault('INVALID');body=structuredBody(input.body,profile.requestSchema);length=body.length;}
    else if(profile.requestClass==='MEDIA'){if(!input.media||input.media.capture!==input.capture||input.body!==undefined)fault('INVALID');length=mediaRequestLength(media!);}
    else if(input.body!==undefined||input.media)fault('INVALID');
    if((profile.method==='GET'||profile.method==='HEAD')&&length)fault('INVALID');
    const headers:Record<string,string>={Accept:'application/json','Accept-Encoding':'identity',Connection:'close'};
    if(length){headers['Content-Length']=String(length);headers['Content-Type']=profile.contentType;}
    if(profile.linkedin){
     headers['Content-Type']='application/json';headers['X-Restli-Protocol-Version']='2.0.0';
     headers['Linkedin-Version']=profile.version.kind==='PINNED'?profile.version.value:'';
     if(profile.linkedin==='AUTHORIZATION')headers['X-RestLi-Method']='BATCH_FINDER';
    }
    if(profile.audience){
     if(!options.credentials)fault('AUTHORIZATION_STALE');const grant=await options.budget.phase(LIMITS.smallMs,()=>options.credentials!());
     if(!sameBinding(binding(grant.binding),b)||grant.audience!==profile.audience||grant.requestClass!==profile.endpointClass||grant.expiresAt<=Date.now()||grant.expiresAt>Date.now()+LIMITS.credentialMs||!(grant.access instanceof SensitiveValue))fault('AUTHORIZATION_STALE');
     leaseEnd=Math.min(leaseEnd,performance.now()+grant.expiresAt-Date.now());const access=grant.access.reveal();if(!access||/[\r\n\0]/.test(access))fault('AUTHORIZATION_STALE');headers.Authorization='Bearer '+access;
    }
    const headerBytes=Object.entries(headers).reduce((sum,[k,v])=>sum+Buffer.byteLength(k)+Buffer.byteLength(v)+4,0)+Buffer.byteLength(url.hostname)+8;
    if(Object.keys(headers).length>LIMITS.requestHeaderCount||headerBytes>LIMITS.requestHeaders)fault('BODY_LIMIT');
    await current(profile);requestBudget=new Budget(profile.requestClass==='MEDIA'?LIMITS.mediaMs:profile.responseClass==='STATUS_RESPONSE'?LIMITS.statusMs:LIMITS.smallMs,leaseEnd,options.budget.signal);
    const budget=requestBudget;
    const result=await new Promise<{status:number;bytes:Buffer;postId?:string}>((yes,no)=>{
     let done=false,responseStarted=false;let headerTimer:ReturnType<typeof setTimeout>|undefined;let idle:ReturnType<typeof setTimeout>|undefined;
     let readyResolve:()=>void=()=>undefined,readyReject:(e:unknown)=>void=()=>undefined;
     const ready=new Promise<void>((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
     const agent=secureAgent(url.hostname,budget,()=>{sent=true;operationPossible=true;readyResolve();},options.testNetwork);
     const req=request({protocol:'https:',hostname:url.hostname,port:443,path:url.pathname+url.search,method:profile.method,headers,agent,maxHeaderSize:LIMITS.responseHeaders,insecureHTTPParser:false},res=>{
      responseStarted=true;clearTimeout(headerTimer);req.maxHeadersCount=0;
      const status=res.statusCode??0;const maximum=responseMaximum(status>=400?'PROVIDER_ERROR_RESPONSE':profile.responseClass);
      if(status<200||status>=300&&status<400){finish(new TransportFault(status>=300&&status<400?'REDIRECT_DENIED':'NETWORK_AMBIGUOUS'));res.destroy();return;}
      if(res.rawHeaders.length/2>LIMITS.responseHeaderCount){finish(new TransportFault('BODY_LIMIT'));res.destroy();return;}
      const encoding=res.headers['content-encoding'];if(encoding!==undefined&&encoding!=='identity'){finish(new TransportFault('ENCODING_DENIED'));res.destroy();return;}
      let postId:string|undefined;
      if(profile.linkedin==='CREATE'){
       if(status!==201){finish(new TransportFault('NETWORK_AMBIGUOUS'));res.destroy();return;}
       const ids:string[]=[];for(let i=0;i<res.rawHeaders.length;i+=2)if(res.rawHeaders[i]!.toLowerCase()==='x-restli-id')ids.push(res.rawHeaders[i+1]!);
       try{if(ids.length!==1)fault('BODY_INVALID');postId=linkedinPostId(ids[0]);}catch{finish(new TransportFault('BODY_INVALID'));res.destroy();return;}
      }
      if(profile.linkedin!=='CREATE'&&res.headers['content-type']!=='application/json'&&res.headers['content-type']!=='application/json; charset=utf-8'){finish(new TransportFault('BODY_INVALID'));res.destroy();return;}
      const declared=res.headers['content-length'];if(declared!==undefined&&(!/^\d+$/.test(declared)||Number(declared)>maximum)){finish(new TransportFault('BODY_LIMIT'));res.destroy();return;}
      let count=0;const chunks:Buffer[]=[];
      const arm=()=>{clearTimeout(idle);idle=setTimeout(()=>finish(new TransportFault('TIMEOUT')),LIMITS.responseIdleMs);};arm();options.testNetwork?.stage?.('BODY');
      res.on('data',(chunk:Buffer)=>{arm();count+=chunk.length;if(count>maximum){finish(new TransportFault('BODY_LIMIT'));res.destroy();return;}if(profile.linkedin!=='CREATE')chunks.push(Buffer.from(chunk));});
      res.once('error',()=>finish(new TransportFault('BODY_INVALID')));res.once('aborted',()=>finish(new TransportFault('BODY_INVALID')));
      res.once('end',()=>{if(!res.complete||declared!==undefined&&Number(declared)!==count)return finish(new TransportFault('BODY_INVALID'));if(status>=400)return finish(new TransportFault('NETWORK_AMBIGUOUS'));finish(undefined,{status,bytes:Buffer.concat(chunks),...(postId?{postId}:{})});});
     });req.maxHeadersCount=0;
     const abort=()=>finish(new TransportFault('TIMEOUT'));budget.signal.addEventListener('abort',abort,{once:true});
     function finish(error?:unknown,value?:{status:number;bytes:Buffer;postId?:string}){if(done)return;done=true;clearTimeout(idle);clearTimeout(headerTimer);budget.signal.removeEventListener('abort',abort);if(error){readyReject(error);no(safeFault(error,sent));}else if(value)yes(value);req.destroy();agent.destroy();}
     req.once('error',error=>finish(error));
     void(async()=>{try{await ready;budget.check();await current(profile);if(length){if(profile.requestClass==='MEDIA')await sendApprovedMedia(media!,b,budget,write);else await write(body!);}req.end(()=>{if(!responseStarted)headerTimer=setTimeout(()=>finish(new TransportFault('TIMEOUT')),LIMITS.headerMs);});}catch(e){finish(e);}})();
     async function write(bytes:Uint8Array){await current(profile!);budget.check();if(!bytes.byteLength)return;await budget.phase(LIMITS.uploadIdleMs,signal=>new Promise<void>((resolve,reject)=>{const aborted=()=>{req.destroy();reject(new TransportFault('TIMEOUT'));};signal.addEventListener('abort',aborted,{once:true});req.write(bytes,e=>{signal.removeEventListener('abort',aborted);if(e)reject(new TransportFault('NETWORK_AMBIGUOUS'));else resolve();});}));}
    });
    await current(profile);
    if(profile.linkedin==='CREATE'){if(!result.postId)fault('BODY_INVALID');return{status:result.status,data:null,capability:null,linkedin:Object.freeze({kind:'POST_CREATED',postId:result.postId})};}
    const data=ingestJson(result.bytes,profile.responseSchema,profile.responseClass);
    let issued:ProviderCapability|null=null;let safeData:unknown=data;
    if(profile.issue){
     if(!data||typeof data!=='object'||Array.isArray(data))fault('BODY_INVALID');const rawURL=Object.getOwnPropertyDescriptor(data,profile.issue.field)?.value;
     const target=profiles.get(profile.issue.targetKey);if(typeof rawURL!=='string'||!target||target.endpointClass!=='PROVIDER_ISSUED_CAPABILITY_URL')fault('BODY_INVALID');if(checkedURL(rawURL,target.authorities).pathname!==target.path)fault('BODY_INVALID');
     const currentAuthority=await options.budget.phase(LIMITS.smallMs,()=>options.authority());authority(b,currentAuthority,profile.requiredScopes);
     const knownExpiry=profile.issue.expiresAtField?Object.getOwnPropertyDescriptor(data,profile.issue.expiresAtField)?.value:Infinity;if(typeof knownExpiry!=='number'||Number.isNaN(knownExpiry)||knownExpiry<=Date.now())fault('EXPIRED');
     issued=new ProviderCapability();capabilities.set(issued,{owner,binding:b,profile:target.key,url:rawURL,expiresAt:Math.min(knownExpiry,approvedHoldExpiry(input.capture),Date.now()+LIMITS.capabilityMs,currentAuthority.expiresAt,Date.now()+Math.max(0,options.budget.end-performance.now())),disposed:false});owned.add(issued);
     safeData=Object.fromEntries(Object.entries(data).filter(([key])=>key!==profile.issue!.field));
    }
    return{status:result.status,data:safeData,capability:issued};
   }catch(e){if(cap){cap.dispose();owned.delete(cap);}throw safeFault(e,sent);}finally{requestBudget?.dispose();}
  },
  dispose(){disposed=true;for(const cap of owned)cap.dispose();owned.clear();},
 });
}
export function productionProviderTransport(input:{binding:Binding;budget:Budget;authority:()=>Promise<Authority>}){return createReviewedOperationTransport({...input,profiles:[]});}
