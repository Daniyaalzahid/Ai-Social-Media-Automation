import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
// Node 24 can require this synchronous ESM diagnostic helper without introducing
// an application dependency or changing production compiler settings.
const {cleanupPackagerDiagnostic}=createRequire(import.meta.url)('../../scripts/cleanup-packager-diagnostics.mjs') as {
 cleanupPackagerDiagnostic(stage:string,error:unknown,context?:Record<string,unknown>):string;
};
it.each(['standalone-check','compiler-load','nft-load','nft-trace','trace-warning-validation','dependency-copy','manifest','isolated-verification'])('identifies packaging stage %s without raw exception details',stage=>{
 const line=cleanupPackagerDiagnostic(stage,new Error('PUBLIC_BUILD_DETAIL_CANARY'));
 expect(line).toContain('CLEANUP_PACKAGER_ERROR stage='+stage);expect(line).toContain('name=Error');
 expect(line).not.toContain('PUBLIC_BUILD_DETAIL_CANARY');expect(line).not.toContain('\n');
});
it('reports trusted missing paths/modules and filesystem codes',()=>{
 const missing=Object.assign(new Error("Cannot find package 'typescript' imported from /private/build/location"),{code:'ERR_MODULE_NOT_FOUND'});
 const compiler=cleanupPackagerDiagnostic('compiler-load',missing,{module:'typescript'});
 expect(compiler).toContain('module=typescript');expect(compiler).toContain('code=ERR_MODULE_NOT_FOUND');expect(compiler).not.toContain('/private/build/location');
 const file=cleanupPackagerDiagnostic('standalone-check',Object.assign(new Error('PRIVATE_PATH_CANARY'),{code:'ENOENT'}),{file:'.next/standalone/server.js'});
 expect(file).toContain('file=.next/standalone/server.js');expect(file).toContain('code=ENOENT');expect(file).not.toContain('PRIVATE_PATH_CANARY');
});
it('reports recognized failure reason, child class/status and numeric TS diagnostics',()=>{
 const line=cleanupPackagerDiagnostic('isolated-verification',new Error('Cleanup artifact import/admission verification failed'),{childStatus:1,childName:'SyntaxError',code:'ERR_MODULE_NOT_FOUND',module:'mysql2',diagnostics:[5097]});
 expect(line).toContain('message="Cleanup artifact import/admission verification failed"');expect(line).toContain('childName=SyntaxError');expect(line).toContain('childStatus=1');expect(line).toContain('module=mysql2');expect(line).toContain('diagnostics=5097');
});
it('never emits injected environment values, credentials, headers, tokens or raw child output',()=>{
 const url=new URL('mysql://localhost/private');url.username='synthetic';url.password='fixture';
 const canaries=[url.href,'PUBLIC_B2_ACCESS_CANARY','PUBLIC_B2_SECRET_CANARY','PUBLIC_SESSION_CANARY','PUBLIC_CSRF_CANARY','PUBLIC_MFA_CANARY','PUBLIC_ENVIRONMENT_CANARY'];
 for(const secret of canaries){
  const error={name:secret,message:secret,code:secret,stack:secret,cause:{secret},environment:{secret},headers:{Authorization:secret},stderr:secret};
  const line=cleanupPackagerDiagnostic(secret,error,{file:secret,module:secret,childName:secret,diagnostics:[secret]});
  expect(line).not.toContain(secret);expect(line).not.toContain('Authorization');expect(line).not.toContain('\n');
 }
 expect(cleanupPackagerDiagnostic('dependency-copy',new Error('secret'),{file:'src/.env.production'})).not.toContain('.env.production');
});
it('does not invoke unknown accessors or serialization hooks',()=>{
 let accessed=false;const getter=()=>{accessed=true;throw new Error('PUBLIC_GETTER_CANARY');};
 const error=Object.defineProperty({toJSON:getter,toString:getter},'message',{get:getter});
 expect(()=>cleanupPackagerDiagnostic('nft-trace',error)).not.toThrow();expect(accessed).toBe(false);
});

