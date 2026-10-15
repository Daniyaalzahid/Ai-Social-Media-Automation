import { z } from 'zod';
export const teamRoles = ['OWNER', 'MARKETING_ADMIN', 'CONTENT_CREATOR', 'REVIEWER', 'VIEWER'] as const;
export const memberSchema = z.object({ id: z.uuid(), displayName: z.string().max(120), email: z.email(), role: z.enum(teamRoles), status: z.enum(['invited', 'pending_mfa', 'active', 'disabled']), mfaEnabled: z.boolean(), activeSessions: z.number().int().min(0).max(5) }).strict();
export type MemberView = z.infer<typeof memberSchema>;
