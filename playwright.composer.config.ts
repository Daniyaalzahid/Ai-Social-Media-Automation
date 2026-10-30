import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'simple-composer.spec.ts',testIgnore:[],webServer:{url:'http://localhost:3100',reuseExistingServer:false,timeout:60000,command:'node tests/production/composer-browser-server.mjs',env:{NODE_ENV:'development',APP_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'}}});
