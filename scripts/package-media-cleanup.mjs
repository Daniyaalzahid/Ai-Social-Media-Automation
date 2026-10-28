import { readFile, writeFile, mkdir, copyFile, realpath, mkdtemp, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import nft from 'next/dist/compiled/@vercel/nft/index.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const entry='scripts/media-cleanup.mjs', output=path.join(root,'.next/standalone');
function inside(file){const relative=path.relative(root,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
function permitted(file){
 if(!inside(file)||/^\.env(?:\.|$)/.test(path.basename(file)))return false;
 const relative=path.relative(root,file);
 return relative==='package.json'||relative===entry||relative.startsWith('src'+path.sep)||relative.startsWith('node_modules'+path.sep);
}
function compile(text,file,rewrite){
 const result=ts.transpileModule(text,{fileName:file,reportDiagnostics:true,compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,allowJs:true,
  rewriteRelativeImportExtensions:rewrite,sourceMap:false,inlineSourceMap:false,
 }});
 if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw new Error('Cleanup compilation failed');
 return result.outputText;
}
let isolated;
try{
 await stat(path.join(output,'server.js')); // A completed standalone build is mandatory.
 const trace=await nft.nodeFileTrace([path.join(root,entry)],{
  base:root,processCwd:root,
  readFile:async file=>{
   if(!permitted(file))return null;
   try{const text=await readFile(file,'utf8');return file.endsWith('.ts')&&!file.endsWith('.d.ts')?compile(text,file,false):text;}
   catch(error){if(error.code==='ENOENT'||error.code==='EISDIR')return null;throw error;}
  },
 });
 for(const warning of trace.warnings){
  // mysql2's optional syntax highlighter is guarded by try/catch in helpers.js.
  // It is not installed or used by this non-debug connection. No other missing
  // dependency or parse warning is accepted.
  const message=String(warning.message);
  if(!message.startsWith('Failed to resolve dependency "cardinal":\n')||!message.endsWith(' loaded from '+path.join(root,'node_modules/mysql2/lib/helpers.js')))throw new Error('Incomplete cleanup dependency trace');
 }
 const hashes={};
 for(const relative of [...trace.fileList].sort()){
  const source=path.resolve(root,relative);
  if(!permitted(source)||!inside(await realpath(source)))throw new Error('Unsafe cleanup trace path');
  const application=!relative.startsWith('node_modules'+path.sep)&&(relative.endsWith('.ts')||relative===entry);
  const destination=application?relative.replace(/\.ts$/,'.js'):relative;
  const target=path.join(output,destination);await mkdir(path.dirname(target),{recursive:true});
  if(application)await writeFile(target,compile(await readFile(source,'utf8'),source,true));
  else await copyFile(source,target);
  hashes[destination]=createHash('sha256').update(await readFile(target)).digest('hex');
 }
 if(!hashes[entry]||!hashes['node_modules/kysely/package.json']||!hashes['node_modules/mysql2/package.json'])throw new Error('Required cleanup dependencies missing');
 const manifest={version:1,files:Object.keys(hashes).map(file=>path.relative('scripts',file)),sha256:hashes};
 await writeFile(path.join(output,'scripts/media-cleanup.nft.json'),JSON.stringify(manifest,null,2)+'\n');
 // Verify actual emitted files outside the checkout. Neither source node_modules,
 // NODE_PATH, NODE_OPTIONS nor build-time credentials can satisfy this execution.
 isolated=await mkdtemp(path.join(tmpdir(),'bsa-cleanup-artifact-'));
 for(const file of Object.keys(hashes)){
  const target=path.join(isolated,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(output,file),target);
 }
 const check=spawnSync(process.execPath,[entry,'--environment=production'],{
  cwd:isolated,env:{NODE_ENV:'production',APP_ENV:'production'},encoding:'utf8',timeout:30000,
 });
 if(check.status!==1||check.stdout!==''||check.stderr.trim()!=='Media cleanup unavailable; check private configuration and storage permissions.')throw new Error('Cleanup artifact import/admission verification failed');
 console.log(`Cleanup artifact packaged and isolated import/admission verified (${Object.keys(hashes).length} traced runtime files).`);
}catch{
 console.error('Cleanup artifact packaging failed; standalone deployment must not be published.');process.exitCode=1;
}finally{if(isolated)await rm(isolated,{recursive:true,force:true});}
