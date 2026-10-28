import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { PrivateObjectMediaStorage } from '../../src/server/media/object-storage';
import { mediaStream } from '../helpers/media-fixtures';

type WireRequest={protocol:string;hostname:string;path:string;method:string;headers:Record<string,string>;body:unknown};
const wire=vi.hoisted(()=>({requests:[] as WireRequest[],status:200}));
// Real pinned SDK serializer, signing and checksum middleware; only the network
// transport is replaced. No external request, credential lookup or B2 account.
vi.mock('@aws-sdk/client-s3',async(importOriginal)=>{
 const sdk=await importOriginal<typeof import('@aws-sdk/client-s3')>();
 return {...sdk,S3Client:class extends sdk.S3Client{
  constructor(config:ConstructorParameters<typeof sdk.S3Client>[0]){
   super({...config,requestHandler:{handle:async(request:WireRequest)=>{
    wire.requests.push(request);
    return {response:{statusCode:wire.status,headers:{'x-amz-request-id':'0123456789abcdef01234567','content-type':'application/xml'},body:Buffer.from(wire.status===200?'':'<Error><Code>AccessDenied</Code><Message>DO_NOT_LOG_SDK_DETAILS</Message></Error>')}};
   }}});
  }
 }};
});
const source={MEDIA_S3_ENDPOINT:'https://s3.us-east-005.backblazeb2.com',MEDIA_S3_REGION:'us-east-005',MEDIA_S3_BUCKET:'private-wire-fixture',MEDIA_S3_ACCESS_KEY_ID:'synthetic-access',MEDIA_S3_SECRET_ACCESS_KEY:'synthetic-wire-fixture-not-a-real-credential'};
beforeEach(()=>{wire.requests=[];wire.status=200;});afterEach(()=>vi.restoreAllMocks());
it.each([false,true])('serializes the private create-only, length-bounded SHA-256 upload (path style %s)',async(pathStyle)=>{
 const bytes=Buffer.from('Synthetic object bytes'),store=new PrivateObjectMediaStorage({...source,MEDIA_S3_FORCE_PATH_STYLE:String(pathStyle)});
 const result=await store.write('a'.repeat(64),mediaStream(bytes),100);
 expect(result.sha256).toEqual(createHash('sha256').update(bytes).digest());expect(wire.requests).toHaveLength(1);
 const request=wire.requests[0]!;
 expect(request.protocol).toBe('https:');expect(request.method).toBe('PUT');
 expect(request.hostname).toBe(pathStyle?'s3.us-east-005.backblazeb2.com':'private-wire-fixture.s3.us-east-005.backblazeb2.com');
 expect(request.path).toBe((pathStyle?'/private-wire-fixture':'')+'/private-media/'+'a'.repeat(64)+'.bin');
 expect(request.headers['content-length']).toBe(String(bytes.length));expect(request.headers['content-type']).toBe('application/octet-stream');
 expect(request.headers['if-none-match']).toBe('*');expect(request.headers['x-amz-checksum-sha256']).toBe(result.sha256.toString('base64'));
 expect(request.headers['x-amz-checksum-crc32']).toBeUndefined();expect(request.headers['x-amz-checksum-crc32c']).toBeUndefined();
 expect(request.headers['x-amz-acl']).toBeUndefined();expect(request.headers['content-encoding']).not.toBe('aws-chunked');
 expect(request.headers.authorization?.includes('/us-east-005/s3/aws4_request')).toBe(true);
 expect(Buffer.from(request.body as Uint8Array)).toEqual(bytes);
});
it('projects a real SDK S3 exception safely without exposing its XML error or signing credentials',async()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>undefined);wire.status=403;
 await expect(new PrivateObjectMediaStorage(source).write('b'.repeat(64),mediaStream(Buffer.from('fixture')),100)).rejects.toMatchObject({status:503,message:'Private object storage unavailable.'});
 expect(wire.requests).toHaveLength(1);expect(log).toHaveBeenCalledOnce();const line=String(log.mock.calls[0]![0]);
 expect(line).toContain('MEDIA_STORAGE_ERROR operation=PutObject name=AccessDenied');expect(line).toContain('status=403 requestId=0123456789abcdef01234567');
 for(const forbidden of ['DO_NOT_LOG_SDK_DETAILS',source.MEDIA_S3_ACCESS_KEY_ID,source.MEDIA_S3_SECRET_ACCESS_KEY,'Authorization','private-media/'])expect(line).not.toContain(forbidden);
});
