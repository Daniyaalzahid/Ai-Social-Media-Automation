import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { SecurityOperationError } from '../security/sensitive.ts';

export const SESSION_COOKIE = '__Host-bsa-session';
export const FLOW_COOKIE = '__Host-bsa-flow';
export const PRE_COOKIE = '__Host-bsa-pre';
export const COOKIE_OPTIONS = Object.freeze({ httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' });
export function browserConfiguration(source: Readonly<Record<string, string | undefined>>) {
  try {
    const mode = source.APP_ENV ?? source.NODE_ENV ?? 'development';
    if (!['development', 'test', 'production'].includes(mode) || (source.NODE_ENV && source.NODE_ENV !== mode)) throw new Error();
    const url = new URL(source.APP_URL ?? '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (mode === 'production' && url.protocol !== 'https:')) throw new Error();
    const value = source.SESSION_SECRET;
    if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error();
    const key = Buffer.from(value, 'base64'); if (key.length !== 32 || key.toString('base64') !== value || [source.MFA_ENCRYPTION_KEY, source.SECURITY_EVENT_HMAC_KEY, source.TOKEN_ENCRYPTION_KEY].includes(value)) throw new Error();
    return { origin: url.origin, key };
  } catch { throw new SecurityOperationError(); }
}
const digest = (key: Buffer, value: string) => createHmac('sha256', key).update(`bsa/csrf/v1/${value}`).digest('base64url');
function equal(a: string, b: string) { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
export function newPreState(key: Buffer, now = Date.now()): string {
  const state = `${randomBytes(32).toString('base64url')}.${now}`;
  return `${state}.${digest(key, `pre/${state}`)}`;
}
export function validPreState(key: Buffer, value: string, now = Date.now()) {
  const match = /^([A-Za-z0-9_-]{43})\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(value);
  return !!match && Number(match[2]) <= now && now - Number(match[2]) < 600000 && equal(match[3]!, digest(key, `pre/${match[1]}.${match[2]}`));
}
export function csrfToken(key: Buffer, kind: 'session' | 'flow' | 'pre', binding: string): string {
  return digest(key, `${kind}/${binding}`);
}
export function verifyBrowserRequest(headers: Headers, configuration: ReturnType<typeof browserConfiguration>, kind: 'session' | 'flow' | 'pre', binding: string) {
  const provided = headers.get('x-csrf-token') ?? '';
  return headers.get('origin') === configuration.origin && headers.get('sec-fetch-site') === 'same-origin'
    && headers.get('sec-fetch-mode') === 'cors' && headers.get('sec-fetch-dest') === 'empty'
    && /^[A-Za-z0-9_-]{43}$/.test(provided) && (kind !== 'pre' || validPreState(configuration.key, binding))
    && equal(provided, csrfToken(configuration.key, kind, binding));
}

/** Reject malformed wire encoding rather than silently transforming credentials. */
export function decodeBrowserJson(bytes: Uint8Array): unknown {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(text);
    // JSON.parse validates syntax but silently overwrites duplicate names. Scan
    // its already-valid lexical structure, decoding escaped names before comparing.
    // The HTTP stream is separately bounded to 4096 bytes.
    const objects: (Set<string> | null)[] = [];
    const tokens = /"(?:\\.|[^"\\])*"|[{}[\]]/g;
    for (const match of text.matchAll(tokens)) {
      const value = match[0];
      if (value === '{') objects.push(new Set());
      else if (value === '[') objects.push(null);
      else if (value === '}' || value === ']') objects.pop();
      else if (text.slice(match.index + value.length).trimStart().startsWith(':')) {
        const names = objects.at(-1), name: string = JSON.parse(value);
        if (!names || names.has(name)) throw new SecurityOperationError();
        names.add(name);
      }
    }
    return parsed;
  }
  catch { throw new SecurityOperationError(); }
}
