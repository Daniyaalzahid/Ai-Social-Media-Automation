import { randomBytes,randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:https';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { SensitiveValue } from '../../src/server/security/sensitive';
import type { PublishingConnection,ProviderIntent } from '../../src/server/publishing/provider';
export const TEST_LINKEDIN_VERSION='202601'; // Deterministic fixture only, not a production support claim.
export function authorizationResource(organization='urn:li:organization:123',member='urn:li:person:synthetic'){
 return{impersonator:member,organization,action:{OrganizationContentAuthorizationActionType:{actionType:'ORGANIC_SHARE_CREATE'}},status:{'com.linkedin.organization.Approved':{}}};
}
export function authorizationResponse(){return{elements:[{elements:[authorizationResource()],paging:{start:0,count:1,total:1}}]};}
export function linkedinIntent():ProviderIntent{return{operationId:randomUUID(),provider:'LINKEDIN',platform:'LINKEDIN',destination:'123',content:{caption:'Approved synthetic text\nSecond line',hashtags:[]},assets:[],intentHash:'a'.repeat(64)};}
export function linkedinConnection(intent:ProviderIntent):PublishingConnection{
 const b={workspaceId:randomUUID(),operationId:intent.operationId,snapshotId:intent.operationId,authorizationId:randomUUID(),destinationId:randomUUID(),authorizationVersion:1,destination:intent.destination,provider:'LINKEDIN' as const,capabilityRef:'linkedin-text-test-'+TEST_LINKEDIN_VERSION,intentHash:intent.intentHash,media:false};
 const access=new SensitiveValue(randomBytes(32).toString('base64url'));
 return{binding:b,personURN:null,authority:async()=>({binding:b,status:'CONNECTED',expiresAt:Date.now()+60000,refreshLease:false,scopes:['rw_organization_admin','w_organization_social']}),credentials:async()=>({binding:b,audience:'api.linkedin.com',requestClass:'STATIC_PROVIDER_API_ENDPOINT',expiresAt:Date.now()+10000,access}),now:async()=>new Date()};
}
/** All traffic uses numeric loopback with a synthetic certificate for original SNI. */
export async function localLinkedIn(){
 const root=await mkdtemp(join(tmpdir(),'bsa-linkedin-test-'));
 try{execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(root,'key.pem'),'-out',join(root,'cert.pem'),'-days','1','-subj','/CN=api.linkedin.com','-addext','subjectAltName=DNS:api.linkedin.com'],{stdio:'ignore'});}catch{await rm(root,{recursive:true,force:true});throw new Error('Synthetic LinkedIn TLS fixture unavailable.');}
 const ca=await readFile(join(root,'cert.pem'),'utf8'),key=await readFile(join(root,'key.pem'),'utf8');
 const state={authorization:authorizationResponse() as unknown,authorizationStatus:200,authorizationRaw:null as Buffer|null,postStatus:201,postId:'urn:li:share:123' as string|string[]|null,postBody:Buffer.alloc(0),authCalls:0,postCalls:0,targets:[] as string[],bodies:[] as Buffer[],headers:[] as {version:string|undefined;protocol:string|undefined;restliMethod:string|undefined;contentType:string|undefined;authorizationPresent:boolean;cookiePresent:boolean}[],onAuthorization:null as (()=>Promise<void>)|null,onPost:null as ((req:IncomingMessage,res:ServerResponse)=>void)|null};
 const server=createServer({key,cert:ca},(req,res)=>{
  req.on('error',()=>undefined);res.on('error',()=>undefined);const chunks:Buffer[]=[];req.on('data',(c:Buffer)=>chunks.push(Buffer.from(c)));req.on('end',()=>{
   state.targets.push(req.url??'');state.headers.push({version:req.headers['linkedin-version'] as string|undefined,protocol:req.headers['x-restli-protocol-version'] as string|undefined,restliMethod:req.headers['x-restli-method'] as string|undefined,contentType:req.headers['content-type'],authorizationPresent:typeof req.headers.authorization==='string',cookiePresent:req.headers.cookie!==undefined});
   if(req.method==='GET'){
    state.authCalls++;void(async()=>{try{await state.onAuthorization?.();res.statusCode=state.authorizationStatus;res.setHeader('Content-Type','application/json');res.end(state.authorizationRaw??JSON.stringify(state.authorization));}catch{res.destroy();}})();
   }else if(req.method==='POST'){
    state.postCalls++;state.bodies.push(Buffer.concat(chunks));if(state.onPost){state.onPost(req,res);return;}res.statusCode=state.postStatus;if(state.postId!==null)res.setHeader('x-restli-id',state.postId);res.end(state.postBody);
   }else res.destroy();
  });
 });server.on('tlsClientError',()=>undefined);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw new Error('Synthetic LinkedIn TLS fixture unavailable.');
 return{state,port:addr.port,ca,async close(){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}};
}
