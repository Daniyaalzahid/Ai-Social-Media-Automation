/** CONTRACT-2 project admission limits; these are not social-provider limits. */
export const LIMITS = Object.freeze({
 smallResponse:65536,errorResponse:16384,statusResponse:16384,initResponse:32768,structured:32768,
 responseHeaders:16384,responseHeaderCount:64,requestHeaders:8192,requestHeaderCount:32,
 depth:16,nodes:2048,members:128,totalMembers:1024,array:256,string:16384,key:128,url:4096,
 hostname:253,label:63,dnsAnswers:16,media:33554432,framing:65536,chunk:65536,
 dnsMs:3000,connectMs:3000,tlsMs:3000,headerMs:5000,responseIdleMs:2000,uploadIdleMs:5000,
 smallMs:10000,statusMs:10000,mediaMs:30000,capabilityMs:30000,credentialMs:30000,
 id:256,error:32,diagnostic:64,log:2048,duration:30000,count:4294967295,
});
export const FAULTS=['INVALID','UNCONFIGURED','AUTHORIZATION_STALE','ADDRESS_DENIED','DNS_FAILED','PEER_DENIED','TLS_FAILED','REDIRECT_DENIED','ENCODING_DENIED','BODY_LIMIT','BODY_INVALID','MEDIA_INVALID','BUSY','EXPIRED','ABORTED','TIMEOUT','NETWORK_AMBIGUOUS','REFERENCE_UNAVAILABLE'] as const;
export type FaultCode=typeof FAULTS[number];
export class TransportFault extends Error {
 constructor(readonly code:FaultCode,readonly exposure:'NOT_SENT_PROVEN'|'MAY_HAVE_BEEN_SENT'='NOT_SENT_PROVEN'){
  super('Provider transport unavailable.');this.name='TransportFault';this.stack='TransportFault: Provider transport unavailable.';
 }
 toJSON(){return{code:this.code,exposure:this.exposure};}
}
export function fault(code:FaultCode):never{throw new TransportFault(code);}
export function safeFault(error:unknown,sent:boolean){let code:FaultCode='NETWORK_AMBIGUOUS';try{const v=error instanceof TransportFault?Object.getOwnPropertyDescriptor(error,'code')?.value:null;code=FAULTS.find(c=>c===v)??code;}catch{/* Never serialize an arbitrary error/getter. */}return new TransportFault(code,sent?'MAY_HAVE_BEEN_SENT':'NOT_SENT_PROVEN');}
export class Budget {
 readonly controller=new AbortController();readonly signal=this.controller.signal;readonly end:number;
 private timer:ReturnType<typeof setTimeout>;private readonly abort:()=>void;
 constructor(ms:number,parentEnd=Infinity,parent?:AbortSignal,readonly now:()=>number=()=>performance.now()){
  if(!Number.isFinite(ms)||ms<=0||ms>LIMITS.mediaMs||Number.isNaN(parentEnd))fault('INVALID');
  this.end=Math.min(now()+ms,parentEnd);this.abort=()=>this.controller.abort();
  parent?.addEventListener('abort',this.abort,{once:true});if(parent?.aborted)this.abort();
  this.timer=setTimeout(this.abort,Math.max(0,this.end-now()));this.parent=parent;
 }
 private readonly parent:AbortSignal|undefined;
 check(){if(this.signal.aborted||this.now()>=this.end)fault('TIMEOUT');}
 async phase<T>(ms:number,work:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  this.check();const phase=new AbortController();const abort=()=>phase.abort();this.signal.addEventListener('abort',abort,{once:true});
  let rejectAbort:(error:unknown)=>void=()=>undefined;
  const listener=()=>rejectAbort(new TransportFault('TIMEOUT'));
  const failure=new Promise<never>((_,reject)=>{rejectAbort=reject;phase.signal.addEventListener('abort',listener,{once:true});});
  const timer=setTimeout(abort,Math.max(0,Math.min(ms,this.end-this.now())));
  try{return await Promise.race([work(phase.signal),failure]);}finally{clearTimeout(timer);this.signal.removeEventListener('abort',abort);phase.signal.removeEventListener('abort',listener);phase.abort();}
 }
 dispose(){clearTimeout(this.timer);this.parent?.removeEventListener('abort',this.abort);this.controller.abort();}
}
