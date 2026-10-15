# Phase 3 final targeted adversarial review — A–AO

## Baseline and evidence

- Branch main; HEAD 974503822f98ca180e4704a756e44c6902b15816; 17 modified tracked/13 new files; index empty.
- Exact pre-review fingerprint saved outside checkout: /tmp/bsa-phase3-adversarial-baseline.json. Aggregate SHA-256: 13449afa7ac981b9d790d04518999737be82af7ab325f507fcb175b81ffe029d.
- All seven manifest hashes matched. 0000–0005 byte-identical to HEAD. Only 0006 new, SHA-256 ac785551c2ca5070c2e62de90877788005c8f4a2ff02e5c74bb0cad50c895c37. No migration/manifest changed during review.
- Exactly 29 permissions; only brand.read added. Public catalog fixture extracted from the exact committed Phase 2D catalog proves the prior 28 codes/grants, not a baseline reconstructed from new policy.
- Pre-repair failing regressions and safe driver/framework evidence retained outside the checkout, never as repository diagnostics. No production database contacted.

## A. Verdict

Targeted review complete after the demonstrated repairs below. Final-gate evidence follows in AH–AN. This validates implemented boundaries; it does not verify Hostinger deployment, future model behavior, or factual correctness/permanence of Owner-approved prose.

## B. Demonstrated defects

1. The exported pure projection trusted TypeScript-only input: extra security fields, invalid approval and unknown claim policy could reach output when called with polluted server data. The authenticated DB path already validated selected rows; no HTTP security-data disclosure was demonstrated. Additional regressions showed substituted brand identity, excess per-kind counts and duplicate IDs/scopes could enter this helper.
2. UUID-only reference lookup confused different entity kinds when two tables legitimately shared an ID. Both projection and UI label regressions failed; an actual MySQL fixture with valid cross-table duplicate UUIDs reproduces the projection risk without disabling constraints.
3. URL percent encoding and hashtag lowercase normalization could expand output beyond declared length bounds after input validation.
4. Anonymous Flight/prefetch denial attempted relative Location /login; installed Next adapter constructs NextURL from Location without a base, raising ERR_INVALID_URL and returning an error instead of the intended login redirect. Viewer 403 branches did not disclose protected context.
5. Brand GET ignored mutation-like/unknown or duplicate query parameters and returned ok:true as a read. It did not mutate state, but did not reject the requested ambiguity.

## C. Smallest production repairs

- src/server/brand/service.ts: runtime snapshot validation + exact marketing field selection, canonical profile identity/count/unique scope checks, typed reference-map keys. Existing service authorization, SQL constraints and 128 KiB cap retained.
- src/features/brand/model.ts: validate URL/hashtag lengths after normalization; no bound increase or marketing-copy normalization.
- src/features/brand/brand-brain.tsx: reference labels match entity kind and ID. No design changes.
- src/proxy.ts: absolute configured-origin login redirect, fail unavailable for invalid configuration; existing early RSC/prefetch 403 checks and page/API guards retained.
- src/app/api/brand/route.ts: GET rejects unknown/mutation-like and duplicate brandId parameters. POST auth/CSRF behavior retained.

## D. Test/document changes and explained test failures

Added unit/projection/schema, real MySQL and browser regressions, frozen public Phase 2D catalog fixture, fixture helper, migration preservation coverage and these docs. Pre-fix red regressions were intentional evidence, not flaky reruns. The first ASCII byte-boundary fixture could not reach the ceiling using its initially allocated fields; it was extended using additional existing bounded category fields (no production limit change). The older oversized projection fixture now uses valid UUIDs and 24 full-size emoji examples, remaining within count limits while exceeding bytes, preserving its original byte-rejection assertion. No assertion weakened and no generic retry. The first final-gate install stopped before tests because the workspace npm-cache override was omitted; npm could not create its home cache. Restoring the existing /workspace/.npm-cache setting corrected the environment without changing dependencies, lock integrity, application policy or tests.

## E. RBAC

All 15 record kinds directly attacked for every role. OWNER reads/manages; MARKETING_ADMIN, CONTENT_CREATOR, REVIEWER read but every mutation rejects; VIEWER read/manage reject. Disabled/stale-version, missing/malformed role, unknown permission and corrupt extra grants fail closed. No reliance on navigation hiding.

## F. Catalog/matrix

Frozen baseline proves unchanged five role names and old 28 codes/grants. Only brand.read added: explicit OWNER/MARKETING_ADMIN/CONTENT_CREATOR/REVIEWER grants. VIEWER neither brand permission. Only OWNER has brand.manage. No implication engine or runtime permission editor.

## G. IDOR and ownership

