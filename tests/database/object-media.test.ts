import { expect,it,vi,beforeAll,afterAll } from 'vitest';
import { sql } from 'kysely';
import { scratchDatabase,resetScratch } from './phase2b-helpers';
import { createMediaService } from '../../src/server/media/service';
import { PrivateObjectMediaStorage } from '../../src/server/media/object-storage';
import { contentActor } from '../helpers/content-fixtures';
import { imageFixture,mediaStream } from '../helpers/media-fixtures';
const fake=vi.hoisted(()=>({send:vi.fn(),objects:new Map<string,Buffer>(),calls:[] as {name:string;input:Record<string,unknown>}[]}));
vi.mock('@aws-sdk/client-s3',()=>{
 class Command{constructor(public input:Record<string,unknown>){}}
 class PutObjectCommand extends Command{}class GetObjectCommand extends Command{}class HeadObjectCommand extends Command{}class DeleteObjectCommand extends Command{}class ListObjectsV2Command extends Command{}
 return {S3Client:vi.fn(class{send=fake.send;}),PutObjectCommand,GetObjectCommand,HeadObjectCommand,DeleteObjectCommand,ListObjectsV2Command};
});
const env=()=>({APP_ENV:'production',NODE_ENV:'production',MEDIA_STORAGE_BACKEND:'s3',MEDIA_S3_ENDPOINT:'https://objects.example.com',MEDIA_S3_BUCKET:'private-fixture',MEDIA_S3_REGION:'reviewed-region',MEDIA_S3_ACCESS_KEY_ID:'fixture-access',MEDIA_S3_SECRET_ACCESS_KEY:'synthetic-private-storage-fixture'});
beforeAll(()=>{fake.objects.clear();fake.calls=[];fake.send.mockImplementation(async(command:{input:Record<string,unknown>;constructor:{name:string}})=>{
 const input=command.input,k=String(input.Key);fake.calls.push({name:command.constructor.name,input});
 switch(command.constructor.name){
 case 'PutObjectCommand':if(fake.objects.has(k))throw new Error('Synthetic collision');fake.objects.set(k,Buffer.from(input.Body as Buffer));return {};
 case 'GetObjectCommand':{const bytes=fake.objects.get(k);if(!bytes)throw new Error('Synthetic missing');return {ContentLength:bytes.length,Body:{transformToWebStream:()=>mediaStream(bytes)}};}
 case 'HeadObjectCommand':if(!fake.objects.has(k))throw Object.assign(new Error('Synthetic missing'),{name:'NotFound'});return {};
 case 'DeleteObjectCommand':fake.objects.delete(k);return {};
 case 'ListObjectsV2Command':return {Contents:[...fake.objects.keys()].map(Key=>({Key,LastModified:new Date(0)}))};
 default:throw new Error('Unexpected operation');}
 });});

const target=scratchDatabase('bsa_test_recovery'),db=target.handle.db,store=new PrivateObjectMediaStorage(env()),service=createMediaService(db,store);
beforeAll(()=>resetScratch(target));afterAll(()=>target.handle.close());
it('preserves authorized upload/read/delete and rejects another creator before object reads',async()=>{
 const actor=await contentActor(db),other=await contentActor(db),bytes=await imageFixture();const view=await service.upload(actor.raw,{name:'fixture.png',mime:'image/png'},mediaStream(bytes));
 const calls=fake.calls.length;await expect(service.binary(other.raw,view.id)).rejects.toThrow();expect(fake.calls.length).toBe(calls);
 const binary=await service.binary(actor.raw,view.id);try{expect(await binary.handle.readFile()).toEqual(bytes);}finally{await binary.handle.close();}
 await service.remove(actor.raw,view.id);expect((await db.selectFrom('media_assets').select('status').where('id','=',view.id).executeTakeFirstOrThrow()).status).toBe('deleted');await expect(service.binary(actor.raw,view.id)).rejects.toThrow();
});
it('rejects false MIME and reconciles failed object uploads without a public binary',async()=>{const actor=await contentActor(db);await expect(service.upload(actor.raw,{name:'fixture.png',mime:'image/png'},mediaStream(Buffer.from('<html>invalid</html>')))).rejects.toThrow();expect((await db.selectFrom('media_assets').select('status').where('created_by','=',actor.id).executeTakeFirstOrThrow()).status).toBe('deleted');});
it('cleans expired objects and preserves tracked active media',async()=>{const actor=await contentActor(db);const expired=await service.upload(actor.raw,{name:'fixture.png',mime:'image/png'},mediaStream(await imageFixture()));const active=await service.upload(actor.raw,{name:'active.png',mime:'image/png'},mediaStream(await imageFixture()));await sql`UPDATE media_assets SET created_at=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 2 DAY),expires_at=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 1 DAY) WHERE id=${expired.id}`.execute(db);expect((await service.cleanup()).failed).toBe(0);expect((await db.selectFrom('media_assets').select('status').where('id','=',expired.id).executeTakeFirstOrThrow()).status).toBe('deleted');const handle=(await service.binary(actor.raw,active.id)).handle;await handle.close();});
