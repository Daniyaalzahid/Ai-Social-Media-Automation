import { test } from 'node:test';
import { setTimeout, clearTimeout } from 'node:timers';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('production standalone artifact preserves auth interrupts and real HTTP denial behavior', { timeout: 180000 }, async () => {
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
    for (const [route, helper] of [['deny', 'forbidden'], ['unauthorized', 'unauthorized'], ['missing', 'notFound']]) {
      await put(`src/app/${route}/page.tsx`, `import { ${helper} } from 'next/navigation';\nexport const dynamic='force-dynamic';\nexport default function Page(){${helper}();}\n`);
    }
    await put('src/app/forbidden.tsx', 'export default function Page(){return <h1>Production denial regression marker</h1>;}');
    await put('src/app/unauthorized.tsx', 'export default function Page(){return <h1>Production authentication regression marker</h1>;}');
    await put('src/app/not-found.tsx', 'export default function Page(){return <h1>Production missing regression marker</h1>;}');
    const build = launch([next, 'build', root], root);
    const timeout = setTimeout(() => build.child.kill('SIGTERM'), 120000);
    const [code] = await once(build.child, 'exit'); clearTimeout(timeout);
    assert.equal(code, 0, 'Production runtime fixture must build successfully');
    const artifact = JSON.parse(await readFile(path.join(root, '.next/required-server-files.json'), 'utf8'));
    assert.equal(artifact.config.output, 'standalone');
    assert.equal(artifact.config.experimental.authInterrupts, true);
    assert.notEqual(artifact.config.typescript.ignoreBuildErrors, true);
    const entry = await standaloneEntry(path.join(root, '.next/standalone'));
    const generated = await readFile(entry, 'utf8');
    assert(generated.includes('__NEXT_PRIVATE_STANDALONE_CONFIG'), 'Start the official generated entrypoint');
    const match = /const nextConfig = (.+)\n/.exec(generated);
    assert(match, 'Generated server must contain its serialized configuration');
    assert.equal(JSON.parse(match[1]).experimental.authInterrupts, true);
    const port = await unusedPort(), origin = `http://127.0.0.1:${port}`;
    server = launch([entry], path.dirname(entry), { HOSTNAME: '127.0.0.1', PORT: String(port) });
    const deadline = Date.now() + 30000;
    while (true) {
      assert(server.child.exitCode === null, 'Standalone server exited before readiness');
      try { await globalThis.fetch(origin + '/missing', { signal: globalThis.AbortSignal.timeout(1000) }); break; }
      catch { assert(Date.now() < deadline, 'Standalone readiness timed out'); await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    for (const [route, status, marker] of [['deny', 403, 'Production denial regression marker'], ['unauthorized', 401, 'Production authentication regression marker'], ['missing', 404, 'Production missing regression marker']]) {
      const response = await globalThis.fetch(origin + '/' + route, { redirect: 'manual', signal: globalThis.AbortSignal.timeout(5000) });
      assert.equal(response.status, status, `Production ${route} must preserve exact HTTP status`);
      assert((await response.text()).includes(marker), `Production ${route} must render its expected boundary`);
    }
    assert(!server.output().includes('only allowed to be enabled'), 'No auth-interrupt configuration mismatch');
  } finally {
    if (server && server.child.exitCode === null) { server.child.kill('SIGTERM'); await once(server.child, 'exit'); }
    await rm(root, { recursive: true, force: true });
  }
});

test('the built application standalone server starts with its reviewed config and denies anonymous workspace access', { timeout: 45000 }, async () => {
  const artifact = JSON.parse(await readFile(path.join(repository, '.next/required-server-files.json'), 'utf8'));
  assert.equal(artifact.config.output, 'standalone', 'Run npm run build before the production runtime gate');
  assert.equal(artifact.config.experimental.authInterrupts, true);
  const entry = await standaloneEntry(path.join(repository, '.next/standalone'));
  const match = /const nextConfig = (.+)\n/.exec(await readFile(entry, 'utf8'));
  assert(match, 'Application standalone entrypoint must serialize configuration');
  assert.equal(JSON.parse(match[1]).experimental.authInterrupts, true);
  const port = await unusedPort(), origin = `http://127.0.0.1:${port}`;
  const server = launch([entry], path.dirname(entry), { HOSTNAME: '127.0.0.1', PORT: String(port) });
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
    assert.equal(response.headers.get('location'), '/login');
    assert(!server.output().includes('only allowed to be enabled'));
  } finally {
    if (server.child.exitCode === null) { server.child.kill('SIGTERM'); await once(server.child, 'exit'); }
  }
});
