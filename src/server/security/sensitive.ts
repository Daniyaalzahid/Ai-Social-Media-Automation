import { inspect } from 'node:util';

/** Explicit reveal only at the database/credential boundary; ordinary inspection is safe. */
export class SensitiveValue {
  #value: string;
  constructor(value: string) { this.#value = value; }
  reveal(): string { return this.#value; }
  toJSON(): string { return '[redacted]'; }
  toString(): string { return '[redacted]'; }
  [inspect.custom](): string { return '[redacted]'; }
}

export class SecurityOperationError extends Error {
  constructor() { super('Security operation unavailable'); this.name = 'SecurityOperationError'; }
}
