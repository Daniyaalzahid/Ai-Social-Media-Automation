import { test } from 'node:test';
import { setTimeout, clearTimeout } from 'node:timers';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const next = path.join(repository, 'node_modules/next/dist/bin/next');
// No inherited application secrets, database URLs, provider configuration or
// private Next feature flags. Only the official generated server sets its config.
const environment = { PATH: process.env.PATH ?? '', NODE_ENV: 'production', APP_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
function launch(args, cwd, extra = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...environment, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const capture = chunk => { output = (output + chunk.toString()).slice(-65536); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  return { child, output: () => output };
}
async function unusedPort() {
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const address = socket.address(); assert(address && typeof address !== 'string');
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  return address.port;
}
async function standaloneEntry(root) {
  const candidates = [], queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && !['node_modules', '.next'].includes(entry.name)) queue.push(file);
      else if (entry.isFile() && entry.name === 'server.js') candidates.push(file);
    }
    assert(queue.length < 100, 'Unexpected standalone artifact layout');
  }
  assert.equal(candidates.length, 1, 'Exactly one generated standalone entrypoint is required');
  return candidates[0];
}

test('production guards preserve denial and access without experimental auth interrupts', { timeout: 180000 }, async () => {
  await mkdir(path.join(repository, '.cache'), { recursive: true });
  const root = await mkdtemp(path.join(repository, '.cache/production-runtime-'));
  let server;
  try {
    for (const name of ['next.config.ts', 'tsconfig.json', 'tsconfig.build.json']) {
      await writeFile(path.join(root, name), await readFile(path.join(repository, name)));
    }
    await writeFile(path.join(root, 'package.json'), '{"private":true,"type":"module"}\n');
    const put = async (file, text) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), text); };
    await put('src/app/layout.tsx', 'export default function Layout({children}:{children:React.ReactNode}) { return <html><body>{children}</body></html>; }');
    // Execute the real proxy and page guards. Only the database/session boundary
    // is synthetic here; full session/MFA/RBAC integration runs in DB/browser gates.
    for (const name of ['src/proxy.ts', 'src/server/authorization/web.ts', 'src/server/authorization/routes.ts', 'src/server/db/catalog.ts', 'src/pages/access-denied.tsx', 'src/pages/_app.tsx', 'src/components/status-page.tsx', 'src/components/brand.tsx', 'src/components/ui/icon.tsx', 'src/components/ui/button.tsx', 'src/lib/classes.ts', 'src/styles/globals.css', 'src/styles/tokens.css']) {
      await put(name, await readFile(path.join(repository, name), 'utf8'));
    }
    const authorization = await readFile(path.join(repository, 'src/server/authorization/authorization.ts'), 'utf8');
    const pureGuards = authorization.slice(authorization.indexOf('export class AuthorizationError'), authorization.indexOf('export async function requireAuthenticatedUser'));
    await put('src/server/authorization/authorization.ts', `import { PERMISSION_CODES, ROLE_PERMISSIONS, type PermissionCode, type RoleCode } from '../db/catalog';
${pureGuards.replace(/export async function validateCatalog[\s\S]*?\n}\n/, '')}
export async function authorizationContext(_db:unknown, raw:{reveal():string}):Promise<AuthorizationContext>{
 const role=raw.reveal()==='A'.repeat(43)?'OWNER':raw.reveal()==='V'.repeat(43)?'VIEWER':null;
 if(!role)throw new AuthorizationError(401);
 return {userId:'synthetic',sessionId:'synthetic',displayName:'Synthetic',role,permissions:ROLE_PERMISSIONS[role]};
}`);
    await put('src/server/db/client.ts', 'export function getDatabase(){return {};}');
    await put('src/server/security/sensitive.ts', 'export class SensitiveValue { constructor(private value:string){} reveal(){return this.value;} }');
    await put('src/server/auth/browser-security.ts', "export const SESSION_COOKIE='__Host-bsa-session'; export function browserConfiguration(_source:unknown){return {origin:'http://localhost'};}");
    await put('src/server/content/service.ts', 'export function createContentService(_db:unknown){return {get:async(_raw:unknown,_id:string|undefined)=>{}};}');
    await put('src/server/content/policy.ts', 'export class ContentError extends Error {status=404;}');
    for (const [route, guardedRoute] of [['overview', '/overview'], ['team', '/team'], ['late-denial', '/team']]) {
      await put(`src/app/${route}/page.tsx`, `import {requireRoute} from '../../server/authorization/web'; export const dynamic='force-dynamic'; export default async function Page(){await requireRoute('${guardedRoute}');return <h1>Authorized workspace marker</h1>;}`);
    }
    await put('src/app/missing/page.tsx', "import {notFound} from 'next/navigation'; export const dynamic='force-dynamic'; export default function Page(){notFound();}");
    await put('src/app/not-found.tsx', 'export default function Page(){return <h1>Production missing regression marker</h1>;}');
    const build = launch([next, 'build', root], root);
    const timeout = setTimeout(() => build.child.kill('SIGTERM'), 120000);
    const [code] = await once(build.child, 'exit'); clearTimeout(timeout);
    assert.equal(code, 0, 'Synthetic production runtime fixture must build successfully: ' + build.output());
    const artifact = JSON.parse(await readFile(path.join(root, '.next/required-server-files.json'), 'utf8'));
    assert.equal(artifact.config.output, 'standalone');
    assert.notEqual(artifact.config.experimental.authInterrupts, true);
    assert.notEqual(artifact.config.typescript.ignoreBuildErrors, true);
    const entry = await standaloneEntry(path.join(root, '.next/standalone'));
    const generated = await readFile(entry, 'utf8');
    assert(generated.includes('__NEXT_PRIVATE_STANDALONE_CONFIG'), 'Start the official generated entrypoint');
    const match = /const nextConfig = (.+)\n/.exec(generated);
    assert(match, 'Generated server must contain its serialized configuration');
    assert.notEqual(JSON.parse(match[1]).experimental.authInterrupts, true);
    const port = await unusedPort(), origin = `http://127.0.0.1:${port}`;
    server = launch([entry], path.dirname(entry), { HOSTNAME: '127.0.0.1', PORT: String(port), APP_URL: origin });
    const deadline = Date.now() + 30000;
    while (true) {
      assert(server.child.exitCode === null, 'Standalone server exited before readiness');
      try { await globalThis.fetch(origin + '/missing', { signal: globalThis.AbortSignal.timeout(1000) }); break; }
      catch { assert(Date.now() < deadline, 'Standalone readiness timed out'); await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    for (const headers of [{}, {rsc:'1'}, {rsc:'1','next-router-prefetch':'1','x-bsa-route':'/overview'}]) {
      for (const [token, status] of [[null,307], ['X'.repeat(43),307], ['V'.repeat(43),403], ['A'.repeat(43),200]]) {
        const options={redirect:'manual', headers:{...headers,...(token?{cookie:`__Host-bsa-session=${token}`}:{})},signal:globalThis.AbortSignal.timeout(5000)};
        let response = await globalThis.fetch(origin + '/team', options);
        // Production Next normalizes an admitted Flight request to its cache-key
        // URL. Follow that protocol redirect once, never an authorization redirect.
        if(status===200 && response.status===307 && response.headers.get('location')?.startsWith('/team?_rsc')) {
          const destination=new URL(response.headers.get('location'),origin);
          assert.equal(destination.origin,origin);assert.equal(destination.pathname,'/team');
          response=await globalThis.fetch(destination,options);
        }
        assert.equal(response.status,status, `Real production proxy must enforce route permissions before rendering (${status}, RSC=${Boolean(headers.rsc)}, location=${response.headers.get('location')})`);
        const body=await response.text();
        if(status!==200) assert(!body.includes('Authorized workspace marker'));
        if(status===403) { assert(response.headers.get('cache-control').includes('no-store')); if(!headers.rsc) assert(body.includes('Access denied')); }
      }
    }
    // Revalidation can deny after proxy admission. The stable page fallback must
    // terminate rendering and lead to a real 403 endpoint, never protected content.
    const late=await globalThis.fetch(origin+'/late-denial',{redirect:'manual',headers:{cookie:`__Host-bsa-session=${'V'.repeat(43)}`}});
    assert.equal(late.status,307);assert.equal(late.headers.get('location'),'/access-denied');
    assert(!(await late.text()).includes('Authorized workspace marker'));
    const denial=await globalThis.fetch(origin+'/access-denied');assert.equal(denial.status,403);assert((await denial.text()).includes('Access denied'));
    const missing=await globalThis.fetch(origin+'/missing');assert.equal(missing.status,404);
    assert((await missing.text()).includes('Production missing regression marker'));
    assert(!server.output().includes('only allowed to be enabled'), 'No auth-interrupt configuration mismatch');
  } finally {
    if (server && server.child.exitCode === null) { server.child.kill('SIGTERM'); await once(server.child, 'exit'); }
    await rm(root, { recursive: true, force: true });
  }
});

