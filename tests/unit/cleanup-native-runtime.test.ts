import { createRequire } from 'node:module';
import { expect,it } from 'vitest';
const {resolveCleanupNativeRuntime,cleanupNativeFailure}=createRequire(import.meta.url)('../../scripts/cleanup-native-runtime.mjs') as {
 resolveCleanupNativeRuntime(root:string,files:Set<string>):{package:string;file:string;platform:string;arch:string}[];
 cleanupNativeFailure(stderr:string,files:string[]):Record<string,string>;
};
const binary='node_modules/argon2/prebuilds/linux-x64/argon2.glibc.node';
it('adds the actual installed native binary even when NFT omits it, without unrelated platforms',()=>{
 const files=new Set(['node_modules/argon2/package.json','node_modules/argon2/prebuilds/win32-x64/argon2.glibc.node']);
 const native=resolveCleanupNativeRuntime(process.cwd(),files);
 expect(native).toHaveLength(1);expect(native[0]).toMatchObject({package:'argon2',platform:process.platform,arch:process.arch});
 expect(files.has(native[0]!.file)).toBe(true);expect(files.has('node_modules/argon2/prebuilds/win32-x64/argon2.glibc.node')).toBe(false);
 const req=createRequire(import.meta.url);expect(()=>req(process.cwd()+'/'+native[0]!.file)).not.toThrow();
});
it.each([
 ['failed to map segment from shared object: Operation not permitted','mapping-denied'],
 ['file too short','truncated-binary'],['invalid ELF header','invalid-elf'],
 ['wrong ELF class','architecture-mismatch'],["version `GLIBCXX_3.4.29' not found",'runtime-library-version'],
 ['libstdc++.so.6: cannot open shared object file','shared-library-unavailable'],
 ['undefined symbol: PRIVATE_SYMBOL_CANARY','unresolved-symbol'],
 ['NODE_MODULE_VERSION 100','node-abi-mismatch'],['PRIVATE_LOADER_CANARY','native-load-failed'],
])('projects native loader failures safely: %s',(message,reason)=>{
 const result=cleanupNativeFailure(`Error: /private/build/${binary}: ${message}\ncode: 'ERR_DLOPEN_FAILED'`,[binary]);
 expect(result.nativeFile).toBe(binary);expect(result.nativeReason).toBe(reason);
 expect(JSON.stringify(result)).not.toContain('/private/build');expect(JSON.stringify(result)).not.toContain('PRIVATE_');
});
it('does not forward unrecognized native paths or arbitrary library names',()=>{
 expect(cleanupNativeFailure('secret.node ERR_DLOPEN_FAILED private.so: cannot open shared object file',[binary])).toEqual({nativeFile:undefined,nativeReason:'shared-library-unavailable',library:undefined});
 expect(cleanupNativeFailure('PRIVATE_CANARY',[binary])).toEqual({});
});
