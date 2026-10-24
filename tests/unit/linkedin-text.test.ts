import { describe,it,expect } from 'vitest';
import { linkedinPost,linkedinAuthorized,linkedinConnectionPerson,createTestLinkedInProvider } from '../../src/server/publishing/linkedin-text';
import { linkedinPostId,LINKEDIN_AUTH_PATH } from '../../src/server/provider-security/linkedin';
import { structuredBody } from '../../src/server/provider-security/response';
import { z } from 'zod';
import { authorizationResource,authorizationResponse,linkedinIntent,TEST_LINKEDIN_VERSION } from '../helpers/linkedin-fixtures';

describe('LinkedIn immutable text and identifiers',()=>{
 it('maps only exact approved Unicode/newlines and fixed provider fields',()=>{const input=linkedinIntent();input.content={caption:'بسم اللہ\nApproved https://example.test/a',hashtags:[]};const out=linkedinPost(input);expect(Buffer.from(out.commentary).equals(Buffer.from(input.content.caption))).toBe(true);expect(out).toEqual({author:'urn:li:organization:123',commentary:input.content.caption,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false});});
 it('does not append hashtags; requires their already-approved exact suffix',()=>{const input=linkedinIntent();input.content={caption:'Approved',hashtags:['#synthetic']};expect(()=>linkedinPost(input)).toThrow();input.content.caption+='\n\n#synthetic';expect(linkedinPost(input).commentary).toBe(input.content.caption);});
 it.each([{destination:'urn:li:person:1'},{destination:'https://example.test'},{provider:'META'},{platform:'FACEBOOK'},{visibility:'PRIVATE'},{lifecycleState:'DRAFT'},{assets:[{}]},{distribution:{feedDistribution:'NONE'}},{content:{caption:'x'.repeat(3001),hashtags:[]}},{content:{caption:'\r\n',hashtags:[]}},{content:{caption:'',hashtags:[]}}])('rejects unsupported intent before network %#',patch=>expect(()=>linkedinPost({...linkedinIntent(),...patch})).toThrow());
 it('retains the structured 32KiB request ceiling independently of provider claims',()=>expect(()=>structuredBody({value:'x'.repeat(32768)},z.object({value:z.string()}))).toThrow());
 it.each(['urn:li:share:1','urn:li:ugcPost:12345678901234567890'])('accepts project-safe ID %s',id=>expect(linkedinPostId(id)).toBe(id));
 it.each(['urn:li:share:0','urn:li:share:-1','urn:li:share:+1','urn:li:share:01','urn:li:share:１','urn:li:share:1 ','urn:li:share:1?x=1','urn:li:share:1#x','urn:li:share:1:2','urn:li:person:1','urn:li:share:','urn:li:share:123456789012345678901','https://example.test/a','urn:li:share:1\nInjected','x'.repeat(257)])('rejects unsafe post identifier %#',id=>expect(()=>linkedinPostId(id)).toThrow());
 it('does not reinterpret an opaque legacy subject as a person URN',()=>{expect(linkedinConnectionPerson('opaque-member')).toBeNull();expect(linkedinConnectionPerson('urn:li:person:synthetic')).toBe('urn:li:person:synthetic');expect(()=>linkedinConnectionPerson('urn:li:organization:123')).toThrow();});
 it('has the exact fixed uppercase BatchFinder criterion and bq selector',()=>expect(LINKEDIN_AUTH_PATH).toBe('/rest/organizationAuthorizations?authorizationActions=List((OrganizationContentAuthorizationAction:(actionType:ORGANIC_SHARE_CREATE)))&bq=authorizationActionsAndImpersonator'));
 it('cannot construct even the test provider outside test runtime',()=>{const previous=process.env.APP_ENV;try{process.env.APP_ENV='production';expect(()=>createTestLinkedInProvider({version:TEST_LINKEDIN_VERSION,port:1,ca:'synthetic'})).toThrow();}finally{process.env.APP_ENV=previous;}});
});
describe('LinkedIn strict complete single-page authorization',()=>{
 it('requires one Approved exact target, bound to authenticated context',()=>expect(linkedinAuthorized(authorizationResponse(),'urn:li:organization:123','urn:li:person:synthetic')).toBe(true));
 it('other valid organizations never authorize a missing target',()=>{const response=authorizationResponse();response.elements[0]!.elements=[authorizationResource('urn:li:organization:456')];expect(()=>linkedinAuthorized(response,'urn:li:organization:123',null)).toThrow();});
 it('can ignore another valid organization only after validating the complete bound response',()=>{const response=authorizationResponse();response.elements[0]!.elements.push(authorizationResource('urn:li:organization:456'));response.elements[0]!.paging={start:0,count:2,total:2};expect(linkedinAuthorized(response,'urn:li:organization:123',null)).toBe(true);});
 it.each(['denied','missing','duplicate','conflict','unknown-status','wrong-action','wrong-member','mixed-member','missing-paging','partial','continuation','too-many','extra-result','malformed'])( '%s cannot authorize',scenario=>{
  const response=authorizationResponse() as {elements:Record<string,unknown>[]};const batch=response.elements[0]!;const target=authorizationResource() as unknown as Record<string,unknown>;
  batch.elements=[target];
  if(scenario==='denied')target.status={'com.linkedin.organization.Denied':{reasons:[]}};
  if(scenario==='missing')batch.elements=[];
  if(scenario==='duplicate'||scenario==='conflict'){const second=authorizationResource() as unknown as Record<string,unknown>;if(scenario==='conflict')second.status={'com.linkedin.organization.Denied':{}};batch.elements=[target,second];batch.paging={start:0,count:2,total:2};}
  if(scenario==='unknown-status')target.status={Unknown:{}};
  if(scenario==='wrong-action')target.action={OrganizationContentAuthorizationActionType:{actionType:'ORGANIC_SHARE_DELETE'}};
  if(scenario==='wrong-member')target.impersonator='urn:li:person:other';
  if(scenario==='mixed-member'){batch.elements=[target,authorizationResource('urn:li:organization:456','urn:li:person:other')];batch.paging={start:0,count:2,total:2};}
  if(scenario==='missing-paging')delete batch.paging;
  if(scenario==='partial')batch.paging={start:0,count:1,total:2};
  if(scenario==='continuation')batch.paging={start:0,count:1,total:1,next:'https://example.test/next'};
  if(scenario==='too-many'){batch.elements=Array.from({length:21},()=>authorizationResource());batch.paging={start:0,count:21,total:21};}
  if(scenario==='extra-result')response.elements.push(batch);
  if(scenario==='malformed')target.organization={id:'123'};
  expect(()=>linkedinAuthorized(response,'urn:li:organization:123','urn:li:person:synthetic')).toThrow();
 });
});
