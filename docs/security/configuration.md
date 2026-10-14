# Configuration and secret handling

`.env.example` contains names with empty values only. Do not commit actual environment files.
The ignore rules cover .env, .env.*, *.env, *.env.*, private key files, and secrets/. Git ignores do not remove already tracked secrets; the scanner also checks tracked files and history.

## Environment separation

- Development: APP_ENV=development, NODE_ENV=development. Database-independent tooling needs no credentials. Database commands require DEV_DATABASE_URL or DEV_DATABASE_MIGRATION_URL as appropriate.
- Test: APP_ENV=test, NODE_ENV=test. Unit/UI tests use synthetic configuration. The separate MySQL suite requires TEST_DATABASE_URL and TEST_DATABASE_MIGRATION_URL; destructive tests also require TEST_DATABASE_RESET_ALLOWED. Never inject production values or call AI/social APIs.
- Production: APP_ENV=production, NODE_ENV=production. Core validation requires APP_URL (HTTPS origin), DATABASE_URL, SESSION_SECRET, MFA_ENCRYPTION_KEY and SECURITY_EVENT_HMAC_KEY. Token encryption and cron secrets remain optional until their features are introduced. Store real values in hosting controls only.

Explicit conflicting APP_ENV and NODE_ENV values fail validation. Missing APP_ENV follows NODE_ENV or defaults to development. No environment loader runs at module import. The server entrypoint must be called by startup/request code when introduced in later phases.

## Variables

APP_URL: application origin; no embedded credentials, query, fragment, or path.
APP_ENV: development, test, or production.
DATABASE_URL: production-only MySQL connection string; rejected in development/test. Database access validation is separate from authentication readiness and never runs on UI import/build.
SESSION_SECRET and CRON_SECRET: at least 32 characters when set. Generate high-entropy independent values outside Git; minimum length does not prove entropy.
TOKEN_ENCRYPTION_KEY: canonical base64 encoding of exactly 32 random bytes; separate from the database and other secrets.
MFA_ENCRYPTION_KEY and SECURITY_EVENT_HMAC_KEY: independently generated canonical base64 encodings of 32 random bytes. Equal bindings among these, SESSION_SECRET and TOKEN_ENCRYPTION_KEY are rejected; operators must also generate independent high-entropy values.
MFA_ENCRYPTION_KEY_ID: optional nonsecret rotation identifier. No encryption or MFA flow is implemented yet.
DEV_DATABASE_URL/DEV_DATABASE_MIGRATION_URL and TEST_DATABASE_URL/TEST_DATABASE_MIGRATION_URL: nonproduction credentials with distinct runtime/migration identities. Local loopback only, bsa_dev_/bsa_test_ database and user namespaces, and no query-string overrides. A migration identity must end in _migration; runtime in _runtime.
DATABASE_MIGRATION_URL: reserved production administrative credential. Production migrations remain explicitly rejected. The Phase 2B interactive bootstrap CLI can intentionally select this separate identity only with explicit production modes and a matching database/host; no production execution is authorized during development.
DB_POOL_MAX: 1–10, default 2 per process. DB_POOL_ACQUIRE_TIMEOUT_MS and DB_CONNECT_TIMEOUT_MS: 100–10000, default 5000. Queue length is bounded at 20; late acquisitions are released.
DB_CA_CERT_PATH: optional private server CA path; production DB connections require verified TLS certificate chain and hostname, TLS 1.2+, and a DNS hostname. Do not weaken verification to address a hosting mismatch. SQL sessions enforce UTC and STRICT_ALL_TABLES.
TEST_DATABASE_RESET_ALLOWED: test-only explicit destructive-operation acknowledgement. This does not override host/name/user/environment guards or database grants.

All provider settings remain optional during Phase 2B and production core validation:
OPENROUTER_API_KEY, OPENROUTER_MODEL;
META_APP_ID, META_APP_SECRET;
TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET;
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET;
LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET.
The readiness helper requires a provider's fields only when explicitly invoked. It implements no provider, network call, or credential authenticity check.

Never use NEXT_PUBLIC_ for credentials. Validation rejects credential-like public names, including empty bindings. Never serialize the validated server environment into a response. Validation throws sanitized field names only, never raw Zod errors, input values, or secret-bearing URLs.

## Security scans

`npm run secret-scan` checks Git-visible tracked/untracked files and every reachable HEAD-history blob. It includes dotfiles, checks prohibited credential file names, enforces empty example values, and runs Secretlint's recommended detectors with AWS access-key ID scanning explicitly enabled. Detector output is withheld on failure to prevent accidental disclosure. Ignored local secret files are intentionally outside the working-tree scan. Other branches, dangling objects, and external storage are not covered.

`npm run audit` checks all production and development dependencies and fails for any reported advisory severity. These checks depend on known patterns/advisories; passing is not a guarantee that all secrets or vulnerabilities are absent.

Phase 2B adds no environment names. SECURITY_EVENT_HMAC_KEY is required when the private password-stage service is initialized, not during UI import/build or database-only commands. No session/MFA feature uses its reserved keys yet. CLI bootstrap uses interactive password input, never a password environment variable.

No browser authentication or protected dashboard is claimed in Phase 2B. Database grant restrictions and schema constraints do not replace later MFA/session/CSRF/object-authorization implementations. See the Phase 2A architecture for schema/grant limitations and Phase 2B architecture for restricted authentication and CLI boundaries.