Random/nonexistent/substituted brand IDs reject across reads, context and every mutation kind. Cross-parent child IDs and contact-as-CTA/category references reject. Canonical brand filters plus composite FKs enforce ownership. V1 singleton prevents a second operational brand; tests do not disable it or invent tenancy. SQL orphan brand changes reject. Typed reference regression also covers valid duplicate UUIDs across entity tables.

## H. Revision concurrency

Separate pools: profile/language/voice/child stale N save cannot overwrite committed N+1. Concurrent profile/language/voice/child and update/deactivate cases have exactly one winner, monotonic revision and exactly the committed audit count. Final-slot creation tested for every requested collection; no threshold overshoot or retries.

## I. Atomicity

Failure injected at actual mutation write, revision update and required audit insertion for create/update/deactivate. Real MySQL rollback preserves data + revision + audit. Healthy same expected-revision request then succeeds once. No transactional-DDL claim.

## J. No-op semantics

Accepted identical save increments revision once and writes one audit, deliberately treated as a save. Rejected validation/authorization/stale requests do not increment. No hidden no-op optimization/retry.

## K. Projection allowlist

Every root and collection field asserted against an independent explicit allowlist. Recursive forbidden-key assertions exclude user/actor/role/permissions/session/auth_version/MFA/invitation/password/audit/security/encryption/created_by/updated_by/database identity/state fields. Real operation UUIDs and bearer material do not appear. Runtime helper also rejects polluted input instead of spreading arbitrary fields. Context service remains authenticated; no public projection endpoint.

## L. Filtering

Contacts, locations, CTAs, wording, categories, seasonal guidance and examples tested in all activity/approval combinations, then legitimately reactivated/approved. Only active + approved records appear. Rejected and inactive policy rows cannot silently permit claims.

## M. Claims

All 13 categories tested. Missing/inactive configuration returns EXPLICIT_APPROVAL_REQUIRED. Unknown/null policy/category rejects, including invalid diagnostic rows. No ALLOWED fallback. JSON tone/language corruption can be injected through realistic SQL without disabling constraints and fails closed. Enum corruption fixtures use query-result injection where SQL already prevents persistence.

## N. Persistent versus campaign facts

No current price, percentage, stock, offer-expiry, campaign-installment or limited-promotion fields exist; strict schemas reject those extras. Generic fact/guidance/example prose is an ambiguity requiring Owner judgment: approval does not automatically prove permanence or truth. Existing warning directs temporary offers to post input. Default PRICE/DISCOUNT/STOCK/INSTALLMENT source policy requires explicit post input; future Phase 5 must enforce source evidence and cannot treat approved text as an automatically current offer feed. No campaign fields, text classifier or policy expansion added.

## O. Exact byte boundary

ASCII, Urdu and emoji tested below, exactly at 131072 UTF-8 bytes, and above by a whole character. Exact boundary accepted; next character rejects controlled 128 KiB failure. Whole records/Unicode preserved; input not mutated/truncated. Actual DB over-budget mutation rolls back row/revision/audit. No limit raised.

## P. Determinism

Contacts/locations/CTAs/wording/categories/seasons/examples reinserted in a different physical order with the same IDs/orders: structurally identical repeated projection. Ordering is display order then UUID; claim categories fixed canonical order. Duplicate source identities/scopes reject instead of first/last-wins behavior.

## Q. Limits

Requested contact/location/CTA/wording/example/category/season caps exercised, including separate-pool creation of final slot and rejected overflow with unchanged state. Bounded JSON/list CHECKs, text limits and request size tested. Exported projection enforces the same existing per-kind counts and exact byte budget. No truncation or enlarged caps.

## R. Unicode

English, Roman Urdu, Urdu, mixed text, decomposed combining sequences, RTL mark, leading/trailing spaces and near-limit multibyte/emoji copy round-trip exactly. Phrase display remains original; comparison normalization separate. Ill-formed UTF-8/UTF-16 rejects. Post-normalization URL/hashtag expansion rejects safely.

## S. XSS

Guidance, examples, CTA, category and seasonal HTML/SVG/script-like input renders as text in real Chromium. No execution marker. No raw HTML renderer added; React escaping retained.

## T. Strict input

HTTP attacks cover extras, duplicate/escaped-equivalent keys, enum casing, illegal null/array/object types, malformed UUID/UTF-8, oversized and unsupported bodies, bad URL/email/timezone/hashtag/phone. Rejections preserve snapshot/revision. Responses sanitized; existing generic unavailable statuses for parser failures retained, not falsely reported as all 400.

## U. Contact approval

Existence, activity or primary flag alone does not approve a contact. Only active+approved projects; primary+unapproved excluded. Single primary per active approved type retained. Other explicitly approved entities tested equivalently.

## V. References/deactivation

Location/contact, category/CTA, season/CTA and example/category references tested. Deactivation or unapproval resolves projected reference to null; legitimate reapproval restores it. No hard deletion. Typed ID lookup prevents cross-kind confusion in projection and UI.

## W. Audit redaction

