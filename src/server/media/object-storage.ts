import { createHash } from 'node:crypto';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { MediaError, type MediaStorage } from './storage.ts';
import { logObjectStorageError } from './object-storage-diagnostics.ts';

const unavailable = () => new MediaError(503, 'Private object storage unavailable.');
const maximumBytes = 33554432;
let activeScratch = 0;
export function objectStorageConfiguration(source: Readonly<Record<string,string|undefined>>) {
  try {
    const endpoint = new URL(source.MEDIA_S3_ENDPOINT ?? '');
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/' || !/^[a-z0-9.-]+$/i.test(endpoint.hostname) || !endpoint.hostname.includes('.') || /^[0-9.]+$/.test(endpoint.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(endpoint.hostname)) throw unavailable();
    const bucket=source.MEDIA_S3_BUCKET,region=source.MEDIA_S3_REGION,accessKeyId=source.MEDIA_S3_ACCESS_KEY_ID,secretAccessKey=source.MEDIA_S3_SECRET_ACCESS_KEY,style=source.MEDIA_S3_FORCE_PATH_STYLE;
    if (!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || !region || !/^[a-zA-Z0-9-]{1,80}$/.test(region) || !accessKeyId || !/^[A-Za-z0-9_-]{1,256}$/.test(accessKeyId) || !secretAccessKey || secretAccessKey.length>4096 || /[\s\p{Cc}]/u.test(secretAccessKey) || style!==undefined && style!=='true' && style!=='false' || source.NODE_TLS_REJECT_UNAUTHORIZED==='0') throw unavailable();
    return {endpoint:endpoint.origin,bucket,region,credentials:{accessKeyId,secretAccessKey},forcePathStyle:style==='true'};
  } catch(error) { logObjectStorageError('Configuration',error);throw unavailable(); }
}
/** Private, create-only objects. Configuration is server-owned, never request data.
 * Scratch files are private and disposable; durable media lives only in the bucket.
 */
