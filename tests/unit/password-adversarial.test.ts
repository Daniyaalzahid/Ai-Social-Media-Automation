import { randomBytes } from 'node:crypto';
import { inspect } from 'node:util';
import argon2 from 'argon2';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HashCapacity, ARGON2_POLICY, hashPassword, verifyPassword, isSupportedPasswordHash, needsPasswordRehash } from '../../src/server/auth/passwords';
import { validatePassword } from '../../src/server/auth/password-policy';
import { SensitiveValue } from '../../src/server/security/sensitive';
import { NetworkIdentity } from '../../src/server/security/identity';

afterEach(() => vi.restoreAllMocks());
describe('adversarial PHC validation', () => {
  it('rejects hostile PHC variants before any native verification', async () => {
    const original = (await hashPassword(randomBytes(24).toString('hex'))).reveal();
    const mutations = [
      (v: string) => v.replace('argon2id', 'argon2i'), (v: string) => v.replace('v=19', 'v=16'),
      (v: string) => v.replace('m=65536', 'm=999999'), (v: string) => v.replace('m=65536', 'm=65537'),
      (v: string) => v.replace('m=65536', 'm=1073741824'), (v: string) => v.replace('m=65536', 'm=0'),
      (v: string) => v.replace('m=65536', 'm=-1'), (v: string) => v.replace('m=65536', 'm=065536'),
      (v: string) => v.replace('t=3', 't=999999'), (v: string) => v.replace('t=3', 't=7'),
      (v: string) => v.replace('p=1', 'p=999999'), (v: string) => v.replace('p=1', 'p=5'),
      (v: string) => v.replace('t=3', 'm=65536'), (v: string) => v.replace('t=3', 'x=3'),
      (v: string) => v + '$extra', (v: string) => v + '\n', (v: string) => v.slice(0, -1),
      (v: string) => v + 'x'.repeat(10000), (v: string) => v.replace(/.$/, '!'),
      ...[4, 5].map((index) => (v: string) => {
        const parts = v.split('$'), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const part = parts[index]!;
        parts[index] = part.slice(0, -1) + alphabet[alphabet.indexOf(part.at(-1)!) + 1];
        return parts.join('$'); // Set unused base64 padding bits without printing any hash.
      }),
    ];
    const native = vi.spyOn(argon2, 'verify');
    for (const mutate of mutations) {
      const encoded = new SensitiveValue(mutate(original));
      expect(isSupportedPasswordHash(encoded)).toBe(false);
      expect(await verifyPassword(encoded, randomBytes(24).toString('hex'))).toBe(false);
    }
    expect(native.mock.calls.length).toBe(0);
  });
  it('identifies weaker hashes but verifies stronger safe hashes without downgrade', async () => {
    const password = randomBytes(24).toString('hex');
    const weak = new SensitiveValue(await argon2.hash(password, { ...ARGON2_POLICY, memoryCost: 19456, timeCost: 2 }));
    const strong = new SensitiveValue(await argon2.hash(password, { ...ARGON2_POLICY, timeCost: 4 }));
    expect(needsPasswordRehash(weak)).toBe(true);
    expect(needsPasswordRehash(strong)).toBe(false);
    expect(await verifyPassword(weak, password)).toBe(true);
    expect(await verifyPassword(strong, password)).toBe(true);
  });
});
describe('deterministic bounded FIFO capacity policy', () => {
  afterEach(() => vi.useRealTimers());
  const clock = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  it.each([1, 2, 3, 4, 5])('admits one active plus at most two FIFO waiters from %i requests', async (count) => {
    clock(); const capacity = new HashCapacity(1, 2, 750);
    const gates = Array.from({ length: count }, () => Promise.withResolvers<void>());
    let active = 0, peak = 0; const order: number[] = [];
    const settled = Promise.allSettled(gates.map((gate, index) => capacity.run(async () => {
      active++; peak = Math.max(peak, active); order.push(index);
      try { await gate.promise; } finally { active--; }
    })));
    await Promise.resolve(); expect(order).toEqual([0]);
    for (const gate of gates) gate.resolve();
    const results = await settled;
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(Math.min(count, 3));
    expect(results.filter((result) => result.status === 'rejected').every((result) => result.reason instanceof Error && result.reason.name === 'HashCapacityError')).toBe(true);
    expect(order).toEqual(Array.from({ length: Math.min(count, 3) }, (_, i) => i));
    expect(peak).toBe(1); expect(active).toBe(0); expect(vi.getTimerCount()).toBe(0);
    expect(await capacity.run(async () => 'recovered')).toBe('recovered');
  });
  it('enforces the exact 750 ms deadline and never starts expired work', async () => {
    clock(); const capacity = new HashCapacity(1, 2, 750), gate = Promise.withResolvers<void>();
    const held = capacity.run(() => gate.promise), started: number[] = [];
    const waiting = Promise.allSettled([1, 2].map((i) => capacity.run(async () => { started.push(i); })));
    await vi.advanceTimersByTimeAsync(749); expect(started).toEqual([]); expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect((await waiting).every((result) => result.status === 'rejected' && result.reason.name === 'HashCapacityError')).toBe(true);
    gate.resolve(); await held; expect(started).toEqual([]); expect(vi.getTimerCount()).toBe(0);
    expect(await capacity.run(async () => 'recovered')).toBe('recovered');
  });
  it('admits the next still-valid FIFO waiter after an older waiter times out', async () => {
    clock(); const capacity = new HashCapacity(1, 2, 750), gate = Promise.withResolvers<void>(), order: number[] = [];
    const held = capacity.run(() => gate.promise);
    const expired = Promise.allSettled([capacity.run(async () => { order.push(1); })]);
    await vi.advanceTimersByTimeAsync(500);
    const valid = capacity.run(async () => { order.push(2); });
    await vi.advanceTimersByTimeAsync(250); expect((await expired)[0]?.status).toBe('rejected');
    gate.resolve(); await Promise.all([held, valid]); expect(order).toEqual([2]); expect(vi.getTimerCount()).toBe(0);
  });
  it('rechecks a waiter deadline on release even before the timer callback runs', async () => {
    clock(); const capacity = new HashCapacity(1, 2, 750), gate = Promise.withResolvers<void>();
    const held = capacity.run(() => gate.promise); let started = false;
    const waiting = Promise.allSettled([capacity.run(async () => { started = true; })]);
    const now = vi.spyOn(performance, 'now').mockReturnValue(750);
    try { gate.resolve(); await held; expect((await waiting)[0]?.status).toBe('rejected'); expect(started).toBe(false); expect(vi.getTimerCount()).toBe(0); }
    finally { now.mockRestore(); }
  });
  it('releases failed work to FIFO waiters and leaves no occupied slot or timer', async () => {
    clock(); const capacity = new HashCapacity(1, 2, 750), gate = Promise.withResolvers<void>(), order: number[] = [];
    const results = Promise.allSettled([capacity.run(() => gate.promise), ...[1, 2].map((i) => capacity.run(async () => { order.push(i); }))]);
    gate.reject(new Error('Synthetic work failure'));
    expect((await results).map((result) => result.status)).toEqual(['rejected', 'fulfilled', 'fulfilled']);
    expect(order).toEqual([1, 2]); expect(vi.getTimerCount()).toBe(0);
    expect(await capacity.run(async () => 'recovered')).toBe('recovered');
  });
});
describe('plaintext and dummy hash handling', () => {
  it('sanitizes validation and native errors without retaining secret causes', async () => {
    const secret = randomBytes(24).toString('hex');
    let policyError: unknown;
    try { validatePassword(secret.repeat(20)); } catch (error) { policyError = error; }
    expect(inspect(policyError).includes(secret)).toBe(false);
    const log = vi.spyOn(console, 'log'), errorLog = vi.spyOn(console, 'error');
    vi.spyOn(argon2, 'hash').mockRejectedValueOnce(new Error(secret));
    let nativeError: unknown;
    try { await hashPassword(secret); } catch (error) { nativeError = error; }
    expect(String(nativeError)).toBe('SecurityOperationError: Security operation unavailable');
    expect(inspect(nativeError).includes(secret)).toBe(false);
    expect(JSON.stringify(nativeError).includes(secret)).toBe(false);
    expect(log.mock.calls.length).toBe(0); expect(errorLog.mock.calls.length).toBe(0);
    expect(await verifyPassword(await hashPassword(secret), secret)).toBe(true);
  });
  it('creates one random approved dummy hash per module lifecycle and obeys capacity', async () => {
    vi.resetModules();
    const service = await import('../../src/server/auth/passwords');
    const native = vi.spyOn(argon2, 'hash');
    await Promise.all([service.initializePasswordSecurity(), service.initializePasswordSecurity()]);
    await service.verifyDummyPassword(randomBytes(24).toString('hex'));
    await service.verifyDummyPassword(randomBytes(24).toString('hex'));
    expect(native).toHaveBeenCalledTimes(1);
    // Test boolean properties only: never snapshot or print native hash arguments.
    expect(native.mock.calls[0]?.[1]?.memoryCost === 65536).toBe(true);
    expect(native.mock.calls[0]?.[1]?.type === argon2.argon2id).toBe(true);
    expect(await service.verifyDummyPassword(native.mock.calls[0]?.[0])).toBeUndefined();
  });
  it('can retry dummy initialization after capacity saturation during startup', async () => {
    vi.resetModules();
    const service = await import('../../src/server/auth/passwords');
    const state = globalThis as typeof globalThis & { bismillahHashCapacity: HashCapacity };
    let release!: () => void;
    const held = state.bismillahHashCapacity.run(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();
    try { await expect(service.initializePasswordSecurity()).rejects.toThrow('Security operation unavailable'); }
    finally { release(); await held; }
    await service.initializePasswordSecurity();
    expect(await service.verifyDummyPassword(randomBytes(24).toString('hex'))).toBeUndefined();
  });
  it('canonicalizes alternate IPv6 socket spellings consistently', () => {
    const key = randomBytes(32);
    expect(NetworkIdentity.fromSocketAddress('2001:db8::1').pseudonym(key).equals(NetworkIdentity.fromSocketAddress('2001:0db8:0:0:0:0:0:1').pseudonym(key))).toBe(true);
    expect(NetworkIdentity.fromSocketAddress('192.0.2.1').pseudonym(key).equals(NetworkIdentity.fromSocketAddress('::ffff:192.0.2.1').pseudonym(key))).toBe(true);
    expect(NetworkIdentity.fromSocketAddress('192.0.2.1').pseudonym(key).equals(NetworkIdentity.fromSocketAddress('0:0:0:0:0:ffff:c000:201').pseudonym(key))).toBe(true);
  });
});
