import { randomBytes,randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { beforeAll,beforeEach,afterAll,describe,it,expect } from 'vitest';
import { scratchDatabase,resetScratch } from './phase2b-helpers';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { BRAND_DROP_ORDER } from '../../src/server/db/schema';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { hashPassword } from '../../src/server/auth/passwords';
import { tokenHash } from '../../src/server/auth/access';
import { newTotpSecret,encryptMfa } from '../../src/server/auth/mfa-crypto';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { AuthorizationError } from '../../src/server/authorization/authorization';
import { createBrandService,BrandError } from '../../src/server/brand/service';
import { BRAND_ID,schemas,CLAIMS,type Kind } from '../../src/features/brand/model';
import { emptyData } from '../../src/features/brand/fields';
import { installMySqlReviewDiagnostics } from '../helpers/mysql-review-diagnostics';
installMySqlReviewDiagnostics();
const target=scratchDatabase('bsa_test_recovery'),db=target.handle.db,service=createBrandService(db);
const second=createDatabase({...resolveDatabaseConfiguration(target.source,'destructive-test'),connectionLimit:2});
let encoded:SensitiveValue;
beforeAll(async()=>{await resetScratch(target);encoded=await hashPassword('public synthetic brand review phrase');});
beforeEach(async()=>{
 for(const t of BRAND_DROP_ORDER)if(t!=='brands')await sql`DELETE FROM ${sql.id(t)}`.execute(db);
 for(const t of ['audit_logs','security_events','mfa_recovery_codes','mfa_methods','auth_challenges','sessions','invitations','user_roles','users'] as const)await db.deleteFrom(t).execute();
 await db.updateTable('brands').set({name:'Bismillah Electronics',website:'https://bismillahelectronics.pk/',short_description:'',business_type:'',country:'Pakistan',timezone:'Asia/Karachi',summary:'',active:true,approved:true,sort_order:0,revision:1}).where('id','=',BRAND_ID).execute();
});
afterAll(async()=>{await second.close();await target.handle.close();});
async function actor(role='OWNER'){
 const id=randomUUID(),now=new Date(),raw=new SensitiveValue(randomBytes(32).toString('base64url'));
 await db.insertInto('users').values({id,email_normalized:`${id}@example.test`,display_name:'Synthetic brand editor',password_hash:encoded.reveal(),status:'active',password_changed_at:now,last_login_at:null}).execute();
 await db.insertInto('user_roles').values({user_id:id,role_id:canonicalCatalogId('role',role),assigned_by:null}).execute();
 if(['OWNER','MARKETING_ADMIN'].includes(role)){const mid=randomUUID();await db.insertInto('mfa_methods').values({id:mid,user_id:id,type:'totp',state:'active',...encryptMfa(newTotpSecret(),{key:randomBytes(32),id:'brand-tests'},id,mid),created_at:now,confirmed_at:now,enrollment_expires_at:null,last_accepted_step:null}).execute();}
 await db.insertInto('sessions').values({id:randomUUID(),user_id:id,token_hash:tokenHash(raw),auth_version:1,created_at:now,last_activity_at:now,idle_expires_at:new Date(+now+1800000),absolute_expires_at:new Date(+now+86400000),authenticated_at:now,mfa_verified_at:['OWNER','MARKETING_ADMIN'].includes(role)?now:null,reauthenticated_at:null,revoked_at:null,revocation_reason:null,ip_hash:null,device_class:null}).execute();return {id,raw};
}
async function write(raw:SensitiveValue,kind:Kind,data:unknown,id:string|null=null,expectedRevision?:number){return service.mutate(raw,{brandId:BRAND_ID,expectedRevision:expectedRevision??(await service.read(raw)).revision,kind,id,data});}
const state={active:true,approved:true,sort_order:0};
function emptyKinds(){return schemas;}
const cta=(text='بسم اللہ — رابطہ کریں')=>({...state,text,language:'URDU',platform:null,context:''});
describe('Brand Brain actual MySQL authorization, revisions and context',()=>{
 it.each(['OWNER','MARKETING_ADMIN','CONTENT_CREATOR','REVIEWER','VIEWER'])('%s uses explicit read and manage grants',async(role)=>{const a=await actor(role);if(role==='VIEWER')await expect(service.read(a.raw)).rejects.toBeInstanceOf(AuthorizationError);else expect((await service.read(a.raw)).canManage).toBe(role==='OWNER');if(role==='OWNER')expect((await write(a.raw,'ctas',cta())).revision).toBe(2);else await expect(service.mutate(a.raw,{brandId:BRAND_ID,expectedRevision:1,kind:'ctas',id:null,data:cta()})).rejects.toBeInstanceOf(AuthorizationError);});
 it.each(['disabled','version','role'])('rejects stale %s authority without a mutation',async(change)=>{const a=await actor();await service.read(a.raw);if(change==='disabled')await db.updateTable('users').set({status:'disabled'}).where('id','=',a.id).execute();if(change==='version')await db.updateTable('users').set({auth_version:2}).where('id','=',a.id).execute();if(change==='role')await db.updateTable('user_roles').set({role_id:canonicalCatalogId('role','VIEWER')}).where('user_id','=',a.id).execute();await expect(service.mutate(a.raw,{brandId:BRAND_ID,expectedRevision:1,kind:'ctas',id:null,data:cta()})).rejects.toBeInstanceOf(AuthorizationError);expect((await db.selectFrom('brands').select('revision').executeTakeFirstOrThrow()).revision).toBe(1);});
 it('rejects brand/record ID substitution, extras and bad references',async()=>{const a=await actor();await expect(service.read(a.raw,randomUUID())).rejects.toBeInstanceOf(BrandError);for(const input of [{brandId:randomUUID()},{id:randomUUID()},{permissions:['*']},{data:{...cta(),bad:true}},{data:{...cta(),text:'x'.repeat(201)}}])await expect(service.mutate(a.raw,{brandId:BRAND_ID,expectedRevision:1,kind:'ctas',id:null,data:cta(),...input})).rejects.toBeInstanceOf(BrandError);await expect(write(a.raw,'locations',{...state,name:'City',city:'City',address:'',short_label:'',contact_id:randomUUID()})).rejects.toBeInstanceOf(BrandError);});
 it.each(['English example','Roman Urdu mein rabta karein','بسم اللہ — معیاری انتخاب'])('round-trips exact multilingual copy %#',async(copy)=>{const a=await actor();const s=await write(a.raw,'ctas',cta(copy));expect(s.records.find((r)=>r.kind==='ctas')?.data).toEqual(schemas.ctas.parse(cta(copy)));expect((await service.context(a.raw)).ctas[0]?.text).toBe(copy);});
 it('archives records, hides unapproved data from readers, and scrubs references in context',async()=>{const a=await actor(),reader=await actor('CONTENT_CREATOR');const s=await write(a.raw,'contacts',{...state,label:'Approved contact',type:'PHONE',normalized_value:'+921234567890',display_value:'Call us',usage_context:'GENERAL',is_primary:true});const contact=s.records.find((r)=>r.kind==='contacts')!;await write(a.raw,'locations',{...state,name:'Synthetic branch',city:'City',address:'',short_label:'',contact_id:contact.id});await write(a.raw,'contacts',{...contact.data,active:false},contact.id);await write(a.raw,'ctas',{...cta('Unapproved copy'),approved:false});const projection=await service.context(reader.raw);expect(projection.contacts).toHaveLength(0);expect(projection.locations[0]?.contact).toBeNull();expect(projection.ctas).toHaveLength(0);expect((await service.read(reader.raw)).records.some((r)=>r.kind==='contacts'||r.kind==='ctas')).toBe(false);const json=JSON.stringify(projection);for(const secret of [a.id,reader.id,a.raw.reveal(),'auth_version','session','record_id'])expect(json.includes(secret)).toBe(false);const inspect=(value:unknown):void=>{if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){expect(['id','brand_id','approved','active','auth_version','session','actorId'].includes(key)).toBe(false);inspect(child);}};inspect(projection);expect(await service.context(reader.raw)).toEqual(projection);});
 it.each(CLAIMS)('%s policy is exact and unknown values never allow',async(category)=>{const a=await actor();await write(a.raw,'claims',{...state,category,policy:'EXPLICIT_POST_INPUT'});expect((await service.context(a.raw)).claimPolicies.find((p)=>p.category===category)?.policy).toBe('EXPLICIT_POST_INPUT');await expect(write(a.raw,'claims',{...state,category,policy:'ALLOW_ALL'})).rejects.toBeInstanceOf(BrandError);});
 it('each structured section is stored and projected through the same validated transaction',async()=>{const a=await actor();const entries:{kind:Kind;data:unknown}[]=[{kind:'language',data:{...state,default_language:'MIXED',allowed_languages:['ENGLISH','URDU','ROMAN_URDU','MIXED'],mixing:'ENGLISH_ROMAN_URDU',guidance:'اردو برقرار رکھیں'}},{kind:'voice',data:{...state,tones:['FRIENDLY','CONCISE'],guidance:'Clear voice'}},{kind:'platforms',data:{...state,platform:'INSTAGRAM',tones:['CONCISE'],guidance:'Short native hook'}},{kind:'facts',data:{...state,category:'CONTACT',label:'Approved route',fact:'Contact the configured support channel'}},{kind:'wording',data:{...state,phrase:'  CHEAPEST ',rule_type:'BANNED',language:'ENGLISH',reason:'Unsupported'}},{kind:'hashtags',data:{...state,platform:'GLOBAL',enabled:true,minimum:0,maximum:3,brand_tags:['#Bismillah'],banned_tags:[]}},{kind:'emoji',data:{...state,intensity:'MINIMAL',preferred:['✨'],prohibited:[]}},{kind:'categories',data:{...state,name:'Appliances',selling_points:['Approved guidance'],guidance:'No invented specs',prohibited_claims:['SPECIFICATION'],cta_id:null,platform_notes:''}},{kind:'seasons',data:{...state,name:'Summer',guidance:'Manual guidance',language:null,tones:[],cta_id:null}},{kind:'examples',data:{...state,title:'Style reference',platform:'FACEBOOK',language:'URDU',content:'<script>window.bad=true</script> — بسم اللہ',category_id:null,context:''}}];for(const entry of entries)await write(a.raw,entry.kind,entry.data);const ctx=await service.context(a.raw);expect(ctx.revision).toBe(entries.length+1);expect(ctx.language?.default_language).toBe('MIXED');expect(ctx.approvedExamples[0]?.content).toContain('<script>');expect(ctx.bannedWording[0]?.comparison_phrase).toBe('cheapest');});
 it.each(['same-config','update-deactivate'])('%s separate-pool race has one winner and no lost update',async(race)=>{const a=await actor(),b=await actor();let current=await write(a.raw,'ctas',cta());const record=current.records.find((r)=>r.kind==='ctas')!;const command={brandId:BRAND_ID,expectedRevision:current.revision,kind:'ctas',id:record.id,data:cta('First edit')};const result=await Promise.allSettled([service.mutate(a.raw,command),createBrandService(second.db).mutate(b.raw,{...command,data:race==='same-config'?cta('Second edit'):{...record.data,active:false}})]);expect(result.filter((r)=>r.status==='fulfilled')).toHaveLength(1);for(const r of result)if(r.status==='rejected')expect(r.reason instanceof BrandError&&r.reason.status===409).toBe(true);current=await service.read(a.raw);expect(current.revision).toBe(3);expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(2);});
 it('required audit failure rolls back create, update, deactivation and revision',async()=>{const a=await actor();let s=await write(a.raw,'ctas',cta());const record=s.records.find((r)=>r.kind==='ctas')!;const faulty=createBrandService(db.withPlugin({transformQuery(args){if(args.node.kind==='InsertQueryNode'&&JSON.stringify(args.node.into).includes('audit_logs'))throw new Error('Intentional isolated audit rejection');return args.node;},async transformResult(args){return args.result;}}));for(const [id,data] of [[null,cta('New')],[record.id,cta('Changed')],[record.id,{...record.data,active:false}]] as const){await expect(faulty.mutate(a.raw,{brandId:BRAND_ID,expectedRevision:s.revision,kind:'ctas',id,data})).rejects.toThrow('Security operation unavailable');expect(await service.read(a.raw)).toEqual(s);}s=await write(a.raw,'ctas',cta('Healthy'));expect(s.revision).toBe(3);const audit=JSON.stringify(await db.selectFrom('audit_logs').select('metadata_safe_json').execute());expect(audit.includes('Healthy')).toBe(false);expect(audit.includes('record:')).toBe(true);});
 it('enforces record cap and rolls back rejected edits without increment',async()=>{const a=await actor();for(let i=0;i<5;i++)await write(a.raw,'platforms',{...emptyData('platforms'),platform:['FACEBOOK','INSTAGRAM','TIKTOK','YOUTUBE','LINKEDIN'][i],active:true,approved:true});await expect(write(a.raw,'platforms',{...emptyData('platforms'),active:true,approved:true})).rejects.toThrow('Record limit reached');expect((await service.read(a.raw)).revision).toBe(6);});
 it('competing singleton profile edits preserve exactly one revision winner',async()=>{
  const a=await actor(),b=await actor();const profile=(await service.read(a.raw)).records.find((r)=>r.kind==='profile')!;
  const base={brandId:BRAND_ID,expectedRevision:1,kind:'profile',id:BRAND_ID};
  const results=await Promise.allSettled([service.mutate(a.raw,{...base,data:{...profile.data,short_description:'First'}}),createBrandService(second.db).mutate(b.raw,{...base,data:{...profile.data,short_description:'Second'}})]);
  expect(results.filter((r)=>r.status==='fulfilled')).toHaveLength(1);for(const r of results)if(r.status==='rejected')expect(r.reason instanceof BrandError && r.reason.status===409).toBe(true);
  expect((await service.read(a.raw)).revision).toBe(2);
 });
 it('executes violating writes against every new boolean/order and bounded-list CHECK',async()=>{
  const constraints=await sql<{n:number}>`SELECT COUNT(*) n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='CHECK' AND TABLE_NAME LIKE 'brand%'`.execute(db);expect(Number(constraints.rows[0]?.n)).toBe(60);
  const a=await actor();const required:Partial<Record<Kind,Record<string,unknown>>>={contacts:{label:'Synthetic',normalized_value:'+12025550123',display_value:'Synthetic'},locations:{name:'Synthetic',city:'City'},language:{allowed_languages:['ENGLISH']},ctas:{text:'Approved'},facts:{label:'Fact',fact:'Persistent context'},wording:{phrase:'Phrase'},categories:{name:'Category'},seasons:{name:'Season'},examples:{title:'Example',content:'Reference'}};
  for(const kind of Object.keys(emptyKinds()) as Kind[]){if(kind==='profile')continue;await write(a.raw,kind,{...emptyData(kind),...required[kind],...state});}
  const kinds=Object.keys(emptyKinds()) as Kind[];
  for(const kind of kinds){const table=kind==='profile'?'brands':`brand_${kind}`;for(const field of ['active','approved','sort_order'])await expect(sql`UPDATE ${sql.id(table)} SET ${sql.id(field)}=${field==='sort_order'?-1:2}`.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});}
  const relationships=await sql<{child:string;parent:string;deletion:string;updating:string}>`SELECT TABLE_NAME child,REFERENCED_TABLE_NAME parent,DELETE_RULE deletion,UPDATE_RULE updating FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'brand%'`.execute(db);
  expect(relationships.rows).toHaveLength(18);expect(relationships.rows.every((r)=>r.deletion==='RESTRICT'&&r.updating==='RESTRICT')).toBe(true);
  expect(relationships.rows.map((r)=>`${r.child}/${r.parent}`).sort()).toEqual([...kinds.filter((k)=>k!=='profile').map((k)=>`brand_${k}/brands`),'brand_locations/brand_contacts','brand_categories/brand_ctas','brand_seasons/brand_ctas','brand_examples/brand_categories'].sort());
  for(const kind of kinds)if(kind!=='profile')await expect(sql`UPDATE ${sql.id(`brand_${kind}`)} SET brand_id=${randomUUID()}`.execute(db)).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});
  for(const [kind,field]of [['locations','contact_id'],['categories','cta_id'],['seasons','cta_id'],['examples','category_id']]as const)await expect(sql`UPDATE ${sql.id(`brand_${kind}`)} SET ${sql.id(field)}=${randomUUID()}`.execute(db)).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});
  for(const [kind,field,max]of [['language','allowed_languages',4],['voice','tones',8],['platforms','tones',8],['hashtags','brand_tags',20],['hashtags','banned_tags',20],['emoji','preferred',12],['emoji','prohibited',12],['categories','selling_points',6],['categories','prohibited_claims',13],['seasons','tones',8]] as const){
    for(const value of ['{}',JSON.stringify(Array.from({length:max+1},()=> 'synthetic'))])await expect(sql`UPDATE ${sql.id(`brand_${kind}`)} SET ${sql.id(field)}=${value}`.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});
  }
  await expect(sql`UPDATE brand_contacts SET is_primary=2`.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});
  await expect(sql`UPDATE brand_hashtags SET enabled=2`.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});
 });
 it('enforces approved context byte budget atomically, without truncation',async()=>{
  const a=await actor();let rejected=false;
  for(let i=0;i<24;i++){
    const before=await service.read(a.raw),audits=(await db.selectFrom('audit_logs').select('id').execute()).length;
    try{await write(a.raw,'examples',{...state,title:`Synthetic ${i}`,platform:'FACEBOOK',language:'URDU',content:'😀'.repeat(1600),category_id:null,context:''});}
    catch(error){expect(error instanceof BrandError && error.status===409).toBe(true);expect((error as Error).message).toContain('128 KiB');expect(await service.read(a.raw)).toEqual(before);expect((await db.selectFrom('audit_logs').select('id').execute()).length).toBe(audits);rejected=true;break;}
  }
  expect(rejected).toBe(true);expect(Buffer.byteLength(JSON.stringify(await service.context(a.raw)),'utf8')).toBeLessThanOrEqual(131072);
 });
 it('does not approve two primary contacts of the same type',async()=>{
  const a=await actor(),data={...state,label:'Primary',type:'PHONE',normalized_value:'+12025550123',display_value:'Synthetic contact',usage_context:'GENERAL',is_primary:true};await write(a.raw,'contacts',data);
  await expect(write(a.raw,'contacts',data)).rejects.toThrow('already has a primary');expect((await service.read(a.raw)).revision).toBe(2);
 });
 it('database CHECKs and same-brand foreign keys reject violating writes',async()=>{for(const statement of [sql`UPDATE brands SET slot=2`,sql`UPDATE brands SET revision=0`,sql`UPDATE brands SET active=2`])await expect(statement.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});await expect(sql`INSERT INTO brand_locations(id,brand_id,name,city,address,short_label,contact_id,active,approved,sort_order) VALUES(${randomUUID()},${BRAND_ID},'Bad','City','','',${randomUUID()},1,1,0)`.execute(db)).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});await expect(sql`INSERT INTO brand_hashtags(id,brand_id,platform,enabled,minimum,maximum,brand_tags,banned_tags,active,approved,sort_order) VALUES(${randomUUID()},${BRAND_ID},'GLOBAL',1,6,2,'[]','[]',1,1,0)`.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});await expect(sql`INSERT INTO brand_voice(id,brand_id,tones,guidance,active,approved,sort_order) VALUES(${randomUUID()},${BRAND_ID},'{}','',1,1,0)`.execute(db)).rejects.toMatchObject({code:'ER_CHECK_CONSTRAINT_VIOLATED'});});
});

