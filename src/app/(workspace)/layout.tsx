import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { requireRoute } from '../../server/authorization/web';
import { can } from '../../server/authorization/authorization';
import { ROUTE_PERMISSIONS } from '../../server/authorization/routes';
import { navigation } from '../../components/shell/navigation';
import { AppShell } from '../../components/shell/app-shell';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const context = await requireRoute((await headers()).get('x-bsa-route') ?? '');
  const items = navigation.filter((item) => ROUTE_PERMISSIONS[item.href]?.some((p) => can(context, p)));
  return <AppShell items={items} showDesignSystem={can(context, 'settings.manage')}>{children}</AppShell>;
}