test('the built application standalone server starts with its reviewed config and denies anonymous workspace access', { timeout: 45000 }, async () => {
  const artifact = JSON.parse(await readFile(path.join(repository, '.next/required-server-files.json'), 'utf8'));
  assert.equal(artifact.config.output, 'standalone', 'Run npm run build before the production runtime gate');
  assert.notEqual(artifact.config.experimental.authInterrupts, true);
  const entry = await standaloneEntry(path.join(repository, '.next/standalone'));
  const match = /const nextConfig = (.+)\n/.exec(await readFile(entry, 'utf8'));
  assert(match, 'Application standalone entrypoint must serialize configuration');
  assert.notEqual(JSON.parse(match[1]).experimental.authInterrupts, true);
  const port = await unusedPort(), origin = `http://127.0.0.1:${port}`;
  const server = launch([entry], path.dirname(entry), { HOSTNAME: '127.0.0.1', PORT: String(port), APP_URL: 'https://production.example.test', SESSION_SECRET: randomBytes(32).toString('base64') });
  try {
    const deadline = Date.now() + 30000;
    while (true) {
      assert(server.child.exitCode === null, 'Application standalone server exited before readiness');
      try {
        const login = await globalThis.fetch(origin + '/login', { signal: globalThis.AbortSignal.timeout(1000) });
        assert.equal(login.status, 200); break;
      } catch { assert(Date.now() < deadline, 'Application standalone readiness timed out'); await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    const response = await globalThis.fetch(origin + '/overview', { redirect: 'manual', signal: globalThis.AbortSignal.timeout(5000) });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://production.example.test/login');
    const denied = await globalThis.fetch(origin + '/access-denied', { signal: globalThis.AbortSignal.timeout(5000) });
    assert.equal(denied.status, 403);
    assert(denied.headers.get('cache-control').includes('no-store'));
    assert((await denied.text()).includes('Access denied'));
    assert(!server.output().includes('only allowed to be enabled'));
  } finally {
    if (server.child.exitCode === null) { server.child.kill('SIGTERM'); await once(server.child, 'exit'); }
  }
});
