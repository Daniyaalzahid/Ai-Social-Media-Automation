import { z } from 'zod';
import { CLAIMS,LANGUAGES,PLATFORMS } from '../brand/model';

export const AI_LIMITS=Object.freeze({inputBytes:16384,promptBytes:196608,responseBytes:65536,outputBytes:32768,timeoutMs:30000,leaseMs:45000,actorDaily:30,globalDaily:100,actorMinute:3,globalActive:2});
export const AI_FAILURES=['INPUT_INVALID','UNAUTHORIZED','RATE_LIMITED','BUSY','PROVIDER_UNAVAILABLE','PROVIDER_RATE_LIMITED','PROVIDER_TIMEOUT','PROVIDER_AUTH_ERROR','MODEL_UNAVAILABLE','CAPABILITY_UNAVAILABLE','RESPONSE_TOO_LARGE','RESPONSE_MALFORMED','RESPONSE_SCHEMA_INVALID','CLAIM_POLICY_REJECTED','CANCELLED','UNAVAILABLE'] as const;
export type AiFailure=typeof AI_FAILURES[number];
export const copyText=(max:number)=>z.string().refine(v=>v.isWellFormed()&&Array.from(v).length<=max&&!/\p{Cc}/u.test(v.replace(/[\n\t]/g,''))&&!/\p{Cf}/u.test(v.replace(/[\u200C\u200D]/g,''))&&!/[<>]|javascript:/iu.test(v));
const factBase={category:z.enum(CLAIMS)};
export const campaignFactSchema=z.discriminatedUnion('source',[
 z.object({...factBase,source:z.literal('USER_INPUT'),value:copyText(400).refine(v=>v.trim().length>0),confirmed:z.literal(true)}).strict(),
 z.object({...factBase,source:z.literal('BRAND_FACT'),index:z.number().int().min(0).max(39)}).strict(),
 z.object({...factBase,source:z.literal('BRAND_CONTACT'),index:z.number().int().min(0).max(19)}).strict(),
 z.object({...factBase,source:z.literal('BRAND_LOCATION'),index:z.number().int().min(0).max(19)}).strict(),
]);
export const generationInputSchema=z.object({requestId:z.uuid(),platforms:z.array(z.enum(PLATFORMS)).min(1).max(5).refine(v=>new Set(v).size===v.length),language:z.enum(LANGUAGES).nullable(),brief:copyText(2000),facts:z.array(campaignFactSchema).max(13).refine(v=>new Set(v.map(f=>f.category)).size===v.length),expectedBrandRevision:z.number().int().positive(),mediaIds:z.array(z.uuid()).max(1)}).strict();
export type GenerationInput=z.infer<typeof generationInputSchema>;
const tag=z.string().max(80).regex(/^#[\p{L}\p{M}\p{N}_]+$/u);
const caption=(max:number,tags:number)=>z.object({caption:copyText(max),hashtags:z.array(tag).max(tags)}).strict();
export const socialPackSchema=z.object({FACEBOOK:caption(3000,5).optional(),INSTAGRAM:caption(2200,20).optional(),TIKTOK:caption(1000,5).optional(),YOUTUBE:z.object({title:copyText(100),description:copyText(5000),hashtags:z.array(tag).max(5),tags:z.array(copyText(80)).max(10)}).strict().optional(),LINKEDIN:caption(3000,5).optional()}).strict();
export type SocialPack=z.infer<typeof socialPackSchema>;
export const generationViewSchema=z.object({id:z.uuid(),createdAt:z.string(),completedAt:z.string().nullable(),brandRevision:z.number().int().positive(),provider:z.string().max(40).regex(/^[a-z][a-z0-9_-]*$/),model:z.string().max(160),platforms:z.array(z.enum(PLATFORMS)).min(1).max(5),language:z.enum(LANGUAGES),status:z.enum(['IN_PROGRESS','COMPLETED','FAILED','REJECTED']),failure:z.enum(AI_FAILURES).nullable(),output:socialPackSchema.nullable()}).strict();
export type GenerationView=z.infer<typeof generationViewSchema>;
