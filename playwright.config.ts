import { defineConfig } from '@playwright/test';

// Automatic failure DOM dumps can contain enrollment material. Tests still fail
// normally; capture neither secret-bearing snapshots nor network traces.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

export default defineConfig({
  testDir: './tests/browser',
  globalSetup: './tests/browser/setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    browserName: 'chromium',
    trace: 'off', screenshot: 'off', video: 'off',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 60_000,
    // Required browser suites must never consume an inherited real AI credential.
    env: { NODE_ENV: 'development', APP_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', OPENROUTER_API_KEY:'', OPENROUTER_MODEL:'' },
  },
});
