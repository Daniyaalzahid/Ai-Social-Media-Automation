import { randomBytes, randomUUID } from 'node:crypto';
import { generate } from 'otplib';
import { describe, it, expect } from 'vitest';
import { browserConfiguration, decodeBrowserJson, COOKIE_OPTIONS, SESSION_COOKIE, newPreState, validPreState, csrfToken, verifyBrowserRequest } from '../../src/server/auth/browser-security';
import { loadMfaKey, newTotpSecret, encryptMfa, decryptMfa, verifyTotp, generateRecoveryCodes, recoveryHash } from '../../src/server/auth/mfa-crypto';
import { validatePassword, PASSWORD_POLICY } from '../../src/server/auth/password-policy';
import { hashPassword, verifyPassword } from '../../src/server/auth/passwords';
import { sessionPolicy, tokenHash } from '../../src/server/auth/access';
import { SensitiveValue } from '../../src/server/security/sensitive';

const key = { key: randomBytes(32), id: 'unit-v1' };
describe('MFA authenticated encryption and TOTP clock policy', () => {
  it('encrypts with distinct IVs and binds ownership, method and key ID', () => {
    const seed = newTotpSecret(), user = randomUUID(), method = randomUUID();
    const a = encryptMfa(seed, key, user, method), b = encryptMfa(seed, key, user, method);
    expect(a.iv.equals(b.iv)).toBe(false); expect(a.iv.length).toBe(12); expect(a.tag.length).toBe(16);
    const row = { ...a, id: method, user_id: user };
    expect(decryptMfa(row, key).reveal() === seed.reveal()).toBe(true);
    expect(() => decryptMfa({ ...row, user_id: randomUUID() }, key)).toThrow('Security operation unavailable');
    expect(() => decryptMfa({ ...row, key_id: 'unknown' }, key)).toThrow('Security operation unavailable');
    const corrupt = Buffer.from(a.seed_ciphertext); corrupt[0] = corrupt[0]! ^ 1;
    expect(() => decryptMfa({ ...row, seed_ciphertext: corrupt }, key)).toThrow('Security operation unavailable');
    expect(JSON.stringify(seed)).not.toContain(seed.reveal());
  });
  it('requires strict independent key material and rotation identifier', () => {
    const value = randomBytes(32).toString('base64');
    expect(loadMfaKey({ MFA_ENCRYPTION_KEY: value, MFA_ENCRYPTION_KEY_ID: 'v1' }).key.length).toBe(32);
    for (const source of [{}, { MFA_ENCRYPTION_KEY: value }, { MFA_ENCRYPTION_KEY: value, MFA_ENCRYPTION_KEY_ID: 'invalid id' }, { MFA_ENCRYPTION_KEY: value, MFA_ENCRYPTION_KEY_ID: 'v1', SECURITY_EVENT_HMAC_KEY: value }]) expect(() => loadMfaKey(source)).toThrow('Security operation unavailable');
  });
  it('accepts current and only first five seconds of past step, rejects future/outside/replay', async () => {
    const secret = newTotpSecret(), epoch = 1800000002, now = new Date(epoch * 1000);
    const current = await generate({ secret: secret.reveal(), epoch });
    const previous = await generate({ secret: secret.reveal(), epoch: epoch - 30 });
    const future = await generate({ secret: secret.reveal(), epoch: epoch + 30 });
    const old = await generate({ secret: secret.reveal(), epoch: epoch - 60 });
    expect(await verifyTotp(secret, current, now, null)).toBe(Math.floor(epoch / 30));
    expect(await verifyTotp(secret, previous, now, null)).toBe(Math.floor(epoch / 30) - 1);
    expect(await verifyTotp(secret, previous, new Date((epoch + 5) * 1000), null)).toBeNull();
    expect(await verifyTotp(secret, future, now, null)).toBeNull(); expect(await verifyTotp(secret, old, now, null)).toBeNull();
    expect(await verifyTotp(secret, current, now, Math.floor(epoch / 30))).toBeNull();
  });
  it.each(['12345', '1234567', ' 123456', '123456 ', 'abcdef', '<script>', 123456, null])('rejects malformed TOTP %#', async (code) => {
    expect(await verifyTotp(newTotpSecret(), code, new Date(), null)).toBeNull();
  });
  it('generates ten distinct 128-bit grouped recovery codes, stores SHA-256 representations', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10); expect(new Set(codes.map((code) => code.reveal())).size).toBe(10);
    for (const code of codes) { expect(recoveryHash(code).length).toBe(32); expect(JSON.stringify(code)).not.toContain(code.reveal()); }
    expect(() => recoveryHash(new SensitiveValue('malformed'))).toThrow('Security operation unavailable');
  });
});
describe('browser CSRF and cookie boundary', () => {
  const source = { APP_ENV: 'test', APP_URL: 'http://localhost:3100', SESSION_SECRET: randomBytes(32).toString('base64') };
  const config = browserConfiguration(source);
  function headers(binding: string, kind: 'pre' | 'session' | 'flow' = 'pre') { return new Headers({ origin: config.origin, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty', 'x-csrf-token': csrfToken(config.key, kind, binding) }); }
  it('rejects malformed UTF-8/JSON and preserves exact valid Unicode password text', () => {
    const value = '  Unicode 🔒 phrase  ';
    const parsed = decodeBrowserJson(Buffer.from(JSON.stringify({ password: value }))) as { password: string };
    expect(parsed.password === value).toBe(true);
    const bad = Buffer.concat([Buffer.from('{"password":"'), Buffer.from([0xc3, 0x28]), Buffer.from('"}')]);
    expect(() => decodeBrowserJson(bad)).toThrow('Security operation unavailable');
    expect(() => decodeBrowserJson(Buffer.from('invalid json'))).toThrow('Security operation unavailable');
  });
  it.each([
    ['truncated', [0xf0, 0x9f, 0x94]],
    ['continuation', [0xe2, 0x28, 0xa1]],
    ['overlong', [0xc0, 0xaf]],
    ['surrogate', [0xed, 0xa0, 0x80]],
    ['out-of-range', [0xf4, 0x90, 0x80, 0x80]],
    ['standalone-continuation', [0x80]],
  ] as const)('rejects %s UTF-8 before any password validation or replacement', (_name, sequence) => {
    const bytes = Buffer.concat([Buffer.from('{"password":"public synthetic '), Buffer.from(sequence), Buffer.from(' phrase"}')]);
    let reachedValidation = false, message = '';
    try {
      const parsed = decodeBrowserJson(bytes) as { password: string };
      reachedValidation = true; validatePassword(parsed.password);
    } catch (error) { message = String(error); }
    expect(reachedValidation).toBe(false);
    expect(message).toBe('SecurityOperationError: Security operation unavailable');
    expect(message.includes('public synthetic')).toBe(false);
    expect(message.includes('\uFFFD')).toBe(false);
  });
  it('preserves valid multibyte passwords, spaces and normalization distinctions through hash/verify', async () => {
    const text = '  اردو 日本語 🔒 e\u0301 phrase  ';
    const parsed = decodeBrowserJson(Buffer.from(JSON.stringify({ password: text }))) as { password: string };
    expect(parsed.password === text).toBe(true);
    expect(Buffer.from(parsed.password).equals(Buffer.from(text))).toBe(true);
    validatePassword(parsed.password);
    expect(PASSWORD_POLICY).toEqual({ minimumCharacters: 15, maximumCharacters: 128, maximumBytes: 512 });
    const encoded = await hashPassword(parsed.password);
    expect(await verifyPassword(encoded, text)).toBe(true);
    expect(await verifyPassword(encoded, text.trim())).toBe(false);
    expect(await verifyPassword(encoded, text.normalize('NFC'))).toBe(false);
  });
  it('requires __Host Secure HttpOnly Lax root cookies without Domain', () => {
    expect(SESSION_COOKIE.startsWith('__Host-')).toBe(true); expect(COOKIE_OPTIONS).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  });
  it('expires tamper-resistant anonymous CSRF state', () => {
    const state = newPreState(config.key, 1800000000000);
    expect(validPreState(config.key, state, 1800000000001)).toBe(true);
    expect(validPreState(config.key, state, 1800000600000)).toBe(false);
    expect(validPreState(config.key, state, 1799999999999)).toBe(false);
    expect(validPreState(config.key, state.slice(0, -1) + '!', 1800000000001)).toBe(false);
  });
  it('binds tokens to session/challenge identity and kind', () => {
    const raw = randomBytes(32).toString('base64url'), h = headers(raw, 'session');
    expect(verifyBrowserRequest(h, config, 'session', raw)).toBe(true);
    expect(verifyBrowserRequest(h, config, 'flow', raw)).toBe(false);
    expect(verifyBrowserRequest(h, config, 'session', randomBytes(32).toString('base64url'))).toBe(false);
  });
  it.each([['origin', 'https://evil.invalid'], ['origin', 'null'], ['sec-fetch-site', 'same-site'], ['sec-fetch-site', 'cross-site'], ['sec-fetch-mode', 'navigate'], ['sec-fetch-dest', 'document'], ['x-csrf-token', 'wrong']])('rejects invalid %s %#', (name, value) => {
    const pre = newPreState(config.key), h = headers(pre); h.set(name, value);
    expect(verifyBrowserRequest(h, config, 'pre', pre)).toBe(false);
  });
  it.each(['origin', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'x-csrf-token'])('rejects missing %s', (name) => {
    const pre = newPreState(config.key), h = headers(pre); h.delete(name); expect(verifyBrowserRequest(h, config, 'pre', pre)).toBe(false);
  });
  it('validates canonical configured origin and independent key', () => {
    expect(() => browserConfiguration({ ...source, APP_ENV: 'production' })).toThrow('Security operation unavailable');
    expect(() => browserConfiguration({ ...source, APP_ENV: undefined, NODE_ENV: 'production' })).toThrow('Security operation unavailable');
    expect(() => browserConfiguration({ ...source, NODE_ENV: 'production' })).toThrow('Security operation unavailable');
    expect(() => browserConfiguration({ ...source, APP_ENV: 'unexpected' })).toThrow('Security operation unavailable');
    expect(() => browserConfiguration({ ...source, APP_URL: 'https://example.test/path' })).toThrow();
    expect(() => browserConfiguration({ ...source, MFA_ENCRYPTION_KEY: source.SESSION_SECRET })).toThrow();
  });
  it('retains role-specific lifetimes and hashes 256-bit tokens only', () => {
    expect(sessionPolicy('OWNER')).toEqual({ idle: 1800000, absolute: 86400000 });
    expect(sessionPolicy('MARKETING_ADMIN')).toEqual(sessionPolicy('OWNER'));
    for (const role of ['VIEWER', 'REVIEWER', 'CONTENT_CREATOR']) expect(sessionPolicy(role)).toEqual({ idle: 7200000, absolute: 604800000 });
    expect(tokenHash(new SensitiveValue(randomBytes(32).toString('base64url'))).length).toBe(32);
    expect(() => tokenHash(new SensitiveValue('bad'))).toThrow();
  });
});
