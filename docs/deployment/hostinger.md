# Hostinger deployment assumptions

Production target: Hostinger Business Web Hosting with Node.js and MySQL.
No Docker, Redis, root-dependent service, VPS, or permanent worker is introduced.
Phase 0 does not deploy, connect to a database, create OAuth apps, or configure production secrets.

Before later deployment, verify in the actual hosting account:

- Node 24 LTS support at the selected patch or a compatible maintained patch; this repository currently pins 24.21.0 and bundled npm 11.19.0.
- Next.js build/start support and runtime environment variables.
- MySQL version, transactions/locking, connection limits, and least-privilege application/migration users.
- Cron interval, secure invocation support, request execution limits, and bounded dispatch capacity.
- Persistent private upload storage, deployment behavior, upload size limits, memory, and video transfer timeouts.
- HTTPS, final application domain, outbound official API destinations, backups, and restore procedure.

Hostinger documentation access was blocked by the cloud proxy. No account-specific compatibility is asserted. If Node 24 is unavailable, stop and evaluate a maintained compatible toolchain before changing pins. No infrastructure workaround is authorized.

No build/start command is validated in Phase 0 because no application routes exist. OAuth callbacks, migrations, secure owner bootstrap, cron dispatch, and production smoke tests belong to later phases.
