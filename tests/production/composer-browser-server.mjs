// Disposable copy: replace ONLY server provider factories. All routes, session /
// MFA, content, approval, publishing, media and database code remain real.
import { cp,copyFile,mkdir,mkdtemp,readFile,writeFile,rm,symlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath,URL } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const url=new URL(process.env.DEV_DATABASE_URL??'');
if(process.env.APP_ENV!=='development'||url.pathname!=='/bsa_dev_browser_tests'||!['localhost','127.0.0.1'].includes(url.hostname)||decodeURIComponent(url.username)!=='bsa_dev_browser_runtime')throw new Error('Isolated browser database required');
const fixture=await mkdtemp(path.join(path.dirname(root),'.bsa-composer-browser-'));
let child;
try{
 for(const name of ['src','public'])await cp(path.join(root,name),path.join(fixture,name),{recursive:true});
 for(const name of ['package.json','tsconfig.json','tsconfig.build.json','tsconfig.typecheck.json','next-env.d.ts','next.config.ts','package-lock.json'])await copyFile(path.join(root,name),path.join(fixture,name));
 await symlink(path.join(root,'node_modules'),path.join(fixture,'node_modules'),'dir');
 const nextConfig=path.join(fixture,'next.config.ts');await writeFile(nextConfig,(await readFile(nextConfig,'utf8')).replace('const config: NextConfig = {','const config: NextConfig = { turbopack: { root: '+JSON.stringify(path.dirname(root))+' },'));

 await mkdir(path.join(fixture,'tests/helpers'),{recursive:true});
 for(const name of ['composer-provider-boundary.ts','ai-fixtures.ts','brand-review-fixtures.ts'])await copyFile(path.join(root,'tests/helpers',name),path.join(fixture,'tests/helpers',name));
 const publishing=path.join(fixture,'src/server/publishing/web.ts');let source=await readFile(publishing,'utf8');
 source="import { composerTestProviders } from '../../../tests/helpers/composer-provider-boundary';\n"+source.replace('new Map(productionPublishingProviders())','new Map(composerTestProviders())').replace("environment:process.env.NODE_ENV==='production'?'production':'development'","environment:'test'");await writeFile(publishing,source);
 const ai=path.join(fixture,'src/server/ai/web.ts');source=await readFile(ai,'utf8');source="import { FakeAiProvider } from '../../../tests/helpers/ai-fixtures';\n"+source.replace("model:process.env.OPENROUTER_MODEL??'unconfigured'","model:'test/model:free'").replace('new OpenRouterGenerationProvider(process.env)','new FakeAiProvider()');await writeFile(ai,source);
 child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','0.0.0.0','--port','3100'],{cwd:fixture,env:{...process.env,NODE_ENV:'development',APP_ENV:'development',OPENROUTER_API_KEY:'synthetic-browser-fixture-only',OPENROUTER_MODEL:'test/model:free'},stdio:'inherit'});
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});process.exitCode=code??1;
}finally{if(child&&!child.killed)child.kill('SIGTERM');await rm(fixture,{recursive:true,force:true});}
