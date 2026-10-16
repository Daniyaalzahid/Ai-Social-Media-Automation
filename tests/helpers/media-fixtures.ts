import sharp from 'sharp';
export async function imageFixture(format:'jpeg'|'png'|'webp'='png',width=2,height=2){return sharp({create:{width,height,channels:3,background:{r:12,g:34,b:56}}}).toFormat(format).toBuffer();}
export const mediaStream=(data:Uint8Array)=>new ReadableStream<Uint8Array>({start(controller){controller.enqueue(data);controller.close();}});
// Public synthetic 16x16 black H.264 frame and AVC configuration produced locally
// with Chromium WebCodecs. No people, business data, FFmpeg or binary asset.
const description=Buffer.from('0142d00bffe1000f6742d00b8c69c9b80868083c2211a801000468ce3c80','hex');
const sample=Buffer.from('0000000e65b8000409fffff87a2800082ffc','hex');
const u32=(...values:number[])=>{const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeUInt32BE(v,i*4));return b;};
const box=(type:string,...parts:Uint8Array[])=>{const data=Buffer.concat(parts);return Buffer.concat([u32(data.length+8),Buffer.from(type),data]);};
const matrix=()=>u32(65536,0,0,0,65536,0,0,0,1073741824);
export function videoFixture(){
 const ftyp=box('ftyp',Buffer.from('isom'),u32(512),Buffer.from('isomiso2avc1mp41'));
 const mvhd=Buffer.alloc(100);u32(0,0,0,1000,1000,65536).copy(mvhd);mvhd.writeUInt16BE(256,24);matrix().copy(mvhd,36);mvhd.writeUInt32BE(2,96);
 const tkhd=Buffer.alloc(84);u32(7,0,0,1,0,1000).copy(tkhd);matrix().copy(tkhd,40);tkhd.writeUInt32BE(16*65536,76);tkhd.writeUInt32BE(16*65536,80);
 const entry=Buffer.alloc(78);entry.writeUInt16BE(1,6);entry.writeUInt16BE(16,24);entry.writeUInt16BE(16,26);entry.writeUInt32BE(72*65536,28);entry.writeUInt32BE(72*65536,32);entry.writeUInt16BE(1,40);entry.writeUInt16BE(24,74);entry.writeInt16BE(-1,76);
 const moov=(offset:number)=>box('moov',box('mvhd',mvhd),box('trak',box('tkhd',tkhd),box('mdia',box('mdhd',u32(0,0,0,1000,1000),Buffer.alloc(4)),box('hdlr',u32(0,0),Buffer.from('vide'),Buffer.alloc(13)),box('minf',box('vmhd',u32(1),Buffer.alloc(8)),box('dinf',box('dref',u32(0,1),box('url ',u32(1)))),box('stbl',box('stsd',u32(0,1),box('avc1',entry,box('avcC',description))),box('stts',u32(0,1,1,1000)),box('stsc',u32(0,1,1,1,1)),box('stsz',u32(0,sample.length,1)),box('stco',u32(0,1,offset)))))));
 const movie=moov(ftyp.length+moov(0).length+8);return Buffer.concat([ftyp,movie,box('mdat',sample)]);
}
