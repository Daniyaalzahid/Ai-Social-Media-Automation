import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import type { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../../src/pages/access-denied';

it('application source cannot import or call experimental authorization interrupts', () => {
  const visitDirectory = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visitDirectory(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === 'next/navigation') {
          const bindings = node.importClause?.namedBindings;
          expect(bindings && ts.isNamespaceImport(bindings), file).not.toBe(true);
          if (bindings && ts.isNamedImports(bindings)) for (const specifier of bindings.elements) {
            expect(['forbidden', 'unauthorized'], file).not.toContain((specifier.propertyName ?? specifier.name).text);
          }
        }
        if (ts.isCallExpression(node)) {
          expect(/^(?:forbidden|unauthorized)$/.test(node.expression.getText(source)), file).toBe(false);
          if (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require') {
            expect(node.arguments.some(arg => ts.isStringLiteral(arg) && arg.text === 'next/navigation'), file).toBe(false);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  };
  visitDirectory('src');
});
it('late page denials terminate at a stable non-cacheable HTTP 403 endpoint', async () => {
  const headers = new Map<string, string>();
  const res = { statusCode: 200, setHeader: (key: string, value: string) => headers.set(key, value) };
  const result = await getServerSideProps({ res } as unknown as GetServerSidePropsContext);
  expect(res.statusCode).toBe(403);
  expect(headers.get('Cache-Control')).toBe('no-store, private');
  expect(headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  expect(result).toEqual({ props: {} });
});
