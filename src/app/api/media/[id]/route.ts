import { NextRequest } from 'next/server';
import { mediaService } from '../../../../server/media/web';
import { browserConfiguration,SESSION_COOKIE,verifyBrowserRequest } from '../../../../server/auth/browser-security';
import { SensitiveValue } from '../../../../server/security/sensitive';
import { MediaError } from '../../../../server/media/storage';
import { reply,failure,requireEmptyRemovalBody } from '../../../../server/media/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(request.nextUrl.search)throw new MediaError(400,'Unsupported read parameters.');return reply({ok:true,media:(await mediaService().get(new SensitiveValue(raw),(await params).id)).view});}catch(error){return failure(error);}}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(!verifyBrowserRequest(request.headers,browserConfiguration(process.env),'session',raw))return reply({ok:false},403);if(request.nextUrl.search)throw new MediaError(400,'Removal takes no extra fields.');await requireEmptyRemovalBody(request);await mediaService().remove(new SensitiveValue(raw),(await params).id);return reply({ok:true});}catch(error){return failure(error);}}
