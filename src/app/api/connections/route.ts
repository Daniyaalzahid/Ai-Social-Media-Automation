import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { connectionsService } from '../../../server/social/web';
import { accessService } from '../../../server/auth/web';
import { SensitiveValue } from '../../../server/security/sensitive';
import { AuthorizationError } from '../../../server/authorization/authorization';
import { IntegrationError } from '../../../server/social/service';
import { browserConfiguration,verifyBrowserRequest,SESSION_COOKIE,COOKIE_OPTIONS } from '../../../server/auth/browser-security';
import { browserBody } from '../../../server/security/browser-request';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});
const failure=(status:number)=>reply({ok:false,message:'Unable to complete this connection request.'},status);
export async function GET(request:NextRequest){const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return failure(401);if(request.nextUrl.search)return failure(400);try{return reply({ok:true,view:await connectionsService().read(new SensitiveValue(raw))});}catch(e){return failure(e instanceof AuthorizationError?e.status:503);}}
const body=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('step-up'),mutation:z.unknown(),password:z.string().max(256),code:z.string().max(32)}).strict(),
 z.object({operation:z.literal('mutate'),mutation:z.unknown(),proof:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict(),
]);
export async function POST(request:NextRequest){
 const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return failure(401);
 try{const config=browserConfiguration(process.env);if(!verifyBrowserRequest(request.headers,config,'session',raw))return failure(403);const input=body.parse(await browserBody(request)),service=connectionsService(),session=new SensitiveValue(raw);
  if(input.operation==='step-up'){const action=await service.authorizeStepUp(session,input.mutation),result=await accessService().recentAuthentication(session,input.password,input.code,action);if(!result.ok)return failure(401);const res=reply({ok:true,proof:result.proof.reveal()});res.cookies.set(SESSION_COOKIE,result.session.reveal(),{...COOKIE_OPTIONS,expires:result.expiresAt});return res;}
  return reply({ok:true,...await service.mutate(session,new SensitiveValue(input.proof),input.mutation)});
 }catch(e){return failure(e instanceof AuthorizationError?e.status:e instanceof z.ZodError?400:e instanceof IntegrationError&&e.reason==='CONFLICT'?409:e instanceof IntegrationError&&e.reason==='SETUP_REQUIRED'?409:503);}
}
