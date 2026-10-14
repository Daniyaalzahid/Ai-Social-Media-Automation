import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import { EnvironmentValidationError, requireProviderConfiguration, validateEnvironment } from '../../src/server/config/schema';

function production() {
  return {
    NODE_ENV: 'production', APP_ENV: 'production', APP_URL: 'https://social.example.test',
    DATABASE_URL: new URL(`mysql://production_fixture:${'fixture'.repeat(6)}@127.0.0.1/production_fixture`).href,
    SESSION_SECRET: 'session-fixture-'.repeat(3),
    CRON_SECRET: 'cron-fixture-'.repeat(3),
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    MFA_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'),
    SECURITY_EVENT_HMAC_KEY: Buffer.alloc(32, 9).toString('base64'),
  };
}

describe('environment validation', () => {
  it.each(['development', 'test'] as const)('supports credential-free %s tooling', (mode) => {
    const result = validateEnvironment({ NODE_ENV: mode, APP_ENV: mode });
    expect(result.APP_ENV).toBe(mode);
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.OPENROUTER_API_KEY).toBeUndefined();
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('defaults to development without loading environment files', () => {
    expect(validateEnvironment({}).APP_ENV).toBe('development');
  });
  it('treats the empty example values as unconfigured', () => {
    expect(validateEnvironment({ OPENROUTER_API_KEY: '', META_APP_SECRET: '  ' }).META_APP_SECRET).toBeUndefined();
  });
  it('requires core production settings while all providers stay optional', () => {
    const result = validateEnvironment(production());
    expect(result.APP_ENV).toBe('production');
    expect(result.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(EnvironmentValidationError);
  });
  it.each(['APP_URL', 'DATABASE_URL', 'SESSION_SECRET', 'MFA_ENCRYPTION_KEY', 'SECURITY_EVENT_HMAC_KEY'])('rejects missing production %s', (key) => {
    const source: Record<string, string> = production();
    delete source[key];
    expect(() => validateEnvironment(source)).toThrow(key);
  });
  it('does not require scheduler or OAuth encryption configuration before those phases', () => {
    const source: Record<string, string> = production();
    delete source.CRON_SECRET;
    delete source.TOKEN_ENCRYPTION_KEY;
    expect(validateEnvironment(source).APP_ENV).toBe('production');
  });
  it('requires independent security keys', () => {
    expect(() => validateEnvironment({ ...production(), SECURITY_EVENT_HMAC_KEY: production().MFA_ENCRYPTION_KEY })).toThrow(EnvironmentValidationError);
  });
  it('rejects a production database binding in nonproduction modes', () => {
    expect(() => validateEnvironment({ APP_ENV: 'test', DATABASE_URL: production().DATABASE_URL })).toThrow('DATABASE_URL');
  });
  it('rejects test configuration in production', () => {
    expect(() => validateEnvironment({ ...production(), TEST_DATABASE_RESET_ALLOWED: '1' })).toThrow('TEST_DATABASE_RESET_ALLOWED');
  });
  it.each([
    { APP_ENV: 'staging' },
    { NODE_ENV: 'test', APP_ENV: 'production' },
    { NODE_ENV: 'production', APP_ENV: 'development' },
    { NODE_ENV: 'unexpected' },
    { APP_URL: 'javascript:alert(1)' },
    { APP_URL: 'https://user:password@example.test' },
    { APP_URL: 'https://example.test/path?token=unsafe' },
    { DATABASE_URL: 'postgres://user:password@localhost/db' },
    { DATABASE_URL: 'mysql://localhost/db' },
    { SESSION_SECRET: 'short' },
    { CRON_SECRET: 'short' },
    { TOKEN_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') },
  ])('rejects invalid or mixed configuration %#', (source) => {
    expect(() => validateEnvironment(source)).toThrow(EnvironmentValidationError);
  });
  it('requires HTTPS and a database password in production', () => {
    expect(() => validateEnvironment({ ...production(), APP_URL: 'http://social.example.test' })).toThrow('APP_URL');
    expect(() => validateEnvironment({ ...production(), DATABASE_URL: 'mysql://user@127.0.0.1/test_only' })).toThrow('DATABASE_URL');
  });
  it.each(['API_KEY', 'CLIENT_KEY', 'OPENROUTER_KEY', 'TOKEN_ENCRYPTION_KEY', 'SESSION_SECRET', 'ACCESS_TOKEN', 'DATABASE_URL', 'PASSWORD'])('rejects NEXT_PUBLIC_%s credentials even when blank', (suffix) => {
    expect(() => validateEnvironment({ [`NEXT_PUBLIC_${suffix}`]: '' })).toThrow('forbidden credential');
  });
  it('does not return unknown values from the process environment', () => {
    expect(validateEnvironment({ UNRELATED_PRIVATE_VALUE: 'fixture' })).not.toHaveProperty('UNRELATED_PRIVATE_VALUE');
  });
  it('does not log or retain invalid secrets in errors', () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    const supplied = 'invalid-fixture-value';
    let caught: unknown;
    try { validateEnvironment({ SESSION_SECRET: supplied }); } catch (failure) { caught = failure; }
    expect(caught).toBeInstanceOf(EnvironmentValidationError);
    expect(String(caught)).not.toContain(supplied);
    expect(JSON.stringify(caught)).not.toContain(supplied);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
  it.each(['openrouter', 'meta', 'tiktok', 'youtube', 'linkedin'] as const)('checks %s only when explicitly requested', (provider) => {
    const env = validateEnvironment({ APP_ENV: 'test' });
    expect(() => requireProviderConfiguration(env, provider)).toThrow(EnvironmentValidationError);
  });
  it('does not make incomplete optional provider configuration a startup requirement', () => {
    const env = validateEnvironment({ META_APP_ID: 'test-app-id' });
    expect(env.META_APP_ID).toBe('test-app-id');
    expect(() => requireProviderConfiguration(env, 'meta')).toThrow('META_APP_SECRET');
  });
});
