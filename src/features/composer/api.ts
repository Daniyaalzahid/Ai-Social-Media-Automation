import { z } from 'zod';
import { contentDetailSchema,type ContentCommand,type ContentDetail,type RevisionInput } from '../content/model';
export class ComposerError extends Error {}
// The existing APIs re-check permission, CSRF, media ownership and Brand Brain
// policy for every step. This is orchestration, never an authorization boundary.
export async function composerRequest(url:string,body?:unknown){
 let headers:Record<string,string>={};
 if(body!==undefined){const token=z.object({csrf:z.string().length(43)}).strict().parse(await(await fetch('/api/auth',{cache:'no-store'})).json());headers={'Content-Type':'application/json','X-CSRF-Token':token.csrf};}
 const response=await fetch(url,{cache:'no-store',...(body!==undefined?{method:'POST',headers,body:JSON.stringify(body)}:{})});
 const value:unknown=await response.json();if(!response.ok){const safe=z.object({message:z.string().max(300)}).passthrough().safeParse(value);throw new ComposerError(safe.success?safe.data.message:'This action could not be completed. Your draft is still available.');}
 return z.record(z.string(),z.unknown()).parse(value);
}
export async function contentCommand(command:ContentCommand){return contentDetailSchema.parse((await composerRequest('/api/content',command)).detail);}
export async function saveComposer(draft:RevisionInput,detail:ContentDetail|null,generationId:string|null,ids={create:crypto.randomUUID(),edit:crypto.randomUUID()}){
 if(detail&&!detail.viewer)return contentCommand({action:'save',requestId:ids.edit,postId:detail.id,expectedRevisionId:detail.latestRevisionId!,draft});
 if(generationId){const imported=await contentCommand({action:'import',requestId:ids.create,generationId,title:draft.title,facts:draft.facts,mediaIds:draft.mediaIds});if(imported.viewer)throw new ComposerError('Unable to open this draft.');return contentCommand({action:'save',requestId:ids.edit,postId:imported.id,expectedRevisionId:imported.latestRevisionId!,draft});}
 return contentCommand({action:'create',requestId:ids.create,draft});
}
