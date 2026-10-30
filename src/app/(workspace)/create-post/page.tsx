import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { can } from '../../../server/authorization/authorization';
import { getDatabase } from '../../../server/db/client';
import { createBrandService } from '../../../server/brand/service';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { PageHeader } from '../../../components/ui/page-header';
import { SimpleComposer } from '../../../features/composer/simple-composer';
import { composerOptions } from '../../../server/content/page-options';
import { publishingService } from '../../../server/publishing/web';
import { GenerationPanel } from '../../../features/ai/generation-panel';
import { aiService } from '../../../server/ai/web';
import { connectionsService } from '../../../server/social/web';
import { LANGUAGES } from '../../../features/brand/model';
import type { GenerationView } from '../../../features/ai/model';
import { CREATIVE } from '../../../server/ai/policy';
import type { ComposerOptions } from '../../../features/content/workspace';
import type { Channel } from '../../../features/composer/model';
export const dynamic='force-dynamic';export const metadata={title:'Create Post'};
export default async function CreatePostPage(){
 const context=await requireRoute('/create-post'),raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);
 let languages:readonly typeof LANGUAGES[number][]=['ENGLISH'],defaultLanguage:typeof LANGUAGES[number]='ENGLISH';
 let generations:GenerationView[]=[];const connectedPlatforms:Channel['platform'][]=[];
 let options:ComposerOptions={starters:CREATIVE,facts:[],media:[]},brandRevision=0,channels:Channel[]=[];
 try{options=await composerOptions(raw,true);const brand=await createBrandService(getDatabase()).context(raw);brandRevision=brand.revision;languages=brand.language?.allowed_languages??['ENGLISH'];defaultLanguage=brand.language?.default_language??'ENGLISH';}catch{/* Keep media and manual editing usable when optional brand/AI setup is unavailable. Mutations still validate policy. */}
 if(can(context,'content.publish')&&can(context,'integrations.read')&&can(context,'publishing_logs.read'))try{channels=(await publishingService().page(raw)).destinations;}catch{/* Fail closed: never advertise an unverified publishing destination. */}
 if(can(context,'ai.generate'))try{generations=await aiService().list(raw);}catch{/* History remains optional. */}
 if(can(context,'integrations.read'))try{for(const d of (await connectionsService().read(raw)).destinations)if(d.status==='CONNECTED'){const p=({PAGE:'FACEBOOK',INSTAGRAM_PROFESSIONAL:'INSTAGRAM',TIKTOK_ACCOUNT:'TIKTOK',YOUTUBE_CHANNEL:'YOUTUBE',LINKEDIN_ORGANIZATION:'LINKEDIN'} as const)[d.type];connectedPlatforms.push(p);}}catch{/* Fail closed. */}
 const aiAvailable=can(context,'ai.generate')&&brandRevision>0&&!!process.env.OPENROUTER_API_KEY&&!!process.env.OPENROUTER_MODEL;
 return <div className="creation-workspace"><PageHeader eyebrow="YOUR NEXT POST" title="Create Post" description="One place for your channels, media, and message."/><SimpleComposer channels={channels} canPublish={can(context,'content.publish')} canUpload={can(context,'media.upload')} canConnect={can(context,'integrations.read')} aiAvailable={aiAvailable} brandRevision={brandRevision} options={options} languages={languages} defaultLanguage={defaultLanguage} connectedPlatforms={connectedPlatforms}/><details className="composer-details"><summary>AI draft history & advanced generation</summary><section aria-label="AI generation"><GenerationPanel revision={brandRevision} languages={languages} defaultLanguage={defaultLanguage} initial={generations}/></section></details></div>;
}
