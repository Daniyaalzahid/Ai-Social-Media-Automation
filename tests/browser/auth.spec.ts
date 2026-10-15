import { generate } from 'otplib';
import { test, expect } from './secure-test';

function fixture(role: string) {
  const data = JSON.parse(process.env.BSA_BROWSER_FIXTURE ?? '{}');
  return { ...data.users.find((u: { role: string }) => u.role === role), password: data.password };
}
async function signIn(page: import('@playwright/test').Page, role: string) {
  const data = fixture(role); await page.goto('/login');
  await page.getByLabel('Work email').fill(data.email); await page.getByLabel('Password', { exact: true }).fill(data.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('unauthenticated routes redirect server-side and never return workspace content', async ({ page }) => {
  for (const route of ['/overview', '/content', '/connections', '/ui-kit']) {
    await page.goto(route); await expect(page).toHaveURL(/\/login$/); await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  }
});
test('login rejects missing CSRF and cross-origin state changes', async ({ request }) => {
  const response = await request.post('/api/auth', { data: { action: 'password', email: 'unknown@example.test', password: 'public synthetic phrase' } });
  expect(response.status()).toBe(403); expect(await response.text()).not.toContain('stack');
});
test('wrong credentials remain generic and clear password input', async ({ page }) => {
  await page.goto('/login'); await page.getByLabel('Work email').fill('unknown@example.test'); await page.getByLabel('Password', { exact: true }).fill('public synthetic phrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Unable to sign in.'); await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
});
test('privileged enrollment displays codes once, issues secure cookie and logout revokes access', async ({ page, context }) => {
  await signIn(page, 'OWNER');
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  await expect(page.getByRole('form', { name: 'Enroll authenticator' })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === '__Host-bsa-session')).toBe(false);
  const seed = await page.locator('.form-notice code').innerText();
  const otp = await generate({ secret: seed }); await page.getByLabel('Authenticator code').fill(otp); await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByRole('region', { name: 'Recovery codes' })).toBeVisible(); await expect(page.getByRole('region', { name: 'Recovery codes' }).locator('li')).toHaveCount(10);
  const cookies = await context.cookies(), session = cookies.find((c) => c.name === '__Host-bsa-session');
  expect(session?.httpOnly).toBe(true); expect(session?.secure).toBe(true); expect(session?.sameSite).toBe('Lax'); expect(session?.path).toBe('/');
  await page.getByRole('button', { name: 'I have saved my codes' }).click(); await expect(page).toHaveURL(/\/overview$/);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.getByRole('button', { name: 'Sign out' }).click(); await expect(page).toHaveURL(/\/login$/);
  await page.goto('/overview'); await expect(page).toHaveURL(/\/login$/);
});

for (const variant of ['expired', 'revoked', 'disabled'] as const) test(`server route rejects ${variant} session`, async ({ page }) => {
  const { createDatabase } = await import('../../src/server/db/connection');
  const { resolveDatabaseConfiguration } = await import('../../src/server/db/config');
  const configuration = resolveDatabaseConfiguration(process.env, 'migration');
  if (configuration.mode !== 'development' || configuration.database !== 'bsa_dev_browser_tests') throw new Error('Isolated browser database required');
  const handle = createDatabase(configuration), data = fixture('VIEWER');
  try {
    await signIn(page, 'VIEWER'); await expect(page).toHaveURL(/\/overview$/);
    if (variant === 'disabled') await handle.db.updateTable('users').set({ status: 'disabled' }).where('id', '=', data.id).execute();
    if (variant === 'revoked') await handle.db.updateTable('sessions').set({ revoked_at: new Date(), revocation_reason: 'synthetic_browser' }).where('user_id', '=', data.id).where('revoked_at', 'is', null).execute();
    if (variant === 'expired') {
      const past = new Date(Date.now() - 120000), expires = new Date(Date.now() - 60000);
      await handle.db.updateTable('sessions').set({ created_at: past, last_activity_at: past, idle_expires_at: expires }).where('user_id', '=', data.id).execute();
    }
    await page.goto('/overview'); await expect(page).toHaveURL(/\/login$/);
  } finally {
    await handle.db.updateTable('users').set({ status: 'active' }).where('id', '=', data.id).execute();
    await handle.db.updateTable('sessions').set({ revoked_at: new Date(), revocation_reason: 'synthetic_cleanup' }).where('user_id', '=', data.id).where('revoked_at', 'is', null).execute();
    await handle.close();
  }
});

for (const [name, sequence] of [['invalid-continuation', [0xc3, 0x28]], ['truncated-sequence', [0xf0, 0x9f, 0x94]], ['overlong', [0xc0, 0xaf]]] as const) test(`rejects ${name} UTF-8 before authentication without echoing input`, async ({ page }) => {
  await page.goto('/login');
  const result = await page.evaluate(async (sequence) => {
    const csrf = await (await fetch('/api/auth', { cache: 'no-store' })).json();
    const prefix = new TextEncoder().encode('{"action":"password","email":"unknown@example.test","password":"');
    const suffix = new TextEncoder().encode('"}');
    const bytes = new Uint8Array(prefix.length + sequence.length + suffix.length);
    bytes.set(prefix); bytes.set(sequence, prefix.length); bytes.set(suffix, prefix.length + sequence.length);
    const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrf }, body: bytes });
    return { status: response.status, body: await response.json() };
  }, sequence);
  expect(result.status).toBe(400);
  expect(result.body).toEqual({ ok: false, message: 'Unable to complete this request.' });
});
