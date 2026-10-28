// Build diagnostics intentionally project only fixed reasons and reviewed paths.
// Never log an Error object, raw message/stack, process environment or child output.
const stages=new Set(['standalone-check','compiler-load','nft-load','nft-trace','trace-warning-validation','dependency-copy','native-resolution','manifest','isolated-verification','cleanup-finalization']);
const names=new Set(['Error','TypeError','SyntaxError','RangeError','ReferenceError','AggregateError']);
const codes=new Set(['ENOENT','EACCES','EPERM','EISDIR','ENOTDIR','ENOSPC','EMFILE','ETIMEDOUT','EAGAIN','ENOSYS','ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND','ERR_PACKAGE_PATH_NOT_EXPORTED','ERR_DLOPEN_FAILED']);
const messages=new Set(['Cleanup compilation failed','Incomplete cleanup dependency trace','Unsafe cleanup trace path','Required cleanup dependencies missing','Cleanup artifact import/admission verification failed','Cleanup native runtime resolution failed','Unsafe cleanup native runtime path','Standalone output not found','Standalone output is ambiguous']);
function field(value,key){
 for(let depth=0;value&&typeof value==='object'&&depth<3;depth++,value=Object.getPrototypeOf(value)){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(descriptor)return 'value'in descriptor?descriptor.value:undefined;
 }
}
function moduleName(value,allowed){
 if(typeof value!=='string'||value.length>200||!/^(?:@[A-Za-z0-9_-]+\/)?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_./-]+)*$/.test(value))return undefined;
 const name=value.split('/').slice(0,value.startsWith('@')?2:1).join('/');
 return allowed.has(name)?name:undefined;
}
export function cleanupPackagerDiagnostic(stage,error,context={}){
 try{
  const name=field(error,'name'),code=field(error,'code')??context.code,message=field(error,'message');
  const allowed=context.modules??new Set(['typescript','next','kysely','mysql2']);
  const missing=typeof message==='string'?/Cannot find (?:package|module) ['"]([^'"\r\n]+)['"]/.exec(message)?.[1]:undefined;
  const module=moduleName(context.module??missing,allowed);
  const reason=messages.has(message)?message:code==='ENOENT'||code==='ERR_MODULE_NOT_FOUND'||code==='MODULE_NOT_FOUND'?'Required file or module unavailable':'Build operation failed; raw details withheld';
  let file=context.file;
  if(typeof file!=='string'||file.length>240||file.includes('..'+ '/')||! /^(?:\.next\/standalone(?:\/[A-Za-z0-9_./-]+)?|scripts\/[A-Za-z0-9_.-]+|src\/[A-Za-z0-9_./-]+|node_modules\/(?:@[A-Za-z0-9_-]+\/)?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_./-]+)*|package(?:-lock)?\.json)$/.test(file)||/^\.env(?:\.|$)/.test(file.split('/').at(-1)))file=undefined;
  const line=['CLEANUP_PACKAGER_ERROR',`stage=${stages.has(stage)?stage:'unavailable'}`,`name=${names.has(name)?name:'Error'}`,`message=${JSON.stringify(reason)}`];
  if(['unresolved-dependency','parse-failure','other-trace-warning'].includes(context.warning))line.push(`warning=${context.warning}`);
  if(codes.has(code))line.push(`code=${code}`);
  if(module)line.push(`module=${module}`);
  if(file)line.push(`file=${file}`);
  if(typeof context.nativeFile==='string'&&/^node_modules\/argon2\/(?:prebuilds\/[a-z0-9_-]+\/[a-z0-9_.-]+|build\/(?:Release|Debug)\/[a-z0-9_.-]+)\.node$/.test(context.nativeFile))line.push(`native=${context.nativeFile}`);
  if(['mapping-denied','truncated-binary','invalid-elf','architecture-mismatch','runtime-library-version','shared-library-unavailable','unresolved-symbol','node-abi-mismatch','native-load-failed'].includes(context.nativeReason))line.push(`loader=${context.nativeReason}`);
  if(['libstdc++.so.6','libgcc_s.so.1','libc.so.6','libm.so.6'].includes(context.library))line.push(`library=${context.library}`);
  if(context.childName&&names.has(context.childName))line.push(`childName=${context.childName}`);
  if(Number.isInteger(context.childStatus))line.push(`childStatus=${context.childStatus}`);
  if(Array.isArray(context.diagnostics)&&context.diagnostics.every(value=>Number.isInteger(value)&&value>0&&value<100000))line.push(`diagnostics=${context.diagnostics.slice(0,8).join(',')}`);
  return line.join(' ');
 }catch{return 'CLEANUP_PACKAGER_ERROR stage=unavailable name=Error message="Diagnostic details withheld"';}
}