it.each(['standalone-check','compiler-load','nft-load','nft-trace','trace-warning-validation','dependency-copy','manifest','isolated-verification'])('real packager emits a sanitized %s failure in an isolated fixture',async stage=>{
 const {mkdtemp,mkdir,writeFile,copyFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const path=await import('node:path');const {spawnSync}=await import('node:child_process');
 const root=await mkdtemp(path.join(tmpdir(),'cleanup-packager-failure-'));
 const marker='PUBLIC_PACKAGER_FAILURE_CANARY';
 const put=async(file:string,text:string)=>{await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),text);};
 try{
  await mkdir(path.join(root,'scripts'),{recursive:true});
  for(const file of ['package-media-cleanup.mjs','cleanup-packager-diagnostics.mjs'])await copyFile(path.join('scripts',file),path.join(root,'scripts',file));
  if(stage!=='standalone-check')await put('.next/standalone/server.js','// Synthetic standalone fixture\n');
  if(!['standalone-check','compiler-load'].includes(stage)){
   await put('node_modules/typescript/package.json',JSON.stringify({type:'module',main:'index.js'}));
   await put('node_modules/typescript/index.js',"export default {ScriptTarget:{ES2022:9},ModuleKind:{ESNext:99},DiagnosticCategory:{Error:1},transpileModule(text){return {outputText:text,diagnostics:[]}}}");
  }
  if(!['standalone-check','compiler-load','nft-load'].includes(stage)){
   await put('node_modules/next/package.json',JSON.stringify({type:'module'}));
   const files=stage==='dependency-copy'?['src/missing.ts']:['scripts/media-cleanup.mjs','node_modules/kysely/package.json','node_modules/mysql2/package.json'];
   const implementation=stage==='nft-trace'?`throw new Error('${marker}');`:stage==='trace-warning-validation'?`return {fileList:new Set(),warnings:new Set([new Error('Failed to resolve dependency "kysely":\\n${marker}')])};`:`return {fileList:new Set(${JSON.stringify(files)}),warnings:new Set()};`;
   await put('node_modules/next/dist/compiled/@vercel/nft/index.js',`export default {async nodeFileTrace(){${implementation}}};`);
   if(['manifest','isolated-verification'].includes(stage)){
    await put('scripts/media-cleanup.mjs',`throw new Error('${marker}');`);
    for(const name of ['kysely','mysql2'])await put(`node_modules/${name}/package.json`,JSON.stringify({name}));
   }
   if(stage==='manifest')await mkdir(path.join(root,'.next/standalone/scripts/media-cleanup.nft.json'),{recursive:true});
  }
  const result=spawnSync(process.execPath,['scripts/package-media-cleanup.mjs'],{cwd:root,encoding:'utf8',timeout:15000,env:{NODE_ENV:'production',APP_ENV:'production',DATABASE_URL:marker,MEDIA_S3_SECRET_ACCESS_KEY:marker,SESSION_SECRET:marker}});
  expect(result.status).toBe(1);expect(result.stdout).toBe('');
  expect(result.stderr).toContain('CLEANUP_PACKAGER_ERROR stage='+stage);
  expect(result.stderr).toContain('Cleanup artifact packaging failed; standalone deployment must not be published.');
  expect(result.stderr).not.toContain(marker);expect(result.stderr).not.toContain('DATABASE_URL');
  if(stage==='compiler-load')expect(result.stderr).toContain('module=typescript');
  if(stage==='nft-load')expect(result.stderr).toContain('module=next');
  if(stage==='trace-warning-validation')expect(result.stderr).toContain('module=kysely');
  if(stage==='standalone-check')expect(result.stderr).toContain('code=ENOENT');
  if(stage==='isolated-verification')expect(result.stderr).toContain('childStatus=1');
 }finally{await rm(root,{recursive:true,force:true});}
});
