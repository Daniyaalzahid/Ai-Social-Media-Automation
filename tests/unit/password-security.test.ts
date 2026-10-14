import { inspect } from 'node:util';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { describe, expect, it, vi } from 'vitest';
import { validatePassword, PASSWORD_POLICY } from '../../src/server/auth/password-policy';
import { hashPassword, verifyPassword, needsPasswordRehash, HashCapacity, ARGON2_POLICY } from '../../src/server/auth/passwords';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { normalizeEmail, NetworkIdentity, pseudonym } from '../../src/server/security/identity';

describe('password policy and Unicode', () => {
  it('counts Unicode scalar values and bounds UTF-8 without normalization', () => {
    for (const value of ['x'.repeat(15), 'x'.repeat(128), '😀'.repeat(15), '😀'.repeat(128), ' '.repeat(15)]) expect(() => validatePassword(value)).not.toThrow();
    for (const value of ['x'.repeat(14), 'x'.repeat(129), '😀'.repeat(129), '\ud800'.repeat(15), undefined]) expect(() => validatePassword(value)).toThrow();
    expect(PASSWORD_POLICY.maximumBytes).toBe(512);
    expect(Buffer.byteLength('😀'.repeat(128), 'utf8')).toBe(512);
    expect(Buffer.byteLength('😀'.repeat(129), 'utf8')).toBeGreaterThan(PASSWORD_POLICY.maximumBytes);
  });
  it('rejects locally listed common passwords without modifying accepted input', () => {
    expect(() => validatePassword('passwordpassword')).toThrow();
    expect(() => validatePassword('PASSWORDPASSWORD')).toThrow();
    expect(() => validatePassword('123456789012345')).toThrow();
    expect(() => validatePassword('  preserve spaces  ')).not.toThrow();
  });
});
describe('real Argon2id password service', () => {
  it('hashes/verifies exact input with random salts and redacts ordinary serialization', async () => {
    const password = '  preserve spaces exactly  ';
    const encoded = await hashPassword(password), second = await hashPassword(password);
    expect(encoded.reveal().startsWith('$argon2id$')).toBe(true);
    expect(encoded.reveal() === second.reveal()).toBe(false);
    expect(await verifyPassword(encoded, password)).toBe(true);
    expect(await verifyPassword(encoded, password.trim())).toBe(false);
    expect(await verifyPassword(encoded, password + 'wrong')).toBe(false);
    expect(needsPasswordRehash(encoded)).toBe(false);
    expect(JSON.stringify(encoded)).toBe('"[redacted]"');
    expect(String(encoded)).toBe('[redacted]');
    expect(inspect(encoded)).toBe('[redacted]');
  });
  it('does not normalize canonically equivalent password characters', async () => {
    const password = 'a long precise é phrase';
    const encoded = await hashPassword(password);
    expect(await verifyPassword(encoded, password.normalize('NFD'))).toBe(false);
    expect(await verifyPassword(encoded, password)).toBe(true);
  });
  it('detects safe older parameters without static hash fixtures', async () => {
    const encoded = new SensitiveValue(await argon2.hash(randomBytes(32).toString('hex'), { ...ARGON2_POLICY, timeCost: 2 }));
    expect(needsPasswordRehash(encoded)).toBe(true);
  });
  it('does not silently reduce a stronger stored iteration cost', async () => {
    const encoded = new SensitiveValue(await argon2.hash(randomBytes(24).toString('hex'), { ...ARGON2_POLICY, timeCost: 4 }));
    expect(needsPasswordRehash(encoded)).toBe(false);
  });
  it('fails safely on malformed hashes without logging supplied secrets', async () => {
    const log = vi.spyOn(console, 'log'), error = vi.spyOn(console, 'error');
    expect(await verifyPassword(new SensitiveValue('malformed'), 'a sufficiently long test phrase')).toBe(false);
    expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  });
});
describe('bounded hashing capacity', () => {
  it('allows only one pending operation, has no queue, and recovers after completion', async () => {
    const limiter = new HashCapacity(1);
    let release!: () => void;
    const held = limiter.run(() => new Promise<void>((resolve) => { release = resolve; }));
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => limiter.run(async () => 'unexpected')));
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    release(); await held;
    expect(await limiter.run(async () => 'ready')).toBe('ready');
  });
  it('enforces the process-wide bound for actual Argon2 operations', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => hashPassword('a sufficiently long test phrase')));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(5);
  });
  it('releases capacity when an operation throws', async () => {
    const limiter = new HashCapacity(1);
    await expect(limiter.run(async () => { throw new Error('synthetic'); })).rejects.toThrow('synthetic');
    expect(await limiter.run(async () => true)).toBe(true);
  });
});
describe('identity boundaries', () => {
  it('normalizes email explicitly and domain-separates pseudonyms', () => {
    expect(normalizeEmail(' USER@Example.test ')).toBe('user@example.test');
    const key = randomBytes(32);
    expect(pseudonym(key, 'account', 'same').equals(pseudonym(key, 'network', 'same'))).toBe(false);
    expect(pseudonym(key, 'account', 'same').equals(pseudonym(key, 'account', 'same'))).toBe(true);
  });
  it('accepts socket IP addresses and rejects forwarded-header lists', () => {
    const key = randomBytes(32);
    expect(NetworkIdentity.fromSocketAddress('127.0.0.1').pseudonym(key)).toHaveLength(32);
    expect(() => NetworkIdentity.fromSocketAddress('127.0.0.1, 192.0.2.1')).toThrow();
    expect(() => NetworkIdentity.fromSocketAddress('client.example.test')).toThrow();
  });
});
