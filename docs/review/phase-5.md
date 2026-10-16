# Phase 5 — implementation and targeted adversarial review

Baseline: clean main 701d490b50ec409857f7569c3068081164519f5a, local/remote verified equal before changes. Existing Phase4 357 unit/UI,542 MySQL,87 browser/0 retries. No staging/commit/push or Phase6. [Architecture and deliberate limitations](../architecture/phase-5.md).

## A–AS — Architecture and security decisions

| Item | Evidence |
|---|---|
| A Architecture | Bounded AI-assisted draft assembly, no Composer/approval/publishing. |
| B Provider abstraction | AiGenerationProvider with internal provider/model descriptor and bounded request/result contract. |
| C OpenRouter | Native fetch, fixed HTTPS endpoint, no SDK/dependency/retry/redirect/user-controlled routing. Official published SDK source verified outside checkout; direct docs blocked HTTP403. No live generation verified. |
| D Model | Existing server OPENROUTER_MODEL only, no browser selector or paid fallback. |
| E Environment | Reuse OPENROUTER_API_KEY/MODEL. No new names or real values. |
| F Catalog | 31 unchanged; existing ai.generate is semantically explicit. No permission extension needed. |
| G Grants | Owner/Marketing Admin/Creator generate; Reviewer/Viewer deny. Existing Brand/media grants unchanged. |
| H Authorization | Current server identity/catalog/session on reads, admission and post-provider completion. Own history only, including Owner. |
| I Media | Text-only; nonempty mediaIds rejects before binary read/egress. No media permission override. |
| J Projection | Reviewed createBrandService.context only; approved/active, validated, ordered, bounded131072 bytes. |
| K Revision | Exact captured revision persisted, unaffected by later edits during the external wait. |
| L Campaign facts | Strict category/source/value-or-index schema; free brief is not provenance. |
| M Provenance | Category/source/index bounded non-content metadata tied to authenticated creator and captured revision; no arbitrary dump. |
| N Thirteen categories | Closed input grammars/exact approved references; missing/unknown/explicit-approval policy fails closed. Supremacy/exclusivity/partnership approval unavailable pending later workflow. |
| O Numeric defense | Model supplies IDs only, never new/altered amounts; authorized literal copied exactly. Known stylistic digit hook allowed. |
| P Contacts/address | Exact approved typed Brand references only; no invented contact/URL/location, no outbound URL fetch. |
| Q Prompt | Fixed privileged instructions, separately serialized untrusted data, deterministic canonical platform/fact order. |
| R Template | social-safe-assembly-v1. |
| S Injection | No tools/eval/execution; variable content cannot edit privileged instructions. Unknown prose/IDs/fields reject. |
| T Output | Server-assembled strict social pack with exact selected platforms and separate YouTube title/description/tags. |
| U Parser | Bounded strict JSON, duplicate/escaped-key rejection, no markdown/prose extraction. |
| V Validation | Strict model plan plus deterministic source/policy/tag/wording/emoji checks; no raw prose marked validated. |
| W Requests | 16KiB HTTP input,2000-code-point brief,13 facts,5 platforms,192KiB provider payload. |
| X Responses | 64KiB provider body,4096 token budget,32KiB final pack plus per-platform bounds. No truncation. |
| Y Timeout | 5s body read,30s provider/cancel signal,45s DB lease. Remote cancellation/billing is not guaranteed. |
| Z Retry | No automatic provider/transaction retry. One explicit attempt; separate failure compensation never retries successful completion/provider work. |
| AA Errors | Closed safe provider/policy/input/capacity/cancellation classes; no raw upstream errors. |
| AB Rate | Existing backing table, separate scopes: actor3/minute,actor30/rolling24h,global100/rolling24h. Failed admitted attempts count; blocked transactions do not extend/increment. |
| AC Concurrency | MySQL guard, at most2 live leases across processes,1 per actor; no DB lock during external I/O. |
| AD Double-submit | Actor/request-ID uniqueness and canonical digest; existing result returned without a second provider call. New explicit ID for regeneration. |
| AE Persistence | Minimal two AI tables in0008; own bounded history; no Post/Composer tables. |
| AF Failure | FAILED/REJECTED store safe class and no output. DB outage can leave expiring lease; bounded next-admission reconciliation documented. |
| AG Retention | No complete prompt, raw provider response, rejected output, brief or reasoning persisted. Only validated output and bounded metadata. |
| AH Logging | No provider body/header/content logging; sensitive-value wrappers and context key guard. |
| AI Audit | Requested/admitted quota/record/audit atomic; completion/output/audit atomic; safe failed compensation. No content in audit. |
| AJ Usage | Optional bounded numeric counts; correctness/authorization do not depend on usage. |
| AK Image | Not supported; capability error, no external/binary access. |
| AL Video | Deferred; no frames/OCR/transcription/FFmpeg. |
| AM UI | Existing design, target/language/brief/typed fact, loading/cancel/error, read-only separated results, human-review label. |
| AN Accessibility | Labels, fieldsets, form status association, keyboard and320/375/390/768/1440 checks. |
| AO Unicode/XSS | React text rendering; invalid controls reject, Urdu joiners preserved; comparison normalization separate from display. |
| AP Privacy | No keys/tokens/actor IDs in provider context; no raw body/brief logging/storage; public DTO excludes digest/provenance/internal identity. |
| AQ Hostinger | UNVERIFIED; all prior gates retained plus outbound HTTPS, timeouts, fetch, memory and secret injection. |
| AR OpenRouter | Production UNVERIFIED; no real key/generation. Configured free-model availability/schema support is a deployment gate. |
| AS Dependencies | No additions/upgrades; SDK only read in/tmp, not installed. Existing Argon2 script allowlist unchanged. |

