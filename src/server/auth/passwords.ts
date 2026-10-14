import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { SensitiveValue, SecurityOperationError } from '../security/sensitive.ts';
import { isBoundedPassword, validatePassword } from './password-policy.ts';

export const ARGON2_POLICY = Object.freeze({ type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1, hashLength: 32 });
export class HashCapacityError extends Error {
  constructor() { super('Password verification unavailable'); this.name = 'HashCapacityError'; }
}
export class HashCapacity {
  #active = 0;
  #pending: { resolve: () => void; reject: (error: Error) => void; deadline: number; timer: ReturnType<typeof setTimeout> }[] = [];
  readonly maximum: number;
  readonly maximumPending: number;
  readonly maximumWaitMs: number;
  constructor(maximum = 1, maximumPending = 0, maximumWaitMs = 750) {
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 2 || !Number.isInteger(maximumPending) || maximumPending < 0 || maximumPending > 2
      || !Number.isInteger(maximumWaitMs) || maximumWaitMs < 1 || maximumWaitMs > 750) throw new SecurityOperationError();
    this.maximum = maximum;
    this.maximumPending = maximumPending;
    this.maximumWaitMs = maximumWaitMs;
  }
  async #acquire(): Promise<void> {
    if (this.#active < this.maximum) { this.#active++; return; }
    if (this.#pending.length >= this.maximumPending) throw new HashCapacityError();
    await new Promise<void>((resolve, reject) => {
      const entry = { resolve, reject, deadline: performance.now() + this.maximumWaitMs, timer: setTimeout(() => {
        this.#pending = this.#pending.filter((item) => item !== entry);
        reject(new HashCapacityError());
      }, this.maximumWaitMs) };
      this.#pending.push(entry);
    });
  }
  #release(): void {
    this.#active--;
    while (this.#pending.length) {
      const entry = this.#pending.shift()!;
      clearTimeout(entry.timer);
      if (performance.now() >= entry.deadline) { entry.reject(new HashCapacityError()); continue; }
      this.#active++; entry.resolve(); return;
    }
  }
  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.#acquire();
    try { return await operation(); } finally { this.#release(); }
  }
}
// One native operation, at most two FIFO waiters, each waiting at most 750 ms.
// Shared across all instances/hot module reloads in this process.
const processState = globalThis as typeof globalThis & { bismillahHashCapacity?: HashCapacity };
const capacity = processState.bismillahHashCapacity ??= new HashCapacity(1, 2, 750);

function readHashParameters(encoded: SensitiveValue): { m: number; t: number; p: number } | null {
  const value = encoded.reveal();
  if (value.length > 255) return null;
  // Bound verification costs even if a stored PHC string is corrupt or tampered with.
  const match = /^\$argon2id\$v=19\$([mtp=,0-9]{13,30})\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/.exec(value);
  if (!match) return null;
  const entries = match[1]!.split(',').map((entry) => /^([mtp])=([1-9]\d{0,5})$/.exec(entry));
  if (entries.length !== 3 || entries.some((entry) => !entry) || new Set(entries.map((entry) => entry![1])).size !== 3) return null;
  const parameters = Object.fromEntries(entries.map((entry) => [entry![1], Number(entry![2])]));
  if (!(parameters.m! >= 19456 && parameters.m! <= 65536 && parameters.t! >= 2 && parameters.t! <= 6 && parameters.p! >= 1 && parameters.p! <= 4)) return null;
  if ([match[2]!, match[3]!].some((part) => Buffer.from(part, 'base64').toString('base64').replace(/=+$/, '') !== part)) return null;
  return { m: parameters.m!, t: parameters.t!, p: parameters.p! };
}
export function isSupportedPasswordHash(encoded: SensitiveValue): boolean {
  return readHashParameters(encoded) !== null;
}
export function needsPasswordRehash(encoded: SensitiveValue): boolean {
  const parameters = readHashParameters(encoded);
  if (!parameters) return true;
  // Never automatically downgrade a stronger stored cost to the current policy.
  if (parameters.t > ARGON2_POLICY.timeCost || parameters.p > ARGON2_POLICY.parallelism) return false;
  try { return argon2.needsRehash(encoded.reveal(), ARGON2_POLICY); } catch { throw new SecurityOperationError(); }
}
export async function hashPassword(password: unknown): Promise<SensitiveValue> {
  validatePassword(password);
  return capacity.run(async () => {
    try { return new SensitiveValue(await argon2.hash(password, ARGON2_POLICY)); }
    catch { throw new SecurityOperationError(); }
  });
}
export async function verifyPassword(encoded: SensitiveValue, password: unknown): Promise<boolean> {
  if (!isBoundedPassword(password) || !isSupportedPasswordHash(encoded)) return false;
  return capacity.run(async () => {
    try { return await argon2.verify(encoded.reveal(), password); }
    catch { throw new SecurityOperationError(); }
  });
}
let dummy: Promise<SensitiveValue> | undefined;
export async function initializePasswordSecurity(): Promise<void> {
  dummy ??= hashPassword(randomBytes(32).toString('hex')).catch(() => { dummy = undefined; throw new SecurityOperationError(); });
  await dummy;
}
export async function verifyDummyPassword(password: unknown): Promise<void> {
  // Never hard-code a hash or password. Initialization obeys the same capacity cap.
  await initializePasswordSecurity();
  const encoded = await dummy!;
  const bounded = isBoundedPassword(password) ? password : 'invalid-input-dummy-verification';
  await verifyPassword(encoded, bounded);
}
