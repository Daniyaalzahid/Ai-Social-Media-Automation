import { expect,it,vi,beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { access } from 'node:fs/promises';
import { S3Client } from '@aws-sdk/client-s3';
import { PrivateObjectMediaStorage,objectStorageConfiguration } from '../../src/server/media/object-storage';
import { configuredMediaStorage } from '../../src/server/media/configured-storage';
import { imageFixture,mediaStream } from '../helpers/media-fixtures';
import { inspectMedia } from '../../src/server/media/parser';
const fake=vi.hoisted(()=>({send:vi.fn(),objects:new Map<string,Buffer>(),calls:[] as {name:string;input:Record<string,unknown>}[]}));
vi.mock('@aws-sdk/client-s3',()=>{
 class Command{constructor(public input:Record<string,unknown>){}}
 class PutObjectCommand extends Command{}class GetObjectCommand extends Command{}class HeadObjectCommand extends Command{}class DeleteObjectCommand extends Command{}class ListObjectsV2Command extends Command{}
 return {S3Client:vi.fn(class{send=fake.send;}),PutObjectCommand,GetObjectCommand,HeadObjectCommand,DeleteObjectCommand,ListObjectsV2Command};
});
const env=()=>({APP_ENV:'production',NODE_ENV:'production',MEDIA_STORAGE_BACKEND:'s3',MEDIA_S3_ENDPOINT:'https://objects.example.com',MEDIA_S3_BUCKET:'private-fixture',MEDIA_S3_REGION:'reviewed-region',MEDIA_S3_ACCESS_KEY_ID:'fixture-access',MEDIA_S3_SECRET_ACCESS_KEY:'synthetic-private-storage-fixture'});
const key='a'.repeat(64);
beforeEach(()=>{fake.objects.clear();fake.calls=[];fake.send.mockImplementation(async(command:{input:Record<string,unknown>;constructor:{name:string}})=>{
 const input=command.input,k=String(input.Key);fake.calls.push({name:command.constructor.name,input});
 switch(command.constructor.name){
 case 'PutObjectCommand':if(input.IfNoneMatch==='*'&&fake.objects.has(k))throw new Error('Synthetic collision');fake.objects.set(k,Buffer.from(input.Body as Buffer));return {};
 case 'GetObjectCommand':{const bytes=fake.objects.get(k);if(!bytes)throw new Error('Synthetic missing');return {ContentLength:bytes.length,Body:{transformToWebStream:()=>mediaStream(bytes)}};}
 case 'HeadObjectCommand':if(!fake.objects.has(k))throw Object.assign(new Error('Synthetic missing'),{name:'NotFound'});return {};
 case 'DeleteObjectCommand':fake.objects.delete(k);return {};
 case 'ListObjectsV2Command':return {Contents:[...fake.objects.keys()].map(Key=>({Key,LastModified:new Date(0)}))};
 default:throw new Error('Unexpected operation');}
 });});
it('roundtrips private media, MIME-validates scratch FD, checks SHA and deletes idempotently',async()=>{
 const store=new PrivateObjectMediaStorage(env()),bytes=await imageFixture();const written=await store.write(key,mediaStream(bytes),8388608);expect(written.sha256).toEqual(createHash('sha256').update(bytes).digest());expect(written.bytes).toBe(bytes.length);
 const put=fake.calls[0]!;expect(put.input).toMatchObject({Key:'private-media/'+key+'.bin',ContentType:'application/octet-stream'});expect(put.input.ACL).toBeUndefined();expect(put.input.IfNoneMatch).toBeUndefined();expect(put.input.ChecksumSHA256).toBeUndefined();expect(put.input.ChecksumAlgorithm).toBeUndefined();
 expect(await store.exists(key)).toBe(true);const handle=await store.open(key);expect(await handle.readFile()).toEqual(bytes);await handle.close();
 const parsed=await store.open(key);expect(await inspectMedia(parsed,'image/png')).toMatchObject({width:2,height:2});await parsed.close();
 expect(await store.abandonedCandidates()).toEqual([{key,mtime:new Date(0)}]);await store.delete(key);await store.delete(key);expect(await store.exists(key)).toBe(false);
 expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({requestChecksumCalculation:'WHEN_REQUIRED',maxAttempts:1,followRegionRedirects:false,endpoint:'https://objects.example.com'}));
});
it('keeps scratch files private and removes them after close',async()=>{const store=new PrivateObjectMediaStorage(env());await store.write(key,mediaStream(Buffer.from('safe fixture')),100);const h=await store.open(key);expect((await h.stat()).mode&0o077).toBe(0);const path=await import('node:fs/promises').then(m=>m.readlink('/proc/self/fd/'+h.fd));await h.close();await expect(access(path)).rejects.toThrow();});
it('rejects invalid keys, oversized and empty uploads before transport',async()=>{const store=new PrivateObjectMediaStorage(env());await expect(store.open('../outside')).rejects.toThrow();await expect(store.write('b'.repeat(64),mediaStream(Buffer.alloc(101)),100)).rejects.toMatchObject({status:413});await expect(store.write('b'.repeat(64),mediaStream(Buffer.alloc(0)),100)).rejects.toMatchObject({status:400});expect(fake.send).not.toHaveBeenCalled();});
it.each(['http://objects.example.com','https://127.0.0.1','https://[::1]','https://localhost','https://objects.example.com/?query=1','https://objects.example.com/path'])('rejects unsafe endpoint %s',endpoint=>expect(()=>objectStorageConfiguration({...env(),MEDIA_S3_ENDPOINT:endpoint})).toThrow());
it.each(['1','TRUE','',' true'])('rejects alternate path-style flag %j',flag=>expect(()=>objectStorageConfiguration({...env(),MEDIA_S3_FORCE_PATH_STYLE:flag})).toThrow());
it('rejects dev/test roots and modes in object runtime factory',()=>{for(const patch of [{DEV_MEDIA_STORAGE_ROOT:'/tmp/private'},{TEST_MEDIA_STORAGE_ROOT:'/tmp/private'},{MEDIA_STORAGE_ROOT:'/tmp/private'},{APP_ENV:'test',NODE_ENV:'test'}])expect(()=>configuredMediaStorage({...env(),...patch})).toThrow();});
it('rejects oversized/truncated downloads without revealing credentials or upstream errors',async()=>{const store=new PrivateObjectMediaStorage(env());fake.send.mockResolvedValue({ContentLength:33554433,Body:{transformToWebStream:()=>mediaStream(Buffer.from('fixture'))}});await expect(store.open(key)).rejects.toThrow('Private object storage unavailable.');fake.send.mockResolvedValue({ContentLength:8,Body:{transformToWebStream:()=>mediaStream(Buffer.from('short'))}});await expect(store.open(key)).rejects.toThrow('Private object storage unavailable.');fake.send.mockRejectedValue(new Error('Synthetic upstream credential-bearing details'));await expect(store.delete(key)).rejects.toThrow('Private object storage unavailable.');});

