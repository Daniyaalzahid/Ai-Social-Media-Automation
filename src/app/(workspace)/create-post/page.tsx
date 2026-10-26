import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { getDatabase } from '../../../server/db/client';
import { createBrandService } from '../../../server/brand/service';
import { aiService } from '../../../server/ai/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { GenerationPanel } from '../../../features/ai/generation-panel';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { ContentWorkspace } from '../../../features/content/workspace';
import { composerOptions } from '../../../server/content/page-options';
export const dynamic='force-dynamic';export const metadata={title:'Create Post'};
export default async function AiDraftPage(){await requireRoute('/create-post');const raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);try{const brand=await createBrandService(getDatabase()).context(raw);const generations=await aiService().list(raw);return <div className="creation-workspace"><PageHeader eyebrow="CONTENT STUDIO" title="Create Post" description="Create once. Adapt for every platform."/><section aria-label="Content composer workspace"><ContentWorkspace options={await composerOptions(raw,true)} generations={generations.filter(g=>g.status==='COMPLETED').map(g=>({id:g.id,label:`${g.language} · ${g.platforms.join(', ')} · ${g.createdAt}`}))}/></section><section aria-label="AI generation"><GenerationPanel revision={brand.revision} languages={brand.language?.allowed_languages??['ENGLISH']} defaultLanguage={brand.language?.default_language??'ENGLISH'} initial={generations}/></section></div>;}catch{return <Card><h1>AI drafts are unavailable</h1><p>Confirm the approved Brand Brain configuration and try again.</p></Card>;}}
