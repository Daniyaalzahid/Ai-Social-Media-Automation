import { randomUUID,randomBytes } from 'node:crypto';
import { beforeAll,afterAll,beforeEach,it,expect } from 'vitest';
import { scratchDatabase,resetScratch } from './phase2b-helpers';
import { contentActor,contentDraft,fullContent } from '../helpers/content-fixtures';
import { publishProof } from '../helpers/publishing-fixtures';
import { localLinkedIn,authorizationResponse,TEST_LINKEDIN_VERSION } from '../helpers/linkedin-fixtures';
import { createPublishingService } from '../../src/server/publishing/service';
import { createTestLinkedInProvider } from '../../src/server/publishing/linkedin-text';
import { createContentService } from '../../src/server/content/service';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { encryptToken } from '../../src/server/social/crypto';
import { BRAND_ID } from '../../src/features/brand/model';
import { CREATIVE } from '../../src/server/ai/policy';
import { publishHash } from '../../src/server/publishing/policy';
const target=scratchDatabase('bsa_test_recovery'),db=target.handle.db,key={key:randomBytes(32),id:'primary-v1'};
let remote:Awaited<ReturnType<typeof localLinkedIn>>;
beforeAll(async()=>{await resetScratch(target);remote=await localLinkedIn();});
afterAll(async()=>{await remote.close();await target.handle.close();});
beforeEach(()=>{Object.assign(remote.state,{authorization:authorizationResponse(),authorizationStatus:200,authorizationRaw:null,postStatus:201,postId:'urn:li:share:123',postBody:Buffer.alloc(0),authCalls:0,postCalls:0,onAuthorization:null,onPost:null});remote.state.bodies.length=0;remote.state.targets.length=0;remote.state.headers.length=0;});
function service(){const provider=createTestLinkedInProvider({version:TEST_LINKEDIN_VERSION,port:remote.port,ca:remote.ca});return createPublishingService(db,{environment:'test',providers:new Map([['LINKEDIN',provider]]),tokenKey:()=>key});}
async function fixture(role:'OWNER'|'MARKETING_ADMIN'='OWNER'){
 const actor=await contentActor(db,role),content=createContentService(db),caption=CREATIVE.ENGLISH.LINKEDIN[0]!;
 let detail=fullContent(await content.mutate(actor.raw,{action:'create',requestId:randomUUID(),draft:contentDraft({content:{LINKEDIN:{caption,hashtags:[]}}})}));
 detail=fullContent(await content.mutate(actor.raw,{action:'submit',requestId:randomUUID(),postId:detail.id,revisionId:detail.latestRevisionId}));const submission=detail.reviews.find(row=>row.state==='PENDING')!;
 detail=fullContent(await content.mutate(actor.raw,{action:'decide',requestId:randomUUID(),postId:detail.id,revisionId:submission.revisionId,submissionId:submission.id,decision:'APPROVED',note:''}));
 const decision=await db.selectFrom('content_decisions').select('id').where('submission_id','=',submission.id).executeTakeFirstOrThrow(),authorization=randomUUID(),destination=randomUUID(),now=new Date(),member='urn:li:person:'+authorization;
 const defaultAuth=authorizationResponse();defaultAuth.elements[0]!.elements[0]!.impersonator=member;remote.state.authorization=defaultAuth;
 await db.insertInto('social_authorizations').values({id:authorization,brand_id:BRAND_ID,provider:'LINKEDIN',connected_by:actor.id,subject:member,status:'CONNECTED',version:1,scopes_json:JSON.stringify(['rw_organization_admin','w_organization_social']),selected_id:null,created_at:now,expires_at:new Date(+now+3600000),refresh_expires_at:null,refresh_lease:null}).execute();
 await db.insertInto('social_destinations').values({id:destination,authorization_id:authorization,brand_id:BRAND_ID,provider:'LINKEDIN',remote_id:'123',kind:'LINKEDIN_ORGANIZATION',display_name:'Synthetic organization',handle:null,active:1}).execute();
 await db.updateTable('social_authorizations').set({selected_id:destination}).where('id','=',authorization).execute();const access=new SensitiveValue(randomBytes(32).toString('base64url'));
 await db.insertInto('social_credentials').values({authorization_id:authorization,purpose:'access',version:1,...encryptToken(access,key,{id:authorization,provider:'LINKEDIN',purpose:'access',version:1})}).execute();
 const selection={requestId:randomUUID(),postId:detail.id,revisionId:detail.approvedRevisionId!,approvalDecisionId:decision.id,destinationId:destination,platform:'LINKEDIN' as const,authorizationVersion:1};return{actor,authorization,destination,selection,detail,caption,access,member};
}
it.each(['OWNER','MARKETING_ADMIN'] as const)('%s gets fresh verified preflight and exact immutable PUBLISHED event',async role=>{
 const f=await fixture(role),s=service(),preview=await s.preview(f.actor.raw,f.selection),proof=await publishProof(db,f.actor.id,preview.command),result=await s.publish(f.actor.raw,proof,preview.command);
 expect(result.state).toBe('PUBLISHED');expect(remote.state.authCalls).toBe(1);expect(remote.state.postCalls).toBe(1);expect(JSON.parse(remote.state.bodies[0]!.toString()).commentary).toBe(f.caption);
 const snapshot=await db.selectFrom('publish_snapshots').selectAll().where('id','=',result.id).executeTakeFirstOrThrow();expect(snapshot.copy_hash.equals(publishHash(preview.content))).toBe(true);expect(snapshot.authorization_version).toBe(1);
 const events=await db.selectFrom('publish_events').selectAll().where('operation_id','=',result.id).orderBy('sequence').execute();expect(events.map(e=>e.state)).toEqual(['CREATED','DISPATCHING','PUBLISHED']);expect(events[2]!.remote_publication_id?.toString()).toBe('urn:li:share:123');expect(events[2]!.published_at).toBeInstanceOf(Date);expect(JSON.stringify(events).includes(f.access.reveal())).toBe(false);
 expect((await s.publish(f.actor.raw,proof,preview.command)).id).toBe(result.id);expect(remote.state.authCalls).toBe(1);expect(remote.state.postCalls).toBe(1);
});
it.each(['CONTENT_CREATOR','REVIEWER','VIEWER'] as const)('%s cannot enter the LinkedIn dispatch path',async role=>{const f=await fixture(),actor=await contentActor(db,role);await expect(service().preview(actor.raw,f.selection)).rejects.toThrow();expect(remote.state.authCalls).toBe(0);expect(remote.state.postCalls).toBe(0);});
it.each(['denied','missing','partial','malformed','oversized','403','429','503'] as const)('%s preflight becomes LOCAL FAILED without DISPATCHING or UNKNOWN',async scenario=>{
 const f=await fixture(),s=service(),preview=await s.preview(f.actor.raw,f.selection),proof=await publishProof(db,f.actor.id,preview.command);
 if(scenario==='denied')remote.state.authorization={elements:[{elements:[{impersonator:f.member,organization:'urn:li:organization:123',action:{OrganizationContentAuthorizationActionType:{actionType:'ORGANIC_SHARE_CREATE'}},status:{'com.linkedin.organization.Denied':{reasons:[]}}}],paging:{start:0,count:1,total:1}}]};
 if(scenario==='missing')remote.state.authorization={elements:[{elements:[],paging:{start:0,count:0,total:0}}]};
 if(scenario==='partial'){const r=authorizationResponse();r.elements[0]!.elements[0]!.impersonator=f.member;r.elements[0]!.paging.total=2;remote.state.authorization=r;}
 if(scenario==='malformed')remote.state.authorizationRaw=Buffer.from('{');
 if(scenario==='oversized')remote.state.authorizationRaw=Buffer.alloc(16385,32);
 if(['403','429','503'].includes(scenario))remote.state.authorizationStatus=Number(scenario);
 const result=await s.publish(f.actor.raw,proof,preview.command);expect(result.state).toBe('FAILED');expect(remote.state.authCalls).toBe(1);expect(remote.state.postCalls).toBe(0);
 const events=await db.selectFrom('publish_events').selectAll().where('operation_id','=',result.id).orderBy('sequence').execute();expect(events.map(e=>e.state)).toEqual(['CREATED','FAILED']);expect(events[1]!.boundary).toBe('LOCAL');expect(events[1]!.remote_publication_id).toBeNull();
});
it.each(['connection-version','credential-version','selection','revocation'] as const)('%s change after preflight aborts before POST',async scenario=>{
 const f=await fixture(),s=service(),preview=await s.preview(f.actor.raw,f.selection),proof=await publishProof(db,f.actor.id,preview.command);
 remote.state.onAuthorization=async()=>{if(scenario==='connection-version')await db.updateTable('social_authorizations').set({version:2}).where('id','=',f.authorization).execute();if(scenario==='credential-version')await db.updateTable('social_credentials').set({version:2}).where('authorization_id','=',f.authorization).execute();if(scenario==='selection')await db.updateTable('social_authorizations').set({selected_id:null}).where('id','=',f.authorization).execute();if(scenario==='revocation')await db.updateTable('social_authorizations').set({status:'DISCONNECTED'}).where('id','=',f.authorization).execute();};
 expect((await s.publish(f.actor.raw,proof,preview.command)).state).toBe('FAILED');expect(remote.state.postCalls).toBe(0);
});
it.each(['rw_organization_admin','w_organization_social'])('legacy CONNECTED missing %s cannot admit',async missing=>{const f=await fixture();await db.updateTable('social_authorizations').set({scopes_json:JSON.stringify(['rw_organization_admin','w_organization_social'].filter(s=>s!==missing))}).where('id','=',f.authorization).execute();await expect(service().preview(f.actor.raw,f.selection)).rejects.toThrow();expect(remote.state.authCalls).toBe(0);expect(remote.state.postCalls).toBe(0);});
it('post ambiguity persists UNKNOWN and uniqueness forbids another create',async()=>{const f=await fixture(),s=service(),preview=await s.preview(f.actor.raw,f.selection),proof=await publishProof(db,f.actor.id,preview.command);remote.state.onPost=(_req,res)=>res.destroy();const result=await s.publish(f.actor.raw,proof,preview.command);expect(result.state).toBe('UNKNOWN');await s.publish(f.actor.raw,proof,preview.command);expect(remote.state.authCalls).toBe(1);expect(remote.state.postCalls).toBe(1);const events=await db.selectFrom('publish_events').selectAll().where('operation_id','=',result.id).orderBy('sequence').execute();expect(events.map(e=>e.state)).toEqual(['CREATED','DISPATCHING','UNKNOWN']);});
it('purpose-bound proof and exact snapshot remain required',async()=>{const f=await fixture(),s=service(),preview=await s.preview(f.actor.raw,f.selection);await expect(s.publish(f.actor.raw,new SensitiveValue(randomBytes(32).toString('base64url')),preview.command)).rejects.toThrow();await expect(s.authorizeStepUp(f.actor.raw,{...preview.command,intentHash:'0'.repeat(64)})).rejects.toThrow();expect(remote.state.authCalls).toBe(0);});
