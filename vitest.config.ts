import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/ui/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    maxWorkers: 2,
    env: { NODE_ENV: 'test', APP_ENV: 'test' },
  },
});
