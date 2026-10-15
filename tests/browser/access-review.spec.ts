import { randomBytes, randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { createAccessService } from '../../src/server/auth/access';
import { insertPasswordChallenge } from '../../src/server/auth/challenges';
import { loadMfaKey } from '../../src/server/auth/mfa-crypto';
import { NetworkIdentity } from '../../src/server/security/identity';

const origin = 'http://localhost:3100';
const routes = ['/overview', '/create-post', '/calendar', '/content', '/media', '/approvals', '/analytics', '/connections', '/brand-brain', '/team', '/activity', '/settings', '/ui-kit'];
const headers = { origin, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty', 'content-type': 'application/json' };
async function csrf(request: APIRequestContext) { return (await (await request.get('/api/auth')).json()).csrf as string; }
function database() {
  const configuration = resolveDatabaseConfiguration(process.env, 'migration');
  if (configuration.mode !== 'development' || configuration.database !== 'bsa_dev_browser_tests' || configuration.user !== 'bsa_dev_browser_migration') throw new Error('Isolated browser database required');
  return createDatabase(configuration);
}
async function identity() {
  const handle = database(), id = randomUUID();
  try {
    const fixture = JSON.parse(process.env.BSA_BROWSER_FIXTURE ?? '{}').users[0];
    const source = await handle.db.selectFrom('users').select('password_hash').where('id', '=', fixture.id).executeTakeFirstOrThrow();
    await handle.db.insertInto('users').values({ id, email_normalized: `${id}@example.test`, display_name: 'Isolated review identity', status: 'active', password_hash: source.password_hash, password_changed_at: null, last_login_at: null }).execute();
    const role = await handle.db.selectFrom('roles').select('id').where('code', '=', 'VIEWER').executeTakeFirstOrThrow();
    await handle.db.insertInto('user_roles').values({ user_id: id, role_id: role.id, assigned_by: null }).execute();
    const proof = await handle.db.transaction().execute((tx) => insertPasswordChallenge(tx, id, 1));
    const service = createAccessService(handle.db, loadMfaKey(process.env), Buffer.from(process.env.SECURITY_EVENT_HMAC_KEY!, 'base64'), NetworkIdentity.fromSocketAddress('::'));
    const result = await service.continuePassword(proof.token);
    if (!result.ok || !('session' in result)) throw new Error('Isolated review session failed');
    return { handle, id, result, service };
  } catch { await handle.close(); throw new Error('Isolated review fixture unavailable'); }
}

for (const variant of ['malformed-json', 'duplicate-action', 'escaped-duplicate', 'unknown-field', 'nested', 'oversized', 'wrong-content-type', 'nonascii-csrf'] as const) test(`strict HTTP rejects ${variant} safely`, async ({ request }) => {
  const token = await csrf(request);
  const body = variant === 'malformed-json' ? '{' : variant === 'duplicate-action' ? '{"action":"logout","action":"activity"}' : variant === 'escaped-duplicate' ? '{"action":"logout","\\u0061ction":"activity"}' : variant === 'unknown-field' ? '{"action":"logout","password":"synthetic"}' : variant === 'nested' ? '{"action":{"action":"logout"}}' : variant === 'oversized' ? ' '.repeat(4097) : '{"action":"logout"}';
  const response = await request.post('/api/auth', { headers: { ...headers, 'content-type': variant === 'wrong-content-type' ? 'text/plain' : 'application/json', 'x-csrf-token': variant === 'nonascii-csrf' ? 'é'.repeat(43) : token }, data: body });
  expect(response.status()).toBe(variant === 'oversized' ? 413 : variant === 'nonascii-csrf' ? 403 : 400);
  expect((await response.text()).includes('stack')).toBe(false);
  expect(response.headers()['cache-control']).toContain('no-store');
});
for (const variant of ['evil-origin', 'multiple-origin', 'no-origin', 'cross-site', 'missing-metadata', 'forwarded-origin'] as const) test(`login CSRF rejects ${variant}`, async ({ request }) => {
  const token = await csrf(request), altered: Record<string, string> = { ...headers, 'x-csrf-token': token };
  if (variant === 'evil-origin') altered.origin = 'https://evil.invalid';
  if (variant === 'multiple-origin') altered.origin = `${origin}, ${origin}`;
  if (variant === 'no-origin') delete altered.origin;
  if (variant === 'cross-site') altered['sec-fetch-site'] = 'cross-site';
  if (variant === 'missing-metadata') delete altered['sec-fetch-site'];
  if (variant === 'forwarded-origin') { altered.origin = 'https://evil.invalid'; altered['x-forwarded-host'] = 'evil.invalid'; altered['x-forwarded-proto'] = 'https'; }
  const response = await request.post('/api/auth', { headers: altered, data: { action: 'password', email: 'synthetic@example.test', password: 'public synthetic phrase' } });
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ ok: false, message: 'Unable to complete this request.' });
});
test('all direct and RSC-prefetch workspace requests deny missing/random credentials', async ({ request }) => {
  for (const route of routes) for (const cookie of ['', `__Host-bsa-session=${randomBytes(32).toString('base64url')}`]) {
    const response = await request.get(route, { maxRedirects: 0, headers: { cookie } });
    expect(response.status()).toBe(307); expect(response.headers().location).toBe('/login');
    const prefetch = await request.get(route, { maxRedirects: 0, headers: { cookie, RSC: '1', 'Next-Router-Prefetch': '1' } });
    expect([200, 307]).toContain(prefetch.status());
    expect((await prefetch.text()).includes('Scheduled today')).toBe(false);
  }
  for (const route of ['/overview/nested', '/unknown-section', '/settings/nested', '/%7Bunknown%7D']) {
    const response = await request.get(route, { maxRedirects: 0 }); expect([307, 404]).toContain(response.status());
    expect((await response.text()).includes('Scheduled today')).toBe(false);
  }
});
for (const variant of ['valid', 'version', 'mandatory-role', 'pending', 'random', 'expired', 'revoked', 'disabled'] as const) test(`every workspace route checks ${variant} state server-side`, async ({ context }) => {
  const request = context.request;
  const fixture = await identity();
  try {
    if (variant === 'disabled') await fixture.handle.db.updateTable('users').set({ status: 'disabled' }).where('id', '=', fixture.id).execute();
    if (variant === 'revoked') await fixture.handle.db.updateTable('sessions').set({ revoked_at: new Date(), revocation_reason: 'synthetic_review' }).where('id', '=', fixture.result.id).execute();
    if (variant === 'expired') await fixture.handle.db.updateTable('sessions').set({ created_at: new Date(Date.now() - 120000), last_activity_at: new Date(Date.now() - 120000), idle_expires_at: new Date(Date.now() - 60000) }).where('id', '=', fixture.result.id).execute();
    if (variant === 'version') await fixture.handle.db.updateTable('users').set({ auth_version: 2 }).where('id', '=', fixture.id).execute();
    if (variant === 'pending') await fixture.handle.db.updateTable('users').set({ status: 'pending_mfa' }).where('id', '=', fixture.id).execute();
    if (variant === 'mandatory-role') {
      const role = await fixture.handle.db.selectFrom('roles').select('id').where('code', '=', 'OWNER').executeTakeFirstOrThrow();
      await fixture.handle.db.updateTable('user_roles').set({ role_id: role.id }).where('user_id', '=', fixture.id).execute();
    }
    await context.addCookies([{ name: '__Host-bsa-session', value: variant === 'random' ? randomBytes(32).toString('base64url') : fixture.result.session.reveal(), domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
    for (const route of routes) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.status()).toBe(variant === 'valid' ? 200 : 307);
      if (variant === 'valid') expect(response.headers()['cache-control']).toContain('no-store');
    }
  } finally { await fixture.handle.close(); }
});
test('session CSRF rejects cross-session and rotated state; logout clears every secure cookie', async ({ context }) => {
  const request = context.request;
  const fixture = await identity(), other = await identity();
  const set = async (value: string) => context.addCookies([{ name: '__Host-bsa-session', value, domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  try {
    await set(fixture.result.session.reveal()); const old = await csrf(request);
    await set(other.result.session.reveal());
    expect((await request.post('/api/auth', { headers: { ...headers, 'x-csrf-token': old }, data: { action: 'logout' } })).status()).toBe(403);
    const rotated = await fixture.service.rotateSession(fixture.result.session); if (!rotated) throw new Error('Synthetic rotation unavailable');
    await set(rotated.token.reveal());
    expect((await request.post('/api/auth', { headers: { ...headers, 'x-csrf-token': old }, data: { action: 'activity' } })).status()).toBe(403);
    const get = await request.get('/api/auth?action=logout'); expect(get.status()).toBe(200);
    expect((await fixture.service.validateSession(rotated.token)) !== null).toBe(true);
    const response = await request.post('/api/auth', { headers: { ...headers, 'x-csrf-token': await csrf(request) }, data: { action: 'logout' } });
    expect(response.status()).toBe(200);
    const deletes = response.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie'); expect(deletes).toHaveLength(3);
    for (const h of deletes) {
      expect(h.value.startsWith('__Host-')).toBe(true);
      for (const attribute of ['HttpOnly', 'Secure', 'SameSite=lax', 'Path=/', 'Max-Age=0']) expect(h.value.includes(attribute)).toBe(true);
      expect(/domain=/i.test(h.value)).toBe(false);
    }
    expect(await fixture.service.validateSession(rotated.token)).toBeNull();
  } finally { await fixture.handle.close(); await other.handle.close(); }
});
