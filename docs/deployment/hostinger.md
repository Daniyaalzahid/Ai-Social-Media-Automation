# Hostinger deployment assumptions

Production target: Hostinger Business Web Hosting with Node.js and MySQL.
No Docker, Redis, root-dependent service, VPS, or permanent worker is introduced.
Phase 2A uses isolated local MySQL only. It does not deploy, connect to Hostinger MySQL,
create OAuth apps, or configure production secrets.

Before later deployment, verify in the actual hosting account:

- Node 24 LTS support at the selected patch or a compatible maintained patch; this repository currently pins 24.21.0 and bundled npm 11.19.0.
- Next.js build/start support and runtime environment variables.
- MySQL 8.0.16+ with enforced CHECK constraints, InnoDB, transactions/locking, verified TLS, connection limits, and separate application/migration users with table-level grants. MariaDB or older MySQL requires explicit compatibility evaluation before deployment.
- Cron interval, secure invocation support, request execution limits, and bounded dispatch capacity.
- Persistent private upload storage, deployment behavior, upload size limits, memory, and video transfer timeouts.
- HTTPS, final application domain, outbound official API destinations, backups, and restore procedure.

Hostinger documentation access was blocked by the cloud proxy. No account-specific compatibility is asserted. If Node 24 is unavailable, stop and evaluate a maintained compatible toolchain before changing pins. No infrastructure workaround is authorized.

The Next.js build and existing UI browser checks are validated locally, not on Hostinger.
Phase 2A uses Kysely/mysql2 without a Prisma migration engine. No trigger, SUPER grant,
root service, or native hashing package is required by this data foundation.
Owner bootstrap, Argon2id, production migration execution, OAuth callbacks, cron dispatch,
backup/restore and production smoke tests still require their own verification/approval.

## First production database initialization

Use the separate administrative command only after the actual Hostinger engine/TLS,
backup, account permissions and identity have been reviewed. This procedure is not a
web-startup hook and does not deploy the application or connect during a build.
No production execution is authorized by the local implementation/validation work.

In a private administrative environment set APP_ENV=production and NODE_ENV=production.
Supply DATABASE_URL for the restricted web runtime account and DATABASE_MIGRATION_URL
for a different administrative account. Both must identify the same DNS hostname,
port and database, with nonempty passwords and no URL query/fragment. Production
DEV_/TEST_ database settings and TEST_DATABASE_RESET_ALLOWED must be absent.
Keep administrative credentials out of the web-server environment, Git and command
arguments. Supply DB_CA_CERT_PATH if needed; verified certificate/hostname validation
and minimum TLS1.2 remain mandatory. Never set NODE_TLS_REJECT_UNAUTHORIZED=0.

After provisioning the empty database/accounts through the hosting administration,
run from the repository root with the established Node24.21.0/npm11.19.0 toolchain:

```sh
npm run db:provision:production -- --confirm-production-database=<EXACT_DATABASE_NAME>
npm run owner:bootstrap
```

Replace the placeholder only with the reviewed database name; it is not a password
or URL. Run one administrative provisioning invocation at a time. It validates both
URLs without opening a runtime pool, opens only the migration identity using verified
TLS, and checks live DATABASE()/CURRENT_USER() before schema administration. It reuses
the existing twelve migrations, checksum manifest, journal and canonical catalog seed.
No new migration, default/demo user, password, Owner or provider profile is created.
The ordinary db:migrate/db:seed commands still refuse production. Startup never runs
this command; selecting development mode is not a provisioning workaround.

A rerun of a correctly migrated database verifies history, applies only unapplied
canonical migrations and reapplies the existing canonical role/permission seeds.
Canonical role-permission mappings are intentionally synchronized by the existing
seed implementation; this is not a user-data reset. There is no drop/reset/truncate,
down migration or automatic destructive repair path. Failed/incomplete MySQL DDL is
not transactionally reversible: stop on failure, inspect journals safely and follow
reviewed backup/forward-recovery procedures; do not repeatedly retry or edit history.

