import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { FileHandle } from 'node:fs/promises';
import { MediaError } from './storage.ts';
// Constant trusted program, never assembled from user input. A disposable child
// bounds parser CPU time and JS heap; native image allocations are pixel-bounded.
const program=String.raw`
const fs=require('node:fs');const{createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');
(async()=>{const mime=process.argv[1],stat=fs.fstatSync(3);if(!stat.isFile()||stat.size<12||stat.size>33554432)throw 0;
let result;
if(mime!=='video/mp4'){
 const data=fs.readFileSync(3);if(data.length>8388608)throw 0;
 const valid=mime==='image/jpeg'?data[0]===255&&data[1]===216&&data.at(-2)===255&&data.at(-1)===217:mime==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.subarray(-12).equals(Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130])):mime==='image/webp'?data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'&&data.readUInt32LE(4)+8===data.length:false;
 if(!valid)throw 0;
 const sharp=req('sharp');sharp.cache(false);sharp.concurrency(1);const image=sharp(data,{limitInputPixels:16777216,failOn:'warning',pages:1});const meta=await image.metadata();
 if(meta.format!==({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'})[mime]||!meta.width||!meta.height||meta.width>8192||meta.height>8192||meta.width*meta.height>16777216||(meta.pages||1)!==1)throw 0;
 await image.stats();result={width:meta.width,height:meta.height,duration:null};
}else{
 let position=0,boxes=0,moov=0,ftyp=0;const ranges=[];
 while(position<stat.size){if(++boxes>10000||stat.size-position<8)throw 0;const h=Buffer.alloc(16);fs.readSync(3,h,0,Math.min(16,stat.size-position),position);let size=h.readUInt32BE(0),head=8;const type=h.toString('ascii',4,8);if(size===1){const big=h.readBigUInt64BE(8);if(big>BigInt(stat.size))throw 0;size=Number(big);head=16;}if(size<head||position+size>stat.size||!['ftyp','moov','mdat','free'].includes(type))throw 0;
 if(type==='ftyp'){if(position!==0||size<16||size>256||ftyp++)throw 0;const b=Buffer.alloc(size);fs.readSync(3,b,0,size,position);if(!['isom','iso2','mp41','mp42','avc1'].includes(b.toString('ascii',8,12)))throw 0;}
 if(type==='moov'&&++moov>1)throw 0;if(type==='mdat')ranges.push([position+head,position+size]);position+=size;
 }
 if(ftyp!==1||moov!==1||!ranges.length)throw 0;
 const{createFile}=req('mp4box');const file=createFile(false);let info,failed=false;file.onError=()=>{failed=true;};file.onReady=value=>{info=value;};
 for(let offset=0;offset<stat.size;){const b=Buffer.alloc(Math.min(65536,stat.size-offset));fs.readSync(3,b,0,b.length,offset);const a=b.buffer.slice(b.byteOffset,b.byteOffset+b.length);a.fileStart=offset;file.appendBuffer(a);offset+=b.length;}file.flush();
 if(failed||!info||info.isFragmented||info.videoTracks.length!==1||info.tracks.length>2||info.audioTracks.length!==info.tracks.length-1||!/^avc1\./.test(info.videoTracks[0].codec)||info.audioTracks.some(t=>!/^mp4a\./.test(t.codec))||info.tracks.some(t=>!(/^(avc1\.|mp4a\.)/.test(t.codec))))throw 0;
 const v=info.videoTracks[0],duration=info.duration/info.timescale;if(!Number.isFinite(duration)||duration<=0||duration>600||!v.video||v.video.width<1||v.video.height<1||v.video.width>3840||v.video.height>2160)throw 0;
 for(const track of info.tracks){const structure=file.getTrackById(track.id),refs=structure?.mdia?.minf?.dinf?.dref?.entries,entries=structure?.mdia?.minf?.stbl?.stsd?.entries;if(!refs||refs.length!==1||refs[0].type!=='url '||refs[0].flags!==1||refs[0].location||!entries?.length||entries.some(e=>e.data_reference_index!==1))throw 0;const samples=file.getTrackSamplesInfo(track.id);if(!samples.length||samples.length>100000||samples.some(s=>!Number.isSafeInteger(s.offset)||!Number.isSafeInteger(s.size)||s.size<1||!ranges.some(([a,b])=>s.offset>=a&&s.offset+s.size<=b)))throw 0;}
 result={width:v.video.width,height:v.video.height,duration:Math.ceil(duration*1000)};
}
process.stdout.write(JSON.stringify(result));})().catch(()=>{process.exitCode=1;});`;
const metadata=z.object({width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192),duration:z.number().int().positive().max(600000).nullable()}).strict().refine((v)=>v.width*v.height<=16777216);
export async function inspectMedia(handle:FileHandle,mime:string){
 const child=spawn(process.execPath,['--max-old-space-size=96','--eval',program,mime],{stdio:['ignore','pipe','ignore',handle.fd],windowsHide:true,env:{NODE_ENV:'production',TZ:'UTC'}});
 let output='';const timer=setTimeout(()=>child.kill('SIGKILL'),10000);
 try{return await new Promise<z.infer<typeof metadata>>((resolve,reject)=>{
  const fail=()=>reject(new MediaError(400,'Media could not be safely validated. Use a supported, intact file.'));
  child.stdout!.on('data',(chunk:Buffer)=>{output+=chunk.toString('utf8');if(Buffer.byteLength(output)>2048)child.kill('SIGKILL');});child.on('error',fail);
  child.on('close',(code)=>{if(code!==0){fail();return;}try{resolve(metadata.parse(JSON.parse(output)));}catch{fail();}});
 });}finally{clearTimeout(timer);if(child.exitCode===null)child.kill('SIGKILL');}
}
