import { afterEach,describe,expect,it,vi } from 'vitest';
import { z } from 'zod';
import { Budget,LIMITS,TransportFault } from '../../src/server/provider-security/policy';
import { checkedURL,publicAddress,selectAddress,peerMatches } from '../../src/server/provider-security/network';
import { ingestJson,structuredBody } from '../../src/server/provider-security/response';
import { binding,authority,providerReference,recoverReference,safeDiagnostic,normalizeObservation,type Binding } from '../../src/server/provider-security/context';
export const B:Binding={workspaceId:'10000000-0000-4000-8000-000000000001',operationId:'10000000-0000-4000-8000-000000000002',snapshotId:'10000000-0000-4000-8000-000000000003',authorizationId:'10000000-0000-4000-8000-000000000004',destinationId:'10000000-0000-4000-8000-000000000005',authorizationVersion:1,destination:'synthetic:destination',provider:'LINKEDIN',capabilityRef:'fixture-v1',intentHash:'a'.repeat(64),media:false};
const denied=(work:()=>unknown)=>{let safe=false;try{work();}catch(e){safe=e instanceof TransportFault;}expect(safe).toBe(true);};
afterEach(()=>vi.useRealTimers());
describe('CONTRACT-2 URL/address security',()=>{
 // Parser-only placeholders on a reserved authority; never real authentication.
 const userinfo=new URL('https://fixture.test/x');userinfo.username='test';userinfo.password='test';
 for(const url of ['http://fixture.test/x',userinfo.href,'https://@fixture.test','https://fixture.test/#','https://fixture.test:444','https://fixture.test:0443','https://127.0.0.1','https://2130706433','https://0177.0.0.1','https://0x7f000001','https://[::1]','https://localhost','https://x.local','https://fixture.test.','https://fíxture.test','https://xn--fixture.test','https://fixture%2etest','https://fixture.test/../x','https://fixture.test/%2e%2e/x','https://fixture.test/\\x','https://fixture.test/\n','https://fixture.test/%QQ','https://other.test/'])it('rejects unsafe URL case '+url.replace(/[^a-z0-9]/ig,'').slice(0,40),()=>denied(()=>checkedURL(url,['fixture.test'])));
 it('allows canonical case/default port with exact authority',()=>expect(checkedURL('HTTPS://FIXTURE.TEST:443/x?opaque=fake',['fixture.test']).hostname).toBe('fixture.test'));
 for(const a of ['0.1.2.3','10.0.0.1','100.64.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.8.8.8','198.18.0.1','198.51.100.1','203.0.113.1','224.1.2.3','255.255.255.255','::','::1','fc00::1','fe80::1','ff02::1','::ffff:8.8.8.8','64:ff9b::808:808','2001::1','2001:db8::1','2002::1','3fff::1','not-an-ip'])it('denies frozen range '+a,()=>expect(publicAddress(a)).toBe(false));
 for(const a of ['8.8.8.8','1.1.1.1','100.63.255.255','172.15.255.255','198.17.255.255','2606:4700::1111'])it('accepts address candidate '+a,()=>expect(publicAddress(a)).toBe(true));
 it('rejects an unsafe tail in mixed DNS answers',()=>denied(()=>selectAddress(['8.8.8.8','127.0.0.1'])));
 it('rejects >16 answers without truncating',()=>denied(()=>selectAddress(Array(17).fill('8.8.8.8'))));
 it('selects numerically, not lexically',()=>expect(selectAddress(['8.8.8.10','8.8.8.2']).address).toBe('8.8.8.2'));
 it('requires matching peer; mapped OS representation only matches selected IPv4',()=>{expect(peerMatches('8.8.8.8','1.1.1.1')).toBe(false);expect(peerMatches('8.8.8.8','::ffff:8.8.8.8')).toBe(true);});
});
describe('bounded JSON ingestion',()=>{
 const object=z.object({ok:z.boolean()}).strict();
 for(const bytes of [Buffer.from('{"ok":true,"ok":false}'),Buffer.from('{"ok":true,"\\u006fk":false}'),Buffer.from('{broken'),Buffer.from([0xc3,0x28]),Buffer.from('[]'),Buffer.from('{"ok":true,"unknown":1}'),Buffer.from('{"__proto__":{}}')])it('rejects invalid/ambiguous shape safely '+bytes.length,()=>denied(()=>ingestJson(bytes,object,'SMALL_JSON_RESPONSE')));
 it('accepts strict bounded data',()=>expect(ingestJson(Buffer.from('{"ok":true}'),object,'STATUS_RESPONSE')).toEqual({ok:true}));
 it('rejects >64KiB before parser',()=>denied(()=>ingestJson(Buffer.alloc(65537),z.unknown(),'SMALL_JSON_RESPONSE')));
 it('rejects >16KiB status body',()=>denied(()=>ingestJson(Buffer.alloc(16385),z.unknown(),'STATUS_RESPONSE')));
 it('rejects >16 nesting',()=>denied(()=>ingestJson(Buffer.from('['.repeat(17)+'0'+']'.repeat(17)),z.unknown(),'SMALL_JSON_RESPONSE')));
 it('rejects >2048 nodes within per-array bound',()=>denied(()=>ingestJson(Buffer.from(JSON.stringify(Array.from({length:16},()=>Array(128).fill(0)))),z.unknown(),'SMALL_JSON_RESPONSE')));
 it('rejects >256 elements',()=>denied(()=>ingestJson(Buffer.from(JSON.stringify(Array(257).fill(0))),z.unknown(),'SMALL_JSON_RESPONSE')));
 it('rejects long strings',()=>denied(()=>ingestJson(Buffer.from(JSON.stringify('x'.repeat(16385))),z.unknown(),'SMALL_JSON_RESPONSE')));
 it('rejects non-finite numbers',()=>denied(()=>ingestJson(Buffer.from('{"a":1e9999}'),z.unknown(),'SMALL_JSON_RESPONSE')));
 it('rejects structured request >32KiB before send',()=>denied(()=>structuredBody({data:'x'.repeat(32768)},z.object({data:z.string()}).strict())));
});
describe('binding/reconciliation/error projection',()=>{
 it('freezes exact snapshot binding',()=>expect(Object.isFrozen(binding(B))).toBe(true));
 for(const status of ['REVOKED','DISCONNECTED','EXPIRED','REAUTH_REQUIRED','RECONNECT_REQUIRED','LIMITED'])it('denies invalid connection '+status,()=>denied(()=>authority(B,{binding:B,status,expiresAt:Date.now()+1000,refreshLease:false,scopes:[]})));
 it('denies N+1 despite same identity/destination/scopes',()=>denied(()=>authority(B,{binding:{...B,authorizationVersion:2},status:'CONNECTED',expiresAt:Date.now()+1000,refreshLease:false,scopes:[]})));
 it('recovers original reference despite later UNKNOWN null',()=>{const ref=providerReference(B,'PROCESSING','synthetic-publish-id');expect(recoverReference(B,[{binding:B,reference:ref},{binding:B,reference:null}],'PROCESSING').id).toBe(ref.id);});
 it('fails closed on conflicting references',()=>denied(()=>recoverReference(B,[{binding:B,reference:providerReference(B,'PROCESSING','one')},{binding:B,reference:providerReference(B,'PROCESSING','two')}],'PROCESSING')));
 for(const key of ['workspaceId','operationId','provider'] as const)it('denies cross-context reference '+key,()=>denied(()=>recoverReference(B,[{binding:{...B,[key]:key==='provider'?'TIKTOK':'20000000-0000-4000-8000-000000000001'},reference:null}],'CONTENT')));
 for(const family of ['password','bearer','api_key','oauth_code','oauth_state','cookie','session','pkce','refresh_token','database_url','capability_url','authorization'])it('omits synthetic secret family '+family,()=>{const sentinel='SYNTHETIC_TEST_ONLY_'+family;const input={stage:'BODY',code:'BODY_INVALID',operationId:B.operationId,raw:sentinel,cause:{message:sentinel},url:'https://fixture.test/'+sentinel};const output=JSON.stringify(safeDiagnostic(input));expect(output.includes(sentinel)).toBe(false);expect(output.length<=LIMITS.log).toBe(true);});
 it('does not invoke diagnostic getters',()=>{let touched=false;safeDiagnostic(Object.defineProperty({},'code',{get(){touched=true;throw new Error();}}));expect(touched).toBe(false);});
 it('clamps numeric observations',()=>expect(safeDiagnostic({durationMs:1e12,sentBytes:-3})).toMatchObject({durationMs:30000,sentBytes:0}));
});
describe('parent deadlines',()=>{
 it('cannot extend parent via later child creation',async()=>{vi.useFakeTimers();const p=new Budget(10000);const later=new Budget(30000,p.end,p.signal);const result=later.phase(30000,()=>new Promise(()=>undefined)).then(()=>false,()=>true);await vi.advanceTimersByTimeAsync(10000);expect(await result).toBe(true);p.dispose();later.dispose();});
 it('enforces the DNS phase budget without arbitrary sleeps',async()=>{vi.useFakeTimers();const b=new Budget(10000);const result=b.phase(LIMITS.dnsMs,()=>new Promise(()=>undefined)).then(()=>false,()=>true);await vi.advanceTimersByTimeAsync(3000);expect(await result).toBe(true);b.dispose();});
});