The successful exit must precede Owner bootstrap. Production bootstrap now also
requires the complete verified migration journal; its existing exact catalog check,
separate admin identity, secure interactive TTY and one-time installation gate remain.
It creates only the intentional MFA_ENROLLMENT_REQUIRED Owner after protected prompts;
no password environment variable or default credential is introduced. Do not run the
second command when provisioning failed. Remove administrative credentials from the
operator environment afterward; the web account retains only reviewed runtime grants.
LinkedIn and all other social providers remain disabled/unverified.

## HOSTINGER BUSINESS WEB HOSTING SINGLE-DB-USER COMPATIBILITY MODE

Hostinger's reviewed Business Web Hosting constraint permits only one MySQL account
per database through hPanel. This administrative exception supports that product;
the separate runtime/admin two-user model above remains the default and preferred
model. No account name, host, password or database name is hardcoded in the application.

The sole opt-in is HOSTINGER_SINGLE_DB_USER_PROVISIONING=true. Omitted or exact false
retains different decoded usernames. Only exact lowercase true enables this mode;
empty strings, whitespace-padded values, 1/0, yes/on and other spellings are rejected
by administrative admission. In this mode BOTH URLs remain mandatory and must identify
the same hostname, port, schema, decoded username AND decoded password. Separate users
or conflicting passwords are rejected in single-user mode; use the default mode for
separate users. Both complete URLs are validated. Exact production selectors and
--confirm-production-database=<EXACT_DATABASE_NAME> remain required for provisioning.
TLS, DNS-host restrictions, live account/database checks, journals/checksums, canonical
seeds and production db:migrate/db:seed prohibitions are unchanged. No grant-management
SQL, reset/drop/truncate option, down migration or startup migration is introduced.

Initial provisioning, during a separately authorized deployment:

1. Keep the web service stopped/inaccessible while the single account has elevated
   privileges. Confirm backups, MySQL/TLS compatibility and the actual hPanel privilege
   controls; the single-account limitation does not establish privilege-edit capability.
2. In hPanel temporarily enable only the provisioning privileges listed below for the
   selected database account. Do not use global privileges or GRANT OPTION.
3. In the PRIVATE administrative environment set APP_ENV=production, NODE_ENV=production,
   both DATABASE_URL and DATABASE_MIGRATION_URL to the same reviewed account/target and
   HOSTINGER_SINGLE_DB_USER_PROVISIONING=true. Retain the verified CA configuration.
4. Run npm run db:provision:production -- --confirm-production-database=<EXACT_DATABASE_NAME>.
   Require success: all twelve migrations, complete matching journals/checksums and
   the exact canonical 32-permission catalog. Stop on failure; do not blind-retry DDL.
5. With the flag still true, run npm run owner:bootstrap separately in its required
   secure interactive TTY. Existing confirmation, complete-journal/catalog and one-time
   Owner checks remain. No Owner is created by provisioning; future migrations do not
   rerun this consumed bootstrap step.
6. Close administrative connections. In hPanel remove CREATE, ALTER, INDEX and REFERENCES,
   and remove any other unused privileges (including DROP, views, routines, triggers,
   events, EXECUTE, temporary tables and explicit table locks). Verify actual grants
   against the runtime requirements below. This repository does not change grants.
7. Remove DATABASE_MIGRATION_URL and the compatibility flag from the NORMAL WEB runtime
   environment. Runtime configuration requires only DATABASE_URL, never the migration
   URL or this flag. Restart the managed web service with fresh database connections
   after privilege reduction. Complete Owner MFA through the normal restricted flow.
   Keep the administrative configuration private and available only for future maintenance.

Future reviewed migrations: enter maintenance/stop web access; back up; temporarily
restore only needed schema privileges in hPanel; supply both URLs and the exact true
flag in the administrative environment; run the reviewed provisioning command with
exact database confirmation; verify journals/catalog; close admin connections; reduce
grants immediately; remove the administrative URL/flag from web configuration; restart
with fresh runtime connections. Do not rerun Owner bootstrap. The reviewed future
migration set may require a newly reviewed privilege list; do not pregrant privileges.

Current privilege requirements (source-derived, not Hostinger execution evidence):

