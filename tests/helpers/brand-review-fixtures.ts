import { BRAND_ID, type Kind, type BrandSnapshot, type BrandRecord } from '../../src/features/brand/model';
import { emptyData } from '../../src/features/brand/fields';
export const APPROVED = {active:true,approved:true,sort_order:0};
export function sample(kind:Kind,patch:Record<string,unknown>={}) {
 const required:Partial<Record<Kind,Record<string,unknown>>>={profile:{name:'Synthetic review brand',website:'https://example.test/',timezone:'Asia/Karachi'},contacts:{label:'Synthetic contact',normalized_value:'+12025550123',display_value:'Synthetic contact'},locations:{name:'Synthetic location',city:'Synthetic city'},language:{allowed_languages:['ENGLISH']},ctas:{text:'Synthetic CTA'},facts:{category:'CONTACT',label:'Synthetic fact',fact:'Approved persistent information'},wording:{phrase:'Synthetic phrase'},categories:{name:'Synthetic category'},seasons:{name:'Synthetic season'},examples:{title:'Synthetic example',content:'Approved reference text'}};
 return {...emptyData(kind),...required[kind],...APPROVED,...patch};
}
export function recordId(n:number){return `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;}
export function reviewSource(records:BrandRecord[]=[]):BrandSnapshot {return {brandId:BRAND_ID,revision:1,updatedAt:'2026-10-15T00:00:00.000Z',canManage:true,records:[{id:BRAND_ID,kind:'profile',data:sample('profile') as BrandRecord['data']},...records]};}
export const FORBIDDEN_CONTEXT_KEYS = ['id','brand_id','brandId','user_id','userId','actorId','actor_user_id','role','permissions','sessions','session','session_id','auth_version','mfa','mfaEnabled','invitation','password','password_hash','metadata_safe_json','audit_logs','security_events','seed_ciphertext','iv','tag','key_id','created_by','updated_by','active','approved','sort_order','contact_id','cta_id','category_id','canManage','updatedAt'];
