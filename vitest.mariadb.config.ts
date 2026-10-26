import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['tests/mariadb/**/*.test.ts'],maxWorkers:1,fileParallelism:false,testTimeout:20000,hookTimeout:30000}});
