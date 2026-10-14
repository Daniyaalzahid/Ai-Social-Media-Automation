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
