import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { mediaService } from '../../../../../server/media/web';
import { SESSION_COOKIE } from '../../../../../server/auth/browser-security';
import { SensitiveValue } from '../../../../../server/security/sensitive';
import { mediaRange } from '../../../../../server/media/delivery';
import { MediaError } from '../../../../../server/media/storage';
import { reply,failure } from '../../../../../server/media/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{
 if(request.nextUrl.search)throw new MediaError(400,'Extra parameters are not supported.');
 const{handle,view}=await mediaService().binary(new SensitiveValue(raw),(await params).id);
 try{const range=mediaRange(request.headers.get('range'),view.bytes);return new Response(Readable.toWeb(handle.createReadStream({autoClose:true,...(range?{start:range.start,end:range.end}:{})})) as ReadableStream,{status:range?206:200,headers:{'Content-Type':view.mime,'Content-Length':String(range?range.end-range.start+1:view.bytes),...(range?{'Content-Range':`bytes ${range.start}-${range.end}/${view.bytes}`} : {}),'Content-Disposition':`inline; filename="media.${view.mime==='image/jpeg'?'jpg':view.mime==='image/png'?'png':view.mime==='image/webp'?'webp':'mp4'}"`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer','Accept-Ranges':'bytes'}});}catch(error){await handle.close();if(error instanceof MediaError&&error.status===416)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${view.bytes}`,'Cache-Control':'no-store, private'}});throw error;}

}catch(error){return failure(error);}}
