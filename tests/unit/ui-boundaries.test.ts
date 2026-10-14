import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
function parse(file: string) { return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS); }
function imports(source: ts.SourceFile): string[] {
  return source.statements.flatMap((node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) return [node.moduleSpecifier.text];
    return [];
  });
}
describe('actual UI source boundaries', () => {
  it('has no direct or transitive server imports in any client component', () => {
    const clients = sources('src').filter((file) => parse(file).statements.some((node) => ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === 'use client'));
    expect(clients.length).toBeGreaterThan(0);
    const visited = new Set<string>();
    function visit(file: string) {
      if (visited.has(file)) return;
      visited.add(file);
      const source = parse(file);
      expect(file.replaceAll('\\', '/')).not.toContain('/server/');
      for (const name of imports(source)) {
        expect(name).not.toBe('server-only');
        expect(name).not.toMatch(/(^|\/)server\//);
        expect(name).not.toMatch(/^node:/);
        if (name.startsWith('.')) {
          const base = path.resolve(path.dirname(file), name);
          const target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate));
          if (target) visit(target);
        }
      }
      expect(source.text).not.toMatch(/process\s*(\.|\[)/);
    }
    clients.forEach(visit);
  });
  it('centralizes core tokens and keeps strict guardrails enabled', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    for (const token of ['--bg', '--text', '--brand-primary', '--font-sans', '--space-1', '--radius-card', '--focus-ring', '--breakpoint-shell']) expect(tokens).toContain(token);
    expect(readFileSync('src/styles/globals.css', 'utf8')).toContain('prefers-reduced-motion: reduce');
    expect(JSON.parse(readFileSync('tsconfig.json', 'utf8')).compilerOptions.strict).toBe(true);
    expect(readFileSync('eslint.config.mjs', 'utf8')).toContain("'guardrails/client-boundary': 'error'");
  });
});
