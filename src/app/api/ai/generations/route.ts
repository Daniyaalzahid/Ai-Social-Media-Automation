import { NextRequest } from 'next/server';
import { aiService } from '../../../../server/ai/web';
import { AiError } from '../../../../server/ai/provider';
import { SESSION_COOKIE,browserConfiguration,verifyBrowserRequest } from '../../../../server/auth/browser-security';
import { SensitiveValue } from '../../../../server/security/sensitive';
import { generationBody } from '../../../../server/ai/http';
import { AuthorizationError } from '../../../../server/authorization/authorization';
import { reply } from '../../../../server/media/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
function failure(error:unknown){if(error instanceof AiError&&error.reason==='CAPABILITY_UNAVAILABLE')return reply({ok:false,message:'Image and video understanding are unavailable. Generate from text instead.'},400);return reply({ok:false,message:'Unable to complete AI generation. Check the input or try again later.'},error instanceof AuthorizationError?error.status:error instanceof AiError&&error.reason==='INPUT_INVALID'?400:error instanceof AiError&&error.reason==='UNAUTHORIZED'?403:error instanceof AiError&&['BUSY','RATE_LIMITED'].includes(error.reason)?429:503);}
export async function GET(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(request.nextUrl.search)throw new AiError('INPUT_INVALID');return reply({ok:true,generations:await aiService().list(new SensitiveValue(raw))});}catch(e){return failure(e);}}
export async function POST(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(!verifyBrowserRequest(request.headers,browserConfiguration(process.env),'session',raw))return reply({ok:false},403);if(request.nextUrl.search)throw new AiError('INPUT_INVALID');return reply({ok:true,generation:await aiService().generate(new SensitiveValue(raw),await generationBody(request),request.signal)});}catch(e){return failure(e);}}