| Privilege | Normal runtime | Current 0000–0011 provisioning + seeding |
| --- | --- | --- |
| SELECT | Yes: authorization, application data, clocks and identity | Yes: catalogs, metadata, journals, INSERT...SELECT |
| INSERT | Yes: admitted application records/events | Yes: canonical data, migration journals/lock-row initialization |
| UPDATE | Yes: state/version/leases and duplicate-key upserts | Yes: checksums, canonical seed upserts |
| DELETE | Yes: bounded auth_rate_limits cleanup, social_transactions cleanup, social_credentials rotation/removal | Yes: existing canonical role_permissions reseeding |
| CREATE | No | Yes: tables, checksum/journal/lock tables in the existing database |
| ALTER | No | Yes: constraints, columns and unique keys, including ALTER TABLE...DROP CHECK |
| INDEX | No | Yes: standalone CREATE INDEX in migration0000 |
| REFERENCES | No new foreign keys at runtime | Yes: foreign keys in table definitions and ALTER TABLE |
| EXECUTE | No | No stored routines; built-in functions are not stored-routine EXECUTE |
| CREATE TEMPORARY TABLES | No | No |
| LOCK TABLES | No | No: InnoDB row locks/transactions and Kysely GET_LOCK/RELEASE_LOCK are not LOCK TABLES |
| DROP / CREATE VIEW / CREATE ROUTINE / ALTER ROUTINE / TRIGGER / EVENT | No | No current statement needs these grants; DROP CHECK uses ALTER, not DROP TABLE |

All twelve SQL files were inspected: only CREATE TABLE/INDEX, ALTER TABLE and INSERT
statements occur; SELECT/UPDATE/DELETE also arise from the existing migration/seed
code. No CREATE DATABASE, stored routine, trigger, view or event is installed. The
production database must already exist. Session UTC/STRICT_ALL_TABLES initialization
needs no global server-setting privilege. Older MySQL versions have different locking
read privilege rules: verify the actual supported engine/version; MySQL8.0.22+ allows
SELECT-only locking reads. Do not compensate for an incompatible server by granting
schema administration to normal runtime.

The privilege-type union is not a recommendation for blanket CRUD on every table.
Where hPanel permits table/column scoping, keep catalogs and installation_state read-only,
audit_logs/security_events and immutable publishing/content history append-only, and
DELETE limited to the three current cleanup/rotation tables above. No runtime grants
are needed on schema_migration_checksums or Kysely migration tables. The existing local
runtime grant map in scripts/local-mysql.py records broader reviewed DML capabilities,
including some reserved deletes; current query-derived DELETE needs are narrower.
If only database-wide DML is available, record that loss of table/column enforcement:
the single account can then mutate immutable history/catalog data if compromised.
If hPanel cannot remove schema privileges at all, do not start normal public runtime
under those privileges; obtain a separately reviewed hosting-compatible operational
solution. This mode does not claim that changing a flag reduces database privileges.

Tradeoff: web and administrative credentials identify the same account, so privilege
separation is temporal and operational rather than enforced by separate identities.
Maintenance isolation, actual grant reduction, closing old connections and restart are
mandatory. Environment-variable presence alone never enables LinkedIn or another
provider; all provider enablement/verification gates remain unchanged.


## Final Hostinger V1 deployment contract

This section defines the explicit managed-hosting exceptions; the default DNS/TLS,
two-user and local-private-filesystem contracts remain available elsewhere. This is
code readiness, not evidence of an actual Hostinger connection or deployment.
Providers remain disabled, including LinkedIn and OpenRouter (omit its credentials).

### Engine compatibility and canonical history

Provisioning admits MySQL 8.0.17+/8.x and 9.x, or MariaDB >=11.4.13 and <11.5.0, plus exact MariaDB 11.8.9.
Other engines/versions fail before migration/journal writes. Confirm the actual
Hostinger version: an older MariaDB does NOT become supported by setting a flag.
MariaDB CHECK enforcement must be enabled. The tested MariaDB engines are 11.4.13 and 11.8.9;
Docker was used only to obtain an isolated test engine, never as a hosting requirement.

