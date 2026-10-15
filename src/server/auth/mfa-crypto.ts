import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { generateSecret, generateURI, verify } from 'otplib';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';
import type { EnvironmentSource } from '../config/schema.ts';

export type MfaKey = Readonly<{ key: Buffer; id: string }>;
export function loadMfaKey(source: EnvironmentSource): MfaKey {
  const value = source.MFA_ENCRYPTION_KEY, id = source.MFA_ENCRYPTION_KEY_ID;
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value) || !id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new SecurityOperationError();
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value || [source.SECURITY_EVENT_HMAC_KEY, source.TOKEN_ENCRYPTION_KEY, source.SESSION_SECRET].includes(value)) throw new SecurityOperationError();
  return { key, id };
}
export function newTotpSecret(): SensitiveValue { return new SensitiveValue(generateSecret({ length: 20 })); }
export function enrollmentURI(secret: SensitiveValue, email: string): SensitiveValue {
  return new SensitiveValue(generateURI({ issuer: 'Bismillah Social AI (Bismillah Electronics)', label: email, secret: secret.reveal(), digits: 6, period: 30, algorithm: 'sha1' }));
}
function mfaAAD(key: MfaKey, userId: string, methodId: string): Buffer {
  // UUID identities and a separator-free key ID make the persisted v1 tuple
  // unambiguous. Reject corrupt DB/caller identities before crypto operations.
  if (key.key.length !== 32 || !/^[A-Za-z0-9_-]{1,40}$/.test(key.id) || !z.uuid().safeParse(userId).success || !z.uuid().safeParse(methodId).success) throw new SecurityOperationError();
  return Buffer.from(`bsa/mfa/v1/${userId}/${methodId}/${key.id}`);
}
export function encryptMfa(secret: SensitiveValue, key: MfaKey, userId: string, methodId: string) {
  try {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key.key, iv);
    cipher.setAAD(mfaAAD(key, userId, methodId));
    const seed_ciphertext = Buffer.concat([cipher.update(secret.reveal(), 'utf8'), cipher.final()]);
    return { seed_ciphertext, iv, tag: cipher.getAuthTag(), key_id: key.id };
  } catch { throw new SecurityOperationError(); }
}
export function decryptMfa(row: { seed_ciphertext: Buffer; iv: Buffer; tag: Buffer; key_id: string; user_id: string; id: string }, key: MfaKey): SensitiveValue {
  try {
    if (row.key_id !== key.id || row.iv.length !== 12 || row.tag.length !== 16) throw new Error();
    const cipher = createDecipheriv('aes-256-gcm', key.key, row.iv);
    cipher.setAAD(mfaAAD(key, row.user_id, row.id)); cipher.setAuthTag(row.tag);
    const seed = Buffer.concat([cipher.update(row.seed_ciphertext), cipher.final()]).toString('utf8');
    if (!/^[A-Z2-7]{32}$/.test(seed)) throw new Error();
    return new SensitiveValue(seed);
  } catch { throw new SecurityOperationError(); }
}
export async function verifyTotp(secret: SensitiveValue, code: unknown, now: Date, lastStep: number | null): Promise<number | null> {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;
  try {
    const result = await verify({ secret: secret.reveal(), token: code, epoch: Math.floor(now.getTime() / 1000), epochTolerance: [5, 0], period: 30, digits: 6, algorithm: 'sha1' });
    return result.valid && 'timeStep' in result && (lastStep === null || result.timeStep > lastStep) ? result.timeStep : null;
  } catch { throw new SecurityOperationError(); }
}
export function generateRecoveryCodes(): SensitiveValue[] {
  return Array.from({ length: 10 }, () => new SensitiveValue(randomBytes(16).toString('hex').match(/.{8}/g)!.join('-')));
}
export function recoveryHash(code: SensitiveValue): Buffer {
  const value = code.reveal();
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/.test(value)) throw new SecurityOperationError();
  return createHash('sha256').update(`bsa/recovery/v1/${value}`).digest();
}
