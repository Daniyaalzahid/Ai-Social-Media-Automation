import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { publishingService } from '../../../server/publishing/web';
import { accessService } from '../../../server/auth/web';
import { PublishingError } from '../../../server/publishing/policy';
import { AuthorizationError } from '../../../server/authorization/authorization';
import { SensitiveValue } from '../../../server/security/sensitive';
import { SESSION_COOKIE,COOKIE_OPTIONS,browserConfiguration,verifyBrowserRequest } from '../../../server/auth/browser-security';
import { contentBody,queryFields } from '../../../server/content/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});
const failure=(e:unknown)=>reply({ok:false,message:e instanceof PublishingError?e.message:'Unable to complete this publishing request.'},e instanceof PublishingError||e instanceof AuthorizationError?e.status:e instanceof z.ZodError?400:503);
const inputSchema=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('preview'),selection:z.unknown()}).strict(),
 z.object({operation:z.literal('step-up'),command:z.unknown(),password:z.string().max(256),code:z.string().max(32)}).strict(),
 z.object({operation:z.literal('publish'),command:z.unknown(),proof:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict(),
 z.object({operation:z.literal('reconcile'),id:z.uuid()}).strict(),
]);
export async function GET(request:NextRequest){const value=request.cookies.get(SESSION_COOKIE)?.value;if(!value)return reply({ok:false},401);try{const query=z.object({postId:z.uuid().optional(),id:z.uuid().optional()}).strict().refine(q=>!!q.id!==!!q.postId).parse(queryFields(request.nextUrl.searchParams)),raw=new SensitiveValue(value);return reply({ok:true,...(query.id?{status:await publishingService().read(raw,query.id)}:{view:await publishingService().page(raw,query.postId!)})});}catch(e){return failure(e);}}
export async function POST(request:NextRequest){const value=request.cookies.get(SESSION_COOKIE)?.value;if(!value)return reply({ok:false},401);try{if(request.nextUrl.search||!verifyBrowserRequest(request.headers,browserConfiguration(process.env),'session',value))return reply({ok:false},403);const input=inputSchema.parse(await contentBody(request)),raw=new SensitiveValue(value),service=publishingService();
 if(input.operation==='preview')return reply({ok:true,preview:await service.preview(raw,input.selection)});
 if(input.operation==='step-up'){const action=await service.authorizeStepUp(raw,input.command),result=await accessService().recentAuthentication(raw,input.password,input.code,action);if(!result.ok)return reply({ok:false},401);const response=reply({ok:true,proof:result.proof.reveal()});response.cookies.set(SESSION_COOKIE,result.session.reveal(),{...COOKIE_OPTIONS,expires:result.expiresAt});return response;}
 return reply({ok:true,status:input.operation==='publish'?await service.publish(raw,new SensitiveValue(input.proof),input.command):await service.reconcile(raw,input.id)});
 }catch(e){return failure(e);}}
