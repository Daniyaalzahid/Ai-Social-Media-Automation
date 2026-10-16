import { NextRequest } from 'next/server';
import { aiService } from '../../../../../server/ai/web';
import { SESSION_COOKIE } from '../../../../../server/auth/browser-security';
import { SensitiveValue } from '../../../../../server/security/sensitive';
import { AuthorizationError } from '../../../../../server/authorization/authorization';
import { reply } from '../../../../../server/media/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(request.nextUrl.search)return reply({ok:false},400);return reply({ok:true,generation:await aiService().get(new SensitiveValue(raw),(await params).id)});}catch(error){return reply({ok:false,message:'Generation unavailable.'},error instanceof AuthorizationError?error.status:404);}}