describe('final adversarial review: authority, ownership, revision and audit',()=>{
 it.each(['OWNER','MARKETING_ADMIN','CONTENT_CREATOR','REVIEWER','VIEWER'])('%s attacks every mutation kind directly',async(role)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor(role);
  for(const kind of Object.keys(schemas) as Kind[]){const input={brandId:BRAND_ID,expectedRevision:(await db.selectFrom('brands').select('revision').executeTakeFirstOrThrow()).revision,kind,id:kind==='profile'?BRAND_ID:null,data:sample(kind)};
   if(role==='OWNER')expect((await service.mutate(a.raw,input)).revision).toBe(input.expectedRevision+1);else await expect(service.mutate(a.raw,input)).rejects.toBeInstanceOf(AuthorizationError);
  }
  if(role!=='OWNER')expect((await db.selectFrom('brands').select('revision').executeTakeFirstOrThrow()).revision).toBe(1);
 });
 it.each(['missing-role','malformed-role','unknown-permission','extra-manage-grant'] as const)('fails closed on %s for read, projection and mutation',async(corruption)=>{
  const a=await actor(),extra=randomUUID(),viewer=canonicalCatalogId('role','VIEWER'),manage=canonicalCatalogId('permission','brand.manage');
  try{
   if(corruption==='missing-role')await db.deleteFrom('user_roles').where('user_id','=',a.id).execute();
   if(corruption==='malformed-role')await db.updateTable('roles').set({code:'CORRUPT_OWNER'}).where('code','=','OWNER').execute();
   if(corruption==='unknown-permission')await db.insertInto('permissions').values({id:extra,code:'unknown.permission'}).execute();
   if(corruption==='extra-manage-grant')await db.insertInto('role_permissions').values({role_id:viewer,permission_id:manage}).execute();
   for(const op of [()=>service.read(a.raw),()=>service.context(a.raw),()=>service.mutate(a.raw,{brandId:BRAND_ID,expectedRevision:1,kind:'ctas',id:null,data:cta()})])await expect(op()).rejects.toBeInstanceOf(AuthorizationError);
   expect((await db.selectFrom('brands').select('revision').executeTakeFirstOrThrow()).revision).toBe(1);
  }finally{if(corruption==='malformed-role')await db.updateTable('roles').set({code:'OWNER'}).where('code','=','CORRUPT_OWNER').execute();if(corruption==='unknown-permission')await db.deleteFrom('permissions').where('id','=',extra).execute();if(corruption==='extra-manage-grant')await db.deleteFrom('role_permissions').where('role_id','=',viewer).where('permission_id','=',manage).execute();}
 });
 it('rejects canonical brand replacement and cross-parent record/reference substitution',async()=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor();const s=await write(a.raw,'contacts',sample('contacts'));const contact=s.records.find(r=>r.kind==='contacts')!;
  for(const brandId of [randomUUID(),'00000000-0000-4000-8000-000000000999']){await expect(service.read(a.raw,brandId)).rejects.toMatchObject({status:404});await expect(service.context(a.raw,brandId)).rejects.toMatchObject({status:404});for(const kind of Object.keys(schemas) as Kind[])await expect(service.mutate(a.raw,{brandId,expectedRevision:2,kind,id:kind==='profile'?BRAND_ID:null,data:sample(kind)})).rejects.toMatchObject({status:404});}
  for(const kind of ['ctas','examples','categories','locations'] as const)await expect(write(a.raw,kind,sample(kind),contact.id)).rejects.toMatchObject({status:404});
  for(const [kind,key]of [['categories','cta_id'],['seasons','cta_id'],['examples','category_id']] as const)await expect(write(a.raw,kind,sample(kind,{[key]:contact.id}))).rejects.toMatchObject({status:400});
  await expect(sql`UPDATE brand_contacts SET brand_id=${randomUUID()}`.execute(db)).rejects.toMatchObject({code:'ER_NO_REFERENCED_ROW_2'});
 });
 it.each(['profile','language','voice','ctas'] as const)('%s sequential stale editor never overwrites the first committed save',async(kind)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor(),b=await actor();if(kind!=='profile')await write(a.raw,kind,sample(kind));const before=await service.read(a.raw),record=before.records.find(r=>r.kind===kind)!;const other=createBrandService(second.db);expect((await other.read(b.raw)).revision).toBe(before.revision);
  const first={...record.data,...(kind==='profile'?{summary:'First committed edit'}:kind==='ctas'?{text:'First committed edit'}:{guidance:'First committed edit'})};
  await write(a.raw,kind,first,record.id,before.revision);const committed=await service.read(a.raw);const auditCount=(await db.selectFrom('audit_logs').select('id').execute()).length;
  await expect(other.mutate(b.raw,{brandId:BRAND_ID,expectedRevision:before.revision,kind,id:record.id,data:record.data})).rejects.toMatchObject({status:409});expect(await service.read(a.raw)).toEqual(committed);expect((await db.selectFrom('audit_logs').select('id').execute()).length).toBe(auditCount);
 });
 it.each(['language','voice'] as const)('%s simultaneous singleton edits produce one committed audit/revision',async(kind)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor(),b=await actor(),s=await write(a.raw,kind,sample(kind)),row=s.records.find(r=>r.kind===kind)!;
  const command={brandId:BRAND_ID,expectedRevision:s.revision,kind,id:row.id};const results=await Promise.allSettled([service.mutate(a.raw,{...command,data:{...row.data,guidance:'A'}}),createBrandService(second.db).mutate(b.raw,{...command,data:{...row.data,guidance:'B'}})]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);for(const r of results)if(r.status==='rejected')expect(r.reason instanceof BrandError&&r.reason.status===409).toBe(true);
  expect((await service.read(a.raw)).revision).toBe(s.revision+1);expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(2);
 });
 for(const phase of ['write','revision','audit'] as const)it.each(['create','update','deactivate'] as const)(`${phase} failure rolls back %s + revision + audit`,async(operation)=>{
  const a=await actor(),before=await write(a.raw,'ctas',cta()),record=before.records.find(r=>r.kind==='ctas')!;let injected=false;
  const faulty=createBrandService(db.withPlugin({transformQuery(args){const node=JSON.stringify(args.node);const trigger=phase==='write'?node.includes('brand_ctas')&&(node.includes('INSERT INTO ')||node.includes('UPDATE ')):phase==='revision'?args.node.kind==='UpdateQueryNode'&&node.includes('brands')&&node.includes('revision'):args.node.kind==='InsertQueryNode'&&node.includes('audit_logs');if(trigger){injected=true;throw new Error('Intentional isolated Brand Brain failure');}return args.node;},async transformResult(args){return args.result;}}));
  const input={brandId:BRAND_ID,expectedRevision:before.revision,kind:'ctas',id:operation==='create'?null:record.id,data:operation==='deactivate'?{...record.data,active:false}:cta('Changed')};
  const audits=await db.selectFrom('audit_logs').select('id').execute();await expect(faulty.mutate(a.raw,input)).rejects.toThrow('Security operation unavailable');expect(injected).toBe(true);expect(await service.read(a.raw)).toEqual(before);expect((await db.selectFrom('audit_logs').select('id').execute()).length).toBe(audits.length);
  expect((await service.mutate(a.raw,input)).revision).toBe(before.revision+1);
 });
 it('identical accepted saves deliberately increment once, rejected saves never increment',async()=>{const a=await actor();let before=await service.read(a.raw);const profile=before.records.find(r=>r.kind==='profile')!;for(let n=0;n<2;n++){const next=await write(a.raw,'profile',profile.data,BRAND_ID,before.revision);expect(next.revision).toBe(before.revision+1);before=next;}expect(await db.selectFrom('audit_logs').select('id').execute()).toHaveLength(2);await expect(write(a.raw,'profile',{...profile.data,unexpected:true},BRAND_ID,before.revision)).rejects.toMatchObject({status:400});expect((await service.read(a.raw)).revision).toBe(before.revision);});
});