All twelve historical SQL files and manifest hashes remain unchanged. CANONICAL_SOURCE_HASH
continues to identify the original migration in both journals. EXECUTED_ENGINE_COMPATIBLE_SQL
is a deterministic, reviewed execution mapping after source-integrity verification.
The mapper admits only the twelve exact reviewed source hashes, never arbitrary SQL.
MySQL executes the canonical statements. Future MariaDB migrations need explicit review.

| Migration | MariaDB execution review |
| --- | --- |
| 0000 | Shared InnoDB tables, named CHECK/FK constraints, indexes, utf8mb4_bin, millisecond DATETIME defaults; no translation |
| 0001 | Shared JSON_TYPE/KEYS/CONTAINS metadata constraints; no translation |
| 0002 | Exact users_active_password DROP CHECK becomes DROP CONSTRAINT |
| 0003 | Shared ALTER enum expansion; no translation |
| 0004 | Shared columns, foreign keys and CHECK; no translation |
| 0005 | Shared guard/seed/ALTER constraints; no translation |
| 0006 | Shared Brand Brain schema, indexes, FK, JSON arrays and seed DML; no translation |
| 0007 | Fixed case-sensitive ASCII REGEXP_LIKE predicates become BINARY REGEXP BINARY |
| 0008 | JSON_SCHEMA_VALID retained; JSON_STORAGE_SIZE becomes OCTET_LENGTH on MariaDB text JSON |
| 0009 | Same JSON storage mapping; generated active-review key retained |
| 0010 | Same JSON storage mapping; schema validation, binary comparisons and constraints retained |
| 0011 | Both reviewed regex and JSON storage mappings; composite FK and state constraints retained |

MariaDB JSON is validated text, unlike MySQL binary JSON. Its size predicates bound
actual UTF-8 stored text bytes (including whitespace); they do not pretend to compute
MySQL binary sizes. Thus edge-case acceptance can differ; no size predicate is removed.
JSON schema, uniqueness, MIME/state, ID grammar and authorization constraints remain.
Runtime shared row locks compile to LOCK IN SHARE MODE, supported by both engines;
exclusive locks remain FOR UPDATE. Transactions, UTC/strict session initialization,
CURRENT_USER()/DATABASE(), information_schema journal queries, canonical seed upserts,
and GET_LOCK/RELEASE_LOCK retain their existing purpose. DDL remains nontransactional;
partial migration failure requires reviewed recovery, not automatic retry/reset.

Isolated MariaDB validation is separately available via npm run test:mariadb with
APP_ENV=test, NODE_ENV=test, TEST_DATABASE_RESET_ALLOWED=1 and a guarded local
TEST_DATABASE_MIGRATION_URL for bsa_test_maria_clean. Use only the dedicated disposable
schema/account with escaped schema-only grants. Existing MySQL tests remain required.

### Exact managed loopback transport

Set HOSTINGER_MANAGED_LOCAL_DB=true ONLY for the reviewed same-account endpoint
127.0.0.1:3306, with both APP_ENV=production and NODE_ENV=production explicitly set.
This is a local non-TLS transport exception authorized for this hosting deployment;
it does NOT provide certificate or hostname authentication. It relies on Hostinger's
managed local endpoint/isolation. It makes no claim that loopback proves the complete
underlying network topology. Never use this mode for a remote/proxied plaintext target.

The selector rejects other IPv4 addresses, IPv6, DNS hosts, other ports, missing or
conflicting production selectors, dev/test database identities, URL query/fragment
controls and alternate truthy values. Without exact true, production retains DNS-name
verified TLS >=1.2. No rejectUnauthorized=false or global TLS disable is introduced.
Local connections also admit the reviewed engine/version and CHECK enforcement.

Keep DATABASE_URL and DATABASE_MIGRATION_URL separate configuration inputs. For this
single-user Hostinger installation both identify the same reviewed account/password,
host, effective port and schema, with HOSTINGER_SINGLE_DB_USER_PROVISIONING=true in
the administrative environment. Exact database confirmation and live account/database
checks remain. Remove the single-user provisioning flag and migration URL from normal
web runtime after administration; KEEP HOSTINGER_MANAGED_LOCAL_DB=true because it is
the runtime transport selection. DB_CA_CERT_PATH does not authenticate plaintext
loopback and should be omitted in this local mode. It remains available for DNS/TLS.

