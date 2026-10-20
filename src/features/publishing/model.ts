import { z } from 'zod';
import { PLATFORMS } from '../brand/model';
import type { SocialPack } from '../ai/model';
export const PUBLISH_STATES=['CREATED','DISPATCHING','ACCEPTED','PROCESSING','PUBLISHED','FAILED','UNKNOWN'] as const;
export const selectionSchema=z.object({requestId:z.uuid(),postId:z.uuid(),revisionId:z.uuid(),approvalDecisionId:z.uuid(),destinationId:z.uuid(),platform:z.enum(PLATFORMS),authorizationVersion:z.number().int().positive()}).strict();
export const publishCommandSchema=selectionSchema.extend({createdAt:z.iso.datetime(),intentHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export type PublishSelection=z.infer<typeof selectionSchema>;
export type PublishCommand=z.infer<typeof publishCommandSchema>;
export type ApprovedCopy=NonNullable<SocialPack[keyof SocialPack]>;
export type PublishStatus={id:string;postId:string;revisionId:string;platform:keyof SocialPack;state:typeof PUBLISH_STATES[number];updatedAt:string;errorCode:string|null};
export type PublishingPage={canPublish:boolean;approved:null|{postId:string;revisionId:string;approvalDecisionId:string;content:SocialPack};destinations:{id:string;displayName:string;platform:keyof SocialPack;authorizationVersion:number}[];operations:PublishStatus[];setupRequired:boolean};
export type PublishPreview={command:PublishCommand;content:ApprovedCopy;hashtags:string[];destination:string;mediaCount:number;expiresAt:string};
export const PUBLISH_LIMITS=Object.freeze({holdMs:86400000,confirmationMs:600000,deadlineMs:30000,statusCooldownMs:30000,events:100});

export const publishStatusSchema=z.object({id:z.uuid(),postId:z.uuid(),revisionId:z.uuid(),platform:z.enum(PLATFORMS),state:z.enum(PUBLISH_STATES),updatedAt:z.iso.datetime(),errorCode:z.enum(['INVALID','UNAVAILABLE','ACCESS_LOST','UNSUPPORTED','RATE_LIMITED','REJECTED','PROCESSING_FAILED','OUTCOME_UNKNOWN']).nullable()}).strict();
