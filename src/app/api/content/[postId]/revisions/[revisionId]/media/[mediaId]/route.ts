import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { contentService } from '../../../../../../../../server/content/web';
import { SESSION_COOKIE } from '../../../../../../../../server/auth/browser-security';
import { SensitiveValue } from '../../../../../../../../server/security/sensitive';
import { mediaRange } from '../../../../../../../../server/media/delivery';
import { MediaError } from '../../../../../../../../server/media/storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{postId:string;revisionId:string;mediaId:string}>}){
 const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return new Response(null,{status:401});
 try{if(request.nextUrl.search)return new Response(null,{status:400});const p=await params,{handle,mime,bytes}=await contentService().binary(new SensitiveValue(raw),p.postId,p.revisionId,p.mediaId);
  try{const range=mediaRange(request.headers.get('range'),bytes);return new Response(Readable.toWeb(handle.createReadStream({autoClose:true,...(range?{start:range.start,end:range.end}:{})})) as ReadableStream,{status:range?206:200,headers:{'Content-Type':mime,'Content-Length':String(range?range.end-range.start+1:bytes),...(range?{'Content-Range':`bytes ${range.start}-${range.end}/${bytes}`} : {}),'Content-Disposition':'inline; filename="review-media"','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer','Accept-Ranges':'bytes'}});}catch(e){await handle.close();if(e instanceof MediaError&&e.status===416)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes}`}});throw e;}
 }catch{return new Response(null,{status:404,headers:{'Cache-Control':'no-store, private'}});}
}
