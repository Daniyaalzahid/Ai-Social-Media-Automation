import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import nextConfig from '../../next.config';

const primaryText = readFileSync('tsconfig.json', 'utf8');
const contractText = readFileSync('tsconfig.typecheck.json', 'utf8');
const roots: string[] = [];
function fixture(dev = false) {
  mkdirSync('.cache', { recursive: true });
  const root = mkdtempSync(path.resolve('.cache/typecheck-contract-'));
  roots.push(root);
  const put = (name: string, value: string) => {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), value);
  };
  put('tsconfig.json', primaryText);
  put('tsconfig.typecheck.json', contractText);
  put('src/app/source.ts', 'export const value: string = "synthetic";');
  put('src/server/provider-security/source.ts', 'export const value: number = 1;');
  put('tests/source.ts', 'export const value: boolean = true;');
  put('required.d.ts', 'declare const requiredDeclaration: unique symbol;');
  put('next-env.d.ts', 'import "./.next/types/routes.d.ts";');
  // Equivalent global-alias collision, without copying private application routes.
  const generated = 'export {}; declare global { type LayoutProps = { children: string }; }';
  put('.next/types/routes.d.ts', generated);
  put('.next/types/validator.ts', 'export const routeContract: string = "synthetic";');
  if (dev) put('.next/dev/types/routes.d.ts', generated);
  return { root, put, generated };
}
function config(root: string, file = 'tsconfig.typecheck.json') {
  const parsed = ts.getParsedCommandLineOfConfigFile(path.join(root, file), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => { throw new Error('Typecheck fixture configuration could not be parsed.'); },
  });
  if (!parsed || parsed.errors.length) throw new Error('Typecheck fixture configuration is invalid.');
  return parsed;
}
function semanticErrors(parsed: ts.ParsedCommandLine) {
  // Only the synthetic fixture uses this bounded ambient universe. Its files
  // require primitive types, not React/Node/DOM APIs. Keep real TS semantics and every
  // selected fixture root; do not mutate the parsed repository compiler options.
  // Full repository options/coverage are checked separately, then by typecheck.
  const program = ts.createProgram(parsed.fileNames, {
    ...parsed.options, incremental: false, types: [], lib: ['lib.es5.d.ts'],
    // Preserve JSX syntax instead of synthesizing an irrelevant React runtime import.
    // This override belongs only to the synthetic semantic program, not the configs.
    jsx: ts.JsxEmit.Preserve,
  });
  expect(program.getSourceFiles().some(file => /[/\\]@types[/\\]react[/\\]/.test(file.fileName))).toBe(false);
  expect(program.getSourceFiles().some(file => /[/\\]jsx(?:-dev)?-runtime\.d\.ts$/.test(file.fileName))).toBe(false);
  return ts.getPreEmitDiagnostics(program).map(diagnostic => diagnostic.code);
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('standalone non-development typecheck contract', () => {
  it('selects the dedicated config only for production builds with dev types present', () => {
    const build = nextConfig(PHASE_PRODUCTION_BUILD);
    const development = nextConfig(PHASE_DEVELOPMENT_SERVER);
    expect(path.resolve(build.typescript!.tsconfigPath!)).toBe(path.resolve('tsconfig.typecheck.json'));
    expect(build.typescript?.ignoreBuildErrors).not.toBe(true);
    expect(build.experimental?.useTypeScriptCli).toBeUndefined();
    expect(development.typescript?.tsconfigPath ?? 'tsconfig.json').toBe('tsconfig.json');
    expect({ ...build, typescript: undefined }).toEqual({ ...development, typescript: undefined });
    const { root } = fixture(true);
    const selected = config(root, build.typescript!.tsconfigPath!);
    expect(selected.fileNames.includes(path.join(root, '.next/types/routes.d.ts'))).toBe(true);
    expect(selected.fileNames.some(file => file.includes('/.next/dev/types/'))).toBe(false);
    expect(config(root, 'tsconfig.json').fileNames.includes(path.join(root, '.next/dev/types/routes.d.ts'))).toBe(true);
  });
  it('preserves the public command and production typegen order', () => {
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    expect(scripts.typecheck).toBe('next typegen && tsc --noEmit -p tsconfig.typecheck.json');
    expect(JSON.parse(contractText)).toEqual({ extends: './tsconfig.json', exclude: ['node_modules', '.next/dev/types/**'] });
  });
  it('inherits include and compiler options, overriding only discovery excludes', () => {
    const { root } = fixture(true);
    const base = config(root, 'tsconfig.json'), selected = config(root);
    expect(selected.raw.include).toEqual(base.raw.include);
    expect(selected.options).toEqual({ ...base.options, configFilePath: selected.options.configFilePath });
    expect(selected.fileNames).toEqual(base.fileNames.filter(file => !file.includes('/.next/dev/types/')));
  });
  it('preserves the actual repository effective file set and compiler options', () => {
    const root = path.resolve('.'), base = config(root, 'tsconfig.json'), selected = config(root);
    expect(selected.raw.include).toEqual(base.raw.include);
    expect(selected.options).toEqual({ ...base.options, configFilePath: selected.options.configFilePath });
    expect(selected.fileNames).toEqual(base.fileNames.filter(file => !file.includes('/.next/dev/types/')));
    for (const directory of ['src/app', 'src/server', 'src/server/provider-security', 'tests']) {
      const intended = base.fileNames.filter(file => file.startsWith(path.join(root, directory) + path.sep));
      expect(intended.length > 0).toBe(true);
      expect(intended.every(file => selected.fileNames.includes(file))).toBe(true);
    }
    expect(selected.fileNames.includes(path.join(root, 'next-env.d.ts'))).toBe(true);
    expect(selected.raw.include).toContain('.next/types/**/*.ts');
    expect(selected.fileNames.some(file => file.includes('/.next/dev/types/'))).toBe(false);
  });
  it('retains application, server, test, declaration and production generated coverage', () => {
    const { root } = fixture(true), parsed = config(root);
    for (const file of ['src/app/source.ts', 'src/server/provider-security/source.ts', 'tests/source.ts', 'required.d.ts', 'next-env.d.ts', '.next/types/routes.d.ts', '.next/types/validator.ts']) {
      expect(parsed.fileNames.includes(path.join(root, file))).toBe(true);
    }
    expect(parsed.fileNames.some(file => file.includes('/.next/dev/types/'))).toBe(false);
  });
  it('passes production-only state A', () => {
    expect(semanticErrors(config(fixture().root))).toEqual([]);
  });
  it('passes dev-first state B once production route types are generated', () => {
    const { root, put, generated } = fixture();
    rmSync(path.join(root, '.next/types'), { recursive: true });
    put('.next/dev/types/routes.d.ts', generated);
    put('.next/types/routes.d.ts', generated);
    expect(semanticErrors(config(root))).toEqual([]);
  });
  it('passes both-trees state C while the original contract detects the collision', () => {
    const { root } = fixture(true);
    expect(semanticErrors(config(root, 'tsconfig.json')).includes(2300)).toBe(true);
    expect(semanticErrors(config(root))).toEqual([]);
  });
  it.each(['src/app/source.ts', 'src/server/provider-security/source.ts', 'tests/source.ts'])('rejects a real type error in %s (state D)', file => {
    const { root, put } = fixture(true);
    put(file, 'export const value: number = "synthetic type error";');
    expect(semanticErrors(config(root)).includes(2322)).toBe(true);
  });
  it('rejects an error in production generated validators', () => {
    const { root, put } = fixture(true);
    put('.next/types/validator.ts', 'export const routeContract: number = "synthetic type error";');
    expect(semanticErrors(config(root)).includes(2322)).toBe(true);
  });
  it('preserves inherited explicit files while excluding dev wildcard discovery', () => {
    const { root, put } = fixture(true);
    put('explicit.required.d.ts', 'declare const explicitDeclaration: unique symbol;');
    put('tsconfig.json', JSON.stringify({ ...JSON.parse(primaryText), files: ['explicit.required.d.ts'] }));
    expect(config(root).fileNames.includes(path.join(root, 'explicit.required.d.ts'))).toBe(true);
  });
  it('survives Next adding a broader include without admitting dev types or node_modules', () => {
    const { root, put } = fixture(true), primary = JSON.parse(primaryText);
    put('tsconfig.json', JSON.stringify({ ...primary, include: [...primary.include, '**/*.ts'] }));
    put('node_modules/synthetic/source.ts', 'export const invalid: number = "synthetic";');
    const selected = config(root);
    expect(selected.fileNames.some(file => file.includes('/.next/dev/types/'))).toBe(false);
    expect(selected.fileNames.some(file => file.includes('/node_modules/'))).toBe(false);
  });
  it('documents that exclusions do not suppress direct imports or explicit files', () => {
    const { root, put } = fixture(true);
    put('src/app/source.ts', 'import "../../.next/dev/types/routes.d.ts";');
    expect(semanticErrors(config(root)).includes(2300)).toBe(true);
    put('tsconfig.json', JSON.stringify({ ...JSON.parse(primaryText), files: ['.next/dev/types/routes.d.ts'] }));
    expect(config(root).fileNames.includes(path.join(root, '.next/dev/types/routes.d.ts'))).toBe(true);
  });
});
