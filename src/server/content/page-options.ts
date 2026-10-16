import 'server-only';
import { getDatabase } from '../db/client';
import { createBrandService } from '../brand/service';
import { mediaService } from '../media/web';
import { CREATIVE } from '../ai/policy';
import type { SensitiveValue } from '../security/sensitive';
import type { ComposerOptions } from '../../features/content/workspace';
export async function composerOptions(raw:SensitiveValue,editable:boolean):Promise<ComposerOptions>{
 const facts:ComposerOptions['facts']=[];let media:ComposerOptions['media']=[];
 if(editable){
  const brand=await createBrandService(getDatabase()).read(raw);
  for(const r of brand.records.filter(r=>r.data.active&&r.data.approved)){
   if(r.kind==='facts'&&'fact'in r.data)facts.push({id:r.id,kind:'BRAND_FACT',category:r.data.category,label:r.data.label});
   if(r.kind==='contacts'&&'normalized_value'in r.data)facts.push({id:r.id,kind:'BRAND_CONTACT',category:'CONTACT',label:r.data.label});
   if(r.kind==='locations'&&'address'in r.data)facts.push({id:r.id,kind:'BRAND_LOCATION',category:'ADDRESS',label:r.data.name});
  }
  try{media=(await mediaService().list(raw)).map(m=>({id:m.id,name:m.name}));}catch{/* Optional media configuration cannot block text-only editing. */}
 }
 return{starters:CREATIVE,facts,media};
}
