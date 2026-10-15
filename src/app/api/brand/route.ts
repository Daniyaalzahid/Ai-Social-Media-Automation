import { NextRequest,NextResponse } from 'next/server';
import { getDatabase } from '../../../server/db/client';
import { createBrandService,BrandError } from '../../../server/brand/service';
import { AuthorizationError } from '../../../server/authorization/authorization';
import { browserBody } from '../../../server/security/browser-request';
import { browserConfiguration,SESSION_COOKIE,verifyBrowserRequest } from '../../../server/auth/browser-security';
import { SensitiveValue } from '../../../server/security/sensitive';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});
function failure(error:unknown){return reply({ok:false,message:error instanceof BrandError?error.message:'Unable to complete this request.'},error instanceof BrandError||error instanceof AuthorizationError?error.status:503);}
export async function GET(request:NextRequest){
 const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);
 try{const query=request.nextUrl.searchParams;if([...query.keys()].some((key)=>key!=='brandId')||query.getAll('brandId').length>1)throw new BrandError(400,'Unsupported or ambiguous read parameters.');return reply({ok:true,brand:await createBrandService(getDatabase()).read(new SensitiveValue(raw),request.nextUrl.searchParams.get('brandId')??undefined)});}catch(error){return failure(error);}
}
export async function POST(request:NextRequest){
 const raw=request.cookies.get(SESSION_COOKIE)?.value;if(!raw)return reply({ok:false},401);
 try{if(!verifyBrowserRequest(request.headers,browserConfiguration(process.env),'session',raw))return reply({ok:false,message:'Unable to complete this request.'},403);
 return reply({ok:true,brand:await createBrandService(getDatabase()).mutate(new SensitiveValue(raw),await browserBody(request,16384))});}catch(error){return failure(error);}
}
