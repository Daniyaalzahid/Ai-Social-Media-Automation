export const ROLE_CODES = ['OWNER', 'MARKETING_ADMIN', 'CONTENT_CREATOR', 'REVIEWER', 'VIEWER'] as const;
export type RoleCode = typeof ROLE_CODES[number];
export const PERMISSION_CODES = [
  'workspace.read', 'content.read', 'calendar.read', 'analytics.read', 'publishing_logs.read',
  'content.create', 'media.upload', 'ai.generate', 'content.edit_any', 'content.edit_assigned',
  'content.submit', 'content.review', 'content.approve', 'content.approve_self', 'content.schedule', 'content.publish',
  'integrations.manage', 'brand.manage', 'settings.manage', 'security.manage', 'audit.read',
  'users.manage', 'roles.assign', 'password_reset.issue', 'sessions.revoke_any',
  'password.change_own', 'sessions.manage_own', 'mfa.manage_own', 'brand.read', 'media.read', 'media.manage',
] as const;
export type PermissionCode = typeof PERMISSION_CODES[number];
const own: readonly PermissionCode[] = ['workspace.read', 'password.change_own', 'sessions.manage_own', 'mfa.manage_own'];
const read: readonly PermissionCode[] = ['content.read', 'calendar.read'];
export const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly PermissionCode[]>> = {
  OWNER: PERMISSION_CODES,
  MARKETING_ADMIN: [...own, ...read, 'brand.read', 'media.read', 'media.manage', 'analytics.read', 'publishing_logs.read', 'content.create', 'media.upload', 'ai.generate', 'content.edit_any', 'content.submit', 'content.review', 'content.approve', 'content.approve_self', 'content.schedule', 'content.publish'],
  CONTENT_CREATOR: [...own, ...read, 'brand.read', 'media.read', 'content.create', 'media.upload', 'ai.generate', 'content.edit_assigned', 'content.submit'],
  REVIEWER: [...own, ...read, 'brand.read', 'content.review', 'content.approve'],
  VIEWER: [...own, ...read, 'analytics.read'],
};
// Seed data defines capabilities only. Object ownership, MFA requirements, last-Owner
// protection, self-approval restrictions and session limits are later server policies.