## AT–AU — Adversarial findings, repairs and explained development checks

- Free multilingual prose cannot be proven claim-safe by a giant keyword/NLP filter. The explicit bounded creative/fact-slot contract is intentionally more restrictive. Arbitrary product prose, unsupported fact formats, bespoke CTAs and free-form rewritten claims reject. Human source approval establishes authority, not independent factual truth. This limitation must be reviewed as product behavior.
- Category laundering is blocked by typed value grammars, not a claimed category label alone. Exact approved contact/location reference resolution stays server-side. Approval-required categories have no checkbox bypass.
- Banned comparisons originally used JSON serialization, which hides rendered newline boundaries. Actual rendered-string comparison plus Cf-insensitive comparison now covers line/Urdu-joiner bypass while preserving display text. Regression coverage included.
- Adapter refuses accidental configured API-key inclusion in message content before transport. Other server credentials never enter prompt construction. Output is a constrained plan, not unrestricted provider text.
- Provider/model metadata comes from the internal descriptor; business validation does not implement another provider. Initial DB provider enum remains OpenRouter only.
- Browser server explicitly empties inherited provider settings; valid-result fixtures use the constructor-injected test fake through the real service. No production fake-mode/environment/debug endpoint.
- Browser fixtures own/reset only isolated AI records/rate namespaces, preventing prior runs from consuming global quota/leases. Existing auth/media rate limits untouched.
- Initial targeted unit run had7 failures because Vitest unpacked platform-array rows into scalar arguments; wrapping rows as named objects corrected the fixture, preserving exact-success assertions. Type-only fixture casts and the repository-supported not.toBeDisabled matcher resolved test typing, without relaxing strict mode.
- Initial targeted MySQL run passed35 AI tests but one legacy checksum assertion expected8 instead of9. Updated count to the actual reviewed new migration; subsequent AI/migration run54/54 passed. No SQL/concurrency repair or retry.
- A first local typecheck saw existing duplicate generated Next dev/build type declarations. Removed only ignored .next/dev output and regenerated; no tsconfig weakening. Final gate starts with ignored caches cleared.
- Targeted evidence before full gate:104 AI unit/UI,54 AI/migration MySQL,9 browser with0 retries; strict typecheck/lint passed during implementation. No unexplained flaky test or concurrency failure occurred.