### Durable private media: S3-compatible objects

Use MEDIA_STORAGE_BACKEND=s3 on this Hostinger plan. No durable media belongs inside
the checkout, public/public_html/htdocs/www, or deployment release directories.
The local adapter remains available for development/tests or deployments with a
verified private persistent path. No commercial object-store vendor is hardcoded.

The external bucket must be private, dedicated to this app, with public access blocked,
versioning disabled for V1 deletion semantics, no unrelated writers/lifecycle expiry
of live objects, HTTPS, and supported conditional PutObject If-None-Match:*, SHA-256
checksums, GetObject/HEAD/ranges, DeleteObject and ListObjectsV2. Review actual behavior
before production use. Give credentials only required object access under private-media/
and prefix-restricted listing; no account administration or public ACL privileges.
No permanent URLs or credentials enter MySQL; existing opaque keys stay authoritative.

All reads remain application-proxied AFTER existing media/content authorization.
The adapter preserves create-only writes, size/SHA admission, validated MIME, deletion
states, expiry/protection checks and approved publishing captures. SDK retries/region
redirects are disabled. Endpoints are server-owned HTTPS configuration, not browser
inputs. Per-object transfers are bounded at 32 MiB, with bounded network deadlines.

Validation and reads use disposable process-owned 0700 scratch directories and 0600
files under the platform temporary directory. These are NOT durable storage. Confirm
Hostinger allows private writable temporary storage, parser child processes, sharp/
mp4box, and native Argon2. At most four object read scratch handles are admitted per
process; normal close/stream completion removes them. Process-crash leftovers require
platform temporary-file reclamation; never expose temp files through a webroot.
The adapter does not require a persistent private upload path on Hostinger.

Cleanup uses existing DB lifecycle/holds plus bounded object-prefix orphan discovery:
at most five pages of 100 objects, with a 15-second listing budget. An incomplete or
looping listing fails closed instead of claiming completeness. Exceeding that inventory
requires reviewed maintenance/capacity adjustment. Configure failed multipart cleanup
at the store if otherwise used; this adapter itself uses bounded single PUTs.

### Final environment inventories

Set APP_ENV=production AND NODE_ENV=production explicitly. NODE_ENV is a framework/
process setting, not an inferred Hostinger default. The example now lists 41 names;
remove unrelated/optional imported entries instead of filling every field.

Normal provider-disabled Hostinger web runtime:

- APP_URL=https://social.binbazz.com
- APP_ENV=production; NODE_ENV=production
- DATABASE_URL=<PRIVATE_PERCENT_ENCODED_MYSQL_URL> (mysql protocol, reviewed user/password,
  exact host 127.0.0.1, port 3306, reviewed database path; no query or fragment)
- HOSTINGER_MANAGED_LOCAL_DB=true
- SESSION_SECRET, MFA_ENCRYPTION_KEY, SECURITY_EVENT_HMAC_KEY: independent canonical
  standard Base64 encodings of 32 random bytes, supplied privately; never example values
- MFA_ENCRYPTION_KEY_ID: reviewed 1–40 character ASCII letters/digits/underscore/hyphen ID
- MEDIA_STORAGE_BACKEND=s3
- MEDIA_S3_ENDPOINT: reviewed HTTPS root origin, without credentials/query/fragment
- MEDIA_S3_REGION: actual store signing region (1–80 letters/digits/hyphens)
- MEDIA_S3_BUCKET: actual private dedicated bucket
- MEDIA_S3_ACCESS_KEY_ID and MEDIA_S3_SECRET_ACCESS_KEY: private least-privilege credentials
- MEDIA_S3_FORCE_PATH_STYLE: omit for false/default, or exact true if required by the store

Keep DB_POOL_MAX / DB_POOL_ACQUIRE_TIMEOUT_MS / DB_CONNECT_TIMEOUT_MS omitted initially
(defaults 2 / 5000 / 5000; existing ranges unchanged). Omit DB_CA_CERT_PATH for local
transport. Do not set MEDIA_STORAGE_ROOT alongside the object backend.

Initial provisioning private environment (web access stopped):

