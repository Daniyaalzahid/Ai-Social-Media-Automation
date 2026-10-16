import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireRoute } from '../../../../server/authorization/web';
import { SESSION_COOKIE } from '../../../../server/auth/browser-security';
import { SensitiveValue } from '../../../../server/security/sensitive';
import { contentService } from '../../../../server/content/web';
import { ContentWorkspace } from '../../../../features/content/workspace';
import { composerOptions } from '../../../../server/content/page-options';
import { ContentError } from '../../../../server/content/policy';
export const dynamic='force-dynamic';export const metadata={title:'Content revision'};
export default async function ContentDetailPage({params}:{params:Promise<{id:string}>}){await requireRoute('/content');const raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);try{const detail=await contentService().get(raw,(await params).id);return <ContentWorkspace initial={detail} options={await composerOptions(raw,!detail.viewer&&detail.canEdit)}/>;}catch(e){if(e instanceof ContentError&&e.status===404)notFound();throw e;}}