describe('final adversarial review: projection filtering, limits, corruption and references',()=>{
 const kinds=['contacts','locations','ctas','wording','categories','seasons','examples'] as const;
 it.each(kinds)('%s count cap and simultaneous final-slot creation stay bounded',async(kind)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const {LIMITS}=await import('../../src/features/brand/model');const a=await actor(),b=await actor();
  for(let i=0;i<LIMITS[kind]-1;i++)await write(a.raw,kind,sample(kind,{approved:false}));
  const revision=(await service.read(a.raw)).revision,command={brandId:BRAND_ID,expectedRevision:revision,kind,id:null,data:sample(kind,{approved:false})};
  const results=await Promise.allSettled([service.mutate(a.raw,command),createBrandService(second.db).mutate(b.raw,command)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);for(const r of results)if(r.status==='rejected')expect(r.reason instanceof BrandError&&r.reason.status===409).toBe(true);
  const before=await service.read(a.raw);expect(before.records.filter(r=>r.kind===kind)).toHaveLength(LIMITS[kind]);await expect(write(a.raw,kind,sample(kind,{approved:false}))).rejects.toMatchObject({status:409});expect(await service.read(a.raw)).toEqual(before);
 });
 it.each(['contacts','locations','ctas','wording','categories','seasons','examples'] as const)('%s requires both active and approved and legitimate reapproval includes it',async(kind)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor();let s=await service.read(a.raw);
  for(const [active,approved]of [[false,false],[true,false],[false,true],[true,true]] as const)s=await write(a.raw,kind,sample(kind,{active,approved,...(kind==='contacts'?{is_primary:true}:{})}));
  const collection={contacts:'contacts',locations:'locations',ctas:'ctas',wording:'bannedWording',categories:'categories',seasons:'seasonalGuidance',examples:'approvedExamples'}[kind];expect((Reflect.get(await service.context(a.raw),collection) as unknown[]).length).toBe(1);
  for(const row of s.records.filter(r=>r.kind===kind && (!r.data.active||!r.data.approved)))await write(a.raw,kind,{...row.data,active:true,approved:true,...(kind==='contacts'?{is_primary:false}:{})},row.id);
  expect((Reflect.get(await service.context(a.raw),collection) as unknown[]).length).toBe(4);
 });
 it.each([['locations','contacts','contact_id'],['categories','ctas','cta_id'],['seasons','ctas','cta_id'],['examples','categories','category_id']] as const)('%s reference never leaks inactive/unapproved %s data',async(child,parent,key)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor();let s=await write(a.raw,parent,sample(parent));const ref=s.records.find(r=>r.kind===parent)!;await write(a.raw,child,sample(child,{[key]:ref.id}));
  const collection=child==='locations'?'locations':child==='categories'?'categories':child==='seasons'?'seasonalGuidance':'approvedExamples',field=child==='locations'?'contact':child==='examples'?'category':'cta';
  expect((Reflect.get(await service.context(a.raw),collection) as Record<string,unknown>[])[0]?.[field]!==null).toBe(true);
  for(const patch of [{active:false},{active:true,approved:false}]){s=await write(a.raw,parent,{...ref.data,...patch},ref.id);expect((Reflect.get(await service.context(a.raw),collection) as Record<string,unknown>[])[0]?.[field]).toBeNull();}
  await write(a.raw,parent,{...ref.data,active:true,approved:true},ref.id);expect((Reflect.get(await service.context(a.raw),collection) as Record<string,unknown>[])[0]?.[field]!==null).toBe(true);expect(s.revision).toBeGreaterThan(1);
 });
 it.each(CLAIMS)('%s missing/inactive policy always returns conservative fallback',async(category)=>{const a=await actor();expect((await service.context(a.raw)).claimPolicies.find(p=>p.category===category)?.policy).toBe('EXPLICIT_APPROVAL_REQUIRED');const s=await write(a.raw,'claims',{...state,category,policy:'APPROVED_FACT_OR_INPUT'}),row=s.records.find(r=>r.kind==='claims')!;await write(a.raw,'claims',{...row.data,active:false},row.id);expect((await service.context(a.raw)).claimPolicies.find(p=>p.category===category)?.policy).toBe('EXPLICIT_APPROVAL_REQUIRED');});
 it.each(['tone','language-list','policy','platform','approval'] as const)('unexpected persisted %s cannot become trusted context without disabling constraints',async(corruption)=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor();
  const kind=corruption==='tone'?'voice':corruption==='language-list'?'language':corruption==='policy'?'claims':corruption==='platform'?'platforms':'ctas';await write(a.raw,kind,sample(kind));
  if(corruption==='tone'){await sql`UPDATE brand_voice SET tones='["UNKNOWN"]'`.execute(db);await expect(service.context(a.raw)).rejects.toThrow('Security operation unavailable');}
  else if(corruption==='language-list'){await sql`UPDATE brand_language SET allowed_languages='["UNKNOWN"]'`.execute(db);await expect(service.context(a.raw)).rejects.toThrow('Security operation unavailable');}
  else{const corrupt=createBrandService(db.withPlugin({transformQuery(args){return args.node;},async transformResult(args){return {...args.result,rows:args.result.rows.map((row)=>{const r=row as Record<string,unknown>;return corruption==='policy'&&'policy'in r?{...r,policy:null}:corruption==='platform'&&'guidance'in r&&'platform'in r?{...r,platform:'UNKNOWN'}:corruption==='approval'&&'text'in r?{...r,approved:2}:r;})};}}));
   if(corruption==='approval')expect((await corrupt.context(a.raw)).ctas).toHaveLength(0);else await expect(corrupt.context(a.raw)).rejects.toThrow('Security operation unavailable');}
 });
 it('same UUID in different SQL tables does not change the referenced entity kind',async()=>{
  const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor(),s=await write(a.raw,'contacts',sample('contacts',{label:'Intended contact'})),contact=s.records.find(r=>r.kind==='contacts')!;
  await db.insertInto('brand_ctas').values({id:contact.id,brand_id:BRAND_ID,...schemas.ctas.parse(sample('ctas'))}).execute();await write(a.raw,'locations',sample('locations',{contact_id:contact.id}));expect((await service.context(a.raw)).locations[0]?.contact?.label).toBe('Intended contact');
 });
 it('projection collections are identical after different physical insertion orders',async()=>{
  const {sample,recordId}=await import('../helpers/brand-review-fixtures');const a=await actor();let n=1000;
  for(const kind of ['contacts','locations','ctas','wording','categories','seasons','examples'] as const)for(const order of [2,0,1]){const data=schemas[kind].parse(sample(kind,{sort_order:order}));const columns=['id','brand_id',...Object.keys(data)],values=[recordId(n++),BRAND_ID,...Object.values(data)];await sql`INSERT INTO ${sql.id(`brand_${kind}`)} (${sql.join(columns.map(c=>sql.id(c)))}) VALUES (${sql.join(values.map(v=>sql`${Array.isArray(v)?JSON.stringify(v):v}`))})`.execute(db);}
  const first=await service.context(a.raw);for(const kind of ['contacts','locations','ctas','wording','categories','seasons','examples'] as const){const rows=await sql<Record<string,unknown>>`SELECT * FROM ${sql.id(`brand_${kind}`)} ORDER BY id DESC`.execute(db);await sql`DELETE FROM ${sql.id(`brand_${kind}`)}`.execute(db);for(const row of rows.rows){const columns=Object.keys(row),values=Object.values(row);await sql`INSERT INTO ${sql.id(`brand_${kind}`)} (${sql.join(columns.map(c=>sql.id(c)))}) VALUES (${sql.join(values.map(v=>sql`${v&&typeof v==='object'?JSON.stringify(v):v}`))})`.execute(db);}}
  expect(await service.context(a.raw)).toEqual(first);expect(await service.context(a.raw)).toEqual(first);
 });
 it.each(['English','Roman Urdu','English اور اردو','  e\u0301 — ا\u0654 \u200f  ','😀'.repeat(200)])('preserves exact multilingual/RTL/combining/space copy %#',async(copy)=>{const a=await actor();await write(a.raw,'ctas',cta(copy));expect((await service.context(a.raw)).ctas[0]?.text).toBe(copy);});
 it('audit metadata never becomes a shadow copy of marketing records',async()=>{const {sample}=await import('../helpers/brand-review-fixtures');const a=await actor();for(const [kind,patch]of [['contacts',{label:'Public canary contact',type:'EMAIL',normalized_value:'review-canary@example.test',display_value:'PUBLIC_REVIEW_CONTACT_VALUE'}],['locations',{address:'PUBLIC_REVIEW_ADDRESS_VALUE'}],['voice',{guidance:'PUBLIC_REVIEW_GUIDANCE_VALUE'}],['examples',{content:'PUBLIC_REVIEW_EXAMPLE_VALUE'}]] as const)await write(a.raw,kind,sample(kind,patch));const rows=await db.selectFrom('audit_logs').select(['action','metadata_safe_json','actor_user_id']).execute();expect(rows).toHaveLength(4);for(const row of rows){expect(row.actor_user_id===a.id).toBe(true);const metadata=typeof row.metadata_safe_json==='string'?JSON.parse(row.metadata_safe_json):row.metadata_safe_json;expect(Object.keys(metadata??{}).sort()).toEqual(['changedFields','count','reasonCode']);expect(Object.values(metadata??{}).some(v=>JSON.stringify(v).includes('PUBLIC_REVIEW_')||JSON.stringify(v).includes('review-canary@example.test'))).toBe(false);}});
});
