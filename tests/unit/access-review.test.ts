import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
import { recordAccessEvent } from '../../src/server/security/access-events';
import { describe, expect, it } from 'vitest';
import { browserConfiguration, csrfToken, verifyBrowserRequest, decodeBrowserJson } from '../../src/server/auth/browser-security';
import { encryptMfa, decryptMfa, newTotpSecret, verifyTotp } from '../../src/server/auth/mfa-crypto';

describe('demonstrated adversarial boundary regressions', () => {
  it('rejects duplicate and escaped-equivalent security field names', () => {
    for (const input of ['{"action":"logout","action":"password"}', '{"action":"logout","\\u0061ction":"password"}', '{"password":"public synthetic","password":"different public phrase"}']) {
      let rejected = false; try { decodeBrowserJson(Buffer.from(input)); } catch { rejected = true; }
      expect(rejected).toBe(true);
    }
  });
  it('malformed non-ASCII CSRF input returns denial without a comparison exception', () => {
    const config = browserConfiguration({ APP_ENV: 'test', APP_URL: 'https://example.test', SESSION_SECRET: randomBytes(32).toString('base64') });
    const headers = new Headers({ origin: config.origin, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty', 'x-csrf-token': 'é'.repeat(43) });
    let denied = false, threw = false;
    try { denied = !verifyBrowserRequest(headers, config, 'session', randomBytes(32).toString('base64url')); } catch { threw = true; }
    expect(threw).toBe(false); expect(denied).toBe(true);
  });
  it('rejects ambiguous noncanonical identities rather than permitting AAD tuple collisions', () => {
    const key = { key: randomBytes(32), id: 'review-v1' }, secret = newTotpSecret();
    let rejected = false;
    try {
      const encrypted = encryptMfa(secret, key, 'a/b', 'c');
      decryptMfa({ ...encrypted, user_id: 'a', id: 'b/c' }, key);
    } catch { rejected = true; }
    expect(rejected).toBe(true);
  });
});

describe('independent cryptographic boundary attacks', () => {
  it('rejects user/method/key substitution and malformed authenticated encryption parts', () => {
    const key = { key: randomBytes(32), id: 'review-v1' }, secret = newTotpSecret(), user = randomUUID(), method = randomUUID();
    const row = { ...encryptMfa(secret, key, user, method), user_id: user, id: method };
    for (const mutation of [ { user_id: randomUUID() }, { id: randomUUID() }, { key_id: 'other-v1' }, { iv: randomBytes(11) }, { tag: randomBytes(15) }, { iv: randomBytes(12) }, { tag: randomBytes(16) }, { seed_ciphertext: randomBytes(32) }, { seed_ciphertext: Buffer.alloc(0) } ]) {
      let safe = false; try { decryptMfa({ ...row, ...mutation }, key); } catch (error) { safe = String(error) === 'SecurityOperationError: Security operation unavailable'; }
      expect(safe).toBe(true);
    }
  });
  it.each([0, 1, 4999, 5000, 5999, 29999])('enforces exact millisecond grace/replay semantics at +%i ms', async (offset) => {
    const secret = newTotpSecret(), epoch = 1800000000, step = epoch / 30;
    const previous = await generate({ secret: secret.reveal(), epoch: epoch - 30 });
    const current = await generate({ secret: secret.reveal(), epoch });
    const future = await generate({ secret: secret.reveal(), epoch: epoch + 30 });
    const now = new Date(epoch * 1000 + offset);
    expect(await verifyTotp(secret, previous, now, null)).toBe(offset < 5000 ? step - 1 : null);
    expect(await verifyTotp(secret, previous, now, step - 1)).toBeNull();
    expect(await verifyTotp(secret, current, now, step - 1)).toBe(step);
    expect(await verifyTotp(secret, current, now, step)).toBeNull();
    expect(await verifyTotp(secret, future, now, step)).toBeNull();
  });
  it('rejects cross-kind/cross-session CSRF substitution and multiple Origins', () => {
    const config = browserConfiguration({ APP_ENV: 'test', APP_URL: 'https://example.test', SESSION_SECRET: randomBytes(32).toString('base64') });
    const raw = randomBytes(32).toString('base64url'), other = randomBytes(32).toString('base64url');
    for (const [from, to] of [['pre', 'flow'], ['flow', 'session'], ['session', 'flow']] as const) {
      const h = new Headers({ origin: config.origin, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty', 'x-csrf-token': csrfToken(config.key, from, raw) });
      expect(verifyBrowserRequest(h, config, to, raw)).toBe(false);
    }
    const h = new Headers({ origin: config.origin, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty', 'x-csrf-token': csrfToken(config.key, 'session', raw) });
    expect(verifyBrowserRequest(h, config, 'session', other)).toBe(false);
    for (const origin of [`${config.origin}, ${config.origin}`, `${config.origin} https://evil.invalid`, 'null', 'https://example.test.evil.invalid']) { h.set('origin', origin); expect(verifyBrowserRequest(h, config, 'session', raw)).toBe(false); }
  });
});


describe('closed event metadata boundary', () => {
  it('rejects prohibited fields and arbitrary objects before database access', async () => {
    let accessed = false;
    const db = { insertInto() { accessed = true; throw new Error('Unexpected database access'); } } as unknown as Kysely<DatabaseSchema>;
    const base = { type: 'session.issued', userId: randomUUID(), outcome: 'success' };
    const rejected = [];
    for (const field of ['password', 'passwordHash', 'totp', 'totpSecret', 'recoveryCode', 'recoveryHash', 'sessionToken', 'sessionHash', 'csrfToken', 'encryptionKey', 'cookie', 'authorization', 'request', 'error', 'metadata']) rejected.push({ ...base, [field]: { private: 'synthetic prohibited data' } });
    rejected.push({ ...base, type: 'arbitrary secret dump' }, { ...base, userId: 'arbitrary secret dump' }, { ...base, outcome: 'arbitrary secret dump' });
    for (const input of rejected) {
      let safe = false; try { await recordAccessEvent(db, input as never); } catch (error) { safe = String(error) === 'SecurityOperationError: Security operation unavailable'; }
      expect(safe).toBe(true);
    }
    expect(accessed).toBe(false);
  });
});
