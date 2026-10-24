import { reviewedLinkedInProfile,type LinkedInProfile } from '../provider-security/linkedin-profile';
import type { NetworkTestHooks } from '../provider-security/network';
import { z } from 'zod';
import { socialPackSchema } from '../../features/ai/model';
import { Budget,LIMITS,TransportFault } from '../provider-security/policy';
import { authority,binding,sameBinding } from '../provider-security/context';
import { createReviewedOperationTransport,type ReviewedProfile } from '../provider-security/transport';
import { LINKEDIN_AUTH_PATH,LINKEDIN_POST_PATH,LINKEDIN_SCOPES,linkedinVersion,linkedinPostId } from '../provider-security/linkedin';
import { structuredBody } from '../provider-security/response';
import { PreDispatchFailure,type ProviderIntent,type PublishingProvider,type PublishingConnection,type PreparedPublication } from './provider';

const orgId=z.string().regex(/^[1-9][0-9]{0,19}$/);
const person=z.string().max(200).regex(/^urn:li:person:[A-Za-z0-9_-]+$/);
const org=z.string().max(200).regex(/^urn:li:organization:[1-9][0-9]{0,19}$/);
const content=socialPackSchema.shape.LINKEDIN.unwrap();
const intentSchema=z.object({provider:z.literal('LINKEDIN'),platform:z.literal('LINKEDIN'),destination:orgId,content,assets:z.array(z.never()).max(0),operationId:z.uuid().optional(),intentHash:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict();
export const linkedinPostSchema=z.object({author:org,commentary:z.string(),visibility:z.literal('PUBLIC'),distribution:z.object({feedDistribution:z.literal('MAIN_FEED'),targetEntities:z.array(z.never()).max(0),thirdPartyDistributionChannels:z.array(z.never()).max(0)}).strict(),lifecycleState:z.literal('PUBLISHED'),isReshareDisabledByAuthor:z.literal(false)}).strict();
export function linkedinPost(value:unknown){
 try{
  const input=intentSchema.parse(value),caption=input.content.caption,tags=input.content.hashtags;
  if(!caption.trim()||Buffer.byteLength(caption)>12000||tags.length&&!caption.endsWith('\n\n'+tags.join(' ')))throw new PreDispatchFailure('VALIDATION','INVALID');
  const body=linkedinPostSchema.parse({author:'urn:li:organization:'+input.destination,commentary:caption,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false});
  structuredBody(body,linkedinPostSchema);return body;
 }catch{throw new PreDispatchFailure('VALIDATION','INVALID');}
}
const approved=z.object({'com.linkedin.organization.Approved':z.object({}).strict()}).strict();
const denied=z.object({'com.linkedin.organization.Denied':z.object({reasons:z.array(z.unknown()).max(20).optional()}).strict()}).strict();
const resource=z.object({impersonator:person,organization:org,action:z.object({OrganizationContentAuthorizationActionType:z.object({actionType:z.literal('ORGANIC_SHARE_CREATE')}).strict()}).strict(),status:z.union([approved,denied])}).strict();
export const linkedinAuthorizationSchema=z.object({elements:z.array(z.object({elements:z.array(resource).max(20),paging:z.object({start:z.literal(0),count:z.number().int().min(0).max(20),total:z.number().int().min(0).max(20)}).strict(),isError:z.literal(false).optional(),error:z.null().optional(),metadata:z.unknown().optional()}).strict()).length(1)}).strict();
export function linkedinAuthorized(value:unknown,organization:string,expectedPerson:string|null){
 try{
  org.parse(organization);if(expectedPerson!==null)person.parse(expectedPerson);
  const batch=linkedinAuthorizationSchema.parse(value).elements[0]!;
  if(batch.paging.total!==batch.elements.length||batch.paging.count!==batch.elements.length||!batch.elements.length)throw new Error();
  const member=expectedPerson??batch.elements[0]!.impersonator;
  if(batch.elements.some(item=>item.impersonator!==member))throw new Error();
  const targets=batch.elements.filter(item=>item.organization===organization);
  if(targets.length!==1||!('com.linkedin.organization.Approved' in targets[0]!.status))throw new Error();
  return true as const;
 }catch{throw new PreDispatchFailure('AUTHORIZATION','ACCESS_LOST');}
}
/** Same complete, member-consistent authorization contract for initial discovery. */
export function linkedinOrganizations(value:unknown){
 try{const batch=linkedinAuthorizationSchema.parse(value).elements[0]!;
  if(!batch.elements.length||batch.paging.count!==batch.elements.length||batch.paging.total!==batch.elements.length||new Set(batch.elements.map(r=>r.organization)).size!==batch.elements.length||batch.elements.some(r=>r.impersonator!==batch.elements[0]!.impersonator))throw new Error();
  const ids=batch.elements.filter(r=>'com.linkedin.organization.Approved' in r.status).map(r=>r.organization.slice('urn:li:organization:'.length));if(!ids.length)throw new Error();return ids;
 }catch{throw new PreDispatchFailure('AUTHORIZATION','ACCESS_LOST');}
}
const officialPublishers=new WeakSet<object>();
export function isReviewedLinkedInPublisher(value:PublishingProvider){return officialPublishers.has(value);}
export function createReviewedLinkedInPublisher(profile:LinkedInProfile,testNetwork?:NetworkTestHooks|undefined):PublishingProvider{
 reviewedLinkedInProfile(profile);const result=linkedInPublisher({version:profile.version,network:testNetwork,official:profile});officialPublishers.add(result);return result;
}
/** Opaque legacy subjects are not reinterpreted as person URNs. */
export function linkedinConnectionPerson(subject:unknown):string|null{
 if(typeof subject!=='string'||!/^[A-Za-z0-9:_-]{1,200}$/.test(subject))throw new PreDispatchFailure('AUTHORIZATION','ACCESS_LOST');
 if(subject.startsWith('urn:')){const result=person.safeParse(subject);if(!result.success)throw new PreDispatchFailure('AUTHORIZATION','ACCESS_LOST');return result.data;}
 return null;
}

/** Only loopback TLS is constructible here. No production profile/version is registered. */
export function createTestLinkedInProvider(options:{version:string;port:number;ca:string}):PublishingProvider{
 if(process.env.NODE_ENV!=='test'||process.env.APP_ENV!=='test'||!Number.isInteger(options.port)||options.port<1||options.port>65535||!options.ca)throw new PreDispatchFailure('CAPABILITY','UNSUPPORTED');
 return linkedInPublisher({version:options.version,network:{port:options.port,ca:options.ca,dialAddress:'127.0.0.1',resolve:async()=>['127.0.0.1']}});
}
function linkedInPublisher(options:{version:string;network?:NetworkTestHooks|undefined;official?:LinkedInProfile|undefined}):PublishingProvider{
 const version=linkedinVersion(options.version),capabilityRef=(options.official?'linkedin-text-reviewed-':'linkedin-text-test-')+version,network=options.network;
 const ready=()=>{if(options.official)reviewedLinkedInProfile(options.official);};
 const profile=(operation:'AUTHORIZATION'|'CREATE'):ReviewedProfile=>({key:operation,provider:'LINKEDIN',capabilityRef,endpointClass:'STATIC_PROVIDER_API_ENDPOINT',authorities:['api.linkedin.com'],path:operation==='AUTHORIZATION'?LINKEDIN_AUTH_PATH:LINKEDIN_POST_PATH,method:operation==='AUTHORIZATION'?'GET':'POST',audience:'api.linkedin.com',requiredScopes:LINKEDIN_SCOPES,requestClass:operation==='AUTHORIZATION'?'EMPTY':'STRUCTURED',responseClass:operation==='AUTHORIZATION'?'STATUS_RESPONSE':'SMALL_JSON_RESPONSE',requestSchema:operation==='AUTHORIZATION'?z.never():linkedinPostSchema,responseSchema:operation==='AUTHORIZATION'?linkedinAuthorizationSchema:z.never(),contentType:'application/json',version:{kind:'PINNED',value:version},linkedin:operation});
 return Object.freeze({
  mode:options.official?'official' as const:'test' as const,provider:'LINKEDIN' as const,platform:'LINKEDIN' as const,capabilityRef,requiredScopes:LINKEDIN_SCOPES,
  validate:(intent:Omit<ProviderIntent,'operationId'|'intentHash'>)=>{ready();linkedinPost(intent);},
  async prepare(intent:ProviderIntent,source:PublishingConnection):Promise<PreparedPublication>{
   const budget=new Budget(LIMITS.mediaMs);let used=false;
   const b=binding(source.binding);let disposed=false;
   const current=async()=>{ready();if(options.official&&!options.official.acceptSubject(source.subject))throw new PreDispatchFailure();const a=await source.authority();authority(b,a,LINKEDIN_SCOPES);if(disposed)throw new PreDispatchFailure();return a;};
   let body:ReturnType<typeof linkedinPost>;
   try{
    body=linkedinPost(intent);
    if(b.provider!=='LINKEDIN'||b.media||b.operationId!==intent.operationId||b.snapshotId!==intent.operationId||b.intentHash!==intent.intentHash||b.destination!==intent.destination||b.capabilityRef!==capabilityRef||!sameBinding(b,source.binding))throw new PreDispatchFailure();
    const preflight=createReviewedOperationTransport({binding:b,budget,authority:current,credentials:source.credentials,profiles:[profile('AUTHORIZATION')],testNetwork:network,linkedinProfile:options.official});
    try{const result=await preflight.request('AUTHORIZATION');if(result.status!==200)throw new PreDispatchFailure();linkedinAuthorized(result.data,body.author,source.personURN);}finally{preflight.dispose();}
    await budget.phase(LIMITS.smallMs,()=>current());
   }catch{budget.dispose();throw new PreDispatchFailure('AUTHORIZATION','UNAVAILABLE');}
   const dispose=()=>{disposed=true;budget.dispose();};
   return Object.freeze({dispose,async publish(signal:AbortSignal){
    if(used||disposed)throw new PreDispatchFailure();used=true;
    const abort=()=>budget.controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
    let client:ReturnType<typeof createReviewedOperationTransport>|undefined;let requestStarted=false,resultReceived=false;
    try{
     budget.check();await budget.phase(LIMITS.smallMs,()=>current());
     // Fresh transport: preflight GET exposure can never become POST exposure.
     client=createReviewedOperationTransport({binding:b,budget,authority:current,credentials:source.credentials,profiles:[profile('CREATE')],testNetwork:network,linkedinProfile:options.official});
     requestStarted=true;const result=await client.request('CREATE',{body});resultReceived=true;
     if(result.status!==201||!result.linkedin) return{status:'UNKNOWN'};
     const id=linkedinPostId(result.linkedin.postId),observed=await budget.phase(LIMITS.smallMs,()=>source.now());
     return{status:'PUBLISHED',publicationId:id,processingId:null,publishedAt:observed.toISOString()};
    }catch(error){if(!requestStarted||!resultReceived&&error instanceof TransportFault&&error.exposure==='NOT_SENT_PROVEN')throw new PreDispatchFailure('TRANSPORT','UNAVAILABLE');return{status:'UNKNOWN'};}
    finally{client?.dispose();signal.removeEventListener('abort',abort);dispose();}
   }});
  },
  async publish(){throw new PreDispatchFailure('CAPABILITY','UNSUPPORTED');},
  async status(){return{status:'UNKNOWN'};},
 });
}