export class PrivateObjectMediaStorage implements MediaStorage {
  private readonly client:S3Client;
  private readonly bucket:string;
  private readonly diagnosticCredentials:readonly string[];
  constructor(source:Readonly<Record<string,string|undefined>>) {
    const config=objectStorageConfiguration(source);this.bucket=config.bucket;
    this.diagnosticCredentials=[config.credentials.accessKeyId,config.credentials.secretAccessKey];
    try {this.client=new S3Client({...config,maxAttempts:1,followRegionRedirects:false,requestHandler:{connectionTimeout:5000,requestTimeout:60000,socketTimeout:15000}});}
    catch(error){logObjectStorageError('Initialize',error,this.diagnosticCredentials);throw unavailable();}
  }
  private key(key:string) {if(!/^[0-9a-f]{64}$/.test(key))throw unavailable();return 'private-media/'+key+'.bin';}
  async write(key:string,source:ReadableStream<Uint8Array>,maximum:number) {
    const name=this.key(key);if(!Number.isSafeInteger(maximum)||maximum<1||maximum>maximumBytes)throw unavailable();
    const signal=AbortSignal.timeout(60000),reader=source.getReader(),chunks:Buffer[]=[];let bytes=0,timedOut=false;const hash=createHash('sha256');
    const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>undefined);},60000);
    try {
      while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>maximum)throw new MediaError(413,'Media exceeds the file limit.');const chunk=Buffer.from(next.value);hash.update(chunk);chunks.push(chunk);}
      if(timedOut)throw unavailable();if(!bytes)throw new MediaError(400,'Empty media is not supported.');const sha256=hash.digest();
      await this.client.send(new PutObjectCommand({Bucket:this.bucket,Key:name,Body:Buffer.concat(chunks),ContentLength:bytes,ContentType:'application/octet-stream',ChecksumSHA256:sha256.toString('base64'),IfNoneMatch:'*'}),{abortSignal:signal});
      return {bytes,sha256};
    } catch(error){if(!(error instanceof MediaError) || error.status===503)logObjectStorageError('PutObject',error,this.diagnosticCredentials);if(error instanceof MediaError)throw error;throw unavailable();}
    finally {clearTimeout(timer);void reader.cancel().catch(()=>undefined);reader.releaseLock();}
  }
  async open(key:string) {
    const name=this.key(key);if(activeScratch>=4)throw unavailable();activeScratch++;let released=false;const release=()=>{if(!released){released=true;activeScratch--;}};let directory:string|undefined;
    const started=Date.now();
    try {
      const response=await this.client.send(new GetObjectCommand({Bucket:this.bucket,Key:name}),{abortSignal:AbortSignal.timeout(60000)});
      if(!response.Body || !Number.isSafeInteger(response.ContentLength) || response.ContentLength!<1 || response.ContentLength!>maximumBytes){response.Body?.transformToWebStream().cancel().catch(()=>undefined);throw unavailable();}
      directory=await mkdtemp(join(tmpdir(),'bsa-private-object-'));const scratch=directory;
      const writer=await open(join(scratch,'media.bin'),'wx',0o600);const reader=response.Body.transformToWebStream().getReader();let size=0,timedOut=false;
      const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>undefined);},Math.max(1,60000-(Date.now()-started)));
      try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>response.ContentLength!||size>maximumBytes)throw unavailable();await writer.writeFile(part.value);}if(timedOut||size!==response.ContentLength)throw unavailable();await writer.sync();}
      catch(error) {await writer.close();throw error;}
      finally {clearTimeout(timer);void reader.cancel().catch(()=>undefined);reader.releaseLock();}
      await writer.close();const handle=await open(join(scratch,'media.bin'),'r');
      const close=handle.close.bind(handle),stream=handle.createReadStream.bind(handle);
      handle.close=async()=>{try{await close();}finally{try{await rm(scratch,{recursive:true,force:true});}finally{release();}}};
      handle.createReadStream=(options)=>{const result=stream(options);result.once('close',()=>{release();void rm(scratch,{recursive:true,force:true}).catch(()=>undefined);});return result;};
      return handle;
    } catch(error) {logObjectStorageError('GetObject',error,this.diagnosticCredentials);release();if(directory)await rm(directory,{recursive:true,force:true});throw unavailable();}
  }
  async exists(key:string){try{await this.client.send(new HeadObjectCommand({Bucket:this.bucket,Key:this.key(key)}),{abortSignal:AbortSignal.timeout(15000)});return true;}catch(error){if(error&&typeof error==='object'&&'name'in error&&['NotFound','NoSuchKey'].includes(String(error.name)))return false;logObjectStorageError('HeadObject',error,this.diagnosticCredentials);throw unavailable();}}
  async delete(key:string){try{await this.client.send(new DeleteObjectCommand({Bucket:this.bucket,Key:this.key(key)}),{abortSignal:AbortSignal.timeout(15000)});}catch(error){logObjectStorageError('DeleteObject',error,this.diagnosticCredentials);throw unavailable();}}
  async abandonedCandidates(){
    const found:{key:string;mtime:Date}[]=[];let token:string|undefined;const signal=AbortSignal.timeout(15000);
    try {
      for(let pageNumber=0;pageNumber<5;pageNumber++) {
        const page=await this.client.send(new ListObjectsV2Command({Bucket:this.bucket,Prefix:'private-media/',MaxKeys:100,...(token?{ContinuationToken:token}:{})}),{abortSignal:signal});
        if((page.Contents?.length??0)>100)throw unavailable();
        for(const item of page.Contents??[]){const match=/^private-media\/([0-9a-f]{64})\.bin$/.exec(item.Key??'');if(match){if(!(item.LastModified instanceof Date)||!Number.isFinite(+item.LastModified))throw unavailable();found.push({key:match[1]!,mtime:item.LastModified});}}
        if(!page.IsTruncated)return found;
        if(!page.NextContinuationToken || page.NextContinuationToken.length>4096 || page.NextContinuationToken===token)throw unavailable();token=page.NextContinuationToken;
      }
      throw unavailable(); // Never claim a partial listing was a complete orphan inventory.
    }catch(error){logObjectStorageError('ListObjectsV2',error,this.diagnosticCredentials);throw unavailable();}
  }
}
