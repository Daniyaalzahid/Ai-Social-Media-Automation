import { z } from 'zod';
import { SensitiveValue,SecurityOperationError } from '../security/sensitive';
import { reviewedLinkedInProfile,type LinkedInProfile } from '../provider-security/linkedin-profile';
import { linkedInConnectionTransport } from '../provider-security/transport';
import type { NetworkTestHooks } from '../provider-security/network';
import { LINKEDIN_SCOPES } from '../provider-security/linkedin';
import { createReviewedLinkedInPublisher,linkedinAuthorizationSchema,linkedinOrganizations } from '../publishing/linkedin-text';
import type { SocialProvider,Grant } from './provider';

export const LINKEDIN_CONNECTION_SCOPES=Object.freeze([...LINKEDIN_SCOPES,'openid','profile']);
const secret=z.string().min(1).max(8192).refine(s=>Buffer.byteLength(s)<=8192&&!/[\p{Cc}\p{Cs}]/u.test(s));
const tokenSchema=z.object({access_token:secret,expires_in:z.number().int().min(1).max(31536000),token_type:z.literal('Bearer').optional(),scope:z.string().min(1).max(1024),refresh_token:secret.optional(),refresh_token_expires_in:z.number().int().min(1).max(63072000).optional()});
const identitySchema=z.object({sub:z.string().regex(/^[A-Za-z0-9_-]{1,151}$/)});
/** Constructible only from a reviewed server profile. Production registration remains disabled. */
export function createLinkedInIntegration(options:{profile:LinkedInProfile;testNetwork?:NetworkTestHooks|undefined}){
 const profile=reviewedLinkedInProfile(options.profile);
 const connection=Object.freeze<SocialProvider>({
  id:'LINKEDIN',mode:'official',pkce:false,requestedScopes:LINKEDIN_CONNECTION_SCOPES,
  authorizationURL({state,challenge,redirectURI}){
   reviewedLinkedInProfile(profile);if(challenge!==null||redirectURI!==profile.redirectURI||!(state instanceof SensitiveValue)||! /^[A-Za-z0-9_-]{43}$/.test(state.reveal()))throw new SecurityOperationError();
   const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
   url.search=new URLSearchParams({response_type:'code',client_id:profile.secrets().clientId,redirect_uri:profile.redirectURI,state:state.reveal(),scope:LINKEDIN_CONNECTION_SCOPES.join(' ')}).toString();return url.toString();
  },
  async exchange(input):Promise<Grant>{
   try{
    const{attempt}=input;reviewedLinkedInProfile(profile);
    if(!attempt||attempt.provider!=='LINKEDIN'||!z.uuid().safeParse(attempt.id).success||!z.uuid().safeParse(attempt.authorizationId).success||! /^[a-f0-9]{64}$/.test(attempt.stateHash)||!Number.isFinite(attempt.expiresAt)||attempt.expiresAt<=Date.now()||input.redirectURI!==profile.redirectURI||input.verifier!==null||!(input.code instanceof SensitiveValue))throw new SecurityOperationError();
    const started=performance.now(),check=async()=>{if(attempt.expiresAt<=Date.now())throw new SecurityOperationError();await attempt.check();};
    const transport=linkedInConnectionTransport({profile,signal:input.signal,check,testNetwork:options.testNetwork});
    const token=tokenSchema.parse(await transport.exchange(input.code,tokenSchema));
    // Scope evidence is required, never replaced by the requested scope list.
    const scopes=token.scope.split(/[ ,]+/);if(scopes.some(s=>!s||!LINKEDIN_CONNECTION_SCOPES.includes(s))||new Set(scopes).size!==scopes.length||LINKEDIN_CONNECTION_SCOPES.some(s=>!scopes.includes(s)))throw new SecurityOperationError();
    const access=new SensitiveValue(token.access_token),identity=identitySchema.parse(await transport.identity(access,identitySchema));
    const organizations=linkedinOrganizations(await transport.organizations(access,linkedinAuthorizationSchema));
    await check();const expiresIn=token.expires_in-Math.ceil((performance.now()-started)/1000);if(expiresIn<1)throw new SecurityOperationError();
    return{access,refresh:null,metadata:{subject:profile.subject(identity.sub),scopes,expiresIn,refreshExpiresIn:null,destinations:organizations.map(remoteId=>({remoteId,type:'LINKEDIN_ORGANIZATION',displayName:'LinkedIn organization '+remoteId,handle:null}))}};
   }catch{throw new SecurityOperationError();}
  },
 });
 return Object.freeze({connection,publisher:createReviewedLinkedInPublisher(profile,options.testNetwork)});
}
