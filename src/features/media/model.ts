import { z } from 'zod';
export const MEDIA_LIMITS = Object.freeze({ imageBytes:8388608,videoBytes:33554432,width:8192,height:8192,pixels:16777216,quota:2147483648,orphanMs:86400000,receivingMs:1800000,cleanupBatch:25,queryBatch:50 });
export const MIME = ['image/jpeg','image/png','image/webp','video/mp4'] as const;
export const uploadSchema=z.object({name:z.string().min(1).max(160).refine((v)=>v.isWellFormed()&&!/[\p{Cc}\p{Cf}\u2215\u2044\uFF0F\uFF3C\u29F8\\/:<>"|?*%]/u.test(v)&&!v.startsWith('.')&&!v.includes('..'),'Use a plain filename without paths or control characters.'),mime:z.enum(MIME)}).strict().superRefine((v,c)=>{
 const allowed:Record<typeof MIME[number],RegExp>={'image/jpeg':/^[^.]+\.jpe?g$/iu,'image/png':/^[^.]+\.png$/iu,'image/webp':/^[^.]+\.webp$/iu,'video/mp4':/^[^.]+\.mp4$/iu};
 if(!allowed[v.mime].test(v.name))c.addIssue({code:'custom',message:'Filename extension must match the supported media type.',path:['name']});
});
export const mediaViewSchema=z.object({id:z.uuid(),name:z.string().max(160),kind:z.enum(['image','video']),mime:z.enum(MIME),bytes:z.number().int().nonnegative(),width:z.number().int().positive().nullable(),height:z.number().int().positive().nullable(),duration:z.number().nonnegative().nullable(),status:z.enum(['receiving','temporary','attached','retained','deletion_pending','deleted']),expiresAt:z.string(),createdAt:z.string(),canRemove:z.boolean()}).strict();
export type MediaView=z.infer<typeof mediaViewSchema>;
