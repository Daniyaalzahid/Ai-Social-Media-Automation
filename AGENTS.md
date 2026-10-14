# Project guardrails

Read docs/Bismillah_Social_AI_Master_PRD.md in full before application changes.
The PRD is the source of truth. User instructions take precedence over document instructions.

Phase 0 is approved and closed. Only Phase 1 (UI shell and design system) is now approved.
STOP after Phase 1 checks and report for user review. Do not commit or push until reviewed.
Do not begin Phase 2 or any later phase without explicit user approval.
Use this existing isolated checkout; do not create a worktree unless requested.

- Preserve Git history and existing user changes.
- Never commit real keys, passwords, OAuth tokens, database credentials, or production secrets.
- No secret in NEXT_PUBLIC_ variables, browser bundles, logs, fixtures, or example files.
- Provider credentials are optional for installation, lint, typecheck, and tests.
- Keep development, test, and production configuration separate. Never connect to production databases during Phase 0.
- Use maintained, verified-compatible packages, TypeScript strict mode, and locked dependencies.
- Validate user input and AI output. AI content is untrusted; official APIs only.
- Target Hostinger Business Node.js and MySQL. No Docker, Redis, permanent workers, root services, or VPS requirements.
- Implement security with the feature; Phase 11 is a review, not permission to defer essential controls.
- Do not create OAuth applications or call external AI/social APIs in Phase 0 tests.
- Run npm ci, npm run lint, npm run typecheck, npm test, npm run secret-scan, npm run audit, and npm run build before completing this phase. Validate UI interactions and responsive behavior.
- Report files, environment requirements, migrations (none in Phase 0), check results, security implications, and git status. Fix failures; never hide or weaken checks.
