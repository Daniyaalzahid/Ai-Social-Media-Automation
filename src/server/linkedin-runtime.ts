import 'server-only';
import { browserConfiguration } from './auth/browser-security';
import { createLinkedInProfile,linkedinSecrets,LINKEDIN_DISABLED } from './provider-security/linkedin-profile';
import { createLinkedInIntegration } from './social/linkedin';

/** Code-reviewed admission only. Credential presence never enables a provider. */
export function linkedinRuntime(){
 if(!LINKEDIN_DISABLED.enabled)return null;
 const profile=createLinkedInProfile({origin:browserConfiguration(process.env).origin,secrets:()=>linkedinSecrets(process.env),review:LINKEDIN_DISABLED});
 return createLinkedInIntegration({profile});
}
