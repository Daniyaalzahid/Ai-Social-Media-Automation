import {describe,it,expect} from 'vitest';
import {projectContext} from '../../src/server/brand/service';
import {schemas,type BrandSnapshot,type BrandRecord} from '../../src/features/brand/model';
import {reviewSource,sample,recordId} from '../helpers/brand-review-fixtures';
describe('Brand Brain defensive projection and normalized bounds regressions',()=>{
 it.each(['role','password_hash','session_id','metadata_safe_json'])('rejects unexpected %s at the exported projection boundary',(key)=>{const source=reviewSource();source.records[0]!.data={...source.records[0]!.data,[key]:'PUBLIC_REVIEW_MARKER_NOT_A_CREDENTIAL'} as BrandRecord['data'];expect(()=>projectContext(source)).toThrow();});
 it('does not reinterpret a corrupt unknown policy as trusted context',()=>{const source=reviewSource([{id:recordId(1),kind:'claims',data:sample('claims',{policy:'ALLOW_ALL'}) as BrandRecord['data']}]);expect(()=>projectContext(source)).toThrow();});
 it('resolves references by entity kind even when different tables share a valid UUID',()=>{const id=recordId(1);const source=reviewSource([{id,kind:'contacts',data:sample('contacts',{label:'Intended contact'}) as BrandRecord['data']},{id,kind:'ctas',data:sample('ctas') as BrandRecord['data']},{id:recordId(2),kind:'locations',data:sample('locations',{contact_id:id}) as BrandRecord['data']}]);expect(projectContext(source).locations[0]?.contact?.label==='Intended contact').toBe(true);});
 it('rejects canonical URLs and normalized hashtags that expand beyond their stored bound',()=>{const website='https://example.test/'+ 'ا'.repeat(100);expect(schemas.profile.safeParse(sample('profile',{website})).success).toBe(false);expect(schemas.hashtags.safeParse(sample('hashtags',{brand_tags:['#'+'İ'.repeat(70)]})).success).toBe(false);});
 it('rejects a normalized hashtag expansion independently',()=>{expect(schemas.hashtags.safeParse(sample('hashtags',{brand_tags:['#'+'İ'.repeat(70)]})).success).toBe(false);});
 it('does not allow non-boolean approval to enter trusted projection',()=>{const source=reviewSource([{id:recordId(1),kind:'ctas',data:sample('ctas',{approved:2}) as BrandRecord['data']}]);expect(()=>projectContext(source as BrandSnapshot)).toThrow();});
});

describe('projection exact field allowlist, corruption and multilingual boundaries',()=>{
 const expected:Record<string,string[]>={brand:['name','website','short_description','business_type','country','timezone','summary'],contacts:['label','type','normalized_value','display_value','usage_context','is_primary'],locations:['name','city','address','short_label','contact'],language:['default_language','allowed_languages','mixing','guidance'],voice:['tones','guidance'],platformGuidance:['platform','tones','guidance'],ctas:['text','language','platform','context'],claimPolicies:['category','policy'],facts:['category','label','fact'],bannedWording:['phrase','rule_type','language','reason','comparison_phrase'],hashtagRules:['platform','enabled','minimum','maximum','brand_tags','banned_tags'],emojiRules:['intensity','preferred','prohibited'],categories:['name','selling_points','guidance','prohibited_claims','cta','platform_notes'],seasonalGuidance:['name','guidance','language','tones','cta'],approvedExamples:['title','platform','language','content','category','context']};
 it('asserts every projected field and recursively excludes security/database state',async()=>{
  const {KINDS}=await import('../../src/features/brand/model');const {FORBIDDEN_CONTEXT_KEYS}=await import('../helpers/brand-review-fixtures');
  const source=reviewSource(KINDS.filter(k=>k!=='profile').map((kind,i)=>({id:recordId(i+1),kind,data:sample(kind) as BrandRecord['data']})));
  const context=projectContext(source);expect(Object.keys(context).sort()).toEqual(['revision',...Object.keys(expected)].sort());
  for(const [key,keys]of Object.entries(expected)){const value=Reflect.get(context,key);for(const item of Array.isArray(value)?value:[value])expect(Object.keys(item).sort()).toEqual(keys.sort());}
  const inspect=(v:unknown):void=>{if(v&&typeof v==='object')for(const [key,value]of Object.entries(v)){expect(FORBIDDEN_CONTEXT_KEYS.includes(key)).toBe(false);inspect(value);}};inspect(context);
  const encoded=JSON.stringify(context);for(const row of source.records)expect(encoded.includes(row.id)).toBe(false);
 });
 it.each([['claims',{policy:null}],['claims',{category:'UNKNOWN'}],['language',{default_language:'urdu'}],['language',{allowed_languages:['UNKNOWN']}],['platforms',{platform:'UNKNOWN'}],['voice',{tones:['UNKNOWN']}],['ctas',{active:2}],['ctas',{approved:null}]] as const)('fails closed on corrupt %s data %#',(kind,patch)=>{expect(()=>projectContext(reviewSource([{id:recordId(1),kind,data:sample(kind,patch) as BrandRecord['data']}]))).toThrow('Security operation unavailable');});
 it.each(['English copy','Roman Urdu mein baat','بسم اللہ — بہترین انتخاب','English + اردو + Roman Urdu','  e\u0301 — ا\u0654 \u200f 😀  '])('preserves display text and separate comparison normalization %#',(content)=>{const source=reviewSource([{id:recordId(1),kind:'wording',data:sample('wording',{phrase:content}) as BrandRecord['data']},{id:recordId(2),kind:'examples',data:sample('examples',{content}) as BrandRecord['data']}]);const ctx=projectContext(source);expect(ctx.bannedWording[0]?.phrase).toBe(content);expect(ctx.approvedExamples[0]?.content).toBe(content);expect(Buffer.from(ctx.approvedExamples[0]!.content).toString('utf8')).toBe(content);});
 it('rejects structured campaign facts rather than silently accepting unexpected offer fields',()=>{for(const extra of [{current_price:100},{discount_percentage:30},{current_stock:5},{offer_expiry:'2026-10-20'},{campaign_installment:'temporary'},{limited_time_promotion:true}])expect(schemas.facts.safeParse({...sample('facts'),...extra}).success).toBe(false);});
});

