import { NextRequest,NextResponse } from 'next/server';
import { connectionsService } from '../../../../../server/social/web';
import { providerSchema } from '../../../../../features/connections/model';
import { SensitiveValue } from '../../../../../server/security/sensitive';
import { browserConfiguration,SESSION_COOKIE } from '../../../../../server/auth/browser-security';
export const runtime='nodejs';export const dynamic='force-dynamic';
/** OAuth protocol GET exception: state + original session context, not browser mutation CSRF. */
export async function GET(request:NextRequest,{params}:{params:Promise<{provider:string}>}){
 let ok=false;try{const{provider}=await params,parsed=providerSchema.safeParse(provider.toUpperCase()),raw=request.cookies.get(SESSION_COOKIE)?.value;if(raw&&parsed.success&&provider===provider.toLowerCase())ok=await connectionsService().callback(new SensitiveValue(raw),parsed.data,request.nextUrl.search);}catch{/* No callback/query/upstream detail is returned or logged. */}
 try{const origin=browserConfiguration(process.env).origin;return NextResponse.redirect(`${origin}/connections?result=${ok?'complete':'restart'}`,{status:303,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});}catch{return new NextResponse('Unable to complete this connection request.',{status:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
}
