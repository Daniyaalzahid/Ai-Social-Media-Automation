# Phase 2A — database, environment and security data foundation

Phase 2A only is authorized. No login/logout, password authentication, bootstrap command,
MFA/TOTP/recovery flow, cookies, CSRF, password reset UI, user-management UI or protected
dashboard is implemented. The reviewed Phase 1 application remains a public UI preview.
Do not begin Phase 2B, commit or push without the user's review.

## Approved policies retained for later subphases

- No public registration; Owner-assisted invitations and password resets.
- One operational role per user: Owner/Super Admin, Marketing Admin, Creator, Reviewer, Viewer.
- Owner/Marketing: 30-minute inactivity, 24-hour absolute sessions; others: 2-hour inactivity, 7-day absolute. Sensitive privileged actions need 5-minute authentication/MFA freshness.
- Five active sessions maximum, no Remember Me. A sixth authenticated login must offer a restricted session-management response; it must not silently revoke another session. Session issuance must lock the user row, count unexpired/unrevoked sessions, and enforce the cap transactionally. None of this issuance behavior is implemented in 2A.
- Passwords: 15–128 Unicode characters, spaces/paste/managers allowed, no composition rules, trimming, truncation or routine expiry; local common-password blocklist. Argon2id conditional on actual hosting verification; no silent bcrypt fallback.
- Owner/Marketing must enroll TOTP; an enrolled optional-role user must use it. Password reset never removes MFA. Recovery codes are high-entropy, one-time, hashed, displayed once and batch-replaced. No hidden/web lost-factor bypass.
- CLI-only one-time Owner bootstrap, permanently consumed; protect last usable Owner. No HTTPS fallback.
- Owner-assisted reset: operational identity verification, recent reauthentication, single-use hashed code, approximately 15-minute expiry, user-selected password, revoke sessions/challenges, preserve MFA, fresh login.
- Owner/Marketing may self-approve; record self-approval on every future approval. Creator cannot approve; Reviewer cannot approve authored content. Content functionality is not implemented here.

## Compatibility and package selection

Node 24.21.0 / npm 11.19.0, Next 16.4.0, TypeScript 6.0.3 and all strict flags remain.
Kysely 0.29.6 (Node >=22, MIT) and mysql2 3.24.6 (Node >=8, MIT) are pinned.
Kysely is the maintained typed query-builder alternative permitted by the PRD. It uses
parameterized SQL and the ordinary Node MySQL driver, with no downloaded migration engine.

Prisma 7.10.0 declares Node 24 compatibility, but its official migration-engine checksum
download returned a proxy 403. Integrity checks were not bypassed. Drizzle 0.45.4/kit
0.31.11 were evaluated but failed the existing strict dependency declaration check and
introduced audit findings. Neither candidate remains in the manifest/lockfile.
Initial DDL was generated during Drizzle evaluation and reviewed/hardened into authoritative
versioned SQL; no generator dependency or generated Drizzle metadata is retained.

The esbuild 0.28.2 override originated from advisory findings in the discarded Drizzle-kit/
tsx experiment. Those packages and their esbuild consumers were removed. Current npm ls
shows esbuild is not installed: Vite 8.3.4 lists it as an optional peer. The retained pin is
within Vite's supported ^0.27.0 || ^0.28.0 range and constrains any future activation; it is
not an audit exemption or a currently installed hashing/database dependency.
TypeScript allowImportingTsExtensions supports Node 24 native type stripping in explicit
database tools; strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess and
skipLibCheck=false remain unchanged. No tsx/auth/native hashing package is installed.

