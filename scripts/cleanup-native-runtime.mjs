import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Resolve using the installed package's own loader, not NFT's prediction. No
// ARGON2_PREBUILD, npm_config_arch, LIBC or other build-environment overrides.
export function resolveCleanupNativeRuntime(root,files){
 if(!files.has('node_modules/argon2/package.json'))return [];
 const check=spawnSync(process.execPath,['--input-type=commonjs','-e',
  "const path=require('node:path');const{createRequire}=require('node:module');const req=createRequire(path.resolve('node_modules/argon2/package.json'));process.stdout.write(req('node-gyp-build').path(path.resolve('node_modules/argon2')));"],
  {cwd:root,env:{},encoding:'utf8',timeout:15000});
 if(check.status!==0)throw new Error('Cleanup native runtime resolution failed');
 const relative=path.relative(root,check.stdout);
 if(!/^node_modules\/argon2\/(?:prebuilds\/[a-z0-9_-]+\/[a-z0-9_.-]+|build\/(?:Release|Debug)\/[a-z0-9_.-]+)\.node$/.test(relative))throw new Error('Unsafe cleanup native runtime path');
 // Include only the binary actually selected on this build platform. Preserve
 // its package-relative path so node-gyp-build resolves it unchanged at runtime.
 for(const file of files)if(file.startsWith('node_modules/argon2/')&&file.endsWith('.node'))files.delete(file);
 files.add(relative);
 return [{package:'argon2',file:relative,platform:process.platform,arch:process.arch}];
}

// stderr stays internal. Export only a known package-relative native path and
// fixed loader categories, never arbitrary paths, symbols or exception text.
export function cleanupNativeFailure(stderr,files){
 if(typeof stderr!=='string'||!stderr.includes('ERR_DLOPEN_FAILED'))return {};
 const native=[...files].filter(file=>file.endsWith('.node')&&stderr.includes('/'+file));
 const reasons=[[/failed to map segment|Operation not permitted/i,'mapping-denied'],[/file too short/i,'truncated-binary'],[/invalid ELF header/i,'invalid-elf'],[/wrong ELF class|Exec format error/i,'architecture-mismatch'],[/version [`'][A-Za-z0-9_.]+['`] not found/,'runtime-library-version'],[/cannot open shared object file/,'shared-library-unavailable'],[/undefined symbol/,'unresolved-symbol'],[/NODE_MODULE_VERSION/,'node-abi-mismatch']];
 const nativeReason=reasons.find(([pattern])=>pattern.test(stderr))?.[1]??'native-load-failed';
 // These are the reviewed system dependencies of the installed Linux addon.
 const library=['libstdc++.so.6','libgcc_s.so.1','libc.so.6','libm.so.6'].find(name=>stderr.includes(name+':'));
 return {nativeFile:native.length===1?native[0]:undefined,nativeReason,library};
}
