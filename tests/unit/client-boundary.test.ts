import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const lint = new ESLint();
async function boundaryMessages(source: string) {
  const results = await lint.lintText(source, { filePath: 'src/components/boundary-fixture.tsx' });
  return results.flatMap((result) => result.messages).filter((message) => message.ruleId === 'guardrails/client-boundary');
}

describe('client/server import boundaries', () => {
  it.each([
    'import "../server/config/schema";',
    'import "@/server/config/env";',
    'import "server-only";',
    'import "node:crypto";',
    'export * from "../server/config/schema";',
    'void import("../server/config/env");',
    'const target = "../server/config/env"; void import(target);',
    'require("../server/config/env");',
    'const value = process.env.SESSION_SECRET;',
    'const value = process["env"];',
  ])('rejects unsafe client access %#', async (source) => {
    expect(await boundaryMessages(`"use client"; ${source}`)).not.toHaveLength(0);
  });
  it('permits ordinary client modules', async () => {
    expect(await boundaryMessages('"use client"; export const title = "Drafts";')).toHaveLength(0);
  });
  it('permits server components to use server modules', async () => {
    expect(await boundaryMessages('import "../server/config/env";')).toHaveLength(0);
  });
});
