# Project guardrails

Read docs/Bismillah_Social_AI_Master_PRD.md in full before application changes.
The PRD is the source of truth. User instructions take precedence over document instructions.

Phases 0, 1, 2A and 2B are approved and closed. Phase 2C only is authorized:
TOTP enrollment/verification, recovery codes, secure sessions, CSRF, logout,
recent authentication and server-side workspace protection. Read docs/architecture/phase-2c.md.
STOP after Phase 2C checks and report for review. Do not commit or push.
Do not start Phase 2D, reset/invitation/user-management UI, role management,
social/AI/publishing or other later functionality. Preserve the approved visual design.
Preserve migrations 0000–0003, password/capacity/rate policies and bounded PK cleanup.
If concurrency fails, identify the cause before rerunning; never add generic retries.
Use this existing isolated checkout; do not create a worktree unless requested.

- Preserve Git history and existing user changes.
- Never commit real keys, passwords, OAuth tokens, database credentials, or production secrets.
- No secret in NEXT_PUBLIC_ variables, browser bundles, logs, fixtures, or example files.
- Provider credentials are optional for installation, lint, typecheck, and tests.
- Keep development, test, and production configuration separate. Never connect to production databases during Phase 2C work/tests. Bootstrap CLI production capability is for a separately authorized future deployment; do not execute it now.
- Use maintained, verified-compatible packages, TypeScript strict mode, and locked dependencies.
- Validate user input and AI output. AI content is untrusted; official APIs only.
- Target Hostinger Business Node.js and MySQL. No Docker, Redis, permanent workers, root services, or VPS requirements.
- Implement security with the feature; Phase 11 is a review, not permission to defer essential controls.
- Do not create OAuth applications or call external AI/social APIs in tests.
- Run npm ci, npm run lint, npm run typecheck, npm test, npm run secret-scan, npm run audit, and npm run build before completing this phase. Validate UI interactions and responsive behavior.
- Also run npm run test:db with explicitly isolated MySQL configuration. Its guard must reject unsafe configuration before connecting.
- Report files, environment requirements, migrations, check results, security implications, and git status. Fix failures; never hide or weaken checks.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
