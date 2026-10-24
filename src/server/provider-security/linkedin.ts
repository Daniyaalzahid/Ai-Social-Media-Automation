import { fault } from './policy';

/** Contract-5 fixed query, not a general Rest.li serializer. */
export const LINKEDIN_AUTH_PATH='/rest/organizationAuthorizations?authorizationActions=List((OrganizationContentAuthorizationAction:(actionType:ORGANIC_SHARE_CREATE)))&bq=authorizationActionsAndImpersonator';
export const LINKEDIN_POST_PATH='/rest/posts';
export const LINKEDIN_SCOPES=['rw_organization_admin','w_organization_social'] as const;
export type LinkedInOperation='AUTHORIZATION'|'CREATE';
export function linkedinVersion(value:string){if(!/^\d{4}(?:0[1-9]|1[0-2])$/.test(value))fault('INVALID');return value;}
/** Narrow project acceptance grammar, not a universal provider-ID grammar. */
export function linkedinPostId(value:unknown):string{
 if(typeof value!=='string'||Buffer.byteLength(value)>256||!/^urn:li:(?:share|ugcPost):[1-9][0-9]{0,19}$/.test(value))fault('BODY_INVALID');
 return value;
}
