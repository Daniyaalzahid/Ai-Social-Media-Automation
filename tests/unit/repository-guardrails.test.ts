import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('repository security guardrails', () => {
  it.each(['.env', '.env.local', '.env.production', '.env.test', '.env.production.local', 'src/.env.local', 'credentials.env', 'secrets/provider.json', 'private.key'])('ignores %s', (file) => {
    const result = spawnSync('git', ['check-ignore', '--no-index', file], { encoding: 'utf8' });
    expect(result.status).toBe(0);
  });
  it('keeps the example trackable and names-only', () => {
    expect(spawnSync('git', ['check-ignore', '--no-index', '.env.example']).status).toBe(1);
    const lines = readFileSync('.env.example', 'utf8').split(/\r?\n/).filter(Boolean);
    expect(lines).toHaveLength(32);
    expect(lines.every((line) => /^[A-Z][A-Z0-9_]*=$/.test(line))).toBe(true);
    expect(lines.some((line) => line.startsWith('NEXT_PUBLIC_'))).toBe(false);
  });
  it('retains strict TypeScript checks', () => {
    const config = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
    expect(config.compilerOptions.strict).toBe(true);
    expect(config.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(config.compilerOptions.exactOptionalPropertyTypes).toBe(true);
  });
  it('the secret scanner rejects a synthetic credential and masks its output', () => {
    const synthetic = ['AK', 'IA', 'Z'.repeat(16)].join('');
    const cli = path.resolve('node_modules/secretlint/bin/secretlint.js');
    const result = spawnSync(process.execPath, [cli, '--stdinFileName', 'fixture.txt', '--no-color'], {
      input: `credential=${synthetic}`, encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(synthetic);
  });
  it('preserves the original repository commit', () => {
    expect(execFileSync('git', ['rev-parse', '779a7a10ebfb0d89ae5dea9f4941671c8d54875a^{commit}'], { encoding: 'utf8' }).trim())
      .toBe('779a7a10ebfb0d89ae5dea9f4941671c8d54875a');
  });
});
