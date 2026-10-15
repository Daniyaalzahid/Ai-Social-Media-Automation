import type { ReactNode } from 'react';
import { requireWorkspaceIdentity } from '../../server/auth/web';
import { AppShell } from '../../components/shell/app-shell';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  await requireWorkspaceIdentity();
  return <AppShell>{children}</AppShell>;
}
