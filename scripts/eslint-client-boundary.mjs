import { isBuiltin } from 'node:module';
import path from 'node:path';

export const clientBoundaryRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      serverImport: 'Client modules must not import server configuration, server modules, or Node built-ins.',
      environment: 'Client modules must not access process.env. Pass explicitly approved non-secret data from the server.',
    },
  },
  create(context) {
    let client = false;
    function checkImport(node, source) {
      if (!client || typeof source !== 'string') return;
      const resolved = source.startsWith('.')
        ? path.resolve(path.dirname(context.filename), source).replaceAll('\\', '/')
        : source;
      if (isBuiltin(source) || source === 'server-only' || /(^|\/)server(\/|$)/.test(resolved)) {
        context.report({ node, messageId: 'serverImport' });
      }
    }
    return {
      Program(node) {
        client = node.body.some((entry) => entry.type === 'ExpressionStatement' && entry.directive === 'use client');
      },
      ImportDeclaration(node) { checkImport(node, node.source.value); },
      ExportNamedDeclaration(node) { if (node.source) checkImport(node, node.source.value); },
      ExportAllDeclaration(node) { checkImport(node, node.source.value); },
      ImportExpression(node) {
        if (client && node.source.type !== 'Literal') context.report({ node, messageId: 'serverImport' });
        else checkImport(node, node.source.value);
      },
      CallExpression(node) {
        if (client && node.callee.type === 'Identifier' && node.callee.name === 'require') {
          context.report({ node, messageId: 'serverImport' });
        }
      },
      MemberExpression(node) {
        if (client && node.object.type === 'Identifier' && node.object.name === 'process') {
          context.report({ node, messageId: 'environment' });
        }
      },
    };
  },
};