Canary contact/email/address/guidance/example content absent from audit metadata. Exact keys reasonCode/changedFields/count only, with validated record ID/revision and dedicated actor/session columns. No shadow marketing copy. Existing runtime audit SELECT/INSERT-only policy preserved; not a guarantee against DB administrators.

## X. CSRF

Valid pending edit attacked with missing/wrong/non-ASCII token, wrong configured Origin, missing/invalid Fetch Metadata, another session token and pre-session token. All reject, revision unchanged, final valid control succeeds. GET mutation ambiguity now rejects; no GET mutates.

## Y. HTTP/RSC/prefetch

Viewer and anonymous document/Flight/prefetch requests deny before private context marker; API read/mutation deny. Absolute login redirect stays on configured origin even with spoofed forwarded host; permitted Flight remains functional. Existing Phase 2D 403 preflight retained.

## Z. Unsaved changes

Validation failure and server conflict retain draft and dirty warning. Reload/discard is explicit. Successful save clears dirty state, so changing sections does not warn. No browser persistence added.

## AA. UI/server consistency

All three read-only roles tested through every section: no mutation form/control. Owner remains editable. Viewer has no Brand Brain access/navigation. Server independently denies crafted writes for all non-Owners.

## AB. Migration 0006

All prior SQL preserved. Clean installation and exact Phase 2D SQL upgrade pass. Upgrade retains usable Owner session, encrypted factor, users/roles, bound proof, invitation, consumed installation state, Team guard and existing audit. Repeat and tampering tested. Frozen 28-grant baseline plus exact four added read grants; no brand.manage expansion. Existing/new CHECK/FK violating writes and multilingual records exercised. 0006 unchanged during this review.

## AC. Corruption

Actual JSON unknown tone/language data plus diagnostic invalid enum/null/approval rows fail closed; no constraints/security settings disabled. Invalid numeric approval decodes false and cannot enter projection; direct exported helper rejects invalid flags. No unknown data converted to an allowed claim.

## AD–AF. Scope, dependencies and Hostinger

Phase 3 data projection only: no uploads/media library, LLM SDK/OpenRouter/prompt/caption generation, OAuth/publishing/scheduler/analytics expansion. No dependency additions/upgrades, environment names or external runtime service. Existing private env separation, CI and credential-safe browser artifact policy unchanged. Hostinger remains unverified: Node/native Argon2/AES-GCM/MySQL TLS/pools/clock/HTTPS/proxy/secure-terminal gates retained. No new infrastructure dependency. Manual invitation handoff remains bearer possession, not independent email ownership.

## AG. Files changed during this review only

- `docs/architecture/phase-3.md`
- `docs/review/phase-3-adversarial.md`
- `docs/review/phase-3.md`
- `src/app/api/brand/route.ts`
- `src/features/brand/brand-brain.tsx`
- `src/features/brand/model.ts`
- `src/proxy.ts`
- `src/server/brand/service.ts`
- `tests/browser/brand-review.spec.ts`
- `tests/database/brand.test.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/fixtures/phase-2d-catalog.json`
- `tests/helpers/brand-review-fixtures.ts`
- `tests/ui/brand.test.tsx`
- `tests/unit/brand-adversarial.test.ts`
- `tests/unit/brand.test.ts`

## AH–AN. Final full gate

- AH — Unit/UI: **298 passed**, 20 files. No skipped/unrun final unit tests.
- AI — Isolated MySQL: **495 passed**, 12 files, including 106 Brand Brain tests and strengthened exact-upgrade coverage. No unexpected deadlock/concurrency failure.
- AJ — Browser: **77 passed**, retries **0**; all specs executed.
- AK — npm ci, zero-warning lint, strict typecheck and production build: **passed**. Build uses no live DB/production credentials.
- AL — Secret scan: **190 repository files**, **264 historical blobs across 8 commits**, passed. npm audit: **0 vulnerabilities**. npm ls --all: **exit 0**, no invalid/extraneous or Prisma/Drizzle packages.
- AM — All **7 migration hashes** match manifest and pre-review fingerprints; 0000–0005 also match main HEAD. 0006/manifest unchanged during review.
- AN — git diff --check: **passed**, repeated after report update.

## AO. Repository and explicit stop state

Branch **main**, HEAD **974503822f98ca180e4704a756e44c6902b15816** unchanged. **18 modified tracked files, 18 new files, index empty**. The 16 review-only files are listed above; all prior Phase 3 work preserved. Only .env.example is present among repository environment files. No credential files, diagnostics/dumps, browser capture files or generated outputs in the candidate tree. Working tree intentionally remains modified for review.

No unexplained flaky test. Intentional pre-fix regressions and the explained ASCII fixture correction are distinguished from final results. No generic retry or transaction isolation change. No Phase 4 work, commit, push, reset/discard or history rewrite.
