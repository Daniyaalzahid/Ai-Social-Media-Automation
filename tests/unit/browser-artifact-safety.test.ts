import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('credential-safe browser failure artifacts', () => {
  it('preserves real failed-test exit status while removing public canary from errors/artifacts', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'bsa-safe-browser-errors-'));
    const marker = 'PUBLIC_ARTIFACT_CANARY_NOT_A_CREDENTIAL';
    try {
      for (const protectedMode of [false, true]) {
        const folder = path.join(directory, protectedMode ? 'protected' : 'control');
        // mkdir via recursive temp helper; no credentials are written to generated source.
        const target = mkdtempSync(`${folder}-`), entered = path.join(target, 'executed');
        const module = protectedMode ? path.resolve('tests/browser/secure-test.ts') : path.resolve('node_modules/@playwright/test/index.mjs');
        writeFileSync(path.join(target, 'probe.spec.ts'), `import { test } from ${JSON.stringify(module)};\nimport {writeFileSync} from 'node:fs';\ntest('controlled failure retains status', async ({request}) => { writeFileSync(${JSON.stringify(entered)}, 'yes'); await request.post('http://127.0.0.1:1/api/team', { headers: { 'x-csrf-token': process.env.BSA_PUBLIC_ARTIFACT_CANARY! }, timeout: 1000 }); });\n`);
        writeFileSync(path.join(target, 'config.mjs'), `process.env.PLAYWRIGHT_NO_COPY_PROMPT='1'; export default ${JSON.stringify({ testDir: target, outputDir: path.join(target,'out'), workers: 1, retries: 0, reporter: 'list', use: { trace: 'off', screenshot: 'off', video: 'off' } })};`);
        const result = spawnSync(process.execPath, [path.resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', path.join(target, 'config.mjs')], { env: { ...process.env, BSA_PUBLIC_ARTIFACT_CANARY: marker }, encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024 });
        expect(existsSync(entered)).toBe(true); expect(result.status).toBe(1);
        const output = result.stdout + result.stderr;
        expect(output.includes('1 failed')).toBe(true);
        expect(output.includes(marker)).toBe(!protectedMode);
        function files(directory: string): string[] { return !existsSync(directory) ? [] : readdirSync(directory, { withFileTypes: true }).flatMap((item) => item.isDirectory() ? files(path.join(directory,item.name)) : [path.join(directory,item.name)]); }
        const artifacts = files(path.join(target,'out'));
        expect(artifacts.some((file) => file.endsWith('error-context.md'))).toBe(true);
        expect(artifacts.some((file) => readFileSync(file,'utf8').includes(marker))).toBe(!protectedMode);
        expect(artifacts.some((file) => /\.(zip|png|webm|html)$/.test(file))).toBe(false);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }, 45000);
});
