import { randomUUID,randomBytes } from 'node:crypto';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { sql,type Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { BRAND_DROP_ORDER } from '../../src/server/db/schema';
import { BRAND_ID } from '../../src/features/brand/model';
import { encryptToken,decryptToken } from '../../src/server/social/crypto';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { scratchDatabase,resetScratch } from './phase2b-helpers';
import { installedChecks,installedForeignKeys,socialTables,socialChecks,socialForeignKeys,sortContracts } from '../helpers/schema-contract';
const target=scratchDatabase('bsa_test_clean'),db=target.handle.db,rollback=Symbol('owned-social-constraint-fixture');
const key={key:randomBytes(32),id:'primary-v1'};
beforeAll(()=>resetScratch(target));
afterAll(async()=>{try{expect(await db.selectFrom('users').select('id').execute()).toEqual([]);for(const table of ['social_transactions','social_destinations','social_credentials','social_authorizations'] as const)expect(await db.selectFrom(table).selectAll().execute()).toEqual([]);}finally{await target.handle.close();}});
async function fixture(tx:Kysely<DatabaseSchema>){
 const user=randomUUID(),sessionOwner=randomUUID(),session=randomUUID(),authorization=randomUUID(),destination=randomUUID(),transaction=randomUUID(),now=new Date('2026-10-17T00:00:00.000Z'),expires=new Date(+now+600000);
 for(const id of [user,sessionOwner])await tx.insertInto('users').values({id,email_normalized:id+'@example.test',display_name:'Owned constraint fixture',status:'invited',password_hash:null,password_changed_at:null,last_login_at:null}).execute();
 await tx.insertInto('sessions').values({id:session,user_id:sessionOwner,token_hash:randomBytes(32),auth_version:1,created_at:now,last_activity_at:now,idle_expires_at:expires,absolute_expires_at:expires,authenticated_at:now,mfa_verified_at:null,reauthenticated_at:null,revoked_at:null,revocation_reason:null,ip_hash:null,device_class:null}).execute();
 const auth={id:authorization,brand_id:BRAND_ID,provider:'TIKTOK' as const,connected_by:user,subject:randomUUID(),status:'CONNECTED' as const,version:1,scopes_json:'["identity"]',selected_id:null,created_at:now,expires_at:expires,refresh_expires_at:null,refresh_lease:null};
 await tx.insertInto('social_authorizations').values(auth).execute();
 const dest={id:destination,authorization_id:authorization,brand_id:BRAND_ID,provider:'TIKTOK' as const,remote_id:randomUUID(),kind:'TIKTOK_ACCOUNT' as const,display_name:'Owned destination',handle:null,active:1};
 await tx.insertInto('social_destinations').values(dest).execute();
 const binding={id:authorization,provider:'TIKTOK' as const,purpose:'access' as const,version:1},envelope=encryptToken(new SensitiveValue('public synthetic constraint fixture'),key,binding);
 const credential={authorization_id:authorization,purpose:'access' as const,version:1,...envelope};await tx.insertInto('social_credentials').values(credential).execute();
 const flow={id:transaction,brand_id:BRAND_ID,provider:'TIKTOK' as const,actor_id:user,session_id:session,auth_version:1,state_hash:randomBytes(32),status:'PENDING' as const,target_id:authorization,target_version:null,redirect_uri:'https://example.test/api/oauth/tiktok/callback',requested_json:'["identity"]',pkce_ciphertext:null,pkce_iv:null,pkce_tag:null,key_id:null,created_at:now,expires_at:expires,finished_at:null};
 await tx.insertInto('social_transactions').values(flow).execute();return{user,sessionOwner,session,authorization,destination,transaction,now,expires,auth,dest,credential,flow,binding};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function owned(fn:(tx:Kysely<DatabaseSchema>,f:Fixture)=>Promise<void>){try{await db.transaction().execute(async tx=>{const f=await fixture(tx);await fn(tx,f);throw rollback;});}catch(e){if(e!==rollback)throw e;}}
/** Keep driver SQL/parameters/crypto material out of assertion diagnostics. */
async function observed(work:()=>Promise<unknown>){try{await work();return{accepted:true};}catch(error){const e=error as {code?:unknown;sqlState?:unknown;sqlMessage?:unknown};const names=[...socialChecks,...socialForeignKeys].map(c=>c.name);return{accepted:false,code:typeof e.code==='string'&&/^[A-Z0-9_]+$/.test(e.code)?e.code:'UNKNOWN',sqlState:typeof e.sqlState==='string'&&/^[A-Z0-9]{5}$/.test(e.sqlState)?e.sqlState:'UNKNOWN',constraint:typeof e.sqlMessage==='string'?names.find(n=>e.sqlMessage!.toString().includes(n))??null:null};}}
async function rejectsCheck(work:()=>Promise<unknown>,name:string){expect(await observed(work)).toMatchObject({accepted:false,code:'ER_CHECK_CONSTRAINT_VIOLATED',sqlState:'HY000',constraint:name});}
it('has exactly the twelve migration-owned CHECK identities, tables, columns and enforced states',async()=>{expect(await installedChecks(db,socialTables)).toEqual(sortContracts(socialChecks));});
it('has exactly the seven migration-owned FK identities, ordered columns, parents and RESTRICT actions',async()=>{expect(await installedForeignKeys(db,socialTables)).toEqual(sortContracts(socialForeignKeys));});
const violations:[string,(tx:Kysely<DatabaseSchema>,f:Fixture)=>Promise<unknown>][]=[
 ['social_guard_single',tx=>tx.updateTable('social_guard').set({id:2}).where('id','=',1).execute()],
 ['social_auth_version',(tx,f)=>tx.updateTable('social_authorizations').set({version:0}).where('id','=',f.authorization).execute()],
 ['social_auth_subject',(tx,f)=>tx.updateTable('social_authorizations').set({subject:''}).where('id','=',f.authorization).execute()],
 ['social_scopes',(tx,f)=>tx.updateTable('social_authorizations').set({scopes_json:'{"identity":true}'}).where('id','=',f.authorization).execute()],
 ['social_expiry',(tx,f)=>tx.updateTable('social_authorizations').set({expires_at:f.now}).where('id','=',f.authorization).execute()],
 ['social_destination_bounds',(tx,f)=>tx.updateTable('social_destinations').set({remote_id:''}).where('id','=',f.destination).execute()],
 ['social_destination_kind',(tx,f)=>tx.updateTable('social_destinations').set({kind:'PAGE'}).where('id','=',f.destination).execute()],
 ['social_credentials_bounds',(tx,f)=>tx.updateTable('social_credentials').set({version:0}).where('authorization_id','=',f.authorization).execute()],
 ['social_tx_expiry',(tx,f)=>tx.updateTable('social_transactions').set({expires_at:f.now}).where('id','=',f.transaction).execute()],
 ['social_tx_pkce',(tx,f)=>tx.updateTable('social_transactions').set({key_id:'primary-v1'}).where('id','=',f.transaction).execute()],
 ['social_tx_terminal',(tx,f)=>tx.updateTable('social_transactions').set({status:'COMPLETED'}).where('id','=',f.transaction).execute()],
 ['social_tx_requested',(tx,f)=>tx.updateTable('social_transactions').set({requested_json:'null'}).where('id','=',f.transaction).execute()],
];
it.each(violations)('%s rejects an independent violating write',(name,write)=>owned(async(tx,f)=>{await rejectsCheck(()=>write(tx,f),name);}));
describe('NULL / UNKNOWN matrices from the exact reviewed CHECK expressions',()=>{
 for(let mask=0;mask<16;mask++)it(`PKCE nullable group mask ${mask}: only all-null or complete is valid`,()=>owned(async(tx,f)=>{const envelope=encryptToken(new SensitiveValue('public synthetic PKCE fixture'),key,{id:f.transaction,provider:'TIKTOK',purpose:'pkce',version:1});const change={pkce_ciphertext:mask&1?envelope.ciphertext:null,pkce_iv:mask&2?envelope.iv:null,pkce_tag:mask&4?envelope.tag:null,key_id:mask&8?envelope.key_id:null};const result=await observed(()=>tx.updateTable('social_transactions').set(change).where('id','=',f.transaction).execute());if(mask===0||mask===15)expect(result).toEqual({accepted:true});else expect(result).toMatchObject({accepted:false,code:'ER_CHECK_CONSTRAINT_VIOLATED',constraint:'social_tx_pkce'});}));
 it.each([null,-1,0,1])('nullable refresh expiry offset %s has intentional NULL behavior',offset=>owned(async(tx,f)=>{const result=await observed(()=>tx.updateTable('social_authorizations').set({refresh_expires_at:offset===null?null:new Date(+f.now+offset)}).where('id','=',f.authorization).execute());if(offset===null||offset>0)expect(result).toEqual({accepted:true});else expect(result).toMatchObject({accepted:false,constraint:'social_expiry'});}));
 it.each([null,0,1])('nullable reconnect version %s has intentional NULL behavior',version=>owned(async(tx,f)=>{const result=await observed(()=>tx.updateTable('social_transactions').set({target_version:version}).where('id','=',f.transaction).execute());if(version===0)expect(result).toMatchObject({accepted:false,constraint:'social_tx_expiry'});else expect(result).toEqual({accepted:true});}));
 for(const status of ['PENDING','EXCHANGING','COMPLETED','FAILED'] as const)for(const finished of [false,true])it(`${status} with finished_at ${finished?'set':'NULL'}`,()=>owned(async(tx,f)=>{const result=await observed(()=>tx.updateTable('social_transactions').set({status,finished_at:finished?f.now:null}).where('id','=',f.transaction).execute());const valid=['COMPLETED','FAILED'].includes(status)===finished;if(valid)expect(result).toEqual({accepted:true});else expect(result).toMatchObject({accepted:false,constraint:'social_tx_terminal'});}));
});
it.each(['null','{}','["same","same"]','[1]','[""]',JSON.stringify(Array(31).fill('scope').map((s,i)=>s+i)),JSON.stringify(['x'.repeat(151)])])('both scope contracts reject malformed representation %#',value=>owned(async(tx,f)=>{await rejectsCheck(()=>tx.updateTable('social_authorizations').set({scopes_json:value}).where('id','=',f.authorization).execute(),'social_scopes');await rejectsCheck(()=>tx.updateTable('social_transactions').set({requested_json:value}).where('id','=',f.transaction).execute(),'social_tx_requested');}));
it.each(['[]','["identity"]'])('scope array %s is valid under the DB contract',value=>owned(async(tx,f)=>{expect(await observed(()=>tx.updateTable('social_authorizations').set({scopes_json:value}).where('id','=',f.authorization).execute())).toEqual({accepted:true});expect(await observed(()=>tx.updateTable('social_transactions').set({requested_json:value}).where('id','=',f.transaction).execute())).toEqual({accepted:true});}));
it('credential envelope rejects empty ciphertext and unsupported key ID',()=>owned(async(tx,f)=>{await rejectsCheck(()=>tx.updateTable('social_credentials').set({ciphertext:Buffer.alloc(0)}).where('authorization_id','=',f.authorization).execute(),'social_credentials_bounds');await rejectsCheck(()=>tx.updateTable('social_credentials').set({key_id:'unsupported'}).where('authorization_id','=',f.authorization).execute(),'social_credentials_bounds');}));
it('PKCE complete envelope rejects empty ciphertext and unsupported key ID',()=>owned(async(tx,f)=>{const e=encryptToken(new SensitiveValue('public synthetic PKCE fixture'),key,{id:f.transaction,provider:'TIKTOK',purpose:'pkce',version:1}),values={pkce_ciphertext:e.ciphertext,pkce_iv:e.iv,pkce_tag:e.tag,key_id:e.key_id};await rejectsCheck(()=>tx.updateTable('social_transactions').set({...values,pkce_ciphertext:Buffer.alloc(0)}).where('id','=',f.transaction).execute(),'social_tx_pkce');await rejectsCheck(()=>tx.updateTable('social_transactions').set({...values,key_id:'unsupported'}).where('id','=',f.transaction).execute(),'social_tx_pkce');}));
const orphanWrites:Record<string,(tx:Kysely<DatabaseSchema>,f:Fixture)=>Promise<unknown>>={
 social_auth_brand:(tx,f)=>tx.insertInto('social_authorizations').values({...f.auth,id:randomUUID(),subject:randomUUID(),brand_id:randomUUID()}).execute(),
 social_auth_actor:(tx,f)=>tx.insertInto('social_authorizations').values({...f.auth,id:randomUUID(),subject:randomUUID(),connected_by:randomUUID()}).execute(),
 social_destination_auth:(tx,f)=>tx.insertInto('social_destinations').values({...f.dest,id:randomUUID(),authorization_id:randomUUID()}).execute(),
 social_credentials_auth:(tx,f)=>tx.insertInto('social_credentials').values({...f.credential,authorization_id:randomUUID()}).execute(),
 social_tx_brand:(tx,f)=>tx.insertInto('social_transactions').values({...f.flow,id:randomUUID(),state_hash:randomBytes(32),brand_id:randomUUID()}).execute(),
 social_tx_actor:(tx,f)=>tx.insertInto('social_transactions').values({...f.flow,id:randomUUID(),state_hash:randomBytes(32),actor_id:randomUUID()}).execute(),
 social_tx_session:(tx,f)=>tx.insertInto('social_transactions').values({...f.flow,id:randomUUID(),state_hash:randomBytes(32),session_id:randomUUID()}).execute(),
};
it.each(socialForeignKeys)('$name rejects its orphan child insert',fk=>owned(async(tx,f)=>{expect(await observed(()=>orphanWrites[fk.name]!(tx,f))).toMatchObject({accepted:false,code:'ER_NO_REFERENCED_ROW_2',constraint:fk.name});}));
it('composite destination FK rejects cross-brand binding even with a real authorization ID',()=>owned(async(tx,f)=>{expect(await observed(()=>tx.insertInto('social_destinations').values({...f.dest,id:randomUUID(),remote_id:randomUUID(),brand_id:randomUUID()}).execute())).toMatchObject({accepted:false,code:'ER_NO_REFERENCED_ROW_2',constraint:'social_destination_auth'});}));
it.each(socialForeignKeys)('$name protects its exact parent against DELETE and key UPDATE',fk=>owned(async(tx,f)=>{
 // Keep only the relationship under test, so another FK cannot mask a failure.
 if(fk.table!=='social_transactions')await tx.deleteFrom('social_transactions').where('id','=',f.transaction).execute();
 if(fk.table!=='social_destinations')await tx.deleteFrom('social_destinations').where('id','=',f.destination).execute();
 if(fk.table!=='social_credentials')await tx.deleteFrom('social_credentials').where('authorization_id','=',f.authorization).execute();
 if(fk.table==='social_transactions')await tx.deleteFrom('social_authorizations').where('id','=',f.authorization).execute();
 if(fk.parent==='users')await tx.deleteFrom('sessions').where('user_id','=',f.user).execute();
 if(fk.parent==='brands')for(const table of BRAND_DROP_ORDER.filter(t=>t!=='brands'))await sql`DELETE FROM ${sql.table(table)} WHERE brand_id=${BRAND_ID}`.execute(tx);
 const id=fk.parent==='brands'?BRAND_ID:fk.parent==='users'?f.user:fk.parent==='sessions'?f.session:f.authorization;
 for(const operation of ['delete','update']){
  const result=await observed(()=>operation==='delete'?sql`DELETE FROM ${sql.table(fk.parent)} WHERE id=${id}`.execute(tx):sql`UPDATE ${sql.table(fk.parent)} SET id=${randomUUID()} WHERE id=${id}`.execute(tx));
  expect(result).toMatchObject({accepted:false,code:'ER_ROW_IS_REFERENCED_2',constraint:fk.name});
 }
}));
it.each([
 ['social_authorizations','provider'],['social_authorizations','status'],['social_destinations','provider'],['social_destinations','kind'],['social_transactions','provider'],['social_transactions','status'],['social_credentials','purpose'],
] as const)('%s.%s is a closed database ENUM',(table,column)=>owned(async(tx,f)=>{const where=table==='social_credentials'?sql`authorization_id=${f.authorization}`:sql`id=${table==='social_authorizations'?f.authorization:table==='social_destinations'?f.destination:f.transaction}`;expect(await observed(()=>sql`UPDATE ${sql.table(table)} SET ${sql.id(column)}='UNRECOGNIZED' WHERE ${where}`.execute(tx))).toMatchObject({accepted:false,code:'WARN_DATA_TRUNCATED'});}));
// Byte-exact key identity is required by the actual token reader; SQL equivalence is insufficient.
it('credential CHECK rejects a noncanonical trailing-space key ID before it can become undecryptable',()=>owned(async(tx,f)=>{
 const result=await observed(()=>tx.updateTable('social_credentials').set({key_id:'primary-v1 '}).where('authorization_id','=',f.authorization).execute());
 if(result.accepted){const row=await tx.selectFrom('social_credentials').selectAll().where('authorization_id','=',f.authorization).executeTakeFirstOrThrow();let readerRejected=false;try{decryptToken(row,key,f.binding);}catch{readerRejected=true;}expect({accepted:result.accepted,storedTrailingSpace:row.key_id.endsWith(' '),readerRejected}).toEqual({accepted:false,storedTrailingSpace:false,readerRejected:false});}
 else expect(result).toMatchObject({accepted:false,constraint:'social_credentials_bounds'});
}));
it('PKCE CHECK rejects the demonstrated padded key-ID family before reader rejection',()=>owned(async(tx,f)=>{
 const envelope=encryptToken(new SensitiveValue('public synthetic PKCE fixture'),key,{id:f.transaction,provider:'TIKTOK',purpose:'pkce',version:1});
 const result=await observed(()=>tx.updateTable('social_transactions').set({pkce_ciphertext:envelope.ciphertext,pkce_iv:envelope.iv,pkce_tag:envelope.tag,key_id:'primary-v1 '}).where('id','=',f.transaction).execute());
 if(result.accepted){const row=await tx.selectFrom('social_transactions').select(['key_id','pkce_ciphertext','pkce_iv','pkce_tag']).where('id','=',f.transaction).executeTakeFirstOrThrow();const bytes=await sql<{hex:string;length:number}>`SELECT HEX(key_id) AS hex,OCTET_LENGTH(key_id) AS length FROM social_transactions WHERE id=${f.transaction}`.execute(tx);let readerRejected=false;try{decryptToken({key_id:row.key_id!,ciphertext:row.pkce_ciphertext!,iv:row.pkce_iv!,tag:row.pkce_tag!},key,{id:f.transaction,provider:'TIKTOK',purpose:'pkce',version:1});}catch{readerRejected=true;}expect({accepted:true,hex:bytes.rows[0]!.hex,length:Number(bytes.rows[0]!.length),readerRejected}).toEqual({accepted:false,hex:'7072696D6172792D7631',length:10,readerRejected:false});}
 else expect(result).toMatchObject({accepted:false,constraint:'social_tx_pkce'});
}));

const keyIdentities=[
 ['canonical','primary-v1'],['trailing ASCII space','primary-v1 '],['leading ASCII space',' primary-v1'],['two trailing spaces','primary-v1  '],
 ['tab','primary-v1\t'],['newline','primary-v1\n'],['case variant','PRIMARY-v1'],['Unicode NBSP','primary-v1\u00a0'],['embedded NUL','primary\0-v1'],['empty',''],['overlong','x'.repeat(41)],
] as const;
for(const path of ['credential','PKCE'] as const)it.each(keyIdentities)(`${path} key identity rejects byte-distinct %s without normalization`,(label,value)=>owned(async(tx,f)=>{
 // SQL parameter bytes are evidence, including invisible suffixes. No token/envelope is printed.
 const bytes=await sql<{hex:string;length:number;ordinary:number;exact:number}>`SELECT HEX(${value}) AS hex,OCTET_LENGTH(${value}) AS length,${value} COLLATE utf8mb4_bin='primary-v1' AS ordinary,CAST(${value} AS BINARY)=CAST('primary-v1' AS BINARY) AS exact`.execute(tx);
 expect(bytes.rows[0]!.hex.toLowerCase()).toBe(Buffer.from(value).toString('hex'));expect(Number(bytes.rows[0]!.length)).toBe(Buffer.byteLength(value));expect(Number(bytes.rows[0]!.exact)).toBe(label==='canonical'?1:0);
 if(label==='trailing ASCII space'||label==='two trailing spaces')expect(Number(bytes.rows[0]!.ordinary)).toBe(1);
 const envelope=encryptToken(new SensitiveValue('public synthetic PKCE fixture'),key,{id:f.transaction,provider:'TIKTOK',purpose:'pkce',version:1});
 const result=await observed(()=>path==='credential'?tx.updateTable('social_credentials').set({key_id:value}).where('authorization_id','=',f.authorization).execute():tx.updateTable('social_transactions').set({pkce_ciphertext:envelope.ciphertext,pkce_iv:envelope.iv,pkce_tag:envelope.tag,key_id:value}).where('id','=',f.transaction).execute());
 if(label==='canonical')expect(result).toEqual({accepted:true});else if(label==='overlong')expect(result).toMatchObject({accepted:false,code:'ER_DATA_TOO_LONG'});else expect(result).toMatchObject({accepted:false,code:'ER_CHECK_CONSTRAINT_VIOLATED',constraint:path==='credential'?'social_credentials_bounds':'social_tx_pkce'});
 const stored=path==='credential'?await sql<{hex:string;length:number}>`SELECT HEX(key_id) AS hex,OCTET_LENGTH(key_id) AS length FROM social_credentials WHERE authorization_id=${f.authorization}`.execute(tx):await sql<{hex:string|null;length:number|null}>`SELECT HEX(key_id) AS hex,OCTET_LENGTH(key_id) AS length FROM social_transactions WHERE id=${f.transaction}`.execute(tx);
 expect(stored.rows[0]).toEqual(path==='credential'||label==='canonical'?{hex:'7072696D6172792D7631',length:10}:{hex:null,length:null});
}));
it('canonical ENUM storage removes SQL padding rather than persisting a byte-distinct security identifier',()=>owned(async(tx,f)=>{
 for(const [table,column,value,id] of [ ['social_authorizations','provider','TIKTOK',f.authorization],['social_authorizations','status','CONNECTED',f.authorization],['social_destinations','kind','TIKTOK_ACCOUNT',f.destination],['social_transactions','status','PENDING',f.transaction] ] as const){
  await sql`UPDATE ${sql.table(table)} SET ${sql.id(column)}=${value+' '} WHERE id=${id}`.execute(tx);
  const result=await sql<{hex:string}>`SELECT HEX(${sql.id(column)}) AS hex FROM ${sql.table(table)} WHERE id=${id}`.execute(tx);expect(result.rows[0]!.hex.toLowerCase()).toBe(Buffer.from(value).toString('hex'));
 }
 await sql`UPDATE social_credentials SET purpose='access ' WHERE authorization_id=${f.authorization}`.execute(tx);const result=await sql<{hex:string}>`SELECT HEX(purpose) AS hex FROM social_credentials WHERE authorization_id=${f.authorization}`.execute(tx);expect(result.rows[0]!.hex.toLowerCase()).toBe(Buffer.from('access').toString('hex'));
}));
