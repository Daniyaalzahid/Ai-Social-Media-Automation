# Configuration and secret handling

`.env.example` contains names with empty values only. Do not commit actual environment files.
The ignore rules cover .env, .env.*, *.env, *.env.*, private key files, and secrets/. Git ignores do not remove already tracked secrets; the scanner also checks tracked files and history.

## Environment separation

- Development: APP_ENV=development, NODE_ENV=development. Core secrets/database/provider values may be absent for Phase 0 tooling. Use ignored .env.local only if configuration is needed in later phases.
- Test: APP_ENV=test, NODE_ENV=test. Tests pass synthetic configuration explicitly; no dotenv files, production values, database connections, or external AI/social calls are used.
- Production: APP_ENV=production, NODE_ENV=production. Requires APP_URL (HTTPS origin), DATABASE_URL (MySQL URL with credentials), SESSION_SECRET, TOKEN_ENCRYPTION_KEY, and CRON_SECRET. Store real values in Hostinger controls only.

Explicit conflicting APP_ENV and NODE_ENV values fail validation. Missing APP_ENV follows NODE_ENV or defaults to development. No environment loader runs at module import. The server entrypoint must be called by startup/request code when introduced in later phases.

## Variables

APP_URL: application origin; no embedded credentials, query, fragment, or path.
APP_ENV: development, test, or production.
DATABASE_URL: MySQL connection string; optional in Phase 0; never exposed to clients.
SESSION_SECRET and CRON_SECRET: at least 32 characters when set. Generate high-entropy independent values outside Git; minimum length does not prove entropy.
TOKEN_ENCRYPTION_KEY: canonical base64 encoding of exactly 32 random bytes; separate from the database and other secrets.

All provider settings are optional during Phase 0 and even production core validation:
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

No active authentication or production security is claimed in Phase 0. Session security, CSRF, encrypted storage, uploads, OAuth, quotas, and publishing reliability are implemented in their assigned phases and reviewed before launch.