## AV–BD — Complete final gate

Complete gate passed once on the recorded33-path candidate (Node24.21.0/npm11.19.0), 2026-10-16. No implementation changes after it.

| Item | Final evidence |
|---|---|
| AV Unit/UI | 461 passed across25 files: Phase4 357 +102 new unit +2 new UI. |
| AW Isolated MySQL | 584 passed across14 files in279.42s: Phase4 542 +41 AI +1 exact0007-to0008 upgrade case. Existing auth/media/concurrency checks retained; both legitimate native Argon2 attempts succeeded, max active1, no DB errors. |
| AX Browser | 96 passed in2.1min, retries0: Phase4 87 +9 AI. No screenshots/traces/videos/DOM captures. |
| AY Tooling/build | npm ci, lint, strict typecheck and production build passed. No live production database/provider credentials required. |
| AZ Secret scan | Passed:232 repository files and348 historical blobs across10 commits. Compiled client JS contains no server-secret environment names. |
| BA npm audit | 0 vulnerabilities. |
| BB npm ls --all | Exit0; no invalid/extraneous dependency state. No added/upgraded dependencies; official SDK only inspected outside repo. |
| BC git diff --check | Passed. |
| BD Migrations | 9/9 SHA-256 entries match, deterministic0000–0008; 0000–0007 byte-identical to Phase4. New0008 checksum d081f12d4575f5b9b1092fada7d761445f6dcaff90c364b0cd0d3f4566e0c7f1. Clean/upgrade/repeat/tamper/preservation/real CHECK/FK tests passed. |

No prior cases were removed/skipped; the Create Post placeholder browser assertion now checks the actual AI page. All33 candidate path hashes matched after the gate. Only this result documentation changed afterward; secret/whitespace checks were repeated for the documentation. No unexplained flaky test, concurrency failure, full-gate retry, generic retry, arbitrary sleep, authentication change or isolation change. Required tests used only test fakes/mocked transport and isolated local MySQL. No live OpenRouter generation/key used; provider and Hostinger production behavior remain unverified.

## BE — Complete changed/new file inventory

- `AGENTS.md`
- `docs/architecture/phase-5.md`
- `docs/review/phase-5.md`
- `migrations/0008_ai_generations.sql`
- `migrations/manifest.json`
- `playwright.config.ts`
- `scripts/local-mysql.py`
- `src/app/(workspace)/[section]/page.tsx`
- `src/app/(workspace)/create-post/page.tsx`
- `src/app/api/ai/generations/[id]/route.ts`
- `src/app/api/ai/generations/route.ts`
- `src/features/ai/generation-panel.tsx`
- `src/features/ai/model.ts`
- `src/server/ai/http.ts`
- `src/server/ai/policy.ts`
- `src/server/ai/provider.ts`
- `src/server/ai/service.ts`
- `src/server/ai/web.ts`
- `src/server/authorization/routes.ts`
- `src/server/db/schema.ts`
- `src/styles/globals.css`
- `tests/browser/ai.spec.ts`
- `tests/browser/setup.ts`
- `tests/browser/ui.spec.ts`
- `tests/database/ai.test.ts`
- `tests/database/check-constraints.test.ts`
- `tests/database/foundation.test.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/database/phase2b-helpers.ts`
- `tests/helpers/ai-fixtures.ts`
- `tests/ui/ai.test.tsx`
- `tests/unit/ai.test.ts`
- `tests/unit/database-config.test.ts`

## BF — Git and scope

main remains701d490b50ec409857f7569c3068081164519f5a; all33 Phase5 paths (15 modified tracked,18 new) unstaged. No real API key, live generation, paid fallback, image/video understanding, model marketplace, AI approval/publishing, Brand mutation, social OAuth, scheduling, media processing, S3/Redis/Docker/root/permanent worker or Phase6. No old migration edits, production-auth change, generic retry, arbitrary sleep or isolation change. No commit/push.
