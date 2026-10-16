import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { z } from 'zod';
import type { DatabaseSchema } from '../db/schema.ts';
import { authorizationContext, requireAuthenticatedUser, requirePermission, can, AuthorizationError } from '../authorization/authorization.ts';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';
import { BRAND_ID, KINDS, schemas, LIMITS, CLAIMS, mutationSchema, snapshotSchema, comparisonPhrase, type ContextData, type Kind, type BrandRecord, type BrandSnapshot } from '../../features/brand/model.ts';
import { FIELDS } from '../../features/brand/fields.ts';

export class BrandError extends Error {
  constructor(readonly status: 400 | 404 | 409, message: string) { super(message); this.name = 'BrandError'; }
}
const table = (kind: Kind) => kind === 'profile' ? 'brands' : `brand_${kind}`;
const columns = (kind: Kind) => [...FIELDS[kind].map((f) => f.name),'active','approved','sort_order'];
const bools = new Set(['active','approved','is_primary','enabled']);
const arrays = new Set(['tones','allowed_languages','brand_tags','banned_tags','preferred','prohibited','selling_points','prohibited_claims']);
export const CONTEXT_MAX_BYTES = 131072;
function decode(kind: Kind, row: Record<string,unknown>): BrandRecord {
  const values = Object.fromEntries(columns(kind).map((key) => [key, bools.has(key) ? row[key] === 1 || row[key] === true : arrays.has(key) && typeof row[key] === 'string' ? JSON.parse(row[key] as string) as unknown : row[key]]));
  return { id:z.uuid().parse(row.id),kind,data:schemas[kind].parse(values) };
}
async function snapshot(tx: Kysely<DatabaseSchema>, manage: boolean): Promise<BrandSnapshot> {
  // Caller first holds the actor user/session, then this brand row. All records share the revision lock.
  const brand = await tx.selectFrom('brands').select(['revision','updated_at']).where('id','=',BRAND_ID).forShare().executeTakeFirst();
  if (!brand) throw new BrandError(404,'Brand is not configured.');
  const records: BrandRecord[] = [];
  for (const kind of KINDS) {
    const rows = await sql<Record<string,unknown>>`SELECT id, ${sql.join(columns(kind).map((k) => sql.id(k)))} FROM ${sql.table(table(kind))} WHERE ${sql.id(kind === 'profile' ? 'id':'brand_id')}=${BRAND_ID} ORDER BY sort_order,id LIMIT ${LIMITS[kind] + 1} LOCK IN SHARE MODE`.execute(tx);
    if (rows.rows.length > LIMITS[kind]) throw new SecurityOperationError();
    for (const row of rows.rows) { const record=decode(kind,row); if (manage || record.data.active && record.data.approved) records.push(record); }
  }
  return {brandId:BRAND_ID, revision:brand.revision, updatedAt:brand.updated_at.toISOString(), canManage:manage,records};
}
/** Pure marketing data only. References resolve to approved data, never internal IDs/security state. */
export function projectContext(source: BrandSnapshot) {
  // This exported boundary may be consumed by later server code: types alone are not validation.
  try {
    if (!source.records.some((r) => r.kind === 'profile' && r.data.active === true && r.data.approved === true)) throw new BrandError(409,'An active approved brand profile is required.');
    source = snapshotSchema.parse(source);
    if (source.brandId !== BRAND_ID || source.records.find((r)=>r.kind==='profile')?.id !== BRAND_ID) throw new SecurityOperationError();
    const identities=new Set<string>(), scopes=new Set<string>();
    for(const kind of KINDS) if(source.records.filter((r)=>r.kind===kind).length>LIMITS[kind]) throw new SecurityOperationError();
    for(const row of source.records){
      const identity=`${row.kind}:${row.id}`;if(identities.has(identity))throw new SecurityOperationError();identities.add(identity);
      const data:Record<string,unknown>={...row.data};
      if(row.kind==='claims'||row.kind==='platforms'||row.kind==='hashtags'){
        const scope=`${row.kind}:${String(row.kind==='claims'?data.category:data.platform)}`;
        if(scopes.has(scope))throw new SecurityOperationError();scopes.add(scope);
      }
    }
  } catch (error) { if (error instanceof BrandError) throw error; throw new SecurityOperationError(); }
  const eligible=source.records.filter((r) => r.data.active && r.data.approved);
  const approved=new Map(eligible.map((r) => [`${r.kind}:${r.id}`,r]));
  const profile=eligible.find((r) => r.kind==='profile');
  if (!profile) throw new BrandError(409,'An active approved brand profile is required.');
  const project=(r:BrandRecord): Record<string,unknown> => {
    const values:Record<string,unknown>={...r.data};
    const data:Record<string,unknown>=Object.fromEntries(FIELDS[r.kind].map((field)=>[field.name,values[field.name]]));
    for(const [key,label,kind] of [['contact_id','contact','contacts'],['cta_id','cta','ctas'],['category_id','category','categories']] as const) if(key in data) {
      const ref=approved.get(`${kind}:${String(data[key])}`); delete data[key]; data[label]=ref ? project(ref):null;
    }
    if(r.kind==='wording') data.comparison_phrase=comparisonPhrase(String(data.phrase));
    return data;
  };
  const list=<K extends Kind>(kind:K)=>eligible.filter((r)=>r.kind===kind).map((r)=>project(r) as ContextData<K>);
  const context={ revision:source.revision, brand:project(profile) as ContextData<'profile'>, contacts:list('contacts'), locations:list('locations'),
    language:list('language')[0]??null, voice:list('voice')[0]??null,
    platformGuidance:list('platforms'),ctas:list('ctas'),
    claimPolicies:CLAIMS.map((category)=>{ const row=eligible.find((r)=>r.kind==='claims' && 'category' in r.data && r.data.category===category);return {category,policy:row && 'policy' in row.data ? row.data.policy:'EXPLICIT_APPROVAL_REQUIRED'}; }),
    facts:list('facts'),bannedWording:list('wording'),hashtagRules:list('hashtags'),emojiRules:list('emoji')[0]??null,
    categories:list('categories'),seasonalGuidance:list('seasons'),approvedExamples:list('examples') };
  if(Buffer.byteLength(JSON.stringify(context),'utf8')>CONTEXT_MAX_BYTES) throw new BrandError(409,'Approved context exceeds 128 KiB. Deactivate or shorten entries.');
  return context;
}
async function audit(tx: Kysely<DatabaseSchema>, actorId:string, sessionId:string, kind:Kind, id:string, operation:'created'|'updated'|'deactivated', revision:number) {
  // IDs occupy a dedicated closed-format field; no marketing content is retained.
  const metadata=JSON.stringify({reasonCode:`brand.${kind}.${operation}`,changedFields:[`record:${id}`],count:revision});
  await tx.insertInto('audit_logs').values({id:randomUUID(),actor_user_id:actorId,target_user_id:null,session_id:sessionId,action:`brand.${kind}.${operation}`,outcome:'success',correlation_id:randomUUID(),metadata_safe_json:metadata,ip_hash:null}).execute();
}
/** Content validation only: caller already holds a current actor in its transaction. */
export async function contentBrandSnapshot(tx:Kysely<DatabaseSchema>,actor:import('../authorization/authorization').AuthorizationContext){
 requirePermission(actor,'brand.read');return snapshot(tx,false);
}
export function createBrandService(db:Kysely<DatabaseSchema>) {
  async function transaction<T>(fn:(tx:Kysely<DatabaseSchema>)=>Promise<T>) {
    try{return await db.transaction().execute(fn);}catch(error){if(error instanceof AuthorizationError || error instanceof BrandError)throw error;throw new SecurityOperationError();}
  }
  return {
    async read(raw:SensitiveValue,brandId:unknown=BRAND_ID) {
      return transaction(async(tx)=>{const {context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'brand.read');if(brandId!==BRAND_ID)throw new BrandError(404,'Brand not found.');return snapshot(tx,can(context,'brand.manage'));});
    },
    async context(raw:SensitiveValue,brandId:unknown=BRAND_ID) {
      return projectContext(await this.read(raw,brandId));
    },
    async mutate(raw:SensitiveValue,value:unknown) {
      // Reject unauthorized work before waiting for marketing locks.
      requirePermission(await authorizationContext(db,raw),'brand.manage');
      const parsed=mutationSchema.safeParse(value);if(!parsed.success)throw new BrandError(400,'Check the request fields.');
      const input=parsed.data;const dataResult=schemas[input.kind].safeParse(input.data);if(!dataResult.success)throw new BrandError(400,'Check field values and limits.');
      const data=dataResult.data,kind=input.kind;
      if(input.brandId!==BRAND_ID)throw new BrandError(404,'Brand not found.');
      return transaction(async(tx)=>{
        const {context}=await requireAuthenticatedUser(tx,raw);requirePermission(context,'brand.manage');
        const brand=await tx.selectFrom('brands').select('revision').where('id','=',BRAND_ID).forUpdate().executeTakeFirstOrThrow();
        if(brand.revision!==input.expectedRevision)throw new BrandError(409,'Brand Brain changed. Reload before saving your edit.');
        if(kind==='profile' && input.id!==BRAND_ID)throw new BrandError(400,'Use the existing brand profile.');
        const current=await sql<{id:string}>`SELECT id FROM ${sql.table(table(kind))} WHERE ${sql.id(kind==='profile'?'id':'brand_id')}=${BRAND_ID} ORDER BY id LIMIT ${LIMITS[kind]+1} FOR UPDATE`.execute(tx);
        if(input.id && !current.rows.some((r)=>r.id===input.id))throw new BrandError(404,'Record not found.');
        if(!input.id && current.rows.length>=LIMITS[kind])throw new BrandError(409,'Record limit reached. Deactivate or edit existing entries.');
        const id=input.id??randomUUID();
        const values:Record<string,unknown>={...data};
        // Every reference is constrained to the same brand both here and by composite SQL FK.
        for(const [key,parent] of [['contact_id','contacts'],['cta_id','ctas'],['category_id','categories']] as const) if(values[key]) {
          const ref=await sql<{id:string}>`SELECT id FROM ${sql.table(table(parent))} WHERE brand_id=${BRAND_ID} AND id=${values[key]} AND active=1 AND approved=1 LOCK IN SHARE MODE`.execute(tx);
          if(ref.rows.length!==1)throw new BrandError(400,'Choose an active approved reference.');
        }
        if(kind==='contacts' && 'is_primary' in data && data.is_primary && data.active && data.approved) {
          const others=await sql<{id:string}>`SELECT id FROM brand_contacts WHERE brand_id=${BRAND_ID} AND type=${data.type} AND is_primary=1 AND active=1 AND approved=1 AND id<>${id} LOCK IN SHARE MODE`.execute(tx);
          if(others.rows.length)throw new BrandError(409,'This contact type already has a primary contact.');
        }
        const names=columns(kind),stored=names.map((k)=>arrays.has(k)?JSON.stringify(values[k]):values[k]);
        if(input.id)await sql`UPDATE ${sql.table(table(kind))} SET ${sql.join(names.map((key,i)=>sql`${sql.id(key)}=${stored[i]}`))} WHERE id=${id} AND ${sql.id(kind==='profile'?'id':'brand_id')}=${BRAND_ID}`.execute(tx);
        else await sql`INSERT INTO ${sql.table(table(kind))} (${sql.join(['id','brand_id',...names].map((k)=>sql.id(k)))}) VALUES (${sql.join([id,BRAND_ID,...stored].map((v)=>sql`${v}`))})`.execute(tx);
        await tx.updateTable('brands').set({revision:brand.revision+1,updated_at:sql`CURRENT_TIMESTAMP(3)`}).where('id','=',BRAND_ID).execute();
        const result=await snapshot(tx,true);projectContext(result);
        await audit(tx,context.userId,context.sessionId,kind,id,!data.active?'deactivated':input.id?'updated':'created',result.revision);
        return result;
      });
    },
  };
}

export type BrandContext = ReturnType<typeof projectContext>;
