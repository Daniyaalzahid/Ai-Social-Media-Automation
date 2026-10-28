import { afterEach, expect, it, vi } from 'vitest';
import { logObjectStorageError } from '../../src/server/media/object-storage-diagnostics';
afterEach(()=>vi.restoreAllMocks());
it('projects only bounded S3 diagnostic metadata into one log line',()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>undefined);
 logObjectStorageError('PutObject',{name:'AccessDenied',Code:'AccessDenied',$metadata:{httpStatusCode:403,requestId:'0123456789abcdef01234567',attempts:1},$fault:'client',$retryable:{throttling:false},message:'DO_NOT_LOG',stack:'DO_NOT_LOG',request:{headers:{Authorization:'DO_NOT_LOG'}}});
 expect(log).toHaveBeenCalledOnce();expect(log.mock.calls[0]).toEqual(['MEDIA_STORAGE_ERROR operation=PutObject name=AccessDenied code=AccessDenied status=403 requestId=0123456789abcdef01234567 fault=client retryable=true throttling=false attempts=1']);
});
it('never logs raw exceptions, credentials, payloads, URLs or arbitrary metadata',()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>undefined);
 const database=new URL('mysql://localhost/private');database.username='synthetic';database.password='fixture';
 const secrets=['SYNTHETIC_ACCESS_KEY_CANARY','SYNTHETIC_SECRET_KEY_CANARY',database.href,'SESSION_CANARY_NOT_REAL','CSRF_CANARY_NOT_REAL','MFA_CANARY_NOT_REAL','UPLOADED_BINARY_CANARY'];
 for(const secret of secrets){
  logObjectStorageError('PutObject',{name:secret,code:secret,$fault:secret,$retryable:{throttling:secret},$metadata:{httpStatusCode:secret,requestId:secret,attempts:secret},message:secret,cause:secret,stack:secret,Authorization:secret,Body:Buffer.from(secret),environment:{secret}});
 }
 const output=log.mock.calls.flat().join('\n');for(const secret of secrets)expect(output).not.toContain(secret);
 expect(output).not.toContain('[object Object]');expect(output).not.toContain('Buffer');
});
it('withholds request ids that equal configured credentials and unsafe identifiers',()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>undefined),credential='abcdef0123456789abcdef01';
 for(const requestId of [credential,'a'.repeat(43),'Bearer session','id\nAuthorization=secret','x'.repeat(10000)])logObjectStorageError('GetObject',{$metadata:{requestId}},[credential]);
 for(const call of log.mock.calls)expect(call[0]).toContain('requestId=Unavailable');
 expect(log.mock.calls.flat().join()).not.toContain(credential);
});
it('does not invoke getters or exception serialization hooks and survives unavailable logging',()=>{
 const getter=vi.fn(()=>{throw new Error('DO_NOT_LOG');});const error=Object.defineProperty({toJSON:getter,toString:getter},'name',{get:getter});
 vi.spyOn(console,'error').mockImplementation(()=>{throw new Error('Synthetic logger unavailable');});
 expect(()=>logObjectStorageError('DeleteObject',error)).not.toThrow();expect(getter).not.toHaveBeenCalled();
 expect(()=>logObjectStorageError('HeadObject',null)).not.toThrow();
});
