import { randomUUID } from 'node:crypto';
import { CLAIMS,PLATFORMS,LANGUAGES,type BrandRecord } from '../../src/features/brand/model';
import { projectContext } from '../../src/server/brand/service';
import { reviewSource,sample,recordId } from './brand-review-fixtures';
import { SensitiveValue } from '../../src/server/security/sensitive';
import type { GenerationInput } from '../../src/features/ai/model';
import type { AiGenerationProvider,ProviderRequest,ProviderResult } from '../../src/server/ai/provider';
export function aiBrand(){return projectContext(reviewSource([
 {id:recordId(1),kind:'language',data:sample('language',{allowed_languages:[...LANGUAGES],default_language:'ENGLISH',mixing:'ENGLISH_ROMAN_URDU'}) as BrandRecord['data']},
 ...CLAIMS.map((category,index)=>({id:recordId(index+10),kind:'claims' as const,data:sample('claims',{category,policy:'EXPLICIT_POST_INPUT'}) as BrandRecord['data']})),
]));}
export function aiInput(patch:Partial<GenerationInput>={}):GenerationInput{return{requestId:randomUUID(),platforms:['FACEBOOK'],language:'ENGLISH',brief:'A thoughtful home update',facts:[],expectedBrandRevision:1,mediaIds:[],...patch};}
export function validPlan(platforms:readonly typeof PLATFORMS[number][]=PLATFORMS,claims:string[]=[]){return Object.fromEntries(platforms.map(p=>[p,p==='YOUTUBE'?{hook:1,titleHook:0,claims,hashtags:[],tags:[]}:{hook:1,claims,hashtags:[]}]));}
/** Test-only deterministic provider. No production import or environment switch. */
export class FakeAiProvider implements AiGenerationProvider {
 readonly id='openrouter';
 readonly model='test/model:free';calls=0;
 constructor(readonly respond:(request:ProviderRequest,signal:AbortSignal)=>Promise<ProviderResult>=async request=>{const data=JSON.parse(request.data) as {selectedPlatforms:typeof PLATFORMS[number][]};return{content:new SensitiveValue(JSON.stringify(validPlan(data.selectedPlatforms))),usage:null};}){}
 async generate(request:ProviderRequest,signal:AbortSignal){this.calls++;return this.respond(request,signal);}
}
