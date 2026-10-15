import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import { test, expect, type BrowserContext } from './secure-test';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { tokenHash } from '../../src/server/auth/access';
import { newTotpSecret, encryptMfa, loadMfaKey } from '../../src/server/auth/mfa-crypto';
import { canonicalCatalogId } from '../../src/server/db/seeds';
import { SensitiveValue } from '../../src/server/security/sensitive';
const fixture = () => JSON.parse(process.env.BSA_BROWSER_FIXTURE ?? '{}');
const origin = 'http://localhost:3100';
const headers = { origin, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty', 'content-type': 'application/json' };
async function cookie(context: BrowserContext, token: string) { await context.addCookies([{ name: '__Host-bsa-session', value: token, domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]); }
async function owner(context: BrowserContext) {
  const configuration = resolveDatabaseConfiguration(process.env, 'migration');
  if (configuration.mode !== 'development' || configuration.database !== 'bsa_dev_browser_tests' || configuration.user !== 'bsa_dev_browser_migration') throw new Error('Isolated browser database required');
  const handle = createDatabase(configuration), id = randomUUID(), method = randomUUID(), now = new Date(), secret = newTotpSecret(), raw = new SensitiveValue(randomBytes(32).toString('base64url'));
  try {
    const encoded = await handle.db.selectFrom('users').select('password_hash').where('id', '=', fixture().teamUsers[0].id).executeTakeFirstOrThrow();
    await handle.db.insertInto('users').values({ id, email_normalized: `${id}@example.test`, display_name: 'Isolated Team administrator', status: 'active', password_hash: encoded.password_hash, password_changed_at: null, last_login_at: null }).execute();
    await handle.db.insertInto('user_roles').values({ user_id: id, role_id: canonicalCatalogId('role', 'OWNER'), assigned_by: null }).execute();
    await handle.db.insertInto('mfa_methods').values({ id: method, user_id: id, type: 'totp', state: 'active', ...encryptMfa(secret, loadMfaKey(process.env), id, method), created_at: now, confirmed_at: now, enrollment_expires_at: null, last_accepted_step: null }).execute();
    await handle.db.insertInto('sessions').values({ id: randomUUID(), user_id: id, token_hash: tokenHash(raw), auth_version: 1, created_at: now, last_activity_at: now, idle_expires_at: new Date(+now + 1800000), absolute_expires_at: new Date(+now + 86400000), authenticated_at: now, mfa_verified_at: now, reauthenticated_at: null, revoked_at: null, revocation_reason: null, ip_hash: null, device_class: null }).execute();
    await cookie(context, raw.reveal()); return { secret, id };
  } finally { await handle.close(); }
}
for (const role of ['OWNER','MARKETING_ADMIN','CONTENT_CREATOR','REVIEWER','VIEWER']) test(`${role} direct Team/IDOR requests use current permission authority`, async ({ context, page }) => {
  const actor = fixture().teamUsers.find((u: { role: string }) => u.role === role); await cookie(context, actor.token);
  const request = context.request;
  const get = await request.get('/api/team'); expect(get.status()).toBe(role === 'OWNER' ? 200 : 403);
  if (role === 'OWNER') {
    const data = await get.json(); expect(data.members.every((m: object) => Object.keys(m).sort().join(',') === 'activeSessions,displayName,email,id,mfaEnabled,role,status')).toBe(true);
  } else {
    const csrf = (await (await request.get('/api/auth')).json()).csrf;
    for (const targetId of [fixture().teamUsers[0].id, randomUUID()]) {
      const result = await request.post('/api/team', { headers: { ...headers, 'x-csrf-token': csrf }, data: { operation: 'step-up', mutation: { action: 'role', targetId, role: 'OWNER' }, password: fixture().password, code: '000000' } }); expect(result.status()).toBe(403);
    }
  }
  const allowed: Record<string, string[]> = {
    OWNER: ['overview','create-post','calendar','content','media','approvals','analytics','connections','brand-brain','team','activity','settings','ui-kit'],
    MARKETING_ADMIN: ['overview','create-post','calendar','content','media','approvals','analytics'],
    CONTENT_CREATOR: ['overview','create-post','calendar','content','media'], REVIEWER: ['overview','calendar','content','approvals'], VIEWER: ['overview','calendar','content','analytics'],
  };
  for (const route of allowed.OWNER!) {
    const response = await request.get(`/${route}`, { headers: { 'x-bsa-route': '/overview' } });
    expect(response.status()).toBe(allowed[role]!.includes(route) ? 200 : 403);
  }
  const direct = await page.goto('/team'); expect(direct?.status()).toBe(role === 'OWNER' ? 200 : 403);
  if (role !== 'OWNER') await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await page.goto('/overview');
  const visible = await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link').evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname).sort());
  expect(visible).toEqual(allowed[role]!.filter((path) => path !== 'ui-kit').map((path) => `/${path}`).sort());
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Team', exact: true })).toHaveCount(role === 'OWNER' ? 1 : 0);
});
test('team mutations reject missing/wrong Origin, CSRF, duplicate fields and permission arrays', async ({ context }) => {
  await owner(context); const request = context.request, csrf = (await (await request.get('/api/auth')).json()).csrf;
  const input = { operation: 'mutate', mutation: { action: 'role', targetId: fixture().teamUsers[4].id, role: 'OWNER' }, proof: randomBytes(32).toString('base64url') };
  for (const extra of [{}, { ...headers, 'x-csrf-token': csrf, origin: 'https://evil.invalid' }, { ...headers, 'x-csrf-token': 'wrong' }]) expect((await request.post('/api/team', { headers: extra, data: input })).status()).toBe(403);
  const altered = await request.post('/api/team', { headers: { ...headers, 'x-csrf-token': csrf }, data: { ...input, mutation: { ...input.mutation, permissions: ['*'] } } }); expect(altered.status()).toBe(403);
  const duplicate = await request.post('/api/team', { headers: { ...headers, 'x-csrf-token': csrf }, data: '{"operation":"mutate","operation":"step-up"}' }); expect(duplicate.status() >= 400).toBe(true);
});
test('one-time invitation handoff, secure acceptance, then mandatory MFA with no premature access', async ({ page, context, browser }) => {
  const actor = await owner(context), email = `${randomUUID()}@example.test`;
  await page.goto('/team');
  await page.getByLabel('Display name', { exact: true }).fill('Invited browser colleague');
  await page.getByLabel('Work email', { exact: true }).fill(email);
  await page.getByLabel('Initial role').selectOption('MARKETING_ADMIN');
  await page.getByRole('button', { name: 'Invite member', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm team change' }); await expect(dialog).toBeVisible();
  await dialog.getByLabel('Your password').fill(fixture().password);
  await dialog.getByLabel('Authenticator code', { exact: true }).fill(await generate({ secret: actor.secret.reveal() }));
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  const handoff = page.getByRole('dialog', { name: 'Invitation link — shown once' }); await expect(handoff).toBeVisible();
  const link = await handoff.getByLabel('One-time invitation link').inputValue();
  expect(link.startsWith(`${origin}/invitation#`)).toBe(true);
  await handoff.getByRole('button', { name: 'I have saved the link securely' }).click();
  await expect(page.getByLabel('One-time invitation link')).toHaveCount(0);
  const recipient = await browser.newContext();
  try {
    const tab = await recipient.newPage(); await tab.goto(link);
    await expect(tab.getByRole('button', { name: 'Accept invitation' })).toBeEnabled();
    expect((await tab.evaluate(() => location.hash)).length).toBe(0);
    await tab.getByLabel('Invited work email').fill(email); await tab.getByLabel('New password').fill(fixture().password);
    await tab.getByRole('button', { name: 'Accept invitation' }).click(); await expect(tab.getByText('Password set. Sign in to continue.')).toBeVisible();
    expect((await recipient.cookies()).some((c) => c.name === '__Host-bsa-session')).toBe(false);
    await tab.goto('/overview'); await expect(tab).toHaveURL(/\/login$/);
    await tab.getByLabel('Work email').fill(email); await tab.getByLabel('Password', { exact: true }).fill(fixture().password); await tab.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(tab.getByRole('button', { name: /Set up authenticator/ })).toBeVisible();
    expect((await recipient.cookies()).some((c) => c.name === '__Host-bsa-session')).toBe(false);
    expect(await tab.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  } finally { await recipient.close(); }
});
test('Team layout and confirmation controls fit 320/375/390/768 widths', async ({ page, context }) => {
  await owner(context); await page.goto('/team');
  for (const width of [320,375,390,768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Invite member', exact: true })).toBeVisible();
  }
});
test('public invitation acceptance rejects missing CSRF and invalid/expired bearer safely', async ({ request }) => {
  expect((await request.post('/api/invitations', { data: { token: 'invalid', email: 'unknown@example.test', password: fixture().password } })).status()).toBe(403);
  const csrf = (await (await request.get('/api/invitations')).json()).csrf;
  const response = await request.post('/api/invitations', { headers: { ...headers, 'x-csrf-token': csrf }, data: { token: randomBytes(32).toString('base64url'), email: 'unknown@example.test', password: fixture().password } });
  const result = await response.json(); expect(result.ok).toBe(false); expect(JSON.stringify(result).includes('hash')).toBe(false);
});

// Final targeted review: direct wire attacks, separate browser states, no secret assertions/snapshots.
function reviewDatabase() {
  const configuration = resolveDatabaseConfiguration(process.env, 'migration');
  if (configuration.mode !== 'development' || configuration.database !== 'bsa_dev_browser_tests' || configuration.user !== 'bsa_dev_browser_migration') throw new Error('Isolated browser database required');
  return createDatabase(configuration);
}
const reviewActions = ['invite','role','disable','enable','sessions','revoke-invitation'] as const;
for (const action of reviewActions) test(`review ${action}: every CSRF rejection preserves a valid proof and final authorized control succeeds`, async ({ context }) => {
  const actor = await owner(context), handle = reviewDatabase(), request = context.request;
  try {
    const id = randomUUID(), now = new Date(), email = `${id}@example.test`;
    const row = await handle.db.selectFrom('users').select('password_hash').where('id', '=', actor.id).executeTakeFirstOrThrow();
    await handle.db.insertInto('users').values({ id, email_normalized: email, display_name: 'Review target', status: action === 'enable' ? 'disabled' : action === 'revoke-invitation' ? 'invited' : 'active', password_hash: action === 'revoke-invitation' ? null : row.password_hash, password_changed_at: null, last_login_at: null }).execute();
    await handle.db.insertInto('user_roles').values({ user_id: id, role_id: canonicalCatalogId('role', 'VIEWER'), assigned_by: actor.id }).execute();
    const mutation = action === 'invite' ? { action, email: `${randomUUID()}@example.test`, displayName: 'HTTP invite', role: 'VIEWER' } : action === 'role' ? { action, targetId: id, role: 'MARKETING_ADMIN' } : action === 'enable' || action === 'disable' ? { action: 'status', targetId: id, enabled: action === 'enable' } : { action, targetId: id };
    const { teamAction, parseMutation } = await import('../../src/server/team/policy');
    const session = await handle.db.selectFrom('sessions').select('id').where('user_id', '=', actor.id).executeTakeFirstOrThrow();
    const proof = new SensitiveValue(randomBytes(32).toString('base64url'));
    await handle.db.insertInto('auth_challenges').values({ id: randomUUID(), user_id: actor.id, token_hash: tokenHash(proof), purpose: 'reauthentication', action_code: teamAction(parseMutation(mutation)), auth_version: 1, bound_session_id: session.id, created_at: now, expires_at: new Date(+now + 300000), consumed_at: null, revoked_at: null }).execute();
    let csrf = (await (await request.get('/api/auth')).json()).csrf;
    const input = { operation: 'mutate', mutation, proof: proof.reveal() };
    for (const variant of ['missing','wrong','origin','non-ascii','cross-state','metadata']) {
      const altered: Record<string,string> = { ...headers, 'x-csrf-token': csrf };
      if (variant === 'missing') delete altered['x-csrf-token'];
      if (variant === 'wrong') altered['x-csrf-token'] = 'wrong';
      if (variant === 'origin') altered.origin = 'https://evil.invalid';
      if (variant === 'non-ascii') altered['x-csrf-token'] = 'é'.repeat(43);
      if (variant === 'cross-state') altered['x-csrf-token'] = (await (await request.get('/api/invitations')).json()).csrf;
      if (variant === 'metadata') altered['sec-fetch-site'] = 'cross-site';
      const result = await request.post('/api/team', { headers: altered, data: input }); expect(result.status()).toBe(403);
    }
    await request.get(`/api/team?operation=mutate&action=${action}`);
    expect((await handle.db.selectFrom('auth_challenges').select('consumed_at').where('token_hash', '=', tokenHash(proof)).executeTakeFirstOrThrow()).consumed_at).toBeNull();
    if (action === 'sessions') {
      const { createAccessService } = await import('../../src/server/auth/access');
      const { loadSecurityEventKey, NetworkIdentity } = await import('../../src/server/security/identity');
      const cookieValue = (await context.cookies()).find((item) => item.name === '__Host-bsa-session')!.value;
      const rotated = await createAccessService(handle.db,loadMfaKey(process.env),loadSecurityEventKey(process.env),NetworkIdentity.fromSocketAddress('::')).rotateSession(new SensitiveValue(cookieValue));
      expect(rotated !== null).toBe(true); await cookie(context,rotated!.token.reveal());
      const fresh = new SensitiveValue(randomBytes(32).toString('base64url')), created = new Date();
      await handle.db.insertInto('auth_challenges').values({ id: randomUUID(), user_id: actor.id, token_hash: tokenHash(fresh), purpose: 'reauthentication', action_code: teamAction(parseMutation(mutation)), auth_version: 1, bound_session_id: session.id, created_at: created, expires_at: new Date(+created + 300000), consumed_at: null, revoked_at: null }).execute();
      input.proof = fresh.reveal();
      expect((await request.post('/api/team',{headers:{...headers,'x-csrf-token':csrf},data:input})).status()).toBe(403);
      expect((await handle.db.selectFrom('auth_challenges').select('consumed_at').where('token_hash','=',tokenHash(fresh)).executeTakeFirstOrThrow()).consumed_at).toBeNull();
      csrf = (await (await request.get('/api/auth')).json()).csrf;
    }
    const good = await request.post('/api/team', { headers: { ...headers, 'x-csrf-token': csrf }, data: input }); expect(good.status()).toBe(200); expect((await good.json()).ok).toBe(true);
    const replay = await request.post('/api/team', { headers: { ...headers, 'x-csrf-token': csrf }, data: input }); expect(replay.status()).toBe(403);
  } finally { await handle.close(); }
});
test('review invitation acceptance binds role on server and protects every anonymous CSRF state', async ({ context, browser }) => {
  const actor = await owner(context), handle = reviewDatabase(), recipient = await browser.newContext();
  try {
    const id = randomUUID(), email = `${id}@example.test`, now = new Date(), raw = new SensitiveValue(randomBytes(32).toString('base64url'));
    const { invitationHash } = await import('../../src/server/team/service');
    await handle.db.insertInto('users').values({ id, email_normalized: email, display_name: 'Review recipient', status: 'invited', password_hash: null, password_changed_at: null, last_login_at: null }).execute();
    await handle.db.insertInto('user_roles').values({ user_id: id, role_id: canonicalCatalogId('role', 'VIEWER'), assigned_by: actor.id }).execute();
    await handle.db.insertInto('invitations').values({ id: randomUUID(), user_id: id, issued_by: actor.id, token_hash: invitationHash(raw), intended_role_id: canonicalCatalogId('role', 'VIEWER'), recipient_auth_version: 1, issuer_auth_version: 1, created_at: now, expires_at: new Date(+now + 3600000), accepted_at: null, revoked_at: null }).execute();
    const request = recipient.request, csrf = (await (await request.get('/api/invitations')).json()).csrf, input = { token: raw.reveal(), email, password: fixture().password };
    for (const variant of ['missing','wrong','origin','non-ascii','cross-state']) {
      const h: Record<string,string> = { ...headers, 'x-csrf-token': csrf };
      if (variant === 'missing') delete h['x-csrf-token'];
      if (variant === 'wrong') h['x-csrf-token'] = randomBytes(32).toString('base64url');
      if (variant === 'origin') h.origin = 'https://evil.invalid';
      if (variant === 'non-ascii') h['x-csrf-token'] = 'é'.repeat(43);
      if (variant === 'cross-state') h['x-csrf-token'] = (await (await context.request.get('/api/auth')).json()).csrf;
      expect((await request.post('/api/invitations', { headers: h, data: input })).status()).toBe(403);
    }
    for (const extra of [{ role: 'OWNER' }, { role: 'MARKETING_ADMIN' }, { roleId: randomUUID() }, { permissions: ['*'] }]) {
      const result = await request.post('/api/invitations', { headers: { ...headers, 'x-csrf-token': csrf }, data: { ...input, ...extra } }); expect(result.status()).toBe(400);
    }
    expect((await handle.db.selectFrom('users').select('status').where('id', '=', id).executeTakeFirstOrThrow()).status).toBe('invited');
    const result = await request.post('/api/invitations', { headers: { ...headers, 'x-csrf-token': csrf }, data: input }); expect((await result.json()).ok).toBe(true);
    expect((await handle.db.selectFrom('user_roles').select('role_id').where('user_id', '=', id).executeTakeFirstOrThrow()).role_id).toBe(canonicalCatalogId('role', 'VIEWER'));
    expect((await recipient.cookies()).some((c) => c.name === '__Host-bsa-session')).toBe(false);
  } finally { await handle.close(); await recipient.close(); }
});
test('review both endpoints reject malformed wire inputs without privileged-field coercion', async ({ context }) => {
  await owner(context); const request = context.request;
  const sessionCsrf = (await (await request.get('/api/auth')).json()).csrf, preCsrf = (await (await request.get('/api/invitations')).json()).csrf;
  for (const endpoint of ['/api/team', '/api/invitations']) {
    const csrf = endpoint === '/api/team' ? sessionCsrf : preCsrf;
    for (const variant of ['utf8','json','duplicate','escaped-duplicate','content-type','oversized','uuid','extra']) {
      const h: Record<string,string> = { ...headers, 'x-csrf-token': csrf };
      let data: string | Buffer = variant === 'utf8' ? Buffer.from([0x7b,0xff,0x7d]) : variant === 'json' ? '{' : variant === 'duplicate' ? '{"operation":"mutate","operation":"step-up"}' : variant === 'escaped-duplicate' ? '{"token":"x","\\u0074oken":"y"}' : variant === 'oversized' ? ' '.repeat(4097) : variant === 'uuid' ? JSON.stringify({ operation: 'step-up', mutation: { action: 'role', targetId: 'bad-id', role: 'OWNER' }, password: 'public synthetic review phrase', code: '000000' }) : '{"unexpected":true}';
      if (variant === 'content-type') { h['content-type'] = 'text/plain'; data = '{}'; }
      const response = await request.post(endpoint, { headers: h, data });
      expect((await response.json()).ok).toBe(false); expect(response.status()).not.toBe(500);
    }
  }
});
test('review denial precedes document/RSC/prefetch streaming and does not return Team DTOs', async ({ context }) => {
  const viewer = fixture().teamUsers.find((u: { role: string }) => u.role === 'VIEWER'); await cookie(context, viewer.token);
  const evidence: { path: string; kind: string; status: number; protectedBody: boolean }[] = [];
  for (const path of ['/team','/connections','/settings']) for (const extra of [{}, { RSC: '1' }, { RSC: '1', 'Next-Router-Prefetch': '1', Purpose: 'prefetch' }]) {
    const result = await context.request.get(path, { headers: { ...extra, 'x-bsa-route': '/overview' }, maxRedirects: 5 });
    const body = await result.text();
    evidence.push({ path, kind: 'Next-Router-Prefetch' in extra ? 'prefetch' : 'RSC' in extra ? 'rsc' : 'document', status: result.status(), protectedBody: body.includes('Invite a teammate') || body.includes('Isolated administration test') });
  }
  console.info(JSON.stringify({ httpDenialEvidence: evidence }));
  expect(evidence.every((item) => item.status === 403 && !item.protectedBody)).toBe(true);
  for (const path of ['/team/nested','/settings/unknown','/not-a-workspace-route']) {
    const result = await context.request.get(path, { maxRedirects: 0 }); expect([403,404].includes(result.status())).toBe(true);
    expect((await result.text()).includes('Invite a teammate')).toBe(false);
  }
});
test('review early RSC boundary permits current authorized identities and preserves Flight responses', async ({ context }) => {
  for (const [role, path] of [['OWNER','/team'], ['VIEWER','/overview']] as const) {
    const user = fixture().teamUsers.find((entry: { role: string }) => entry.role === role); await cookie(context, user.token);
    const result = await context.request.get(path, { headers: { RSC: '1' }, maxRedirects: 5 });
    expect(result.status()).toBe(200); expect(result.headers()['content-type']?.includes('text/x-component')).toBe(true);
  }
});
