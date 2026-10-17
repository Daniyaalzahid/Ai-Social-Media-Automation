import { randomBytes,randomUUID,createHash } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { tokenHash } from '../../src/server/auth/access';
import { integrationAction } from '../../src/server/social/policy';
import type { SocialProvider,Grant } from '../../src/server/social/provider';
export class FakeSocialProvider implements SocialProvider{
 constructor(readonly origin='https://localhost'){}
 readonly id='TIKTOK' as const;readonly mode='test' as const;readonly pkce=true;readonly requestedScopes=['identity','destinations'];
 exchanges=0;refreshes=0;revocations=0;scopes=['identity','destinations'];fail=false;subject=randomUUID();
 gate:(()=>Promise<void>)|null=null;
 readonly access=new SensitiveValue(randomBytes(32).toString('base64url'));readonly refreshToken=new SensitiveValue(randomBytes(32).toString('base64url'));
 challenge:string|null=null;
 authorizationURL(input:Parameters<SocialProvider['authorizationURL']>[0]){this.challenge=input.challenge;const u=new URL(this.origin+'/test-provider');u.searchParams.set('state',input.state.reveal());return u.href;}
 result():Grant{return{access:this.access,refresh:this.refreshToken,metadata:{subject:this.subject,scopes:this.scopes,expiresIn:3600,refreshExpiresIn:86400,destinations:[{remoteId:'destination-'+this.subject,type:'TIKTOK_ACCOUNT',displayName:'بسم اللہ <script>untrusted</script>',handle:'safe-handle'}]}};}
 async exchange(input:Parameters<SocialProvider['exchange']>[0]){this.exchanges++;if(!input.verifier||createHash('sha256').update(input.verifier.reveal()).digest('base64url')!==this.challenge)throw new Error('PKCE mismatch');await this.gate?.();if(this.fail)throw new Error('Synthetic failure');return this.result();}
 async refresh(){this.refreshes++;await this.gate?.();if(this.fail)throw new Error('Synthetic failure');return this.result();}
 async revoke(){this.revocations++;if(this.fail)throw new Error('Synthetic failure');}
}
export async function integrationProof(db:Kysely<DatabaseSchema>,actor:{id:string;raw:SensitiveValue},mutation:unknown){const session=await db.selectFrom('sessions').selectAll().where('token_hash','=',tokenHash(actor.raw)).executeTakeFirstOrThrow(),proof=new SensitiveValue(randomBytes(32).toString('base64url')),now=new Date();await db.insertInto('auth_challenges').values({id:randomUUID(),user_id:actor.id,token_hash:tokenHash(proof),purpose:'reauthentication',action_code:integrationAction(mutation),bound_session_id:session.id,auth_version:session.auth_version,created_at:now,expires_at:new Date(+now+300000),consumed_at:null,revoked_at:null}).execute();return proof;}
