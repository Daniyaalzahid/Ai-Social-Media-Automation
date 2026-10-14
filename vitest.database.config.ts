import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', include: ['tests/database/**/*.test.ts'],
    maxWorkers: 1, fileParallelism: false, testTimeout: 20000, hookTimeout: 30000,
    // Never override an inherited production mode to make a DB test appear safe.
  },
});
