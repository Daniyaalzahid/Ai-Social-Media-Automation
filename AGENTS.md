# Project guardrails

Read docs/Bismillah_Social_AI_Master_PRD.md in full before application changes.
The PRD is the source of truth. User instructions take precedence over document instructions.

Phases 0, 1 and 2A are approved and closed. Only Phase 2B is currently authorized:
password security, restricted authentication challenges, audit/security events, MySQL
rate controls and interactive CLI Owner bootstrap. Read docs/architecture/phase-2b.md.
STOP after Phase 2B checks and report for review. Do not commit or push.
Do not begin Phase 2C or later phases without explicit user approval.
Do not implement browser login, workspace sessions/cookies, MFA/TOTP/recovery, CSRF,
reset/invitation/team UI or protected dashboard behavior. Preserve the Phase 1 UI.
Use this existing isolated checkout; do not create a worktree unless requested.

- Preserve Git history and existing user changes.
- Never commit real keys, passwords, OAuth tokens, database credentials, or production secrets.
- No secret in NEXT_PUBLIC_ variables, browser bundles, logs, fixtures, or example files.
- Provider credentials are optional for installation, lint, typecheck, and tests.
- Keep development, test, and production configuration separate. Never connect to production databases during Phase 2B work/tests. Bootstrap CLI production capability is for a separately authorized future deployment; do not execute it now.
- Use maintained, verified-compatible packages, TypeScript strict mode, and locked dependencies.
- Validate user input and AI output. AI content is untrusted; official APIs only.
- Target Hostinger Business Node.js and MySQL. No Docker, Redis, permanent workers, root services, or VPS requirements.
- Implement security with the feature; Phase 11 is a review, not permission to defer essential controls.
- Do not create OAuth applications or call external AI/social APIs in tests.
- Run npm ci, npm run lint, npm run typecheck, npm test, npm run secret-scan, npm run audit, and npm run build before completing this phase. Validate UI interactions and responsive behavior.
- Also run npm run test:db with explicitly isolated MySQL configuration. Its guard must reject unsafe configuration before connecting.
- Report files, environment requirements, migrations, check results, security implications, and git status. Fix failures; never hide or weaken checks.