- APP_ENV=production; NODE_ENV=production; HOSTINGER_MANAGED_LOCAL_DB=true
- DATABASE_URL and DATABASE_MIGRATION_URL: same reviewed local target and decoded credentials
- HOSTINGER_SINGLE_DB_USER_PROVISIONING=true
- Optional reviewed DB tuning only; no media/provider/authentication secrets required

Run npm run db:provision:production -- --confirm-production-database=<EXACT_DATABASE_NAME>.
It reports a sanitized engine version, rejects unsupported engines before schema writes,
applies/verifies canonical journals and seeds exactly 32 permissions. No Owner, provider
profile or default password is created. No startup migration or reset/down exists.

Owner bootstrap: retain the same PRIVATE administrative environment after provisioning
succeeds; run npm run owner:bootstrap in its secure interactive TTY. Protected prompts,
one-time gate and verified complete journal/catalog remain. Never pass a password in
an environment variable/argument. Finish normal Owner MFA after web runtime is ready.

Future migration maintenance: stop public web access, back up, restore only required
schema grants temporarily, supply the administrative environment above, run the reviewed
provisioning command, verify journals/seeds, close admin connections and reduce privileges.
Do not repeat consumed Owner bootstrap. Runtime requires only bounded/scoped SELECT,
INSERT, UPDATE, DELETE; current provisioning additionally uses CREATE, ALTER, INDEX,
REFERENCES. No automatic grant manipulation is implemented. Confirm hPanel can actually
reduce privileges; the compatibility mode itself does not reduce grants.

Then remove DATABASE_MIGRATION_URL and HOSTINGER_SINGLE_DB_USER_PROVISIONING from the
web process, retain the local transport selector, and restart with fresh connections.

Media maintenance: npm run media:cleanup -- --environment=production, using normal runtime
DB/object-store configuration. Schedule a non-overlapping invocation every five minutes
if supported by the hosting execution limits; require successful exit and monitor failures.
This is media cleanup, not social publishing dispatch. No permanent worker is required.

Optional providers: leave TOKEN_ENCRYPTION_KEY, OPENROUTER_API_KEY, OPENROUTER_MODEL,
META_APP_ID/SECRET, TIKTOK_CLIENT_KEY/SECRET, GOOGLE_CLIENT_ID/SECRET and
LINKEDIN_CLIENT_ID/SECRET unset. Credential presence never enables social providers;
OpenRouter must remain unconfigured for this V1 deployment. Provider token operations
will later need an independent 32-byte canonical Base64 TOKEN_ENCRYPTION_KEY.
CRON_SECRET currently has no operational consumer; omit it. All DEV_/TEST_ database and
media variables, especially TEST_DATABASE_RESET_ALLOWED, must be absent in production.
Never set NODE_TLS_REJECT_UNAUTHORIZED=0. No actual Hostinger/provider validation is
claimed by local tests; perform separately authorized deployment-only checks and backups.


### Hostinger MariaDB 11.8.9 reconciliation

The supplied Hostinger production banner is 11.8.9-MariaDB-log. Independent isolated
validation uses the official MariaDB 11.8.9 image, including a binary-log-enabled
local fixture; no Hostinger connection or credentials
are used. Admission adds ONLY exact 11.8.9 (including normal vendor/log suffixes), not
all 11.8 patches or MariaDB 11.x. The existing 11.4.13–11.4.x range remains unchanged.
11.8.8, 11.8.10 and 11.9 remain rejected pending their own review. This exact boundary
matches the deployment evidence and tested release without assuming future compatibility.

All twelve canonical migrations and their 148 translated statements use the existing
reviewed rules unchanged. Integration starts with an explicitly guarded empty test
schema and exercises provisioning, canonical journal hashes, idempotent seeds/rerun,
32 permissions, no automatic users/provider authorizations, live identity, shared and
exclusive locks, CHECK enforcement, regex/JSON semantics, generated unique keys, foreign
keys, Unicode, millisecond timestamps, authorization queries and transaction rollback.
MySQL validation remains separate and required. Neither the exact managed-loopback
transport exception nor default DNS/verified-TLS behavior changes in this reconciliation.
