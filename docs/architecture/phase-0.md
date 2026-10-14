# Phase 0: repository and guardrails

Only Phase 0 is authorized. Phase 1 requires explicit user approval.
No pages, UI design system, database schema, auth, uploads, AI calls, OAuth, publishing, or scheduler are implemented.

## Toolchain decisions

Checked official npm metadata and upstream documentation before installation:

- Node 24.21.0: maintained LTS, npm 11.19.0 bundled. Official archive SHA-256 verified against the official HTTPS SHASUMS256.txt.
- Next 16.4.0: stable, Node >=20.9, React 19 compatible.
- React/React DOM 19.3.0: stable, within Next's supported peer range.
- TypeScript 6.0.3: stable compatible release. Latest major 7 is outside typescript-eslint's supported >=4.8.4 <6.1 range.
- ESLint 10.12.0 with @eslint/js 10.0.1 and typescript-eslint 8.71.2: maintained stable versions with verified compatible peer ranges. Installation revealed ESLint 9 is deprecated. The Next React lint preset is not installed because its React plugin only declares ESLint <=9 compatibility. React/framework-specific lint rules must be verified when Phase 1 is approved; Phase 0 uses maintained JS/TS rules and a tested custom client boundary rule.
- Vitest 5.0.4: stable, Node ^22.12 || ^24 || >=26. Node 24 satisfies this.
- Zod 4.6.7: strict server configuration validation.
- Secretlint 13.0.7: maintained, Node >=22, free local/CI scanning with recommended rules.
- Prisma and Argon2 are deliberately deferred until Phase 2 compatibility checks.

Sources:
- https://nodejs.org/dist/index.json
- https://github.com/nodejs/Release/blob/main/schedule.json
- https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/01-installation.mdx
- https://github.com/vitest-dev/vitest/blob/main/docs/guide/index.md
- https://registry.npmjs.org/next
- https://registry.npmjs.org/typescript-eslint
- https://registry.npmjs.org/eslint-plugin-react
- https://github.com/secretlint/secretlint

Direct Next, Vitest, and Hostinger documentation hosts returned proxy 403; official upstream Next/Vitest source and npm metadata were used instead. Hostinger account-specific support remains unverified.

## Boundaries and deferred decisions

Next and React dependencies prepare the framework foundation only. There are no routes or UI yet, so no dev/build/start commands or running-app claim in Phase 0.
The server environment entrypoint imports server-only. The tested ESLint rule rejects direct server imports, Node built-ins, dynamic unknown imports, require, and process access in use-client modules. It is an additional guardrail, not a complete transitive bundler proof; bundle leakage checks must be added once an application exists.

Future features must include their security controls when implemented. Phase 11 is a hardening review. Phase 2 must define RBAC, MFA/recovery policy, content revision approvals, OAuth state records, job connection identity, and retention policy. Do not connect to production MySQL in Phase 0.

CI uses commit-pinned official actions, read-only permissions, no persisted Git credentials, full history scanning, and no paid security service. Enable branch protection and require this workflow in GitHub settings before collaborative merges; it is documented, not enabled by this change.
