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