it('UNKNOWN observation cannot be turned into publication by HTTP-style success',()=>denied(()=>normalizeObservation(B,{state:'PUBLISHED',reference:null,observedAt:new Date(),publishedAt:null,safeCode:null})));
it('read-only observation requires exact workspace/provider reference binding',()=>denied(()=>normalizeObservation(B,{state:'PROCESSING',reference:providerReference({...B,provider:'TIKTOK'},'PROCESSING','one'),observedAt:new Date(),publishedAt:null,safeCode:null})));
it('normalizes only a closed safe UNKNOWN observation',()=>expect(normalizeObservation(B,{state:'UNKNOWN',reference:null,observedAt:new Date(),publishedAt:null,safeCode:'OUTCOME_UNKNOWN'}).state).toBe('UNKNOWN'));
it('hostile diagnostic Proxy cannot leak through a thrown error',()=>expect(JSON.stringify(safeDiagnostic(new Proxy({},{getOwnPropertyDescriptor(){throw new Error('SYNTHETIC_TEST_ONLY_SECRET');}}))).includes('SYNTHETIC_TEST_ONLY')).toBe(false));

it('URL-shaped capability cannot masquerade as a persistable safe provider ID',()=>denied(()=>providerReference(B,'PROCESSING','https://fixture.test/SYNTHETIC_TEST_ONLY_CAP')));
