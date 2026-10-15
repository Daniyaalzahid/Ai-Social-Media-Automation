import type { PermissionCode } from '../db/catalog.ts';
export const ROUTE_PERMISSIONS: Readonly<Record<string, readonly PermissionCode[]>> = Object.freeze({
  '/overview': ['workspace.read'], '/create-post': ['content.create'], '/calendar': ['calendar.read'], '/content': ['content.read'],
  '/media': ['media.upload'], '/approvals': ['content.review', 'content.approve'], '/analytics': ['analytics.read'],
  '/connections': ['integrations.manage'], '/brand-brain': ['brand.read'], '/team': ['users.manage'], '/activity': ['audit.read'], '/settings': ['settings.manage'], '/ui-kit': ['settings.manage'],
});
