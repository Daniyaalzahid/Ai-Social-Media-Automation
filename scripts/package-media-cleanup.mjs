import { readFile, writeFile, mkdir, copyFile, realpath, mkdtemp, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cleanupPackagerDiagnostic } from './cleanup-packager-diagnostics.mjs';
let ts,nft,stage='standalone-check',context={};
const diagnosticModules=new Set(['typescript','next','kysely','mysql2','cardinal']);

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
 if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error)){context.diagnostics=result.diagnostics.map(d=>d.code);throw new Error('Cleanup compilation failed');}
 return result.outputText;
}
let isolated;
try{
 // Package names are public metadata; never forward raw trace messages/paths.
 try{const lock=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));for(const key of Object.keys(lock.packages??{})){const name=key.split('node_modules/').at(-1);if(name)diagnosticModules.add(name);}}catch{/* Fall back to the fixed critical-module list. */}
 context={file:'.next/standalone/server.js'};
 await stat(path.join(output,'server.js')); // A completed standalone build is mandatory.
 stage='compiler-load';context={module:'typescript'};ts=(await import('typescript')).default;
 stage='nft-load';context={module:'next'};nft=(await import('next/dist/compiled/@vercel/nft/index.js')).default;
 stage='nft-trace';context={file:entry};
 const trace=await nft.nodeFileTrace([path.join(root,entry)],{
  base:root,processCwd:root,
  readFile:async file=>{
   if(!permitted(file))return null;
   try{const text=await readFile(file,'utf8');return file.endsWith('.ts')&&!file.endsWith('.d.ts')?compile(text,file,false):text;}
   catch(error){if(error.code==='ENOENT'||error.code==='EISDIR')return null;throw error;}
  },
 });
 stage='trace-warning-validation';
 for(const warning of trace.warnings){
  // mysql2's optional syntax highlighter is guarded by try/catch in helpers.js.
  // It is not installed or used by this non-debug connection. No other missing
  // dependency or parse warning is accepted.
  const message=String(warning.message);
  context={module:/Failed to resolve dependency "([^"]+)"/.exec(message)?.[1],warning:message.startsWith('Failed to resolve dependency')?'unresolved-dependency':message.startsWith('Failed to parse')?'parse-failure':'other-trace-warning'};
  const importer=/(?:loaded from |Failed to parse )([^\r\n]+?)(?: as module:|$)/.exec(message)?.[1];
  if(importer&&inside(path.resolve(importer)))context.file=path.relative(root,importer);
  if(!message.startsWith('Failed to resolve dependency "cardinal":\n')||!message.endsWith(' loaded from '+path.join(root,'node_modules/mysql2/lib/helpers.js')))throw new Error('Incomplete cleanup dependency trace');
 }
 const hashes={};stage='dependency-copy';
 for(const relative of [...trace.fileList].sort()){
  const source=path.resolve(root,relative);context={file:relative};
  if(!permitted(source)||!inside(await realpath(source)))throw new Error('Unsafe cleanup trace path');
  const application=!relative.startsWith('node_modules'+path.sep)&&(relative.endsWith('.ts')||relative===entry);
  const destination=application?relative.replace(/\.ts$/,'.js'):relative;
  const target=path.join(output,destination);await mkdir(path.dirname(target),{recursive:true});
  if(application)await writeFile(target,compile(await readFile(source,'utf8'),source,true));
  else await copyFile(source,target);
  hashes[destination]=createHash('sha256').update(await readFile(target)).digest('hex');
 }
 if(!hashes[entry]||!hashes['node_modules/kysely/package.json']||!hashes['node_modules/mysql2/package.json'])throw new Error('Required cleanup dependencies missing');
 stage='manifest';context={file:'scripts/media-cleanup.nft.json'};
 const manifest={version:1,files:Object.keys(hashes).map(file=>path.relative('scripts',file)),sha256:hashes};
 await writeFile(path.join(output,'scripts/media-cleanup.nft.json'),JSON.stringify(manifest,null,2)+'\n');
 // Verify actual emitted files outside the checkout. Neither source node_modules,
 // NODE_PATH, NODE_OPTIONS nor build-time credentials can satisfy this execution.
 stage='isolated-verification';context={file:entry};
 isolated=await mkdtemp(path.join(tmpdir(),'bsa-cleanup-artifact-'));
 for(const file of Object.keys(hashes)){
  const target=path.join(isolated,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(output,file),target);
 }
 const check=spawnSync(process.execPath,[entry,'--environment=production'],{
  cwd:isolated,env:{NODE_ENV:'production',APP_ENV:'production'},encoding:'utf8',timeout:30000,
 });
 context.childStatus=check.status;
 context.code=check.error?.code??/\b(ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ERR_DLOPEN_FAILED|EACCES|EPERM|ETIMEDOUT)\b/.exec(check.stderr??'')?.[1];
 context.childName=/\b(TypeError|SyntaxError|ReferenceError|RangeError|Error):/.exec(check.stderr??'')?.[1];
 const missing=/Cannot find (?:package|module) ['"]([^'"\r\n]+)['"]/.exec(check.stderr??'')?.[1];
 context.module=missing;
 if(missing&&path.isAbsolute(missing)){const relative=path.relative(isolated,missing);if(relative!==''&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))context.file=relative;}
 if(check.status!==1||check.stdout!==''||check.stderr.trim()!=='Media cleanup unavailable; check private configuration and storage permissions.')throw new Error('Cleanup artifact import/admission verification failed');
 console.log(`Cleanup artifact packaged and isolated import/admission verified (${Object.keys(hashes).length} traced runtime files).`);
}catch(error){
 console.error(cleanupPackagerDiagnostic(stage,error,{...context,modules:diagnosticModules}));
 console.error('Cleanup artifact packaging failed; standalone deployment must not be published.');process.exitCode=1;
}finally{if(isolated)try{await rm(isolated,{recursive:true,force:true});}catch(error){console.error(cleanupPackagerDiagnostic('cleanup-finalization',error));process.exitCode=1;}}
