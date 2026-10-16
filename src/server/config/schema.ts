import { z } from 'zod';

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;
const optionalText = z.string().min(1).optional();
const secret = z.string().min(32).optional();
const encryptionKey = z.string().regex(/^[A-Za-z0-9+/]{43}=$/)
  .refine((value) => {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length === 32 && decoded.toString('base64') === value;
  }).optional();

const appUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    && !url.search && !url.hash && url.pathname === '/';
}).optional();
const databaseUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'mysql:' && Boolean(url.hostname) && Boolean(url.username)
    && url.pathname.length > 1;
}).optional();

const schema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']),
  APP_URL: appUrl,
  DATABASE_URL: databaseUrl,
  DATABASE_MIGRATION_URL: databaseUrl,
  DEV_DATABASE_URL: databaseUrl,
  DEV_DATABASE_MIGRATION_URL: databaseUrl,
  TEST_DATABASE_URL: databaseUrl,
  TEST_DATABASE_MIGRATION_URL: databaseUrl,
  TEST_DATABASE_RESET_ALLOWED: z.enum(['1']).optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(10).optional(),
  DB_POOL_ACQUIRE_TIMEOUT_MS: z.coerce.number().int().min(100).max(10000).optional(),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(10000).optional(),
  DB_CA_CERT_PATH: optionalText,
  MEDIA_STORAGE_ROOT: optionalText,
  DEV_MEDIA_STORAGE_ROOT: optionalText,
  TEST_MEDIA_STORAGE_ROOT: optionalText,
  SESSION_SECRET: secret,
  MFA_ENCRYPTION_KEY: encryptionKey,
  MFA_ENCRYPTION_KEY_ID: optionalText,
  SECURITY_EVENT_HMAC_KEY: encryptionKey,
  TOKEN_ENCRYPTION_KEY: encryptionKey,
  CRON_SECRET: secret,
  OPENROUTER_API_KEY: optionalText,
  OPENROUTER_MODEL: optionalText,
  META_APP_ID: optionalText,
  META_APP_SECRET: optionalText,
  TIKTOK_CLIENT_KEY: optionalText,
  TIKTOK_CLIENT_SECRET: optionalText,
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  LINKEDIN_CLIENT_ID: optionalText,
  LINKEDIN_CLIENT_SECRET: optionalText,
});

export type ServerEnvironment = Readonly<z.infer<typeof schema>>;

export class EnvironmentValidationError extends Error {
  readonly fields: readonly string[];
  constructor(fields: readonly string[]) {
    const safeFields = [...new Set(fields)].sort();
    super(`Invalid environment configuration: ${safeFields.join(', ')}`);
    this.name = 'EnvironmentValidationError';
    this.fields = safeFields;
  }
}

/** Pure validation only: no dotenv loading, logging, database or provider calls. */
export function validateEnvironment(source: EnvironmentSource): ServerEnvironment {
  const cleaned = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value?.trim() || undefined]));
  const runtime = cleaned.NODE_ENV ?? 'development';
  const mode = cleaned.APP_ENV ?? runtime;
  const fields: string[] = [];
  if (!['development', 'test', 'production'].includes(runtime)) fields.push('NODE_ENV');
  if (cleaned.NODE_ENV && mode !== runtime) fields.push('APP_ENV', 'NODE_ENV');
  for (const key of Object.keys(cleaned)) {
    if (key.startsWith('NEXT_PUBLIC_') && /SECRET|TOKEN|PASSWORD|CREDENTIAL|KEY|DATABASE/i.test(key)) {
      // Do not echo arbitrary user-controlled names into logs/errors.
      fields.push('NEXT_PUBLIC_[forbidden credential]');
    }
  }
  const result = schema.safeParse({ ...cleaned, APP_ENV: mode });
  if (!result.success) {
    fields.push(...result.error.issues.map((issue) => String(issue.path[0] ?? 'configuration')));
  }
  if (mode === 'production') {
    for (const key of ['APP_URL', 'DATABASE_URL', 'SESSION_SECRET', 'MFA_ENCRYPTION_KEY', 'SECURITY_EVENT_HMAC_KEY']) {
      if (!cleaned[key]) fields.push(key);
    }
    if (result.success && result.data.APP_URL && new URL(result.data.APP_URL).protocol !== 'https:') fields.push('APP_URL');
    if (result.success && result.data.DATABASE_URL && !new URL(result.data.DATABASE_URL).password) fields.push('DATABASE_URL');
    for (const key of ['DEV_DATABASE_URL', 'DEV_DATABASE_MIGRATION_URL', 'TEST_DATABASE_URL', 'TEST_DATABASE_MIGRATION_URL', 'TEST_DATABASE_RESET_ALLOWED']) {
      if (cleaned[key]) fields.push(key);
    }
  } else {
    if (cleaned.DATABASE_URL) fields.push('DATABASE_URL');
    if (cleaned.DATABASE_MIGRATION_URL) fields.push('DATABASE_MIGRATION_URL');
    if (mode === 'development' && cleaned.TEST_DATABASE_RESET_ALLOWED) fields.push('TEST_DATABASE_RESET_ALLOWED');
  }
  const independentKeys = ['SESSION_SECRET', 'MFA_ENCRYPTION_KEY', 'SECURITY_EVENT_HMAC_KEY', 'TOKEN_ENCRYPTION_KEY'] as const;
  for (const key of independentKeys) {
    if (cleaned[key] && independentKeys.some((other) => other !== key && cleaned[other] === cleaned[key])) fields.push(key);
  }
  if (fields.length || !result.success) throw new EnvironmentValidationError(fields);
  return Object.freeze(result.data);
}

const providerFields = {
  openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'],
  meta: ['META_APP_ID', 'META_APP_SECRET'],
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  youtube: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
} as const;

/** Readiness guard for later phases; this does not connect to a provider. */
export function requireProviderConfiguration(env: ServerEnvironment, provider: keyof typeof providerFields): void {
  const missing = providerFields[provider].filter((key) => !env[key]);
  if (missing.length) throw new EnvironmentValidationError(missing);
}