Sources: official npm registry metadata for [Kysely](https://registry.npmjs.org/kysely/0.29.6),
[mysql2](https://registry.npmjs.org/mysql2/3.24.6), [Prisma](https://registry.npmjs.org/prisma/7.10.0),
and [esbuild](https://registry.npmjs.org/esbuild/0.28.2).

## Schema and relationships

15 security tables, plus three technical migration tables:

| Table | Foundation |
| --- | --- |
| users | Unique normalized email, bounded fields, invited/pending_mfa/active/disabled, hash slot, positive authentication version, UTC dates. Null hash only for invited placeholders; all other states require a nonempty hash. |
| roles / permissions | Unique canonical codes; no secret-view/decrypt permission. |
| user_roles | User/role FKs, composite primary key, additional UNIQUE(user_id) enforcing one role. |
| role_permissions | Composite unique capability mapping and reverse lookup. |
| sessions | Unique 32-byte token hash, user FK, auth version, activity/idle/absolute expiry, MFA/reauth dates, revocation metadata. |
| auth_challenges | Separate restricted-purpose hashed challenges; user FK, attempts, expiry, consumption/revocation. |
| mfa_methods | One TOTP method per user; ciphertext and exact IV/tag sizes; pending/active consistency and replay-step slot. |
| mfa_recovery_codes | Unique hash, method FK, batch, use/revocation dates. User ownership follows method FK, avoiding conflicting duplicated user IDs. |
| password_reset_tokens | Unique hash, target/issuer user FKs, expiry/use/revocation. |
| invitations | Separate activation record with unique hash, target/issuer, expiry/acceptance/revocation. Role comes from the invited user's assignment. |
| installation_state | CHECK(id=1), migration-seeded singleton, consumed timestamp and initial Owner FK must be set together. |
| auth_rate_limits | Composite scope/32-byte subject key, atomic-counter storage, backoff/expiry fields. No rate algorithm yet. |
| audit_logs | Actor/target/session FKs, action/outcome/correlation, bounded allowlisted metadata keys, pseudonymized IP slot. |
| security_events | Nullable user for unknown login actors, severity/type/outcome/correlation, restricted metadata keys. |

All security tables explicitly use InnoDB/utf8mb4_bin and UTC-oriented DATETIME(3).
Email storage must already be canonical lowercase/trimmed; the CHECK rejects casing drift.
Future validators must also validate email syntax and specify Unicode normalization; no
provider-specific email rewriting is implied. Random record IDs are supplied by future services.

Hashes use VARBINARY(32) with exact-length CHECKs: BINARY would silently pad short input.
MFA IV/tag also have exact-length checks. Session/challenge/reset/invitation/rate expiry
relationships are enforced. Unique indexes cover token hashes, email, codes and role mappings.
Composite indexes serve active-user session queries, MFA batches, actor/target/type/action
timelines and correlation lookups. Expiry indexes support later bounded cleanup.

Foreign keys use RESTRICT for deletion/update: disable users instead of erasing identities.
Audit session references preserve history; retention and purging need a later controlled procedure.
No content/social/publishing tables, separate login-attempt table, or separate session-history table.

## Access and grants

Application entry: src/server/db/client.ts imports server-only and lazily creates one
process-scoped pool. No page imports it yet, and import/build does not connect or migrate.
Tooling uses the underlying connection implementation within the server directory.
No client component may transitively import server modules.

Per-process pool default 2, configurable 1–10; queue limit 20, connection/acquisition
deadlines default 5 seconds, late acquisitions released, UTC and multipleStatements=false.
Production requires verified TLS; custom CA is optional, verification is never disabled.
Certificate hostname verification is explicitly enabled, minimum TLS is 1.2, and production
requires a DNS hostname because mysql2's explicit identity check skips IP-address servernames.
Every acquired connection also enables STRICT_ALL_TABLES while preserving existing SQL modes,
so invalid enums, truncated hashes and invalid numeric/date input cannot silently coerce.
Do not assume ten connections is acceptable on Hostinger: aggregate across processes.

Runtime grants are table-specific: roles/permissions/role_permissions and installation_state
are SELECT-only; users/sessions cannot be deleted; audit_logs/security_events are SELECT+INSERT
only; no migration-table or DDL grants. Other auth records get bounded-purpose DML including
DELETE for eventual factor removal/controlled cleanup. Development and test users cannot access
each other's databases. The local helper revokes stale grants before applying an explicit
15-table allowlist; unknown tables are never granted automatically. Production must reproduce
these restrictions where hosting permits.

No triggers are required: binlogged MySQL can require elevated privileges for trigger creation.
No SUPER/server-setting workaround is introduced. Runtime credentials cannot erase/bootstrap
the marker or mutate audit history; database administrators/migration credentials inherently can.
Later CLI/service code must permanently reject consumed bootstrap, enforce last usable Owner,
and authorize objects. These are not implemented or claimed by the data layer.

Metadata-key CHECKs are an additional barrier, not full secret redaction. Future event writers
must allowlist action/reason/field values, bound JSON size, and never serialize arbitrary
requests/errors. No active audit/security-event writer is implemented here.

## Migrations and recovery

- 0000_phase2a_security_foundation.sql: generated initial DDL, reviewed to add explicit storage/collation and exact byte checks; all FKs/indexes reviewed.
- 0001_security_invariants.sql: seed singleton and metadata-key constraints; no user/account bootstrap.
- 0002_review_integrity.sql: forward correction for non-invited password-hash requirements, token lifecycle timestamps, session revocation consistency and MFA timeline integrity. No columns/tables or authentication behavior added.
- manifest.json: checked SHA-256 for every SQL file; unexpected/changed files fail before SQL runs.
- Kysely migration journal/lock and schema_migration_checksums record ordered application and integrity. Applying/inconsistent state or changed applied checksum stops retry.
- Explicit db:migrate only; never development migration at application startup. Phase 2A commands reject production migration mode.

MySQL DDL has implicit commits. There is no automatic down/drop rollback in application tooling.
Before eventual production migration: backup, verified restore, SQL review, short maintenance
window, controlled migration credential, then checks. Failed/partial DDL requires inspection and
backup restoration or an explicitly reviewed forward migration; do not repeatedly retry it.

Integration tests recreate only guarded scratch schemas, verify a clean migration and rerun,
exercise partial persisted DDL and changed-checksum rejection, then restore synthetic records.
This is a local logical-snapshot recovery check, not a proven Hostinger full backup restore.

Seeds run explicitly under administrative tooling in one transaction. Five stable canonical
role IDs and 28 permission IDs/mappings are idempotent; canonical mapping drift is reconciled.
Conflicting canonical identities fail. No users, credentials, MFA material or sessions are seeded.
Both code and ID collisions fail transactionally before grant mapping is changed. A custom
record occupying a deterministic Owner/permission ID cannot acquire canonical privileges by seed.
Future-domain permission names reserve the matrix; they add no content/AI/social functionality.

## Isolated development/test workflow

Run with pinned Node/npm and no production bindings. On this cloud instance:

```sh
export PATH=/workspace/.tools/node-v24.21.0-linux-x64/bin:$PATH
export NPM_CONFIG_CACHE=/workspace/.npm-cache
npm ci
python3 scripts/local-mysql.py start
node --env-file=/workspace/.tools/phase2a-mysql/development.env scripts/database.mjs migrate
node --env-file=/workspace/.tools/phase2a-mysql/development.env scripts/database.mjs seed
node --env-file=/workspace/.tools/phase2a-mysql/test.env scripts/database.mjs migrate
node --env-file=/workspace/.tools/phase2a-mysql/test.env scripts/database.mjs seed
python3 scripts/local-mysql.py grants
node --env-file=/workspace/.tools/phase2a-mysql/test.env scripts/database.mjs test
python3 scripts/local-mysql.py stop
```

Helper prerequisites: Linux x64 with compatible libc/OpenSSL and supporting libraries,
Python, dpkg-deb. It extracts pinned official Ubuntu MySQL 8.0.46 packages with HTTPS and
SHA-256 checks into the local tool directory; no root installation, Docker or permanent worker.
Fresh initialization generates independent random local passwords. Private files are mode 0600
under a private directory outside checkout. Never print/commit these files. Stop/start retains
local data and credentials; no destructive reinitialization of existing directories.
CI uses RUNNER_TEMP/bismillah-tools when /workspace is unavailable/unwritable.

Ordinary npm test is database-independent; npm run test:db requires explicit local test URLs
and reset acknowledgement. Guard executes before launching Vitest, which does not rewrite
an inherited production environment into test mode. Loopback/user/database namespaces,
distinct credentials/grants and connected DATABASE()/CURRENT_USER() checks form layers.
SHOW GRANTS is checked before destructive SQL: global, non-test, delegated or role grants
are rejected. Database-level grant underscores must be escaped so they cannot be wildcards.
Destructive operations use only approved scratch databases and a fixed table drop order.
Do not use SSH tunnels to production under test names. Naming checks cannot prove the identity
of a deliberately disguised database; restricted grants and provisioning provenance are essential.

## Environment additions

.env.example has names only. No bootstrap web variables are added.

| Names | Classification |
| --- | --- |
| MFA_ENCRYPTION_KEY, SECURITY_EVENT_HMAC_KEY | Required by production core/authentication validation; production secrets. Optional for database-independent tooling and local schema tests. |
| MFA_ENCRYPTION_KEY_ID | Optional nonsecret rotation identifier. |
| DATABASE_MIGRATION_URL | Optional production deployment secret; unused/rejected by Phase 2A migration commands. |
| DEV_DATABASE_URL, DEV_DATABASE_MIGRATION_URL | Development-only credentials; required for respective DB operations. |
| TEST_DATABASE_URL, TEST_DATABASE_MIGRATION_URL | Test-only credentials; required for real MySQL tests. |
| TEST_DATABASE_RESET_ALLOWED | Test-only nonsecret explicit destructive-test gate. |
| DB_POOL_MAX, DB_POOL_ACQUIRE_TIMEOUT_MS, DB_CONNECT_TIMEOUT_MS | Optional bounded nonsecret operational controls. |
| DB_CA_CERT_PATH | Optional server TLS configuration path. |

Existing SESSION_SECRET stays separate. TOKEN_ENCRYPTION_KEY/CRON_SECRET/provider credentials
remain optional until their corresponding features. Production/nonproduction DB bindings cannot
mix; validation errors contain safe field names, not values. UI builds require no DB credentials.

## Hostinger gates and limitations

Verify actual Node/Next/MySQL version, CHECK enforcement (MySQL 8.0.16+), TLS CA/hostname,
pool/account limits, command execution, table-level runtime/migration grants and backups.
If the account uses MariaDB, explicitly re-evaluate SQL/JSON/check behavior; do not assume equivalence.
Argon2/native hashing remains unselected and requires actual hosting verification before auth.
Filesystem contains no production runtime security state. Local test helper is not a deployment
component. No Hostinger production database has been contacted.

GitHub CI is configured for a rootless MySQL job plus the existing checks/browser job; remote
execution is unverified until the reviewed change is committed/pushed. No deployment or phase
completion should be mistaken for implementation of authentication or authorization flows.

## Final security-review boundaries

Direct real-MySQL tests cover every live security CHECK by asserting its named rejection,
and compare the tested list to deployed information_schema constraints. Every FK is tested
with an orphan write and its RESTRICT delete/update behavior is inspected in the live database.
The migration runner rejects even an empty checksum ledger when the journal retains entries.

Email syntax, Unicode normalization, password-hash algorithm validation and user authorization
remain application responsibilities. The database rejects basic casing/trim drift but does not
implement normalization. Invitation placeholders may have no password; their invitations can
be revoked before activation. Do not fabricate a password merely to change account status.

No raw token, plaintext TOTP seed or recovery-code column is present. Fixtures use synthetic
ciphertext/hash stand-ins only. Database length checks cannot prove encryption or hashing.
Recovery used_at and last_accepted_step represent consumption/replay state; future code must
use atomic conditional writes and reject previously consumed steps/codes. Null used/consumed
timestamps alone NEVER establish token validity. Future token reads must require matching
purpose/owner, current auth version where applicable, unconsumed/unrevoked state and strictly
unexpired timestamps. Sessions require both idle and absolute expiry checks; pending MFA has
enrollment expiry; recovery codes are intentionally non-expiring until used/revoked/replaced.
No token activation/verification flow is implemented or guaranteed by the database alone.

Lifecycle CHECKs permit a previously consumed item to be revoked later, but reject timestamps
before creation and token consumption after recorded expiry. Those checks do not compare NOW():
expired unconsumed rows may remain for history and must be rejected by later authorization logic.
Runtime grants cannot reset installation state. Trusted migration/database administrators can;
permanent bootstrap rejection and last-Owner safety still need their separately approved CLI/
service implementation. Audit metadata keys are a partial barrier, never full secret redaction.
