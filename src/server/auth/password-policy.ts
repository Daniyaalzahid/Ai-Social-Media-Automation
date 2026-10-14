// Curated public rejection list, not credentials. No account uses these passwords.
const common = new Set([
  'passwordpassword', 'password12345678', '123456789012345', '1234567890123456',
  'qwertyuiopasdfgh', 'qwertyuiop123456', 'letmeinletmein123', 'iloveyouiloveyou',
  'welcome123456789', 'adminadminadmin', 'changemechangeme',
]);
export const PASSWORD_POLICY = Object.freeze({ minimumCharacters: 15, maximumCharacters: 128, maximumBytes: 512 });
export class PasswordPolicyError extends Error {
  constructor() { super('Password does not meet the password policy'); this.name = 'PasswordPolicyError'; }
}

/** Unicode scalar values; reject ill-formed UTF-16 instead of silently replacing it.
 * No trimming, case folding, normalization or truncation is applied to the password.
 * Case folding is used ONLY to compare against the local public rejection list.
 */
export function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length > 256 || !password.isWellFormed()) throw new PasswordPolicyError();
  const characters = [...password].length;
  if (characters < 15 || characters > 128 || Buffer.byteLength(password, 'utf8') > 512 || common.has(password.toLowerCase())) throw new PasswordPolicyError();
}

/** Verification bounds existing credentials without rejecting a newly blocklisted password. */
export function isBoundedPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length <= 256 && password.isWellFormed()
    && [...password].length >= 15 && [...password].length <= 128 && Buffer.byteLength(password, 'utf8') <= 512;
}
