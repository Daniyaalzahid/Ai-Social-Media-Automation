import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { clientBoundaryRule } from './scripts/eslint-client-boundary.mjs';

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { guardrails: { rules: { 'client-boundary': clientBoundaryRule } } },
    rules: { 'guardrails/client-boundary': 'error' },
  },
  globalIgnores(['.next/**', 'out/**', 'dist/**', 'coverage/**', 'node_modules/**']),
]);
