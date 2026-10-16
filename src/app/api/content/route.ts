import { NextRequest } from 'next/server';
import { z } from 'zod';
import { SESSION_COOKIE,browserConfiguration,verifyBrowserRequest } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
import { contentService } from '../../../server/content/web';
import { contentBody,queryFields } from '../../../server/content/http';
import { ContentError } from '../../../server/content/policy';
import { AuthorizationError } from '../../../server/authorization/authorization';
import { reply } from '../../../server/media/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
function failure(e:unknown){return reply({ok:false,message:e instanceof ContentError?e.message:'Unable to access this content.'},e instanceof ContentError||e instanceof AuthorizationError?e.status:503);}
export async function GET(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{const fields=queryFields(request.nextUrl.searchParams);if('id'in fields){const q=z.object({id:z.uuid(),before:z.string().regex(/^[1-9][0-9]{0,8}$/).optional()}).strict().parse(fields);return reply({ok:true,detail:await contentService().get(new SensitiveValue(raw),q.id,q.before?Number(q.before):undefined)});}return reply({ok:true,list:await contentService().list(new SensitiveValue(raw),fields)});}catch(e){return failure(e);}}
export async function POST(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);try{if(!verifyBrowserRequest(request.headers,browserConfiguration(process.env),'session',raw))return reply({ok:false},403);if(request.nextUrl.search)throw new ContentError('VALIDATION_FAILED');return reply({ok:true,detail:await contentService().mutate(new SensitiveValue(raw),await contentBody(request))});}catch(e){return failure(e);}}
