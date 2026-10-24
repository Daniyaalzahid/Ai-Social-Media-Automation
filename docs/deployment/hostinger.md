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
