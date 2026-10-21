import { Resolver } from 'node:dns/promises';
import { Agent,type AgentOptions } from 'node:https';
import { BlockList,SocketAddress,isIP,connect,type Socket } from 'node:net';
import { connect as connectTLS,rootCertificates,checkServerIdentity,type TLSSocket } from 'node:tls';
import { LIMITS,Budget,fault,TransportFault,safeFault } from './policy';
const blocked4=new BlockList();
for(const [address,prefix]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',8],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked4.addSubnet(address,prefix,'ipv4');
const candidates6=new BlockList();candidates6.addSubnet('2000::',3,'ipv6');
const blocked6=new BlockList();for(const [address,prefix]of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]] as const)blocked6.addSubnet(address,prefix,'ipv6');
/** All 192/8 denied by project policy, not because all 192/8 is private. */
export function publicAddress(address:string){const family=isIP(address);return family===4?!blocked4.check(address,'ipv4'):family===6&&candidates6.check(address,'ipv6')&&!blocked6.check(address,'ipv6')&&!address.includes('%');}
export function checkedURL(raw:string,authorities:readonly string[]):URL{
 if(typeof raw!=='string'||raw.length>LIMITS.url||/[^\x21-\x7e]|\\|#/.test(raw))fault('INVALID');
 const authority=/^https:\/\/([^/?#]+)(?:[/?]|$)/i.exec(raw)?.[1];if(!authority||(/[@%]/.test(authority)||authority.includes('[')||authority.includes(']')))fault('INVALID');
 const parts=authority.split(':');if(parts.length>2||parts.length===2&&parts[1]!=='443')fault('INVALID');
 const host=parts[0]!.toLowerCase();if(host.length>LIMITS.hostname||host.endsWith('.')||!host.includes('.')||isIP(host)||/^(?:0x[0-9a-f]+|[0-9.]+)$/i.test(host))fault('INVALID');
 const labels=host.split('.');if(labels.some(l=>!l||l.length>LIMITS.label||l.startsWith('xn--')||! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(l))||/(?:^|\.)(?:localhost|local|internal)$|\.home\.arpa$/.test(host))fault('INVALID');
 let url:URL;try{url=new URL(raw);}catch{fault('INVALID');}
 if(url.protocol!=='https:'||url.hostname!==host||url.username||url.password||url.hash||isIP(url.hostname)||!authorities.includes(host))fault('INVALID');
 const path=raw.slice(raw.indexOf(authority)+authority.length).split('?')[0]??'';
 if(path.split('/').some(p=>['.','..'].includes(p.replace(/%2e/ig,'.'))))fault('INVALID');
 if(/%(?![0-9a-f]{2})/i.test(raw))fault('INVALID');return url;
}
export function selectAddress(addresses:readonly string[],testLoopback=false){
 if(!addresses.length||addresses.length>LIMITS.dnsAnswers||addresses.some(a=>!(testLoopback&&a==='127.0.0.1')&&!publicAddress(a)))fault('ADDRESS_DENIED');
 const list=addresses.map(a=>({address:a,family:isIP(a)})).sort((a,b)=>a.family-b.family||(ipValue(a.address)<ipValue(b.address)?-1:ipValue(a.address)>ipValue(b.address)?1:0));
 return list[0]!;
}
function ipValue(address:string){if(isIP(address)===4)return address.split('.').reduce((n,v)=>(n<<8n)+BigInt(v),0n);const halves=address.split('::');const left=halves[0]!.split(':').filter(Boolean),right=(halves[1]??'').split(':').filter(Boolean);const groups=halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left;return groups.reduce((n,v)=>(n<<16n)+BigInt('0x'+v),0n);}
function canonical(address:string){const family=isIP(address);return SocketAddress.parse(family===6?`[${address}]:443`:`${address}:443`)?.address??'';}
export function peerMatches(selected:string,actual:string|undefined){
 if(!actual)return false;
 if(isIP(selected)===4&&isIP(actual)===6){const mapped=new BlockList();mapped.addAddress(selected,'ipv4');return mapped.check(actual,'ipv6');}
 return canonical(selected)!==''&&canonical(selected)===canonical(actual);
}
export type NetworkTestHooks={resolve:(host:string,signal:AbortSignal)=>Promise<readonly string[]>;port:number;ca:string;dialAddress?:string;stage?:(stage:'BODY')=>void};
export function assertTestHooks(hooks:NetworkTestHooks|undefined){if(hooks&&(process.env.NODE_ENV!=='test'||process.env.APP_ENV!=='test'))fault('UNCONFIGURED');}
export function assertRuntimeSafe(){if(process.env.NODE_DEBUG||process.env.NODE_DEBUG_NATIVE||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')fault('UNCONFIGURED');}
async function resolve(host:string,signal:AbortSignal){
 const resolver=new Resolver();const abort=()=>resolver.cancel();signal.addEventListener('abort',abort,{once:true});
 try{const query=async(family:4|6)=>{try{return await(family===4?resolver.resolve4(host+'.'):resolver.resolve6(host+'.'));}catch(error){if(error&&typeof error==='object'&&'code'in error&&error.code==='ENODATA')return[];throw new TransportFault('DNS_FAILED');}};return(await Promise.all([query(4),query(6)])).flat();}
 finally{signal.removeEventListener('abort',abort);resolver.cancel();}
}
export function secureAgent(host:string,budget:Budget,onReady:()=>void,hooks?:NetworkTestHooks){
 assertTestHooks(hooks);assertRuntimeSafe();
 const agent=new Agent({keepAlive:false,maxSockets:1,maxTotalSockets:1,maxCachedSessions:0,proxyEnv:{} as NonNullable<AgentOptions['proxyEnv']>});
 agent.createConnection=(_options,callback)=>{
  if(!callback)fault('UNCONFIGURED');
  void establish().then(socket=>{try{budget.check();onReady();callback(null,socket);}catch{socket.destroy();callback(new TransportFault('TIMEOUT'),undefined as never);}},error=>callback(safeFault(error,false),undefined as never));
  return undefined;
 };
 async function establish():Promise<TLSSocket>{
  const addresses=await budget.phase(LIMITS.dnsMs,s=>hooks?hooks.resolve(host,s):resolve(host,s));const selected=selectAddress(addresses,!!hooks);const port=hooks?.port??443;
  const tcp=await budget.phase(LIMITS.connectMs,signal=>new Promise<Socket>((yes,no)=>{
   const socket=connect({host:hooks?.dialAddress??selected.address,port,family:isIP(hooks?.dialAddress??selected.address),autoSelectFamily:false});socket.on('error',()=>undefined);
   const abort=()=>finish(new TransportFault('TIMEOUT'));const error=()=>finish(new TransportFault('DNS_FAILED'));
   const finish=(e?:Error)=>{signal.removeEventListener('abort',abort);socket.removeListener('error',error);if(e){socket.destroy();no(e);}else yes(socket);};
   signal.addEventListener('abort',abort,{once:true});socket.once('error',error);socket.once('connect',()=>{if(!peerMatches(selected.address,socket.remoteAddress)||socket.remotePort!==port)return finish(new TransportFault('PEER_DENIED'));finish();});
  }));
  try{return await budget.phase(LIMITS.tlsMs,signal=>new Promise<TLSSocket>((yes,no)=>{
   const socket=connectTLS({socket:tcp,servername:host,rejectUnauthorized:true,minVersion:'TLSv1.2',ca:hooks?.ca??[...rootCertificates],checkServerIdentity:(_name,cert)=>checkServerIdentity(host,cert)});socket.on('error',()=>undefined);
   const abort=()=>finish(new TransportFault('TIMEOUT'));const error=()=>finish(new TransportFault('TLS_FAILED'));
   const finish=(e?:Error)=>{signal.removeEventListener('abort',abort);socket.removeListener('error',error);if(e){socket.destroy();no(e);}else yes(socket);};
   signal.addEventListener('abort',abort,{once:true});socket.once('error',error);socket.once('secureConnect',()=>{if(!socket.authorized||!peerMatches(selected.address,socket.remoteAddress)||socket.remotePort!==port)return finish(new TransportFault('PEER_DENIED'));finish();});
  }));}catch(e){tcp.destroy();throw e;}
 }
 return agent;
}
