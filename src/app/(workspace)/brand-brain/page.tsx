import { cookies } from 'next/headers';
import { requireRoute } from '../../../server/authorization/web';
import { createBrandService } from '../../../server/brand/service';
import { getDatabase } from '../../../server/db/client';
import { SESSION_COOKIE } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { PageHeader } from '../../../components/ui/page-header';
import { BrandBrain } from '../../../features/brand/brand-brain';
export const metadata={title:'Brand Brain'};
export default async function BrandBrainPage(){await requireRoute('/brand-brain');const raw=(await cookies()).get(SESSION_COOKIE)!.value;const initial=await createBrandService(getDatabase()).read(new SensitiveValue(raw));return <><PageHeader eyebrow="APPROVED BRAND CONTEXT" title="Brand Brain" description="Define how Bismillah Electronics communicates."/><BrandBrain initial={initial}/></>;}
