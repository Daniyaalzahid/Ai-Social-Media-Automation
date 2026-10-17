import { z } from 'zod';
export const PROVIDERS = ['META','TIKTOK','YOUTUBE','LINKEDIN'] as const;
export const providerSchema = z.enum(PROVIDERS);
export type SocialProviderId = typeof PROVIDERS[number];
export const mutationSchema = z.discriminatedUnion('action',[
 z.object({action:z.literal('connect'),provider:providerSchema}).strict(),
 z.object({action:z.literal('reconnect'),provider:providerSchema,authorizationId:z.uuid(),version:z.number().int().positive()}).strict(),
 z.object({action:z.literal('select'),provider:providerSchema,authorizationId:z.uuid(),version:z.number().int().positive(),destinationId:z.uuid()}).strict(),
 z.object({action:z.literal('disconnect'),provider:providerSchema,authorizationId:z.uuid(),version:z.number().int().positive()}).strict(),
]);
export type IntegrationMutation=z.infer<typeof mutationSchema>;
/** Deliberately separate from administrative DTOs. Never add credential/grant diagnostics here. */
export type SafeDestination={id:string;provider:SocialProviderId;type:'PAGE'|'INSTAGRAM_PROFESSIONAL'|'TIKTOK_ACCOUNT'|'YOUTUBE_CHANNEL'|'LINKEDIN_ORGANIZATION';displayName:string;handle:string|null;status:'CONNECTED'|'LIMITED'|'RECONNECT_REQUIRED'|'DISCONNECTED';publishing:'UNVERIFIED'};
export type ManagementConnection={id:string;provider:SocialProviderId;version:number;status:SafeDestination['status'];destinations:SafeDestination[];selectedId:string|null};
export type ConnectionsView={destinations:SafeDestination[];canManage:boolean;management:ManagementConnection[];setup:SocialProviderId[]};