it('supplies immutable SHA-checked approved publishing captures from object storage',async()=>{
 const {approvedMediaBroker,sendApprovedMedia}=await import('../../src/server/provider-security/media');const {Budget}=await import('../../src/server/provider-security/policy');
 const b={workspaceId:'10000000-0000-4000-8000-000000000001',operationId:'10000000-0000-4000-8000-000000000002',snapshotId:'10000000-0000-4000-8000-000000000003',authorizationId:'10000000-0000-4000-8000-000000000004',destinationId:'10000000-0000-4000-8000-000000000005',authorizationVersion:1,destination:'synthetic:destination',provider:'LINKEDIN' as const,capabilityRef:'fixture-v1',intentHash:'a'.repeat(64),media:true};
 const store=new PrivateObjectMediaStorage(env()),bytes=await imageFixture();await store.write(key,mediaStream(bytes),8388608);const data={binding:b,approved:true as const,assets:[{id:'fixture-media',storageKey:key,mime:'image/png' as const,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),protectedUntil:Date.now()+30000,status:'attached' as const}]};
 const budget=new Budget(30000),broker=approvedMediaBroker(store,async()=>data),cap=await broker.capture(b,budget);
 try{fake.objects.set('private-media/'+key+'.bin',Buffer.from('changed'));const chunks:Buffer[]=[];await sendApprovedMedia({capture:cap,assetId:'fixture-media',start:0,end:bytes.length,prefix:Buffer.alloc(0),suffix:Buffer.alloc(0)},b,budget,async copy=>{chunks.push(Buffer.from(copy));});expect(Buffer.concat(chunks)).toEqual(bytes);}finally{cap.dispose();budget.dispose();}
 const next=new Budget(30000);try{await expect(broker.capture(b,next)).rejects.toThrow();}finally{next.dispose();}
});

