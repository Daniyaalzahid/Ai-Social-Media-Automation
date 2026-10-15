# Phase 3 — Brand Brain implementation review (A–AM)

Historical implementation gate before the final adversarial review. See [phase-3-adversarial.md](phase-3-adversarial.md) for current findings, repairs and final counts.

Base: main, 974503822f98ca180e4704a756e44c6902b15816. No commit/push or Phase 4 work. The original Phase 3 request and subsequent explicit brand.read approval control this implementation. Architecture details: [phase-3.md](../architecture/phase-3.md).

| Item | Implementation / evidence |
|---|---|
| A — Architecture | One operational brand, relational typed marketing configuration, central server authorization, transaction/revision/audit service, existing-design UI. No AI/provider/prompt generation. |
| B — Schema | brands plus 14 child tables; configuration singleton/unique scopes, same-brand references, bounded JSON arrays only. 60 new CHECKs and 18 restrictive FKs. |
| C — Migration | New 0006_brand_brain.sql; old 0000–0005 unchanged. Clean/exact Phase 2D upgrade, repeat, tampering and preservation tests. Explicit migrate then seed, never startup migration. |
| D — Profile | Name, HTTPS website, description, business type, country, timezone, summary, approval and revision. Only explicitly supplied name/website/Pakistan/Asia-Karachi seeded; other business facts empty. Profile stays active/approved as the stable operational identity. |
| E — Contacts | Label, type, normalized machine value, separate display value, general/sales/support/WhatsApp usage, primary flag, approval/activity/order. One approved active primary per type. |
| F — Locations | Branch name/city/address/short label, optional same-brand contact, activity/approval/order. No invented branch/address/phone seeds. |
| G — Language | Explicit English/Urdu/Roman Urdu/mixed enum, allowed set, default, mixing behavior and bounded guidance. No guessed initial preference. |
| H — Tone | Closed multi-select attributes plus short guidance; unconfigured until saved. |
| I — Platforms | Five optional unique platform scopes with guidance and tone overrides; global configuration remains separate, no generation. |
| J — CTAs | Text/language/optional platform/context, activity/approval/order; all editable, no immutable sample entries. |
| K — Claims | All 13 categories, three mutually exclusive source-policy enums; conservative documented defaults. Missing/inactive rules become EXPLICIT_APPROVAL_REQUIRED. Unknown category/policy rejects. Policy alone is not evidence for a factual claim. |
| L — Wording | Banned/discouraged phrase, language/reason, activity/approval; original copy preserved, comparison-only NFC/lowercase/whitespace normalization. |
| M — Hashtags | Global + platform scopes, enabled state, min/max 0–20, bounded normalized brand/banned lists; contradictions reject. |
| N — Emoji | NONE/MINIMAL/MODERATE, <=12 preferred/prohibited sequences each, conflicts reject; no complex taxonomy. |
| O — Categories | Name, <=6 approved selling points, wording guidance, prohibited claim enums, optional CTA, platform notes, approval/activity/order. No catalog sync/specification invention. |
| P — Seasonal | Manual name/guidance/language/tone/CTA overrides; no scheduling/date activation or campaign offer creation. |
| Q — Examples | Label/platform/language/text/category/context, activity/approval/order; reference data only, plain text, <=1600 code points. |
| R — Revision | Mandatory expectedRevision, one increment per successful save, no lost update; stale revision 409. Revision, row write and required audit commit atomically. |
| S — Projection | Authenticated server-only service produces typed approved marketing data and revision. No public context endpoint; no audit/user/auth/security state, no internal record IDs. Inactive references resolve to null. |
| T — Bounds/order | Row/list/text caps, deterministic display-order + UUID ordering, full approved projection <=128 KiB UTF-8. Excess approval/edit rolls back, no silent truncation/selection. This is not a model-specific token budget. |
| U — Fact semantics | Persistent approved facts separate from future request-specific campaign prices/stock/offers. Free-text guidance/examples are contextual data, not executable instructions. Future generated output still requires schema validation + human review. |
| V — RBAC | Exactly brand.read added (29 total). Explicit read grants: OWNER, MARKETING_ADMIN, CONTENT_CREATOR, REVIEWER; VIEWER denied. brand.manage remains OWNER only. All four non-Owner roles reject crafted writes. Existing 28 grants preserved. |
| W — Audit | Closed brand kind/action + validated record ID + numeric revision; actor/session dedicated existing columns. No entire records/content dumping. Mutation + revision rollback if required audit insert fails. Existing append-oriented runtime grants retained. |
| X — Validation | Strict request/data schemas, enums/IDs/URLs/email/timezone, deliberate phone format, Unicode limits, forbidden extras/controls, bounded 16 KiB Brand request body. Existing authentication/Team body bound remains 4 KiB. |
| Y — Multilingual | English/Roman Urdu/Urdu round-trip exactly; code-point limits; no global copy normalization/trimming/truncation. Browser and MySQL cover Urdu and HTML-like text. |
| Z — Concurrency | Actor user/security -> brand -> marketing records/references -> revision/audit. Current locking reads after brand lock avoid stale REPEATABLE READ snapshots. Separate-pool singleton and update/deactivate races have one winner. No generic retries or isolation changes. |
| AA — UI | Ten keyboard tab groups, compact labeled structured forms, explicit approval, validation/save/conflict states, read-only views, empty states, deactivation confirmation and unsaved-change guards. Existing DM Sans/colors/cards/layout retained. |
| AB — Responsive | Browser checks 320/375/390/768/1440, tab keyboard access and unsaved-edit retention; no horizontal overflow. Multilingual text wraps. No sensitive screenshots/traces/video captured. |
| AC — Focused security | Current RBAC, CSRF/Origin/Fetch Metadata, strict/duplicate-body handling, XSS text rendering, brand/record IDOR, audit rollback, context filtering/budget and stale revision checked. No independent massive auth redesign. |
| AD — Defects repaired | Initial deterministic claim seed IDs were not RFC-valid UUIDs; schema validation correctly denied initial reads. Fixed only new 0006 seed IDs to valid deterministic UUIDs; migration/initial-seed regression and real restricted-runtime read confirm repair. Current-read review also made contact-primary lookup a locking read, preventing old transaction snapshots from hiding a competing primary. No prior migrations changed. The editor now exposes invalid display-order/profile-state errors rather than silently refusing a save, with a UI regression. A synthetic credential-bearing URL literal in a rejection test triggered BasicAuth scanning; it is now constructed only in test memory, preserving the rejection check without a credential-shaped repository literal. Scanner policy was not relaxed. A substring-based test falsely matched approvedExamples; replaced with exact recursive forbidden-field checks, preserving actual secret-material assertions. |

