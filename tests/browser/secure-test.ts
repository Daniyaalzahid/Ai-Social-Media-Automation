import { test as base, expect } from '@playwright/test';
/** Failure diagnostics can contain cookies, form values and one-time URLs. Keep failure + location, discard payloads before artifact/report generation. */
export const test = base.extend<{ credentialSafeErrors: void }>({
  credentialSafeErrors: [async ({ browserName }, use, info) => {
    void browserName;
    try { await use(); }
    finally {
      for (const error of info.errors) {
        for (const key of Object.keys(error)) Reflect.deleteProperty(error, key);
        error.message = 'Browser security check failed (credential-bearing details withheld).';
        error.stack = `Error: ${error.message}\n    at ${info.file}:${info.line}:${info.column}`;
      }
    }
  }, { auto: true }],
});
export { expect };
export type { APIRequestContext, BrowserContext } from '@playwright/test';
