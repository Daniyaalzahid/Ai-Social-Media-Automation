import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ROLE_CODES } from '../db/catalog.ts';
import { normalizeEmail } from '../security/identity.ts';
import type { RecentAction } from '../auth/access.ts';

export const teamMutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('invite'), email: z.string().max(320), displayName: z.string().min(1).max(120).regex(/^[^\p{Cc}\p{Cf}\p{Cs}]+$/u), role: z.enum(ROLE_CODES) }).strict(),
  z.object({ action: z.literal('role'), targetId: z.uuid(), role: z.enum(ROLE_CODES) }).strict(),
  z.object({ action: z.literal('status'), targetId: z.uuid(), enabled: z.boolean() }).strict(),
  z.object({ action: z.literal('sessions'), targetId: z.uuid() }).strict(),
  z.object({ action: z.literal('revoke-invitation'), targetId: z.uuid() }).strict(),
]);
export type TeamMutation = z.infer<typeof teamMutationSchema>;
export function parseMutation(value: unknown): TeamMutation {
  const input = teamMutationSchema.parse(value);
  if (input.action === 'invite') return { ...input, email: normalizeEmail(input.email) };
  return input;
}
export function teamAction(input: TeamMutation): RecentAction {
  const kind = input.action.replaceAll('-', '_').toUpperCase();
  const payload = input.action === 'invite' ? [input.email, input.displayName, input.role]
    : input.action === 'role' ? [input.targetId, input.role] : input.action === 'status' ? [input.targetId, input.enabled] : [input.targetId];
  return `TEAM_${kind}:${createHash('sha256').update(JSON.stringify(payload)).digest('base64url')}`;
}
export const permissionFor = (input: TeamMutation) => input.action === 'role' ? 'roles.assign' as const : input.action === 'sessions' ? 'sessions.revoke_any' as const : 'users.manage' as const;
