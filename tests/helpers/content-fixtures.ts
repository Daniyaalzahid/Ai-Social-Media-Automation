import { randomBytes,randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import type { RoleCode } from '../../src/server/db/catalog';
import type { RevisionInput,ContentDetail } from '../../src/features/content/model';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { hashPassword } from '../../src/server/auth/passwords';
import { encryptMfa,newTotpSecret } from '../../src/server/auth/mfa-crypto';
import { tokenHash } from '../../src/server/auth/access';
import { assertDestructiveTestDatabase } from '../../src/server/db/test-guard';
import type { EnvironmentSource } from '../../src/server/config/schema';
import { CREATIVE } from '../../src/server/ai/policy';
let encoded:Promise<SensitiveValue>|undefined;
export async function contentActor(db:Kysely<DatabaseSchema>,role:RoleCode='CONTENT_CREATOR',id=randomUUID()){
 encoded??=hashPassword(randomBytes(24).toString('hex'));const hash=await encoded;
 const raw=new SensitiveValue(randomBytes(32).toString('base64url')),now=new Date();
 await db.insertInto('users').values({id,email_normalized:id+'@example.test',display_name:'Synthetic content actor',status:'active',password_hash:hash.reveal(),password_changed_at:now,last_login_at:null}).execute();
 await db.insertInto('user_roles').values({user_id:id,role_id:canonicalCatalogId('role',role),assigned_by:null}).execute();
 if(['OWNER','MARKETING_ADMIN'].includes(role)){const mid=randomUUID();await db.insertInto('mfa_methods').values({id:mid,user_id:id,type:'totp',state:'active',...encryptMfa(newTotpSecret(),{key:randomBytes(32),id:'content-test'},id,mid),created_at:now,confirmed_at:now,enrollment_expires_at:null,last_accepted_step:null}).execute();}
 await db.insertInto('sessions').values({id:randomUUID(),user_id:id,token_hash:tokenHash(raw),auth_version:1,created_at:now,last_activity_at:now,idle_expires_at:new Date(+now+1800000),absolute_expires_at:new Date(+now+86400000),authenticated_at:now,mfa_verified_at:['OWNER','MARKETING_ADMIN'].includes(role)?now:null,reauthenticated_at:null,revoked_at:null,revocation_reason:null,ip_hash:null,device_class:null}).execute();return{id,raw,role};
}
export function contentDraft(patch:Partial<RevisionInput>={}):RevisionInput{return{title:'Synthetic workflow content',language:'ENGLISH',content:{FACEBOOK:{caption:CREATIVE.ENGLISH.FACEBOOK[0]!,hashtags:[]}},facts:[],mediaIds:[],...patch};}
export function fullContent(d:ContentDetail){if(d.viewer)throw new Error('Expected internal workflow view');return d;}

/** Removes only the explicitly reserved actor and its isolated workflow fixture. */
export async function removeContentActorFixture(db:Kysely<DatabaseSchema>,source:EnvironmentSource,id:string){
 await assertDestructiveTestDatabase(db,source);
 await db.transaction().execute(async tx=>{
  const posts=(await tx.selectFrom('content_items').select('id').where('created_by','=',id).execute()).map(r=>r.id);
  if(posts.length){
   const revisions=(await tx.selectFrom('content_revisions').select('id').where('post_id','in',posts).execute()).map(r=>r.id);
   await tx.deleteFrom('content_decisions').where('post_id','in',posts).execute();
   await tx.deleteFrom('content_submissions').where('post_id','in',posts).execute();
   if(revisions.length)for(const table of ['content_revision_authors','content_revision_facts','content_revision_media','content_variants'] as const)
    await tx.deleteFrom(table).where('revision_id','in',revisions).execute();
   await tx.deleteFrom('content_revisions').where('post_id','in',posts).execute();
   await tx.deleteFrom('content_items').where('id','in',posts).execute();
  }
  await tx.deleteFrom('audit_logs').where('actor_user_id','=',id).execute();
  await tx.deleteFrom('sessions').where('user_id','=',id).execute();
  await tx.deleteFrom('user_roles').where('user_id','=',id).execute();
  await tx.deleteFrom('users').where('id','=',id).execute();
 });
}
