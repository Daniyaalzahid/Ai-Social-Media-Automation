import { generate } from 'otplib';
import { sql } from 'kysely';
import { test,expect } from './secure-test';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { publishingDestination } from '../helpers/publishing-fixtures';
import { imageFixture } from '../helpers/media-fixtures';
import { CREATIVE } from '../../src/server/ai/policy';
const fixture=()=>JSON.parse(process.env.BSA_BROWSER_FIXTURE??'{}');
let owner:{id:string;email:string;secret:string};
let destinations:string[]=[];
test.beforeAll(async()=>{
 const config=resolveDatabaseConfiguration(process.env,'migration');if(config.mode!=='development'||config.database!=='bsa_dev_browser_tests')throw new Error('Isolated browser database required');
 owner=fixture().teamUsers.find((u:{role:string})=>u.role==='OWNER');const handle=createDatabase(config);
 try{
  await handle.db.updateTable('social_destinations').set({active:0}).where('provider','=','META').execute();
  const facebook=await publishingDestination(handle.db,owner.id),instagram=await publishingDestination(handle.db,owner.id);destinations=[facebook.destination,instagram.destination];
  await handle.db.updateTable('social_destinations').set({display_name:'Composer Facebook'}).where('id','=',facebook.destination).execute();
  await handle.db.updateTable('social_destinations').set({display_name:'Composer Instagram',kind:'INSTAGRAM_PROFESSIONAL'}).where('id','=',instagram.destination).execute();
 }finally{await handle.close();}
});
test.afterAll(async()=>{
 const h=createDatabase(resolveDatabaseConfiguration(process.env,'migration'));
 try{await h.db.updateTable('social_destinations').set({active:0}).where('id','in',destinations).execute();}finally{await h.close();}
});
async function freshCode(){const wait=30000-Date.now()%30000+1000;await new Promise(resolve=>setTimeout(resolve,wait));return generate({secret:owner.secret});}
test('real login → composer → private upload → multi-channel publishing preserves partial results and security',async({page,context})=>{
 test.setTimeout(180000);let phase='login';const statuses:{method:string;route:string;status:number}[]=[];
 page.on('response',r=>{const route=new URL(r.url()).pathname;if(['/api/content','/api/publishing','/api/media'].includes(route))statuses.push({method:r.request().method(),route,status:r.status()});});
 try{
  await page.goto('/login');await page.getByLabel('Work email').fill(owner.email);await page.getByLabel('Password',{exact:true}).fill(fixture().password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Authenticator code').fill(await generate({secret:owner.secret}));await page.getByRole('button',{name:'Verify and sign in'}).click();await expect(page).toHaveURL(/\/overview$/);
  phase='composer';await page.getByRole('link',{name:'Create Post',exact:true}).first().click();await expect(page).toHaveURL(/\/create-post$/);
  await page.getByRole('button',{name:'Select All'}).click();await expect(page.getByRole('checkbox',{name:/Composer Facebook/})).toBeChecked();await expect(page.getByRole('checkbox',{name:/Composer Instagram/})).toBeChecked();
  phase='upload';await page.getByLabel('Upload Media').setInputFiles({name:'composer.png',mimeType:'image/png',buffer:await imageFixture()});await expect(page.getByAltText('composer.png')).toBeVisible();expect(await page.getByAltText('composer.png').evaluate(e=>(e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  phase='caption';await page.getByText('Post details & authorized campaign facts').click();await page.getByRole('form',{name:'Content composer'}).getByLabel('Language',{exact:true}).selectOption('ENGLISH');await page.getByLabel('Caption',{exact:true}).fill(CREATIVE.ENGLISH.FACEBOOK[0]!);await page.getByText('Customize for each channel',{exact:true}).click();await page.getByLabel('Instagram caption',{exact:true}).fill(CREATIVE.ENGLISH.INSTAGRAM[0]!);
  phase='post-now';await page.getByRole('button',{name:'Post Now',exact:true}).dblclick();const dialog=page.getByRole('dialog',{name:'Confirm publication'});await expect(dialog).toBeVisible();await expect(page.locator('.composer-results h2')).toHaveText('Ready to confirm');
  phase='facebook-confirm';await dialog.getByLabel('Password',{exact:true}).fill(fixture().password);await dialog.getByLabel('Authenticator code').fill(await freshCode());await dialog.getByRole('button',{name:'Confirm and publish'}).click();await expect(page.getByRole('region',{name:'Channel results'}).locator('article').filter({hasText:'Facebook'}).getByText('Published',{exact:true})).toBeVisible();
  phase='instagram-confirm';await page.getByRole('button',{name:'Continue confirmation'}).click();await expect(dialog.getByText(/Publish the exact approved caption and media to Instagram/)).toBeVisible();await dialog.getByLabel('Password',{exact:true}).fill(fixture().password);await dialog.getByLabel('Authenticator code').fill(await freshCode());await dialog.getByRole('button',{name:'Confirm and publish'}).click();await expect(dialog).not.toBeVisible();
  const results=page.getByRole('region',{name:'Channel results'});await expect(results.getByRole('heading',{name:'Partially Published'})).toBeVisible();await expect(results.locator('article').filter({hasText:'Facebook'}).getByText('Published',{exact:true})).toBeVisible();await expect(results.getByText('Failed',{exact:true})).toBeVisible();expect(page.url()).toMatch(/\/create-post$/);
  phase='database-proof';const h=createDatabase(resolveDatabaseConfiguration(process.env,'migration'));try{
   const items=await h.db.selectFrom('content_items').select('id').where('created_by','=',owner.id).execute();expect(items.length).toBe(1);
   const ops=await h.db.selectFrom('publish_snapshots as s').innerJoin('publish_operations as o','o.id','s.id').select(['o.state','s.platform']).where('s.post_id','=',items[0]!.id).execute();expect(ops).toHaveLength(2);expect(ops.find(o=>o.platform==='FACEBOOK')?.state).toBe('PUBLISHED');expect(ops.find(o=>o.platform==='INSTAGRAM')?.state).toBe('FAILED');
   expect((await sql<{count:number}>`SELECT COUNT(*) AS count FROM content_decisions WHERE post_id=${items[0]!.id} AND decision='APPROVED'`.execute(h.db)).rows[0]!.count).toBe(1);
  }finally{await h.close();}
  expect(statuses.filter(s=>s.route==='/api/media'&&s.method==='POST').every(s=>s.status===201)).toBe(true);
  expect((await context.request.get('/api/publishing?postId=invalid')).status()).toBe(400);
 }catch(error){console.info('Composer browser diagnostic',JSON.stringify({phase,statuses}));throw error;}
});
test('shared media preview supports replace/remove and real AI generation remains editable on the same screen',async({page,context})=>{
 test.setTimeout(60000);const actor=fixture().teamUsers.find((u:{role:string})=>u.role==='CONTENT_CREATOR');await context.addCookies([{name:'__Host-bsa-session',value:actor.token,domain:'localhost',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
 await page.goto('/create-post');await page.setViewportSize({width:375,height:900});await page.getByText('Post details & authorized campaign facts').click();await page.getByRole('form',{name:'Content composer'}).getByLabel('Language',{exact:true}).selectOption('ENGLISH');
 await page.getByLabel('Upload Media').setInputFiles({name:'first.png',mimeType:'image/png',buffer:await imageFixture()});await expect(page.getByAltText('first.png')).toBeVisible();
 await page.getByLabel('Upload Media').setInputFiles({name:'second.jpg',mimeType:'image/jpeg',buffer:await imageFixture('jpeg')});await expect(page.getByAltText('second.jpg')).toBeVisible();await expect(page.getByAltText('first.png')).toHaveCount(0);
 await page.getByRole('button',{name:'Remove from post'}).click();await expect(page.getByAltText('second.jpg')).toHaveCount(0);
 await page.getByRole('button',{name:'Generate with AI',exact:true}).click();await expect(page.getByLabel('Caption',{exact:true})).toHaveValue(CREATIVE.ENGLISH.FACEBOOK[1]!);await page.getByLabel('Caption',{exact:true}).fill('My edited generated caption');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Draft saved. Nothing has been published.',{exact:true})).toBeVisible();await expect(page).toHaveURL(/\/create-post$/);
 for(const width of [320,375,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:375,height:900});await page.getByRole('button',{name:'Open navigation'}).click();const navDialog=page.getByRole('dialog',{name:'Bismillah Social AI'});await navDialog.getByRole('link').last().focus();await page.keyboard.press('Tab');await expect(navDialog.getByText('More',{exact:true})).toBeFocused();await page.keyboard.press('Space');await expect(navDialog.getByRole('link',{name:'Media',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 const h=createDatabase(resolveDatabaseConfiguration(process.env,'migration'));try{
  const post=await h.db.selectFrom('content_items').select('id').where('created_by','=',actor.id).orderBy('created_at','desc').executeTakeFirstOrThrow();
  const revision=await h.db.selectFrom('content_revisions').select(['source','generation_id']).where('post_id','=',post.id).orderBy('sequence','desc').executeTakeFirstOrThrow();expect(revision.source).toBe('AI_EDITED');expect(revision.generation_id).not.toBeNull();
 }finally{await h.close();}
});
