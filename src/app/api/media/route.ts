import { NextRequest } from 'next/server';
import { mediaService } from '../../../server/media/web';
import { browserConfiguration,SESSION_COOKIE,verifyBrowserRequest } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { reply,failure } from '../../../server/media/http';
import { MediaError } from '../../../server/media/storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(request.nextUrl.search)throw new MediaError(400,'Unsupported read parameters.');return reply({ok:true,media:await mediaService().list(new SensitiveValue(raw))});}catch(error){return failure(error);}}
export async function POST(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{
 if(!verifyBrowserRequest(request.headers,browserConfiguration(process.env),'session',raw))return reply({ok:false},403);
 if(request.nextUrl.searchParams.size!==1||request.nextUrl.searchParams.getAll('name').length!==1||!request.body||request.headers.has('content-encoding'))throw new MediaError(400,'Unsupported upload request.');
 decodeURIComponent(request.nextUrl.search.slice(request.nextUrl.search.indexOf('=')+1).replace(/\+/g,' '));
 const mime=request.headers.get('content-type'),length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>33554432))throw new MediaError(413,'Upload exceeds the request limit.');
 return reply({ok:true,media:await mediaService().upload(new SensitiveValue(raw),{name:request.nextUrl.searchParams.get('name'),mime},request.body)},201);
}catch(error){return failure(error);}}