describe('exact 128 KiB UTF-8 context ceiling',()=>{
 function sizedSource(unit:string,count:number,padding:number){
  const source=reviewSource();(source.records[0]!.data as {summary:string}).summary='a'.repeat(padding);
  let id=1,remaining=count;
  function fill(kind:'examples'|'facts'|'wording'|'ctas'|'categories',n:number,field:string,cap:number){for(let i=0;i<n;i++){const amount=Math.min(cap,remaining);remaining-=amount;source.records.push({id:recordId(id++),kind,data:sample(kind,{[field]:unit.repeat(amount)||'x'}) as BrandRecord['data']});}}
  fill('examples',24,'content',1600);fill('facts',40,'fact',400);fill('wording',80,'reason',200);fill('ctas',40,'text',200);fill('categories',20,'guidance',400);
  for(const row of source.records.filter(r=>r.kind==='categories')){
   const data=row.data as {platform_notes:string;selling_points:string[]};const amount=Math.min(400,remaining);remaining-=amount;data.platform_notes=unit.repeat(amount);data.selling_points=[];
   for(let n=0;n<6;n++){const points=Math.min(159,remaining);remaining-=points;data.selling_points.push(String(n)+unit.repeat(points));}
  }
  return source;
 }
 it.each(['a','ا','😀'])('accepts exact byte ceiling and rejects the next complete %s without truncation',(unit)=>{
  const width=Buffer.byteLength(unit),base=Buffer.byteLength(JSON.stringify(projectContext(sizedSource(unit,0,0))));
  // Empty optional strings become x in this fixture, so all filler slots keep a one-byte baseline.
  let found=false;
  for(let padding=0;padding<width&&!found;padding++){
   let low=0,high=200000;
   while(low+1<high){const mid=Math.floor((low+high)/2);try{projectContext(sizedSource(unit,mid,padding));low=mid;}catch(error){expect((error as Error).message).toContain('128 KiB');high=mid;}}
   const source=sizedSource(unit,low,padding),context=projectContext(source),encoded=JSON.stringify(context),bytes=Buffer.byteLength(encoded);
   if(bytes!==131072)continue;
   found=true;expect(bytes).toBe(131072);expect(Buffer.from(encoded).toString('utf8')).toBe(encoded);expect(projectContext(source)).toEqual(context);
   expect(Buffer.byteLength(JSON.stringify(projectContext(sizedSource(unit,low-1,padding))))).toBeLessThan(131072);
   expect(()=>projectContext(sizedSource(unit,low+1,padding))).toThrow('128 KiB');
   expect(JSON.stringify(source)).toBe(JSON.stringify(sizedSource(unit,low,padding)));
  }
  expect(base<131072).toBe(true);expect(found).toBe(true);
 });
});

describe('canonical source/count ambiguity at the projection boundary',()=>{
 it('rejects a substituted canonical brand identity',()=>{expect(()=>projectContext({...reviewSource(),brandId:recordId(999)})).toThrow();});
 it('rejects too many contacts even when serialized bytes are small',()=>{expect(()=>projectContext(reviewSource(Array.from({length:21},(_,i)=>({id:recordId(i+1),kind:'contacts' as const,data:sample('contacts') as BrandRecord['data']}))))).toThrow();});
 it('rejects duplicate claim categories instead of selecting the first policy',()=>{expect(()=>projectContext(reviewSource([{id:recordId(1),kind:'claims',data:sample('claims') as BrandRecord['data']},{id:recordId(2),kind:'claims',data:sample('claims',{policy:'EXPLICIT_APPROVAL_REQUIRED'}) as BrandRecord['data']}]))).toThrow();});
 it('rejects duplicate identity within one entity kind',()=>{expect(()=>projectContext(reviewSource([{id:recordId(1),kind:'ctas',data:sample('ctas') as BrandRecord['data']},{id:recordId(1),kind:'ctas',data:sample('ctas') as BrandRecord['data']}]))).toThrow();});
});

describe('frozen Phase 2D canonical permission baseline',()=>{
 it('preserves all previous roles/28 permissions/grants and adds only four explicit read grants',async()=>{
  const legacy=(await import('../fixtures/phase-2d-catalog.json')).default;const {ROLE_CODES,ROLE_PERMISSIONS,PERMISSION_CODES}=await import('../../src/server/db/catalog');
  expect(legacy.base).toBe('974503822f98ca180e4704a756e44c6902b15816');expect(ROLE_CODES).toEqual(legacy.roles);expect(PERMISSION_CODES).toHaveLength(31);expect(PERMISSION_CODES.filter(p=>!['brand.read','media.read','media.manage'].includes(p))).toEqual(legacy.permissions);
  for(const role of ROLE_CODES){expect(ROLE_PERMISSIONS[role].filter(p=>!['brand.read','media.read','media.manage'].includes(p))).toEqual(legacy.grants[role]);expect(ROLE_PERMISSIONS[role].includes('brand.read')).toBe(role!=='VIEWER');expect(ROLE_PERMISSIONS[role].includes('brand.manage')).toBe(role==='OWNER');}
 });
});
