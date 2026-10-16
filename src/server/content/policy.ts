import { CLAIMS,PLATFORMS,type BrandSnapshot } from '../../features/brand/model';
import { socialPackSchema,type SocialPack } from '../../features/ai/model';
import { factSnapshotSchema,type FactInput,type FactSnapshot } from '../../features/content/model';
import { projectContext } from '../brand/service';
import { CREATIVE,prepareGeneration,validateDraft,type PreparedGeneration } from '../ai/policy';
import { SensitiveValue } from '../security/sensitive';
import { randomUUID } from 'node:crypto';

export class ContentError extends Error {
 constructor(readonly reason:'NOT_FOUND'|'CONFLICT'|'UNAUTHORIZED'|'VALIDATION_FAILED'|'POLICY_CHANGED'|'MEDIA_UNAVAILABLE'|'UNAVAILABLE',readonly status=400){super(reason==='VALIDATION_FAILED'?'This draft is outside the supported phrase and authorized-fact contract. Edit it before submitting.':reason==='POLICY_CHANGED'?'Brand policy or a referenced fact changed. Create a new revision before continuing.':reason==='CONFLICT'?'Content changed or this review was already decided. Reload before continuing.':'Unable to complete this content operation.');this.name='ContentError';}
}
export function preparedContent(source:BrandSnapshot,language:PreparedGeneration['language'],platforms:typeof PLATFORMS[number][],facts:FactInput[]){
 const brand=projectContext(source),ordered=[...facts].sort((a,b)=>CLAIMS.indexOf(a.category)-CLAIMS.indexOf(b.category));
 const resolved=ordered.map(f=>{
  if(f.source==='USER_INPUT')return f;
  const kind=f.source==='BRAND_FACT'?'facts':f.source==='BRAND_CONTACT'?'contacts':'locations';
  const rows=source.records.filter(r=>r.kind===kind&&r.data.active&&r.data.approved),index=rows.findIndex(r=>r.id===f.recordId);
  if(index<0)throw new ContentError('POLICY_CHANGED',409);
  return{category:f.category,source:f.source,index};
 });
 let prepared:PreparedGeneration;
 try{prepared=prepareGeneration({requestId:randomUUID(),platforms,language,brief:'',facts:resolved,expectedBrandRevision:source.revision,mediaIds:[]},brand);}catch{throw new ContentError('VALIDATION_FAILED');}
 const snapshots=prepared.claims.map((c,index)=>factSnapshotSchema.parse({category:c.category,source:c.source,recordId:ordered[index]!.source==='USER_INPUT'?null:(ordered[index] as {recordId:string}).recordId,value:c.value}));
 return{prepared,snapshots};
}
export function revalidateSnapshots(source:BrandSnapshot,language:PreparedGeneration['language'],content:SocialPack,snapshots:FactSnapshot[]){
 const inputs:FactInput[]=snapshots.map(f=>f.source==='USER_INPUT'?{category:f.category,source:'USER_INPUT',value:f.value,confirmed:true}:{category:f.category,source:f.source,recordId:f.recordId!});
 const result=preparedContent(source,language,Object.keys(content) as typeof PLATFORMS[number][],inputs);
 if(JSON.stringify(result.snapshots)!==JSON.stringify(snapshots))throw new ContentError('POLICY_CHANGED',409);
 if(!representableContent(content,result.prepared))throw new ContentError('VALIDATION_FAILED');
 return source.revision;
}
/** Exact inverse of the reviewed assembly contract. No NLP/keyword factuality claim. */
export function representableContent(value:unknown,prepared:PreparedGeneration):boolean{
 try{
  const pack=socialPackSchema.parse(value),plans:Record<string,unknown>={};
  if(Object.keys(pack).length!==prepared.input.platforms.length)return false;
  for(const platform of prepared.input.platforms){
   const variant=pack[platform];if(!variant)return false;
   const body='description'in variant?variant.description:variant.caption,parts=body.split('\n\n'),hook=CREATIVE[prepared.language][platform].findIndex(s=>s===parts[0]);
   if(hook<0)return false;
   const claims=parts.slice(1).map(part=>{const matches=prepared.claims.filter(f=>f.value===part);if(matches.length!==1)throw new Error();return matches[0]!.id;});
   const titleHook='title'in variant?CREATIVE[prepared.language].YOUTUBE.findIndex(s=>s===variant.title):undefined;
   plans[platform]={hook,claims,hashtags:variant.hashtags,...('title'in variant?{titleHook,tags:variant.tags}:{})};
  }
  const validated=validateDraft(new SensitiveValue(JSON.stringify(plans)),prepared);
  return JSON.stringify(validated)===JSON.stringify(pack);
 }catch{return false;}
}