## AE–AJ — Final verification

- AE — Unit/UI: **265 passed**, 19 files; includes public-canary expected-failure controls with preserved child failure status.
- AF — Isolated real MySQL: **425 passed**, 12 files, including 36 Brand Brain tests. No unexpected deadlock/concurrency error. Clean and exact Phase 2D upgrades passed.
- AG — Browser: **67 passed**, retries **0**, all browser specs. Responsive widths 320/375/390/768/1440 passed.
- AH — npm ci, zero-warning lint, strict typecheck and optimized production build: **passed**. Clear only ignored .next/dev output before typecheck/build after browser development runs to avoid Next's duplicate generated declarations; no strictness/config reduction.
- AI — Secret scan: **185 repository files**, **264 unique historical blobs**, **8 commits**, passed. npm audit: **0 vulnerabilities**. npm ls --all: **exit 0**, no invalid/extraneous dependencies or Prisma/Drizzle.
- AJ — All **7** manifest SHA-256 checksums match; **0000–0005 byte-identical to main HEAD**; migration order 0000–0006. No startup migrations. git diff --check passed.

## AK — Hostinger gates

No production deployment or production database access. Existing Node/native Argon2/AES-GCM/MySQL TLS/connection-limit/clock/HTTPS/proxy-attribution/secure-terminal gates remain. No Redis, Docker, daemon, permanent worker, vector store or external AI requirement. Manual invitation handoff remains bearer-possession proof, not independently verified email ownership.

## AL — Files created/changed

- `AGENTS.md`
- `migrations/manifest.json`
- `scripts/local-mysql.py`
- `src/app/(workspace)/[section]/page.tsx`
- `src/server/authorization/routes.ts`
- `src/server/db/catalog.ts`
- `src/server/db/schema.ts`
- `src/server/security/browser-request.ts`
- `src/styles/globals.css`
- `tests/browser/team.spec.ts`
- `tests/browser/ui.spec.ts`
- `tests/database/check-constraints.test.ts`
- `tests/database/foundation.test.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/database/phase2b-helpers.ts`
- `tests/unit/authorization.test.ts`
- `tests/unit/database-config.test.ts`
- `docs/architecture/phase-3.md`
- `docs/review/phase-3.md`
- `migrations/0006_brand_brain.sql`
- `src/app/(workspace)/brand-brain/page.tsx`
- `src/app/api/brand/route.ts`
- `src/features/brand/brand-brain.tsx`
- `src/features/brand/fields.ts`
- `src/features/brand/model.ts`
- `src/server/brand/service.ts`
- `tests/browser/brand.spec.ts`
- `tests/database/brand.test.ts`
- `tests/ui/brand.test.tsx`
- `tests/unit/brand.test.ts`

## AM — Repository state

Base main remains 974503822f98ca180e4704a756e44c6902b15816. Final status: 17 modified tracked files and 13 new files, index empty. Changes remain unstaged/untracked for review. No credentials, private environment files, diagnostic harnesses/dumps, build/test output or browser artifacts belong to the candidate tree. No commit/push. Phase 4 has not started.
