import { constants } from 'node:fs';
import { mkdir,lstat,realpath,open,unlink,opendir } from 'node:fs/promises';
import { resolve,dirname,parse,relative,isAbsolute,sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable,Transform,Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { FileHandle } from 'node:fs/promises';
import { EnvironmentValidationError } from '../config/schema.ts';
export class MediaError extends Error { constructor(readonly status:400|403|404|409|413|416|429|503,message:string){super(message);this.name='MediaError';} }
export function storageRoot(source:Record<string,string|undefined>){
 const mode=source.APP_ENV??source.NODE_ENV??'development';
 if(!['development','test','production'].includes(mode)||source.NODE_ENV&&source.NODE_ENV!==mode)throw new EnvironmentValidationError(['media environment']);
 const name=mode==='production'?'MEDIA_STORAGE_ROOT':mode==='test'?'TEST_MEDIA_STORAGE_ROOT':'DEV_MEDIA_STORAGE_ROOT';
 if(mode!=='production'&&source.MEDIA_STORAGE_ROOT||mode==='production'&&(source.DEV_MEDIA_STORAGE_ROOT||source.TEST_MEDIA_STORAGE_ROOT))throw new EnvironmentValidationError(['media environment isolation']);
 const value=source[name];if(!value||!isAbsolute(value)||value.includes('\0')||resolve(value)===parse(value).root)throw new EnvironmentValidationError([name]);
 if(resolve(value).split(sep).some(part=>['public','public_html','htdocs','www'].includes(part)))throw new EnvironmentValidationError([name]);
 const path=resolve(value),inside=relative(resolve(process.cwd()),path);
 if(!inside.startsWith('..'+sep)&&inside!=='..'&&!isAbsolute(inside))throw new EnvironmentValidationError([name]);
 return path;
}
export interface MediaStorage {
 write(key:string,source:ReadableStream<Uint8Array>,maximum:number):Promise<{bytes:number;sha256:Buffer}>;
 open(key:string):Promise<FileHandle>;exists(key:string):Promise<boolean>;delete(key:string):Promise<void>;
}
export class LocalPrivateMediaStorage implements MediaStorage {
 constructor(private readonly root:string){}
 private async path(key:string){
  if(!/^[0-9a-f]{64}$/.test(key))throw new MediaError(400,'Invalid media identity.');
  const absolute=resolve(this.root);let current=absolute;
  while(true){try{if((await lstat(current)).isSymbolicLink())throw new Error();}catch(error){if(!(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT'))throw new MediaError(503,'Private storage unavailable.');}const parent=dirname(current);if(parent===current)break;current=parent;}
  await mkdir(absolute,{recursive:true,mode:0o700});
  const stat=await lstat(absolute);
  if(!stat.isDirectory()||stat.mode&0o077||typeof process.getuid==='function'&&stat.uid!==process.getuid()||await realpath(absolute)!==absolute)throw new MediaError(503,'Private storage unavailable.');
  return resolve(absolute,key+'.bin');
 }
 async write(key:string,source:ReadableStream<Uint8Array>,maximum:number){
  const path=await this.path(key),handle=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  let bytes=0;const hash=createHash('sha256');
  try{
   const meter=new Transform({transform(chunk:Buffer,_encoding,done){bytes+=chunk.length;if(bytes>maximum){done(new MediaError(413,'Media exceeds the file limit.'));return;}hash.update(chunk);done(null,chunk);}});
   await pipeline(Readable.fromWeb(source as Parameters<typeof Readable.fromWeb>[0]),meter,new Writable({write(chunk:Buffer,_encoding,done){handle.writeFile(chunk).then(()=>done(),done);}}),{signal:AbortSignal.timeout(60000)});
   if(!bytes)throw new MediaError(400,'Empty media is not supported.');await handle.sync();return {bytes,sha256:hash.digest()};
  }finally{await handle.close();}
 }
 async open(key:string){const path=await this.path(key),handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=await handle.stat();if(!stat.isFile()||stat.nlink!==1||stat.mode&0o077||stat.mode&0o111)throw new Error();return handle;}catch{await handle.close();throw new MediaError(503,'Media unavailable.');}}
 async exists(key:string){try{const handle=await this.open(key);await handle.close();return true;}catch(error){if(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT')return false;throw error;}}
 async delete(key:string){const path=await this.path(key);try{const handle=await this.open(key);await handle.close();await unlink(path);}catch(error){
  // Another authorized deleter may unlink an already-open inode before fstat.
  // Only confirmed path absence makes deletion idempotent; reads stay strict.
  try{await lstat(path);}catch(check){if(check&&typeof check==='object'&&'code'in check&&check.code==='ENOENT')return;}
  throw error;
 }}
 /** Explicit maintenance inventory only; bounded discovery and age check, never user-supplied paths. */
 async abandonedCandidates(){await this.path('0'.repeat(64));const directory=await opendir(this.root);const found:{key:string;mtime:Date}[]=[];let visited=0;for await(const entry of directory){if(++visited>100)break;const name=entry.name;if(!/^[0-9a-f]{64}\.bin$/.test(name))continue;const stat=await lstat(resolve(this.root,name));if(stat.isFile()&&!stat.isSymbolicLink())found.push({key:name.slice(0,64),mtime:stat.mtime});}return found;}
}
