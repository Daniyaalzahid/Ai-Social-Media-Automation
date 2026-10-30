import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { can } from '../../../server/authorization/authorization';
import type { Metadata } from 'next';
import { Overview } from '../../../features/overview/overview';
import { contentService } from '../../../server/content/web';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
export const metadata:Metadata={title:'Overview'};
export default async function OverviewPage(){const context=await requireRoute('/overview');const raw=new SensitiveValue((await cookies()).get(SESSION_COOKIE)!.value);return <Overview canCreate={can(context,'content.create')} canSeePublishing={can(context,'publishing_logs.read')} posts={can(context,'content.read')?await contentService().list(raw):{items:[],cursor:null}}/>;}
