import { z } from 'zod';
import { CLAIMS, LANGUAGES, PLATFORMS } from '../brand/model';
import { copyText, socialPackSchema } from '../ai/model';

export const CONTENT_LIMITS = Object.freeze({ body:65536, pack:32768, title:160, note:1000, media:4, page:20, draftProtectionMs:7*86400000, approvalProtectionMs:30*86400000 });
export const CONTENT_STATES = ['DRAFT','IN_REVIEW','CHANGES_REQUESTED','REJECTED','APPROVED'] as const;
export const DECISIONS = ['APPROVED','CHANGES_REQUESTED','REJECTED'] as const;
export const factInputSchema=z.discriminatedUnion('source',[
 z.object({category:z.enum(CLAIMS),source:z.literal('USER_INPUT'),value:copyText(400),confirmed:z.literal(true)}).strict(),
 z.object({category:z.enum(CLAIMS),source:z.enum(['BRAND_FACT','BRAND_CONTACT','BRAND_LOCATION']),recordId:z.uuid()}).strict(),
]);
export const factSnapshotSchema=z.object({category:z.enum(CLAIMS),source:z.enum(['USER_INPUT','BRAND_FACT','BRAND_CONTACT','BRAND_LOCATION']),recordId:z.uuid().nullable(),value:copyText(1600)}).strict();
export type FactInput=z.infer<typeof factInputSchema>;
export type FactSnapshot=z.infer<typeof factSnapshotSchema>;
const facts=z.array(factInputSchema).max(13).refine(v=>new Set(v.map(f=>f.category)).size===v.length);
const media=z.array(z.uuid()).max(CONTENT_LIMITS.media).refine(v=>new Set(v).size===v.length);
export const revisionInputSchema=z.object({title:copyText(CONTENT_LIMITS.title).refine(v=>v.trim().length>0),language:z.enum(LANGUAGES),content:socialPackSchema,facts,mediaIds:media}).strict().refine(v=>Object.keys(v.content).length>0);
export type RevisionInput=z.infer<typeof revisionInputSchema>;
export const commandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),requestId:z.uuid(),draft:revisionInputSchema}).strict(),
 z.object({action:z.literal('import'),requestId:z.uuid(),generationId:z.uuid(),title:copyText(160).refine(v=>v.trim().length>0),facts,mediaIds:media}).strict(),
 z.object({action:z.literal('save'),requestId:z.uuid(),postId:z.uuid(),expectedRevisionId:z.uuid(),draft:revisionInputSchema}).strict(),
 z.object({action:z.literal('submit'),requestId:z.uuid(),postId:z.uuid(),revisionId:z.uuid()}).strict(),
 z.object({action:z.literal('decide'),requestId:z.uuid(),postId:z.uuid(),submissionId:z.uuid(),revisionId:z.uuid(),decision:z.enum(DECISIONS),note:copyText(CONTENT_LIMITS.note)}).strict(),
]);
export type ContentCommand=z.infer<typeof commandSchema>;
export const listSchema=z.object({scope:z.enum(['content','review']).default('content'),status:z.enum(CONTENT_STATES).optional(),cursor:z.uuid().optional()}).strict();
export const revisionViewSchema=z.object({id:z.uuid(),sequence:z.number().int().positive(),title:copyText(160),language:z.enum(LANGUAGES),content:socialPackSchema,source:z.enum(['MANUAL','HUMAN_EDITED','AI_GENERATED','AI_EDITED']),brandRevision:z.number().int().positive(),validated:z.boolean(),createdAt:z.string(),author:z.string().max(200),mediaIds:media,facts:z.array(factSnapshotSchema).max(13),generationId:z.uuid().nullable(),generationSource:z.object({provider:z.string().max(40),model:z.string().max(160),brandRevision:z.number().int().positive()}).strict().nullable()}).strict();
export const reviewViewSchema=z.object({id:z.uuid(),revisionId:z.uuid(),state:z.enum(['PENDING',...DECISIONS]),note:copyText(1000).nullable(),selfApproval:z.boolean(),submittedAt:z.string(),validationBrandRevision:z.number().int().positive(),decisionBrandRevision:z.number().int().positive().nullable()}).strict();
const fullContentDetailSchema=z.object({id:z.uuid(),creator:z.string().max(200),state:z.enum(CONTENT_STATES),latestRevisionId:z.uuid().nullable(),approvedRevisionId:z.uuid().nullable(),revisions:z.array(revisionViewSchema).max(20),historyCursor:z.number().int().positive().nullable(),reviews:z.array(reviewViewSchema).max(20),activeReviewRevision:revisionViewSchema.nullable(),canEdit:z.boolean(),canSubmit:z.boolean(),canReview:z.boolean(),canApprove:z.boolean(),viewer:z.literal(false)}).strict();
export const contentDetailSchema=z.discriminatedUnion('viewer',[fullContentDetailSchema,z.object({id:z.uuid(),viewer:z.literal(true),approved:z.object({id:z.uuid(),sequence:z.number().int().positive(),title:copyText(160),content:socialPackSchema}).strict()}).strict()]);
export type ContentDetail=z.infer<typeof contentDetailSchema>;
export const contentListSchema=z.object({items:z.array(z.object({id:z.uuid(),title:copyText(160),revisionId:z.uuid(),sequence:z.number().int().positive(),state:z.enum(CONTENT_STATES),creator:z.string().max(200).optional(),submittedAt:z.string().optional(),platforms:z.array(z.enum(PLATFORMS)).max(5),preview:z.object({caption:copyText(5000),createdAt:z.string(),mediaId:z.uuid().nullable(),mediaKind:z.enum(['image','video']).nullable(),publicationStates:z.array(z.enum(['CREATED','DISPATCHING','ACCEPTED','PROCESSING','PUBLISHED','FAILED','UNKNOWN'])).max(100),publishedAt:z.string().nullable()}).strict().optional()}).strict()).max(20),cursor:z.uuid().nullable()}).strict();
export type ContentList=z.infer<typeof contentListSchema>;
export const platformNames=PLATFORMS;
