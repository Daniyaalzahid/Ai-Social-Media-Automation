import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import { SecurityOperationError } from './sensitive.ts';
import type { EnvironmentSource } from '../config/schema.ts';

export function normalizeEmail(input: unknown): string {
  const parsed = z.string().max(320).safeParse(input);
  if (!parsed.success || !parsed.data.isWellFormed()) throw new SecurityOperationError();
  // Explicit account identifier policy, never applied to passwords.
  const normalized = parsed.data.trim().normalize('NFC').toLowerCase();
  if (!z.email().max(254).safeParse(normalized).success) throw new SecurityOperationError();
  return normalized;
}
export class NetworkIdentity {
  #address: string;
  private constructor(address: string) { this.#address = address; }
  static fromSocketAddress(address: string): NetworkIdentity {
    if (!isIP(address)) throw new SecurityOperationError();
    let canonical = isIP(address) === 6 ? new URL(`http://[${address}]/`).hostname.slice(1, -1) : address;
    // A dual-stack Node socket can report an IPv4 peer in IPv4-mapped IPv6 form.
    // Both forms must charge the same network bucket.
    const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
    if (mapped) {
      const high = Number.parseInt(mapped[1]!, 16), low = Number.parseInt(mapped[2]!, 16);
      canonical = [high >>> 8, high & 255, low >>> 8, low & 255].join('.');
    }
    return new NetworkIdentity(canonical);
  }
  pseudonym(key: Buffer): Buffer { return pseudonym(key, 'network', this.#address); }
  toJSON(): string { return '[network identifier]'; }
}
export function pseudonym(key: Buffer, scope: 'network' | 'account' | 'challenge' | 'global', value: string): Buffer {
  if (key.length !== 32 || value.length > 320) throw new SecurityOperationError();
  return createHmac('sha256', key).update(`bismillah-social-ai/v1/${scope}\0`).update(value).digest();
}
export function loadSecurityEventKey(source: EnvironmentSource): Buffer {
  const value = source.SECURITY_EVENT_HMAC_KEY;
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new SecurityOperationError();
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) throw new SecurityOperationError();
  return key;
}
