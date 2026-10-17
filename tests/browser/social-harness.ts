/** Standalone loopback test server, never linked into production Next routes. */
import { createServer } from 'node:http';
import { build } from 'vite';
import { randomBytes } from 'node:crypto';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { createConnectionsService } from '../../src/server/social/service';
import { tokenHash } from '../../src/server/auth/access';
import { authorizationContext,requirePermission } from '../../src/server/authorization/authorization';
import { FakeSocialProvider,integrationProof } from '../helpers/social-fixtures';
import { SensitiveValue } from '../../src/server/security/sensitive';
import {contentDatabaseDiagnostic} from '../helpers/content-database-diagnostic';
import { csrfToken,verifyBrowserRequest,decodeBrowserJson } from '../../src/server/auth/browser-security';
export async function socialBrowserHarness(rawToken:string){
 const configuration=resolveDatabaseConfiguration(process.env,'migration');if(configuration.mode!=='development'||configuration.database!=='bsa_dev_browser_tests'||configuration.user!=='bsa_dev_browser_migration')throw new Error('Isolated browser database required');
 const db=createDatabase(configuration),raw=new SensitiveValue(rawToken),key={key:randomBytes(32),id:'primary-v1'},csrfKey=randomBytes(32);
 const bundle=await build({configFile:false,logLevel:'silent',oxc:{jsx:{runtime:'automatic'}},define:{'process.env.NODE_ENV':'"development"'},build:{write:false,minify:false,lib:{entry:'tests/browser/social-harness-client.tsx',name:'SocialHarness',formats:['iife']}}});
 const output=Array.isArray(bundle)?bundle[0]:bundle;if(!output||!('output' in output))throw new Error('Test bundle unavailable');const script=output.output.find(c=>c.type==='chunk');if(!script||script.type!=='chunk')throw new Error('Test bundle unavailable');

 const trace=contentDatabaseDiagnostic(db.db),events:string[]=[];
 let origin='',service:ReturnType<typeof createConnectionsService>,provider:FakeSocialProvider;
 const server=createServer(async(req,res)=>{
  const json=(data:unknown,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{const url=new URL(req.url!,origin);if(req.method==='GET'&&url.pathname==='/client.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(script.code);return;}
   if(req.method==='GET'&&url.pathname==='/api/auth'){json({csrf:csrfToken(csrfKey,'session',rawToken)});return;}
   if(url.pathname==='/api/connections'){
    if(req.method==='GET'){json({ok:true,view:await service.read(raw)});return;}
    if(req.method!=='POST')throw new Error();const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
    if(!verifyBrowserRequest(headers,{origin,key:csrfKey},'session',rawToken))throw new Error();const parts:Buffer[]=[];let size=0;for await(const part of req){const b=Buffer.from(part);size+=b.length;if(size>4096)throw new Error();parts.push(b);}
    const input=decodeBrowserJson(Buffer.concat(parts)) as {operation:string;mutation:unknown;proof:string};
    if(input.operation==='step-up'){
     // Purpose-bound proof fixture only: shared password/MFA behavior remains covered by access tests.
     requirePermission(await authorizationContext(db.db,raw),'integrations.manage');const session=await db.db.selectFrom('sessions').select('user_id').where('token_hash','=',tokenHash(raw)).executeTakeFirstOrThrow();
     const proof=await integrationProof(db.db,{id:session.user_id,raw},input.mutation);json({ok:true,proof:proof.reveal()});return;
    }
    json({ok:true,...await service.mutate(raw,new SensitiveValue(input.proof),input.mutation)});return;
   }
   if(req.method==='GET'&&url.pathname==='/test-provider'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});const next='/api/oauth/tiktok/callback?state='+encodeURIComponent(url.searchParams.get('state')!)+'&code=synthetic';res.end('<a href="'+next.replaceAll('&','&amp;')+'">Authorize deterministic provider</a>');return;}
   if(req.method==='GET'&&url.pathname==='/api/oauth/tiktok/callback'){const ok=await service.callback(raw,'TIKTOK',url.search);events.push(ok?'callback:complete':'callback:failed');res.writeHead(303,{Location:'/connections?result='+(ok?'complete':'restart'),'Referrer-Policy':'no-referrer'});res.end();return;}
   if(req.method==='GET'&&url.pathname==='/connections'){const initial=JSON.stringify(await service.read(raw)).replaceAll('<','\\u003c');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html><html><body><div id="root"></div><script>window.socialFixture='+initial+'</script><script src="/client.js"></script></body></html>');return;}
   json({ok:false},404);
  }catch(e){events.push(e instanceof Error?e.name:'unknown');json({ok:false},400);}
 });
 try{await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error();origin='http://localhost:'+address.port;provider=new FakeSocialProvider(origin);service=createConnectionsService(db.db,{origin,key:()=>key,providers:new Map([['TIKTOK',provider]]),environment:'test'});
  return{origin,provider,diagnostic:()=>({events,exchanges:provider.exchanges,database:trace.report()}),close:async()=>{trace.close();const owned=await db.db.selectFrom('social_authorizations').select('id').where('subject','=',provider.subject).execute();for(const a of owned){await db.db.deleteFrom('social_credentials').where('authorization_id','=',a.id).execute();await db.db.deleteFrom('social_transactions').where('target_id','=',a.id).execute();await db.db.deleteFrom('social_destinations').where('authorization_id','=',a.id).execute();await db.db.deleteFrom('social_authorizations').where('id','=',a.id).execute();}await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await db.close();}};
 }catch(e){server.close();await db.close();throw e;}
}