it('bounds pagination and rejects incomplete or looping orphan inventories',async()=>{const store=new PrivateObjectMediaStorage(env());fake.send.mockResolvedValue({Contents:[],IsTruncated:true,NextContinuationToken:'same'});await expect(store.abandonedCandidates()).rejects.toThrow();let calls=0;fake.send.mockImplementation(async()=>({Contents:[],IsTruncated:true,NextContinuationToken:String(++calls)}));await expect(store.abandonedCandidates()).rejects.toThrow();expect(calls).toBe(5);});
it('streams ranges without exposing a remote URL and cleans private scratch',async()=>{const store=new PrivateObjectMediaStorage(env());await store.write(key,mediaStream(Buffer.from('abcdef')),100);const h=await store.open(key);const chunks:Buffer[]=[];for await(const b of h.createReadStream({start:1,end:3,autoClose:true}))chunks.push(Buffer.from(b));expect(Buffer.concat(chunks).toString()).toBe('bcd');});

it('rejects endpoint credentials',()=>{const endpoint=new URL('https://objects.example.com');endpoint.username='synthetic';endpoint.password='fixture';expect(()=>objectStorageConfiguration({...env(),MEDIA_S3_ENDPOINT:endpoint.href})).toThrow();});

it('selects the private S3 adapter for the exact Hostinger B2 selector without network activity',()=>{
 const source={...env(),MEDIA_STORAGE_BACKEND:'s3',MEDIA_S3_ENDPOINT:'https://s3.us-east-005.backblazeb2.com',MEDIA_S3_REGION:'us-east-005'};
 expect(configuredMediaStorage(source)).toBeInstanceOf(PrivateObjectMediaStorage);
 expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({endpoint:source.MEDIA_S3_ENDPOINT,region:'us-east-005',maxAttempts:1,followRegionRedirects:false}));
 expect(fake.send).not.toHaveBeenCalled();
 expect(()=>configuredMediaStorage({...source,MEDIA_STORAGE_BACKEND:'S3_COMPATIBLE_PRIVATE_OBJECT_STORAGE'})).toThrow('MEDIA_STORAGE_BACKEND');
});

it.each(['write','open','exists','delete','abandonedCandidates'] as const)('logs safe metadata for %s failures while keeping the client error generic',async(operation)=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>undefined),store=new PrivateObjectMediaStorage(env());
 fake.send.mockRejectedValueOnce(Object.assign(new Error('DO_NOT_LOG upstream headers or credentials'),{name:'AccessDenied',$metadata:{httpStatusCode:403,requestId:'0123456789abcdef01234567'},$fault:'client'}));
 try{
  const result=operation==='write'?store.write(key,mediaStream(Buffer.from('fixture')),100):operation==='abandonedCandidates'?store.abandonedCandidates():store[operation](key);
  await expect(result).rejects.toMatchObject({status:503,message:'Private object storage unavailable.'});
  expect(log).toHaveBeenCalledOnce();expect(log.mock.calls[0]![0]).toContain('MEDIA_STORAGE_ERROR');expect(log.mock.calls[0]![0]).toContain('name=AccessDenied code=Unavailable status=403');
  for(const secret of [env().MEDIA_S3_ACCESS_KEY_ID,env().MEDIA_S3_SECRET_ACCESS_KEY,'DO_NOT_LOG'])expect(log.mock.calls.flat().join()).not.toContain(secret);
 }finally{log.mockRestore();}
});
it('does not log expected missing-object responses',async()=>{const log=vi.spyOn(console,'error').mockImplementation(()=>undefined);try{expect(await new PrivateObjectMediaStorage(env()).exists(key)).toBe(false);expect(log).not.toHaveBeenCalled();}finally{log.mockRestore();}});
