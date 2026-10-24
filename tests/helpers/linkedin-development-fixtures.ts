import { randomBytes,randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:https';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { createLinkedInProfile,type LinkedInReview } from '../../src/server/provider-security/linkedin-profile';
import { LINKEDIN_CONNECTION_SCOPES } from '../../src/server/social/linkedin';
import type { OAuthAttempt } from '../../src/server/social/provider';
import { authorizationResponse } from './linkedin-fixtures';
// Synthetic review admission only. No real product, app or operation is verified.
export const SYNTHETIC_LINKEDIN_REVIEW:LinkedInReview=Object.freeze({enabled:true,entitlementConfirmed:true,operationContractReviewed:true,identityContractReviewed:true,destinationContractReviewed:true});
export const REVIEW_TIME=Date.parse('2026-10-25T00:00:00Z');
export function syntheticLinkedInProfile(now:()=>number=()=>REVIEW_TIME){const clientId=randomBytes(16).toString('hex'),clientSecret=new SensitiveValue(randomBytes(32).toString('base64url'));return createLinkedInProfile({origin:'https://localhost',secrets:()=>({clientId,clientSecret}),review:SYNTHETIC_LINKEDIN_REVIEW,now});}
export function syntheticAttempt(check:()=>Promise<void>=async()=>undefined):OAuthAttempt{return{id:randomUUID(),authorizationId:randomUUID(),provider:'LINKEDIN',stateHash:'a'.repeat(64),expiresAt:Date.now()+60000,check};}
export async function localLinkedInDevelopment(){
 const root=await mkdtemp(join(tmpdir(),'bsa-linkedin-development-'));
 try{execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(root,'key.pem'),'-out',join(root,'cert.pem'),'-days','1','-subj','/CN=api.linkedin.com','-addext','subjectAltName=DNS:api.linkedin.com,DNS:www.linkedin.com'],{stdio:'ignore'});}catch{await rm(root,{recursive:true,force:true});throw new Error('Synthetic TLS fixture unavailable.');}
 const ca=await readFile(join(root,'cert.pem'),'utf8'),key=await readFile(join(root,'key.pem'),'utf8'),access=new SensitiveValue(randomBytes(32).toString('base64url'));
 const initial=()=>({token:{access_token:access.reveal(),expires_in:3600,token_type:'Bearer',scope:LINKEDIN_CONNECTION_SCOPES.join(' ')} as unknown,identity:{sub:randomBytes(16).toString('hex')} as unknown,organizations:authorizationResponse() as unknown,postId:'urn:li:share:123' as string|null,resetPost:false,status:200,raw:null as Buffer|null,onOperation:null as ((name:string)=>Promise<void>)|null});
 const state={...initial(),calls:[] as string[],headers:[] as {host:string;version:string|undefined;method:string|undefined;contentType:string|undefined;bearerMatches:boolean;cookiePresent:boolean}[],forms:[] as URLSearchParams[],posts:[] as Buffer[]};
 const server=createServer({key,cert:ca},(req:IncomingMessage,res:ServerResponse)=>{
  req.on('error',()=>undefined);res.on('error',()=>undefined);const chunks:Buffer[]=[];
  req.on('data',(chunk:Buffer)=>chunks.push(Buffer.from(chunk)));req.on('end',()=>{void(async()=>{
   const operation=req.url==='/oauth/v2/accessToken'?'TOKEN':req.url==='/v2/userinfo'?'IDENTITY':req.url?.startsWith('/rest/organizationAuthorizations?')?'DISCOVERY':req.url==='/rest/posts'?'CREATE':'INVALID';
   state.calls.push(operation);state.headers.push({host:req.headers.host??'',version:req.headers['linkedin-version'] as string|undefined,method:req.headers['x-restli-method'] as string|undefined,contentType:req.headers['content-type'],bearerMatches:req.headers.authorization==='Bearer '+access.reveal(),cookiePresent:req.headers.cookie!==undefined});
   if(operation==='TOKEN')state.forms.push(new URLSearchParams(Buffer.concat(chunks).toString()));if(operation==='CREATE')state.posts.push(Buffer.concat(chunks));
   await state.onOperation?.(operation);if(operation==='CREATE'){if(state.resetPost){res.destroy();return;}res.statusCode=201;if(state.postId!==null)res.setHeader('x-restli-id',state.postId);res.end();return;}
   res.statusCode=state.status;res.setHeader('Content-Type','application/json');res.end(state.raw??JSON.stringify(operation==='TOKEN'?state.token:operation==='IDENTITY'?state.identity:state.organizations));
  })().catch(()=>res.destroy());});
 });server.on('tlsClientError',()=>undefined);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Synthetic TLS fixture unavailable.');
 return{state,access,network:{port:address.port,ca,dialAddress:'127.0.0.1',resolve:async()=>['127.0.0.1']},reset(){Object.assign(state,initial());state.calls.length=0;state.headers.length=0;state.forms.length=0;state.posts.length=0;},async close(){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}};
}
