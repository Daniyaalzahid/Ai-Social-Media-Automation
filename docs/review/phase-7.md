# Phase 7 — pre-implementation policy gate

Status: **READY FOR REVIEW: authorized repair and fresh complete gate passed. Unfinalized; real adapters disabled/UNVERIFIED.** Fresh gate UTC date: 2026-10-16; earlier record dates retained.
The initial A–L policy-stop record below is preserved historically. The authorized
continuation and current review evidence follow it; proposals in that historical
record are no longer pending decisions. This is not a claim of real-provider readiness.

## Baseline and inspection

Initial branch: `main`; initial local HEAD and remote main both
`8e8ac677ca0125239d45fe3110f25961aa2dfcc3`.
Message: `feat: establish phase 6 content review workflow`; direct parent
`d143a300c8213178a49aa1b02cb6e21866572760`.
Initial worktree and index were clean. No Phase 7 application implementation exists.
All ten migration files match their manifest SHA-256 values and committed HEAD.
0009 remains `f4c21f84c2127f6cced5d881151709fd4df55424f3a43b72d04f6efaa0fc0782`.
No 0010 was created.

Inspection covered the canonical catalog/seeder, Phase 2D authorization and route
policy, current recent-auth implementation/team payload binding, MFA encryption
and sensitive-value helpers, environment validation/example names, rootless MySQL
runtime grants, the Connections placeholder and the complete Phase 7 request.
The older Phase 6-only scope in AGENTS.md is superseded by the explicit Phase 7
request; its security and preservation guardrails remain applicable.

## A–D. Existing capabilities, definitions, grants and gaps

Authoritative identifiers/grants: `src/server/db/catalog.ts`; exact canonical
IDs are seeded by `src/server/db/seeds.ts`. Permission records have codes, not a
separate prose definition. The following meanings come from the established PRD
and architecture; no new implied capability is asserted.

| Relevant capability | Established boundary | OWNER | MARKETING_ADMIN | CONTENT_CREATOR | REVIEWER | VIEWER |
|---|---|---|---|---|---|---|
| integrations.manage | Integration administration; current Connections route gate | yes | no | no | no | no |
| content.publish | Content publishing capability, not connection administration | yes | yes | no | no | no |
| content.schedule | Content scheduling capability, not connection administration | yes | yes | no | no | no |
| workspace.read | General workspace entry, not social connection disclosure | yes | yes | yes | yes | yes |
| brand.read | Brand Brain read within its own domain | yes | yes | yes | yes | no |
| media.upload | Authorized temporary uploads/self-removal, not OAuth | yes | yes | yes | no | no |
| settings.manage | Settings administration; not a substitute integration grant | yes | no | no | no | no |
| security.manage | Security administration; not a substitute integration grant | yes | no | no | no | no |

The entire 31-code catalog was inspected: workspace.read, content.read,
calendar.read, analytics.read, publishing_logs.read, content.create, media.upload,
ai.generate, content.edit_any, content.edit_assigned, content.submit,
content.review, content.approve, content.approve_self, content.schedule,
content.publish, integrations.manage, brand.manage, settings.manage,
security.manage, audit.read, users.manage, roles.assign, password_reset.issue,
sessions.revoke_any, password.change_own, sessions.manage_own, mfa.manage_own,
brand.read, media.read, media.manage. None supplies a separate connection-read
capability. Owner has all 31. Exact other grants remain unchanged in the catalog.

Sources: PRD §5 gives Owner integration control and denies Reviewer integration
changes; §14 identifies social credential changes/disconnect as sensitive;
§15 requires server-side token handling. `docs/architecture/phase-2d.md`
explicitly says Marketing Admin gains no integration/security power from its title.
`src/server/authorization/routes.ts` requires integrations.manage for Connections.
The current page is a protected placeholder, not an OAuth implementation.

Existing semantics support Owner-only integration management without a new
permission. They do not authorize the suggested Marketing Admin expansion or
read-only Creator visibility. Those intentions are explicitly not pre-approved in
the Phase 7 request. No unrelated permission should be repurposed to fill the gap.

## E–L. Minimum proposed policy (NOT APPLIED)

If the suggested operational-manager and safe Creator-read split is desired,
add exactly one capability: **integrations.read**. Reuse integrations.manage for
connect, server-discovered destination selection, reconnect and disconnect/local
revocation. Grant both capabilities explicitly to Owner and Marketing Admin;
grant only integrations.read to Content Creator. Grant neither to Reviewer/Viewer.
No implication engine and no permission-management UI.

| Canonical role | Proposed integrations.read | Proposed integrations.manage |
|---|---|---|
| OWNER | yes | yes (existing) |
| MARKETING_ADMIN | yes | yes (new grant of existing capability) |
| CONTENT_CREATOR | yes | no |
| REVIEWER | no | no |
| VIEWER | no | no |

G. Read scope: current authorized workspace/brand only. Closed safe destination
DTO: provider/platform, public destination display identity and coarse connection
health/setup status. No credential/authorization internals, encrypted values,
raw provider data, connecting employee identity or secret configuration. Creator
gets no discovery endpoint or OAuth transaction access merely by possessing read.

H. Management scope: current workspace/brand, independent of connected_by;
current session, canonical authority, explicit object lookup, CSRF and step-up
where approved. Selection only from authorized server-discovered destinations;
UUID possession grants nothing. No export/decrypt-token browser capability.

I. Creator status access: **proposed yes**, safe read-only DTO as above.
J. Reviewer status access: **proposed no** in Phase 7.
K. Viewer status access: **proposed no** in Phase 7.
L. Resulting proposed catalog count: **32**, currently still **31**.

Alternative requiring no catalog/grant expansion: Owner-only Connections for
Phase 7, no other-role status access. This alternative still needs the recent-auth
purpose decision below. The proposed 32-code option is not assumed approved.

## Additional consolidated decision: purpose-bound recent authentication

`src/server/auth/access.ts` accepts only REPLACE_FACTOR, REGENERATE_RECOVERY,
REVOKE_SESSIONS and the closed TEAM action family. Existing proofs require
password plus active/required MFA, rotate the session, expire after five minutes,
and are user/session/auth-version/action bound and single-use. Team actions
commit a normalized payload digest. There is no integration action and no safe
way to reuse a TEAM/factor proof for OAuth management.

Approval requested: narrowly extend that action vocabulary for integration
CONNECT, RECONNECT, SELECT_DESTINATION and DISCONNECT using the existing
five-minute, single-use password/MFA mechanism with canonical payload binding
(provider, workspace/brand, target/version and selected destination as applicable).
Consume CONNECT/RECONNECT proof when creating the OAuth transaction; bind the
callback to that originating context and revalidate current authority. Do not
require an external provider to send application CSRF/step-up secrets. Selection
and disconnect require their own purpose-bound proof. Safe reads and internal
credential maintenance do not initiate human reauthentication.

This would require a narrowly scoped change to the shared action allowlist and
tests; it is **not implemented or authorized by this report**. No change is
proposed to password/MFA/session policy, lifetime, capacity, rate limits, CSRF or
isolation. Explicit approval is required under Phase 7 §§86/130 before modifying
the shared authentication code. Do not substitute login timestamps or a generic
recent-auth proof.

## Encryption, grants and environment findings

- Existing MFA utility uses AES-256-GCM, random 12-byte IV, 16-byte tag,
  independent strict 32-byte key, key ID and purpose/identity-bound AAD. It is
  MFA-specific; do not reuse its key or seed-specific parser for social tokens.
- TOKEN_ENCRYPTION_KEY already exists and is validated as canonical base64
  32-byte material distinct from session/MFA/event keys. There is no general
  social-token encryption implementation or key-ID configuration yet. Versioned
  envelopes and key-ID selection remain design work after the policy gate.
- All eight provider ID/secret environment names already exist with empty
  .env.example values and server-only schema entries. No names/values changed.
- Runtime grants are explicit table/column allowlists in scripts/local-mysql.py;
  unknown tables receive none. Immutable Phase 6 history remains SELECT/INSERT
  only with narrowly allowed mutable aggregate/submission/protection columns.
  Future credential-table grants must be explicit and preserve this separation.
  No grant or schema change has been made. Hostinger grant support is UNVERIFIED.

## Official research blocker

See `docs/research/phase-7-provider-requirements.md`: all 16 official-source
requests were denied by the outbound proxy (HTTP tunnel 403). No normative
provider facts were successfully verified. Endpoint/PKCE/scope/lifetime/review
decisions must wait for accessible current official documentation; no guessed
adapter implementation. Provider setup/approval and Hostinger remain UNVERIFIED.

## Inventory / verification at this stop

Only two new documentation files:

- docs/research/phase-7-provider-requirements.md
- docs/review/phase-7.md

No application/test/dependency/environment/migration changes. No implementation
or full review gate was run at this pre-implementation stop. Finalized Phase 6
test results are historical evidence, not fresh Phase 7 results. No live provider
call, SDK, publishing, scheduling, retry, sleep or isolation change. Nothing staged,
committed or pushed; Phase 8 not started.

Approval needed together: permission/read-object matrix; integration step-up action
extension. Official documentation access is a separate prerequisite for real
provider implementation. The full implementation review report is deferred until
these gates are resolved and Phase 7 implementation/review actually completes.

## Authorized continuation — current candidate

The user approved the matrix and existing recent-auth action-family extension.
Accounting was rechecked against finalized catalog: integrations.manage ALREADY
EXISTED for Owner with compatible administration semantics; integrations.read did
NOT exist. Exactly ONE new permission: **31 -> 32**. Marketing Admin's manage grant
is intentionally new. The original proposal did not propose two new identifiers.
No alias or implication rule was added. Historical stop proposals above describe
that earlier stage, not the current implementation status.

### Current review scope and external blockers

The shared domain/security/UI candidate is implemented and tested with deterministic
fake providers. **No real provider adapter is enabled.** All managers see setup
required in the actual application. This is a reviewable foundation, not completion
of all real-provider integrations. Exact wire protocols, endpoint allowlists,
HTTP body/response bounds, discovery, refresh and revocation behavior for real
Meta/TikTok/Google/LinkedIn still require current official source review and adapter
implementation. Do not infer those tests passed from the shared fake-provider suite.

The independently supplied TikTok/Google findings were preserved with their exact
URLs and provenance. Five fresh requests remained proxy-blocked. No guessed Meta/
LinkedIn protocols or unsupported real-provider PKCE parameters were introduced.
Hostinger, all real social integrations and production OpenRouter stay UNVERIFIED.

### Findings, evidence and repairs during implementation

1. Clean migration initially created all five social tables, then failed inserting
   role_permissions for roles absent before explicit catalog seeding. Targeted suite
   executed no tests (26 skipped). Safe direct SQL diagnosis captured
   ER_NO_REFERENCED_ROW_2 / SQLSTATE 23000 at grant insertion. Corrected uncommitted
   0010 to INSERT SELECT existing canonical role+permission, matching the repository
   clean-install convention; explicit seeding supplies the complete final matrix.
   Exact Phase 6 upgrade tests verify pre-existing grant preservation and new grants.
   Old migrations were not touched. Diagnostic script/evidence stayed outside Git.
2. Historical-catalog test adjustment accidentally applied a Marketing Admin exception
   to the live can() assertion. Initial focused run: 146 passed, one failed. This was
   a TEST EDIT DEFECT; live policy assertion restored, historical exceptions retained
   only where comparing older frozen grants. New full Phase 6 catalog fixture proves
   the exact delta rather than accepting arbitrary grant drift.
3. Browser fixture used url with a Secure __Host cookie. Standalone synthetic-cookie
   check showed Chromium Storage.setCookies Invalid cookie fields for url form, while
   domain=localhost/path=/ succeeded. TEST FIXTURE DEFECT: use established repository
   cookie shape. Five role tests plus mutation test then passed without production
   auth changes.
4. Browser callback response actually had Referrer-Policy=strict-origin-when-cross-origin
   despite a route no-referrer setting: global Next config overrode it. PRODUCTION
   CONFIG DEFECT: add callback-specific no-referrer rule after the global rule. Actual
   HTTP regression now verifies 303, configured redirect and no-referrer, including
   forwarded-host spoofing. Next's documented default development request logging
   also includes query URLs; OAuth callback namespace is excluded with its supported
   incomingRequests ignore setting. Reverse-proxy/access-log redaction is still a
   deployment gate.
5. Fake-browser exchange completed with no DB errors but Urdu destination selector
   did not match: standalone harness text/html lacked UTF-8 charset. TEST HARNESS
   DEFECT: declare charset=utf-8 and assert document.characterSet plus exact Urdu
   button name. No production Unicode normalization or timeout change.
6. One attempted targeted DB invocation encountered the existing fixture lease while
   an earlier migration-test process was still active. No tests executed, no guard
   bypass or destructive overlap. Waited for previous completion (43 passed), then
   executed the current changed-path target (28 passed). This is execution coordination
   evidence, not a passing run or a production defect.
7. Refresh design was tightened during implementation: exact lease identity prevents
   stale failure/completion overwrites; expired abandoned leases are not automatically
   re-exchanged. Explicit reconnect is required. Tests verify one concurrent provider
   call, disconnect wins, and abandoned lease causes zero new provider calls. Refresh
   reconciles active destination discovery and clears removed selections.

No generic retry, arbitrary sleep, test suppression, original auth limit change,
MFA/session-policy change or isolation change was used. Targeted test reruns followed
identified corrections/added evidence; none was an unexplained rerun until green.

### Targeted evidence before the complete gate

- Focused policy/crypto: 42 passed after the isolated test-edit correction.
- Latest policy + UI target: 30 passed (27 social unit cases + three UI cases).
- Latest shared MySQL OAuth target: 28 passed.
- Historical migrations + OAuth: 43 passed; includes new exact Phase 6 upgrade case.
- Connections browser target: eight passed, zero retries; fake browser flow uses real
  component/domain/MySQL and a test-only purpose-proof seam, not production MFA bypass.
- Intermediate browser history preserved: first eight failed (six cookie fixtures,
  header regression and charset harness); after cookie correction six passed/two failed;
  after header/charset correction eight passed. No unexplained flakiness claimed.
- Eleven manifest checksums match; old ten migrations match committed bytes.
- package.json, package-lock.json and .env.example are byte-identical to baseline.

### Security review map

| Attack / boundary | Evidence and current scope |
|---|---|
| State forgery/replay, duplicate callback/code | Digest lookup, bounded strict parser, separate-pool exactly-one exchange |
| Login CSRF / wrong session/user | Session/actor/version bound at claim+completion; real SQL denials |
| Disabled actor / role revoked while provider runs | Deliberate suspended fake exchange, authority changed, no grant attaches |
| Redirect / forwarded-host poisoning | Trusted fixed callback/result origin; actual 303/no-referrer browser check |
| Arbitrary scope / mass assignment | Closed mutation schema and request digest-bound step-up; provider result scope allowlist |
| Token encryption / ciphertext swapping | Wrong provider/identity/purpose/version/key/tag/IV/ciphertext/key-ID unit cases |
| Credential serialization | SensitiveValue, separated DTO, no credentials in metadata reads; boolean sentinel assertions |
| Discovery IDOR / cross-provider/brand | Exact authorization membership service checks; composite FK and provider-kind CHECK |
| Refresh/disconnect races | Independent pools, deferred promises, one refresh call, no stale credential restoration |
| Audit failure | Injected audit insertion failure rolls back selected ID/version/proof consumption |
| NULL CHECK | Direct SQL rejects each incomplete PKCE envelope group member |
| Partial consent / error | LIMITED status; no rejected credential stored; one exchange without retry |
| XSS / Unicode | Literal HTML-like Urdu destination in React, no executable script; UTF-8 browser round-trip |
| CSRF / direct route denial | All roles via API/document/Flight/prefetch; wrong/missing CSRF rejected |
| Fake production exposure | Constructor rejects test providers outside explicit test environment; production map empty |
| SSRF / real upstream parser | No production provider fetch exists; real adapter network tests remain BLOCKED, not passed |
| Provider identity/destination admin | Reconnect compares stable subject; persistent selection requires own bound proof/version |
| Phase 6 history and original auth | Full review gate must include unchanged regressions; no test removed |

### Complete gate

Pending one complete REVIEW gate from the frozen candidate. Expected enumeration:
532 Unit/UI (502 + 27 social + 3 UI), 739 MySQL (710 + 28 social + 1 exact upgrade),
112 browser (104 + 8), zero browser retries. Counts must be taken from the actual
runner, not these estimates. Stop at the first complete-gate failure; do not repair
and continue. Gate evidence will be appended after execution. No finalization.

### Current exact path inventory

44 paths: 20 modified tracked, 24 new. All belong to this implementation,
research, permission-compatible historical tests, or isolated test harness.

- AGENTS.md
- docs/architecture/phase-7.md
- docs/research/phase-7-provider-requirements.md
- docs/review/phase-7.md
- migrations/0010_social_connections.sql
- migrations/manifest.json
- next.config.ts
- scripts/local-mysql.py
- src/app/(workspace)/[section]/page.tsx
- src/app/(workspace)/connections/page.tsx
- src/app/(workspace)/overview/page.tsx
- src/app/api/connections/route.ts
- src/app/api/oauth/[provider]/callback/route.ts
- src/features/connections/connections.tsx
- src/features/connections/model.ts
- src/server/auth/access.ts
- src/server/authorization/routes.ts
- src/server/db/catalog.ts
- src/server/db/schema.ts
- src/server/social/crypto.ts
- src/server/social/events.ts
- src/server/social/policy.ts
- src/server/social/provider.ts
- src/server/social/schema.ts
- src/server/social/service.ts
- src/server/social/web.ts
- tests/browser/connections.spec.ts
- tests/browser/social-harness-client.tsx
- tests/browser/social-harness.ts
- tests/browser/team.spec.ts
- tests/browser/ui.spec.ts
- tests/database/foundation.test.ts
- tests/database/migration-recovery.test.ts
- tests/database/phase2b-helpers.ts
- tests/database/social.test.ts
- tests/fixtures/phase-6-catalog.json
- tests/helpers/social-fixtures.ts
- tests/ui/connections.test.tsx
- tests/unit/authorization.test.ts
- tests/unit/brand-adversarial.test.ts
- tests/unit/brand.test.ts
- tests/unit/database-config.test.ts
- tests/unit/media.test.ts
- tests/unit/social.test.ts


## First complete Phase 7 REVIEW gate — FAILED / STOPPED

The frozen 44-path candidate was run once. Results:

| Gate | Result |
|---|---|
| npm ci | PASS (321 packages; no dependency/lockfile change) |
| lint | PASS |
| strict typecheck | PASS |
| Unit/UI | PASS: 532 tests, 29 files |
| Complete isolated MySQL | FAILED; stopped after first reported failing file; no final whole-suite count |
| secret scan | NOT RUN in this gate |
| npm audit | NOT RUN in this gate |
| production build | NOT RUN in this gate |
| complete browser suite | NOT RUN in this gate |
| npm ls | NOT RUN in this gate |
| final gate git diff --check | NOT RUN; separate earlier inspection passed |

The runner was terminated after the first failed file was observed, rather than
continuing later gate checks. Its final process status is termination (143), not
a fabricated completed MySQL-suite result. The failing file reported 65 cases,
two failures. No full MySQL pass count is claimed.

Exact failures in tests/database/check-constraints.test.ts:

- `covers exactly every CHECK currently installed in the security schema`
- `matches all deployed security relationships with RESTRICT for delete AND update`

Read-only metadata inspection of the guarded isolated schema established:

- CHECK inventory: expected 36 foundation names, actual 48 = those same 36 plus
  12 new social CHECKs, all ENFORCED=YES.
- FK inventory: expected 21 foundation relationships, actual 28 = those same 21
  plus seven new social relationships, all RESTRICT for delete and update.
- Both legacy inventory queries exclude brand/media/ai/content tables, but do not
  exclude or account for the new social tables. Their expected arrays still
  contain only the foundation constraints.

Classification: demonstrated TEST COVERAGE / INVENTORY MAINTENANCE DEFECT.
The observed mismatch does not demonstrate a production constraint failure.
The exact metadata difference is explained deterministically by the SQL predicates
and arrays; the failing tests were not rerun. The independent read-only inspection
was evidence gathering, not another suite attempt.

Proposed repair, NOT APPLIED: keep explicit foundation inventory assertions scoped
to their domain, and add an exact independent Phase 7 inventory plus direct
violating-write coverage for all 12 new CHECKs and seven FK constraints. A simple
exclusion without corresponding complete new-domain coverage would be inadequate.
No production, migration, isolation or authentication change is justified by this
failure. Await repair authorization before changing tests or running another gate.

The frozen candidate still matched all 44 recorded hashes immediately after
stopping the gate. Only this report was subsequently updated to record the result.
Nothing staged, committed or pushed. HEAD remains the finalized Phase 6 baseline.
Phase 8 has not started. This candidate is NOT ready for Phase 7 approval.
Real provider adapter implementation remains independently research-blocked.


## Authorized inventory-test repair — 2026-10-17 — production defect STOP

The historical first complete gate above remains unchanged: npm ci/lint/strict
 typecheck passed, Unit/UI 532 passed, isolated MySQL FAILED, later checks NOT RUN.
The subsequent user authorization allowed test-only ownership/inventory changes,
direct MySQL constraint tests, and a second gate only if no production defect was
exposed. The committed baseline, empty index and initial 44-path inventory were
verified again; local and remote main both matched finalized Phase 6.

### Test-only changes made before stopping

- tests/database/check-constraints.test.ts: retain the exact 36 foundation CHECK
  names and existing violating writes; replace fragile domain-prefix exclusion
  with 16 explicit foundation-owned tables. Expected CHECK properties additionally
  include table and constrained-column set. Preserve all 21 foundation FK names
  and violating writes; additionally compare exact child/parent ordered columns,
  schema ownership and RESTRICT actions through the shared metadata reader.
- tests/helpers/schema-contract.ts: independent expected identities from reviewed
  0010 for all 12 social CHECKs and seven FKs; exact table/column/enforced ownership,
  schema and composite FK order/action comparisons. No observed-count-only contract.
- tests/database/social-constraints.test.ts: 79 direct MySQL cases, isolated scratch
  schema ownership with rollback per case, strict safe diagnostic classification
  instead of printing SQL/parameters/envelopes. Includes all 12 CHECK violations,
  seven orphan FK writes, per-FK exact-parent DELETE/UPDATE RESTRICT behavior,
  cross-brand compound FK, closed ENUMs, scope representations, nullable matrices,
  empty/unknown key envelopes and byte-exact credential key identity.
- This review document records the results. No production or migration file changed.

The foundation inventory edits have NOT yet been executed: testing stopped on the
new social schema defect before proceeding to the remaining requested targets.
Global/historical drift coverage and shuffled order validation must not be claimed
complete from the new social test run alone.

### Targeted execution history

Strict TypeScript check passed before the first targeted invocation.

First social-constraint run with bail=1: 63 passed, one failed; remaining 15 cases
not executed. A cross-brand fixture cloned the existing remote ID and hit
ER_DUP_ENTRY before its intended composite FK. Classification TEST FIXTURE DEFECT.
Corrected only that insert to allocate its own remote identity. No assertion,
constraint, schema or timeout was weakened. The next execution followed this
specific correction, not an unexplained rerun until green.

Corrected run: **78 passed, 1 failed, 79 total**. Exact failing case:

`credential CHECK rejects a noncanonical trailing-space key ID before it can become undecryptable`

Passed coverage includes:

- exact 12 social CHECK identities/table/columns/enforcement properties;
- exact seven social FK identities/table/ordered columns/parent columns/actions;
- each CHECK's independent violating write;
- seven orphan-reference writes and seven exact-parent RESTRICT tests (both DELETE
  and key UPDATE), plus cross-brand compound-FK rejection;
- seven closed ENUM cases and malformed requested/granted scope representations;
- 31 NULL-related states: PKCE 16 (2 accepted/14 rejected), refresh expiry 4
  (2 accepted/2 rejected), target version 3 (2 accepted/1 rejected), lifecycle
  status/finished_at 8 (4 accepted/4 rejected). Total 10 intentional valid states
  accepted, 21 invalid states rejected. No NULL/UNKNOWN bypass was observed there.

Per-case transaction rollback and afterAll assertions confirmed no users or social
transaction/destination/credential/authorization fixture rows remained in the owned
scratch schema. No broad deletion against the shared primary test database occurred.
No shuffled-order run, original 28 OAuth regression rerun, affected migration suite
or second complete gate was started after the production defect was identified.

### Demonstrated PRODUCTION SCHEMA DEFECT: PAD SPACE key identity

Invalid write, against an otherwise valid encrypted credential fixture:

```sql
UPDATE social_credentials
SET key_id = 'primary-v1 '
WHERE authorization_id = <owned fixture authorization>;
```

Observed safe assertion evidence:

```json
{"accepted":true,"storedTrailingSpace":true,"readerRejected":true}
```

The credential was encrypted with the real token encryptor and its original
provider/authorization/purpose/version AAD. Only its nonsecret key identifier was
changed. The space was preserved on readback; the production decryptToken reader
rejected it. The invalid fixture write was rolled back, not left committed.

Root cause established by read-only MySQL metadata/comparison evidence:

- social_credentials.key_id uses utf8mb4_bin, PAD_ATTRIBUTE=PAD SPACE;
- social_credentials_bounds is ENFORCED=YES, but compares key_id='primary-v1'
  using this padded string collation;
- under that collation, 'primary-v1 ' = 'primary-v1' evaluates TRUE;
- byte comparison evaluates FALSE; canonical length is 10 bytes, padded length 11;
- the TypeScript reader requires exact key ID identity and rejects the 11-byte ID.

This is TRUE caused by string-collation equivalence, **not** a NULL/UNKNOWN bypass
and not an unenforced CHECK. It demonstrates the database CHECK admitting an
unsupported envelope identifier. The normal token writer emits the canonical ID;
no browser-controlled key ID path or decryption/authentication bypass was shown.
The observed effect is credential data-integrity/availability failure with the
reader failing closed. No real credentials were involved or disclosed.

social_transactions.key_id also has PAD SPACE collation and social_tx_pkce uses
that same equality expression. This is an affected-pattern review concern, not a
separately reproduced violating PKCE write: the required stop rule prevented further
mutating probes after the credential defect. Its explicit NULL-group tests passed.

Proposed smallest repair, NOT APPLIED: make accepted key identity byte-exact in
both relevant uncommitted 0010 CHECK predicates, retaining explicit NULL-safe PKCE
group logic, then test padded/case/unknown IDs and valid envelopes. Do not loosen
the reader, trim stored identifiers into apparent validity, change global/table
collation generically, edit old migrations or add 0011. This requires separate
production-schema repair authorization under the user's stop rule.

### Unchanged boundary and current state

0010 remains exactly:
1880eb569ff324882b4ec9374bf352ab44efbeb251952cab4121ee66a052848a

All eleven manifest checksums match; 0000–0009 remain byte-for-byte identical to
HEAD. Permission count remains 32 and approved grants unchanged. No production
authentication, provider configuration, dependency/environment, service, schema,
isolation, retry, sleep or timeout change was made in this repair cycle. Real
provider adapters remain disabled/unverified. Hostinger remains UNVERIFIED.

Current candidate: **21 modified tracked + 26 new = 47 paths**. The three added
inventory paths relative to the prior 44 are the newly modified foundation test
and two new test/helper files above. The existing review document is the fourth
repair-touched path; all other pre-repair candidate files retain their fingerprints.
Nothing staged, committed or pushed. Phase 8 remains unstarted. Second complete
review gate NOT RUN because the prerequisite targeted validation found a production
schema defect. Preserve the failing regression and wait for repair authorization.

## Authorized production collation-family repair — 2026-10-17

All earlier stop/results above remain historical. Authorization now permits a
narrow repair of uncommitted 0010, including PKCE if independently reproduced.
Branch/main/local/remote remain 8e8ac677ca0125239d45fe3110f25961aa2dfcc3;
index empty. Before repair: 21 modified tracked + 26 new = 47 paths. External
candidate hashes were preserved at /tmp/phase7-collation-baseline.json, not copied
into the repository. Package/lock/example remain unchanged.

### PKCE reproduction before repair

One dedicated direct MySQL regression failed as expected: the complete otherwise
valid PKCE envelope accepted key_id with a trailing ASCII space. Safe output:

```json
{"accepted":true,"hex":"7072696D6172792D763120","length":11,"readerRejected":true}
```

Canonical identity bytes are `7072696D6172792D7631` (10 bytes). This reproduces the
same PAD SPACE family in social_tx_pkce, rather than assuming it from source.
There were 79 deliberately unselected tests in this diagnostic invocation.
No NULL bypass or fail-open reader was observed. Impact remains data integrity /
validation mismatch, not authentication/authorization/decryption bypass.

### Smallest production repair and write-path inspection

Replace only the two literal key-ID equality predicates in existing CHECKs with:
`CAST(key_id AS BINARY)=CAST('primary-v1' AS BINARY)`.
No new constraint/table, no global collation change, no 0011. Counts remain twelve
social CHECKs and seven social FKs. Explicit NULL-group predicates are retained.
Manifest updated to the actual uncommitted migration bytes.

Old 0010 SHA-256:
1880eb569ff324882b4ec9374bf352ab44efbeb251952cab4121ee66a052848a

New 0010 SHA-256:
b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce

Application inspection: loadTokenKey fixes id to primary-v1; aad(), called by
both encryptToken/decryptToken, rejects any other exact string. encryptToken
writes that validated identity; decryptToken additionally requires the envelope
ID to equal the key ID. No application change was needed. Ten new unit cases
retain matching strict writer/reader rejection without normalizing values.
AES-GCM, AAD, keys, DTOs, authentication, recent-auth fundamentals, privileges,
transaction isolation and production reader are unchanged.

### Bounded security-sensitive predicate audit

| Field/predicate | Classification | Evidence/disposition |
|---|---|---|
| credentials.key_id | A: byte-exact required | Reproduced stored 11-byte invalid identity; binary-cast CHECK repaired |
| transactions.key_id in PKCE group | A: byte-exact required | Independently reproduced same bytes/reader rejection; binary-cast CHECK repaired |
| provider, destination kind, connection/transaction status, credential purpose | B: canonical ENUM domain sufficient | Unknown values reject; direct padded ENUM writes persist canonical ENUM bytes, not padded identities |
| envelope/auth/target versions | D: not collation affected | Numeric unsigned columns plus positive-version CHECKs; no string format-version comparison |
| state_hash, ciphertext, IV, tag | D: not collation affected | Binary storage, not collated string equality; state hash unique; PKCE explicit NULL grouping retained |
| redirect URI, UUID references, remote subject/destination identity, scopes | D: no security-key literal equality predicate in reviewed CHECKs | Service exact typed validation/object resolution remains authoritative; no broad VARCHAR redesign |
| display_name, handle | C: untrusted display/user text | Escaped display data, not encryption-key identity |

The audit is limited to 0010 security-sensitive predicates. It does not assert
that every VARCHAR has binary uniqueness semantics. No materially different
production defect was demonstrated during this audit.

### Initial repaired validation

103 direct MySQL constraint tests passed (3.58 seconds): previous 79 cases plus
one independently reproduced PKCE case, 22 key-ID matrix cases (11 each credential
and PKCE), and one canonical ENUM-storage test. Matrix includes canonical valid,
leading/trailing/double ASCII spaces, tab, newline, case, NBSP, embedded NUL,
empty and overlong strings. Safe HEX/OCTET_LENGTH checks prove attempted parameter
bytes and unchanged stored bytes after rejection. PAD SPACE ordinary equality is
TRUE for trailing spaces while binary equality is FALSE. Overlong values reject
at the column bound; other invalid identities reject the relevant CHECK.

All original 31 NULL states, exact social inventories, independent CHECK writes,
FK orphan/cross-brand/RESTRICT tests and corrected duplicate-identity fixture
passed. Per-case rollback and empty-scratch assertions passed. Crypto/policy unit
subset: 37 passed, including ten added strict writer/reader identity regressions.
Further migration/foundation/order validation and complete gate results follow.

### Foundation and security revalidation

Normal affected execution: 146 passed across social constraints, OAuth and migration
recovery files; then 281 passed across historical CHECK/FK inventory, foundation,
authentication/access, rate/security-event and content/runtime immutability files.
Total affected normal-order coverage: 427 tests in nine files. No failing assertion.
The added runtime credential-grant test proves exact table-level CRUD grants and
rejection of credential DDL, authorization-history deletion and grant escalation.
Existing content runtime direct-SQL denial coverage remains intact.

The guarded disposable primary test and browser schemas were rebuilt from the
repaired migration files before revalidation/browser preparation. Old applied
migration checksums were not overwritten to conceal changed SQL. No production
schema or credentials were contacted. Runtime grant definitions were not changed.

Normal foundation run observed both native legitimate authentication attempts
PASSWORD_VERIFIED; wait approximately 0.03/184.05 ms, verification 191.21/159.71 ms,
maximum active 1, both rate-admitted, databaseErrors empty. This is observation,
not a new availability guarantee or change to the 750 ms admission policy.

One requested shuffled-run tool launch failed before process creation because
exec-server transport disconnected. A separate process check confirmed no Vitest
runner existed. The test invocation was then launched; no test result was rerun.
Fixed-seed shuffled results and gate evidence follow below.

## Consolidated Phase 7 review report (gate results appended below)

This is a review candidate, not finalized or production verified. Shared lifecycle
machinery is implemented; real protocol/network adapters remain disabled. The
historical policy stops and failed runs above remain part of this report.

| Items | Result |
|---|---|
| A baseline | main, HEAD/local/remote 8e8ac677ca0125239d45fe3110f25961aa2dfcc3; unstaged candidate |
| B–C research | 2026-10-16 official-source attempts; 21 proxy-403 failures preserved in docs/research/phase-7-provider-requirements.md, with independently supplied TikTok/Google official findings distinguished from successful retrieval |
| D–F permissions | 32 canonical; integrations.read added; compatible integrations.manage existed. Explicit read/manage: Owner YES/YES, Marketing Admin YES/YES, Creator YES/NO, Reviewer NO/NO, Viewer NO/NO. Only approved Marketing Admin manage grant expansion; no implication engine |
| G object scope | Canonical workspace; managers administer workspace connections with step-up. Creator dedicated minimal safe-destination DTO only, no credential/transaction/audit/security identity/scope/expiry details |
| H abstraction | Small SocialProvider interface; deterministic injected test fake; empty production adapter registry; no SDK |
| I–J transactions/state | PENDING→EXCHANGING→COMPLETED/FAILED; ten-minute expiry; 256-bit random state, domain-separated digest, unique and single-use; no raw state persisted |
| K PKCE | Fake-provider S256 exercises encrypted pending verifier and challenge; individual real provider PKCE requirements remain UNVERIFIED. Both envelope CHECKs now enforce byte-exact key identity |
| L callback binding | Live initiating actor/session/auth version/provider/brand checked at claim and completion; role loss/disabled/stale/expired/revoked context rejects |
| M parser | Bounded strict callback parameters; duplicate/escaped-equivalent security keys, malformed controls/encoding, code/error ambiguity and unexpected fields reject |
| N redirect | Fixed trusted APP_URL-derived callback and fixed result route; no forwarded-host/returnTo authority; callback no-referrer |
| O endpoints | No production outbound provider endpoint implemented. Future exact endpoint allowlist is blocked on official protocol review, not claimed tested by a fake |
| P–Q schema/migration | Five social tables via uncommitted 0010; eleven migrations total; 0000–0009 unchanged; twelve social CHECKs and seven RESTRICT FKs; key identity collation repair only |
| R runtime grants | Table-specific social access; no new runtime DDL/catalog/audit/history mutation. Credentials require server-only CRUD for lifecycle; migration/admin identity separate; actual restricted SQL denial coverage retained |
| S–T encryption | AES-256-GCM; existing separate 32-byte TOKEN_ENCRYPTION_KEY; random IV12/tag16; AAD binds format/key/provider/authorization or transaction/purpose/version; primary-v1 byte-exact, swaps/tamper fail closed |
| U plaintext | Transient SensitiveValue at crypto/provider boundary; redacted JSON/errors; no plaintext DB/DTO/log storage; JS string zeroization cannot be guaranteed |
| V–X Meta/Facebook/Instagram | Real adapter and Page/professional-account discovery disabled/UNVERIFIED. Typed destination model exists; no claims of verified provider discovery/publishing capability |
| Y–AA TikTok/YouTube/LinkedIn | All real adapters/app configurations/production connections UNVERIFIED and disabled. Supplied official findings do not prove exact implemented wire protocols or app approval |
| AB–AC scopes | Provider-owned requested registry and validated actually granted subset in injected interface; unrequested/invalid scopes reject; partial consent becomes LIMITED. Real provider scope registries await official verification |
| AD–AE discovery/selection | Typed validated discovered destinations; explicit persistent selection bound to authorization/provider/brand/version and separate recent-auth proof; no automatic cross-owner/object selection |
| AF–AG status/readiness | CONNECTED/LIMITED/RECONNECT_REQUIRED/DISCONNECTED with expired/ambiguous refresh treated safely; future publishing classification UNVERIFIED, never inferred from login/connection success |
| AH expiry | Access/optional refresh expiry tracked; expired authorization fails safely/requires reconnect; no fiction of permanent authorization |
| AI–AJ refresh | Internal primitive, bounded provider deadline/lease; one concurrent claimant; version+lease identity recheck, no DB transaction during provider work; ambiguous/abandoned refresh not retried automatically; disconnect/stale completion cannot restore credentials |
| AK reconnect | New bound transaction, current manage+step-up authority, stable subject/version check; cannot silently swap remote identity |
| AL–AM disconnect/revocation | Local credential deletion/destination disable/selection clear first; optional provider revocation outcome safely audited; remote failure cannot restore local authority. Real provider revocation semantics remain unverified |
| AN CSRF | Existing Origin/Fetch Metadata/session-CSRF architecture on management mutations; narrowly bound OAuth callback navigation exception; no broad CORS/CSP relaxation |
| AO–AP IDOR/mass assignment | Strict schemas; authoritative brand/authorization/destination lookup; no browser token/provider endpoint/raw scope/owner assignment; safe read DTO independent of management DTO |
| AQ–AR SSRF/redirects | No production provider outbound request exists; no user/database URL-selected endpoint; fixed trusted redirects. Real adapter SSRF/response parser controls remain blocked until adapters are implemented |
| AS replay | Separate-pool callback race allows exactly one exchange; EXCHANGING commits before provider work; no retry of ambiguous exchange |
| AT–AU audit/events | Required bounded safe action/record/outcome metadata; no code/state/PKCE/token/envelope/raw response; audit failure rolls back domain completion; safe events share correlation |
| AV–AW UI/roles | Connections page, enabled-provider management controls with step-up; disabled setup for unverified adapters; Creator read-only safe destinations; Reviewer/Viewer no surface or direct document/Flight/prefetch/API access |
| AX–AY responsive/a11y | Existing design-system layout, keyboard/labels/focus/status behavior and narrow/wide viewport regressions; final complete browser result below |
| AZ–BA findings/repairs | Historical implementation/test findings above; inventory ownership repaired without weakening exactness; duplicate remote-ID fixture corrected; reproduced credential+PKCE PAD SPACE predicates repaired; no reader normalization or auth redesign |
| BB–BL complete gate | Fresh authorized complete-gate results appended below; no earlier failed gate is replaced |
| BM–BN migrations | Eleven verified manifest entries; previous finalized ten byte-identical; 0010 old/new hashes above; no 0011 |
| BO inventory | Exact 47 paths listed below: 21 modified tracked, 26 new |
| BP–BQ dependencies/env | No additions/upgrades/new environment names; package/lock/example byte-identical to baseline; provider keys optional and no real credentials used |
| BR git | Nothing staged/committed/pushed; baseline preserved; Phase 8 absent |
| BS Hostinger | UNVERIFIED, including runtime grants, secret injection, HTTPS/proxy/query-log redaction, Node/native/crypto/MySQL/storage/cron and outbound provider gates |
| BT–BW providers | Meta, TikTok, Google/YouTube and LinkedIn production/app-review/configuration all UNVERIFIED; none enabled by local/fake tests |

### Explicit scope/security answers

| Question | YES/NO |
|---|---|
| New canonical permission added? | YES: integrations.read only |
| Existing grants changed? | YES: approved Marketing Admin integrations.manage only |
| Production authentication fundamentals changed? | NO; existing closed purpose/action extension only |
| Recent-auth policy changed? | NO; existing bound mechanism reused |
| Social OAuth separate from app login? | YES |
| Access/refresh tokens server-side only? | YES |
| Token plaintext stored in DB or exposed to browser? | NO |
| State random / single-use / expiry enforced / initiating context bound? | YES / YES / YES / YES |
| Duplicate callback security parameters rejected? | YES |
| PKCE used where officially supported/required? | NO real adapter is enabled; fake S256 only; real per-provider protocol verification pending |
| Redirect URI trusted-config-derived? | YES |
| Open redirects / user-controlled provider endpoints / arbitrary browser scopes? | NO / NO / NO |
| Granted scopes recorded / partial consent handled? | YES / YES (shared machinery; real-provider verification pending) |
| Credentials encrypted at rest? | YES |
| Tokens present in audit/logs? | NO |
| Reviewer global credentials / Viewer credentials? | NO / NO |
| Fake provider can run in production? | NO |
| Real secrets or live social provider required for CI/browser tests? | NO / NO |
| Connection treated as publishing success? | NO |
| TikTok login treated as Direct Post approval? | NO |
| LinkedIn login treated as organization posting authority? | NO |
| Meta login treated as Instagram publishing readiness? | NO |
| Google login treated as YouTube upload success? | NO |
| Publishing endpoint called / test social post created / scheduling added? | NO / NO / NO |
| Generic retry / arbitrary sleep / isolation change / finalized migration change? | NO / NO / NO / NO |
| S3 / Redis / Docker-root-permanent-worker required? | NO / NO / NO |
| Phase 8 / staged / committed / pushed? | NO / NO / NO / NO |

### Order-independence and pre-gate candidate freeze

Fixed-seed shuffled execution (files and tests, seed 20261017): **427 passed in
nine files**, 139.34 seconds. Together with normal 146+281 passes, no fixture
contamination or order-dependent failure was observed. No test retries, sleeps,
timeout/policy changes or assertion weakening were used.

Fresh complete gate expected enumeration: Unit/UI 542 (532 + 10 strict identity
unit cases); MySQL 843 (prior 739 + 103 social constraints + 1 runtime credential
grant case); browser 112, zero retries. Actual counts will be reported.

Current exact inventory: **21 modified tracked + 26 new = 47 paths**. Relative
to the pre-production-repair candidate, only seven existing candidate paths changed:
0010, manifest, social-constraints test, foundation runtime-grant test, social unit
test, architecture document and this review record. No new repair path was added.
Every other candidate path retained its pre-repair content hash.

```text
M AGENTS.md
A docs/architecture/phase-7.md
A docs/research/phase-7-provider-requirements.md
A docs/review/phase-7.md
A migrations/0010_social_connections.sql
M migrations/manifest.json
M next.config.ts
M scripts/local-mysql.py
M src/app/(workspace)/[section]/page.tsx
A src/app/(workspace)/connections/page.tsx
M src/app/(workspace)/overview/page.tsx
A src/app/api/connections/route.ts
A src/app/api/oauth/[provider]/callback/route.ts
A src/features/connections/connections.tsx
A src/features/connections/model.ts
M src/server/auth/access.ts
M src/server/authorization/routes.ts
M src/server/db/catalog.ts
M src/server/db/schema.ts
A src/server/social/crypto.ts
A src/server/social/events.ts
A src/server/social/policy.ts
A src/server/social/provider.ts
A src/server/social/schema.ts
A src/server/social/service.ts
A src/server/social/web.ts
A tests/browser/connections.spec.ts
A tests/browser/social-harness-client.tsx
A tests/browser/social-harness.ts
M tests/browser/team.spec.ts
M tests/browser/ui.spec.ts
M tests/database/check-constraints.test.ts
M tests/database/foundation.test.ts
M tests/database/migration-recovery.test.ts
M tests/database/phase2b-helpers.ts
A tests/database/social-constraints.test.ts
A tests/database/social.test.ts
A tests/fixtures/phase-6-catalog.json
A tests/helpers/schema-contract.ts
A tests/helpers/social-fixtures.ts
A tests/ui/connections.test.tsx
M tests/unit/authorization.test.ts
M tests/unit/brand-adversarial.test.ts
M tests/unit/brand.test.ts
M tests/unit/database-config.test.ts
M tests/unit/media.test.ts
A tests/unit/social.test.ts
```

All eleven migration manifest hashes match. Finalized 0000–0009 are byte-identical
to HEAD. Package/lock/example retain the baseline hashes recorded below. The
full candidate freeze is stored outside the repository, not as a diagnostic artifact
in the commit. No files are staged. No implementation change is allowed during
the complete gate. Final gate outcomes will be appended as review evidence.


## Fresh second complete Phase 7 REVIEW gate — PASS

This is the one newly authorized complete attempt after the demonstrated schema
repair. It ran from the beginning against the frozen candidate, without repair,
rerun, retry, skip or assertion change during the gate. Original failed first-gate
and targeted-run histories above remain unchanged.

| Gate | Actual result |
|---|---|
| npm ci | PASS; 321 packages installed; existing install-script policy unchanged |
| lint | PASS, zero warnings |
| strict typecheck | PASS |
| Unit/UI | **542 passed**, 29 files |
| complete isolated MySQL | **843 passed**, 17 files; 330.55-second Vitest duration |
| secret scan | PASS; 279 repository files and 420 unique historical blobs across 12 commits |
| npm audit | PASS, **0 vulnerabilities** |
| production build | PASS; existing media filesystem-tracing warning retained below |
| complete browser | **112 passed**, **0 retries**, one worker, approximately 2.3 minutes |
| npm ls --all | PASS, exit 0; uninstalled optional platform/tool integrations are reported as optional, not required dependency errors |
| git diff --check | PASS |
| all migration checksums | PASS: eleven manifest entries and eleven SQL files; 0000–0009 match committed bytes |

Enumeration changes are fully accounted for: original Phase 6 baseline 502 Unit/UI
+27 social unit +3 Connections UI +10 strict writer/reader key-ID cases =542.
MySQL 710 finalized baseline +28 OAuth +1 exact Phase 6 upgrade +103 direct social
constraint cases +1 runtime credential-grant case =843. Browser 104 finalized
baseline +8 Connections cases =112. No unexplained disappearance, skip or retry.

Full-gate authentication observation: both attempts PASSWORD_VERIFIED, rate-admitted,
maximum active native work **1**, databaseErrors empty. Waits approximately
0.03/134.77 ms; native verification approximately 141.53/141.17 ms. No CAPACITY
failure occurred. Production auth/Argon2/session/MFA/recent-auth fundamentals,
queue bounds and 750 ms deadline remain unchanged. This does not retrospectively
classify the original historical Phase 3 authentication failure.

### Non-failing output retained transparently

Build emitted one Turbopack dynamic-filesystem tracing warning at the unchanged
Phase 4 media storage-root validation in src/server/media/storage.ts:17. No tracing
bypass or path-validation weakening was added. Deployment bundle size/content
inspection remains a Hostinger gate; local build success does not prove deployment.

Browser server emitted `The destination stream errored while writing data` with
safe digest 1827607153 during the passing Composer responsive/navigation case
(tests/browser/content.spec.ts:42). The cause is not established by this output;
no assertion/test/check failed, no repeatability is claimed, and no repair/rerun
was attempted. Browser also emitted NO_COLOR/FORCE_COLOR configuration warnings.
These messages do not establish a new production schema/service defect and are
preserved for review rather than suppressed or silently represented as absent.

### Freeze, integrity and artifact inspection

Pre-gate 47-path SHA-256 fingerprint (sorted path + NUL + content digest + newline):
`26ab185ac08ceaf7285216f702860e2cd78359f3663ab49c7e2425f301d72681`.
All 47 individual file hashes and the exact inventory matched after the complete
gate. Only this documentation record is subsequently updated to report results;
production/test/migration files remain exactly the tested bytes.

Baseline and final package/example fingerprints:

- package.json: 9a1601a108d72bfa63e47faad201288284d018c7de975cc490901be96fea8591
- package-lock.json: ea3b129e3bae04a93b47780c4cb9292d3f2dd699986671c3c4c0f9ca64edbc57
- .env.example: b441023d4a408cfad87a9e25db3cfc556d44d3f93b9a0bcdc2e21a602e5d9846

No dependency addition/upgrade, install-script allowance or environment-name/value
change occurred in this repair. No production credential, plaintext token, key,
private environment file, browser capture, upload, dump, log, coverage/build output
or diagnostic transcript is among the candidate paths. Secret scanning passed.
Safe test output contains classifications/timing, HTTP outcomes and public key-ID
bytes, not password/hash/token/code/state/PKCE/encryption key values. External gate
logs/freezes remain outside the repository and are not copied into the candidate.

Exact migration manifest verified after the gate:

```text
0000_phase2a_security_foundation.sql f1bd8bb9ec302a9e67c8a25d70dde8f7707fdbdfbe3e0d4e263ef88f4b33f799
0001_security_invariants.sql 6e3725de5e3eb5af2141e0e6d41e9269f607d8610c6c7e59153e38d4fec35e02
0002_review_integrity.sql 429a62df6842fd1bb0261baaf51b6121305cc1b3576682f51b9b5dce87f5a811
0003_password_verified_challenges.sql 978abcf2a7456c1259c5208442eebdeb9e78233b1d692c40f2ef2e2cded7a401
0004_phase2c_access_bindings.sql 48130cb75ecc20db6e1aec08fdb475f73b07e5a73eef6515cad3af2b7ca55925
0005_phase2d_administration.sql 9d973926b53e35a7721eacff046bbc347ff43b2a9a5558c6112ca28a2bbc716a
0006_brand_brain.sql ac785551c2ca5070c2e62de90877788005c8f4a2ff02e5c74bb0cad50c895c37
0007_temporary_media.sql 01495fcf7d3945d951935f807c9f952eb149ef59b8449c9083884c85642a9d4a
0008_ai_generations.sql d081f12d4575f5b9b1092fada7d761445f6dcaff90c364b0cd0d3f4566e0c7f1
0009_content_workflow.sql f4c21f84c2127f6cced5d881151709fd4df55424f3a43b72d04f6efaa0fc0782
0010_social_connections.sql b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce
```

### Repair report cross-reference (A–AH)

| Items | Final evidence |
|---|---|
| A–B original inventory gate / test repair | First gate ci/lint/typecheck/532 unit passed, MySQL FAILED, later checks NOT RUN. Explicit historical-table CHECK/FK contracts plus independent complete social contracts replace accidental inclusion of social names; no weak count-only assertion |
| C–D 63/1 fixture result | Duplicate remote identity masked composite FK; only fixture remote ID changed; exact evidence/history retained above |
| E–J 78/1 schema result / impact | Credential padded key stored, reader rejected; PKCE independently reproduced; PAD SPACE TRUE vs byte FALSE, not NULL UNKNOWN; integrity/availability mismatch, no demonstrated auth/token bypass or plaintext exposure |
| K–L production repair / writer | Binary casts in two existing 0010 CHECKs; existing exact writer and fail-closed reader unchanged |
| M–O matrix / PKCE / string audit | 22 credential+PKCE byte-identity matrix cases, preserved two targeted regressions; PKCE affected and repaired; typed ENUM storage/numeric/binary/display predicates classified above |
| P 31 NULL states | All passed normally, fixed-seed shuffled and complete suite; ten valid accepted, 21 invalid rejected |
| Q–S inventories / violating writes | Foundation 36 CHECKs and 21 FKs exact; social 12 CHECKs and seven FKs exact; independent CHECK writes, orphan/cross-brand FKs, per-parent DELETE/UPDATE RESTRICT and fixed fixture all pass |
| T–W checksums / old migration integrity | Old/new 0010 hashes above; 0000–0009 byte-identical to finalized baseline; eleven total, no 0011 |
| X–Y foundation / shuffle | 281 foundation/auth/security/content passes; combined normal affected146+281=427; shuffled427 pass, fixed seed20261017 |
| Z–AC complete gate | Unit542, MySQL843, browser112/retries0; all eleven gate commands exit0; all migration hashes verified |
| AD inventory | 21 modified +26 new=47, exact list above; seven existing candidate paths touched during this authorized repair, all other pre-repair hashes preserved |
| AE permissions | 32; read Owner/Admin/Creator; manage Owner/Admin; Reviewer/Viewer neither; no permission/grant changes during this repair |
| AF real providers | Meta/TikTok/Google-YouTube/LinkedIn disabled and production/app-review UNVERIFIED; no real credentials/live CI calls |
| AG Hostinger | UNVERIFIED; all previous deployment gates plus credential grants, secret custody, trusted callbacks, query-log redaction/outbound protocol gates retained |
| AH Phase 8 | NOT STARTED; no publishing/scheduling/remote social post/schema |

Final Git state: main, local HEAD and remote main both
8e8ac677ca0125239d45fe3110f25961aa2dfcc3. Exactly 21 modified tracked and 26 new
Phase 7 paths; empty index. **Nothing staged. Nothing committed. Nothing pushed.**
No history rewrite. No generic retry, arbitrary sleep, transaction isolation,
production authentication/Argon2/session/MFA or recent-auth policy change.
No change to AES-GCM/AAD/key material/reader behavior. No real provider enabled,
S3/Redis/Docker/root/permanent worker added. **STOPPED FOR REVIEW, NOT FINALIZED.**

## First FINALIZATION gate — FAILED (history preserved)

The successful REVIEW gate above remains historical evidence: Unit/UI542,
MySQL843, browser112/retries0, and all its other checks passed. It is not replaced
by this later failed finalization attempt.

First finalization attempt: npm ci, lint, strict typecheck, Unit/UI542, MySQL843,
secret scan, npm audit (zero vulnerabilities) and production build passed. The
recorded build warning remained non-failing. Browser summary after interrupting
on the observed failure: **108 passed / 1 failed / 1 interrupted / 2 not run /
0 retries**. npm ls --all and git diff --check were NOT RUN after the failure.
The interrupted UI case is not classified as an independent defect.

Historical failed case: tests/browser/media.spec.ts:12,
`upload UI keyboard/remove and responsive widths retain the existing design`.
Captured message: `Browser security check failed (credential-bearing details withheld).`
The root cause remains **NOT REPRODUCED — ROOT CAUSE UNRESOLVED**; flakiness was
not established. Neither a security leak nor a production/test/fixture/environment
cause is established by that redacted message. No repair or complete-gate rerun
occurred under that failed authorization. No staging/commit/push occurred.

## Authorized single-test diagnosis and retained safe observability

Read-only inspection established that tests/browser/secure-test.ts rewrites ALL
underlying errors, not only security assertions. It was the reporter; its generic
message is not proof that a security invariant failed. The historical context
retained no specific assertion identity. This is a separate demonstrated
DIAGNOSTIC / OBSERVABILITY LIMITATION, not an explanation of the underlying failure.

The separately authorized diagnosis executed the exact media test ONCE: **1 passed,
0 retries**. Input focus, upload-ready status, all five overflow checks, removal
and removed-status checks passed. Safe HTTP evidence: upload201, removal200 and
metadata refresh200. This later pass does not invalidate the historical failure.

User then approved retention of the existing test-only instrumentation, subject
to explicit safe-contract validation. Only tests/browser/media.spec.ts was changed
for the instrumentation; no production/helper/wrapper changes were needed.

Original media.spec.ts SHA-256:
be646c07557d7cde4ce85277e4eeb77a94399f88bb84f8473c5516c1b1601ae6

Retained diagnostic SHA-256:
88efca9c734d1597ea9aefc084a7de6407d76365f43498367d46834993e48128

The retained code emits fixed assertion labels, bounded route/method/status
classifications, booleans, counts, dimensions and closed UI-status categories.
No raw error, header, body, cookie, browser storage, credential or sensitive URL
is emitted. At most twelve response classifications are retained; unsupported
routes/methods are omitted. Response listener removal is in finally. The global
redaction fixture remains byte-identical to the finalized parent.

### Diagnostic contract validation — PASS

A local deterministic harness outside the checkout transpiled and executed the
ACTUAL original and retained test callbacks using existing TypeScript plus
controlled browser doubles; it did not copy/reimplement the diagnostic logic.
Sixteen scenarios exercised success, navigation/focus/status/overflow/click/removal
failures, unavailable failure probe, bounded response flooding, all six closed
status classifications and non-media route redaction. It compared original versus
retained product-operation/assertion sequences. Injected assertion failures still
failed; the instrumentation never converted a failure into success. Listener
cleanup ran exactly once in every success/failure scenario, including unavailable
failure-state collection. Viewports, predicates, selectors, waits and timeouts
were preserved. No sleeps, retries or new product requests were introduced.

Synthetic sentinels covered twelve secret families: Authorization, cookie,
session, CSRF, OAuth code/state, PKCE, access/refresh token, password, MFA and
query-string secret. They were placed in rich raw errors, fixture cookie input,
response URLs (including userinfo/query values), forbidden header/body accessors,
unknown DOM status text and non-media pathname. Strict output field/value allowlist
assertions rejected raw-value serialization; forbidden accessors were not used.
Response output was restricted to fixed route category, GET/POST/DELETE and numeric
HTTP status. Overflow diagnostics retained the actual FALSE predicate and width390
in the synthetic failure rather than weakening the authoritative assertion.

Two additional deterministic regressions executed the actual secure-test fixture
with successful and throwing use boundaries and credential-bearing synthetic
error objects: original payload properties were removed and only the existing
redacted message/stack remained. No wrapper modification was made.

Result: **16 controlled scenarios + 2 wrapper scenarios PASS**, twelve synthetic
secret families, 1,371 counted boolean contract checks plus structural equality
assertions. No repository test/helper file was added for this validation; the
harness and sanitized results remain outside the checkout.

The retention authorization's required real media validation then ran ONCE using
the same Chromium/configuration: **1 test passed, 0 retries**, 7.9-second runner
duration. This is distinct from the earlier single diagnostic execution; neither
was a repeated loop. Its bounded output passed a strict field/value review; all
original assertions passed, including widths320/375/390/768/1440 at height900.
No historical root cause or flakiness is inferred.

### Test-description observation (no behavior change)

The title says keyboard/remove. Actual scope is programmatic input focus and a
removal click; there is no keyboard activation assertion, resulting-focus assertion
or media-count assertion. This observation does not expand Phase 7 or change the
test. The resize/overflow predicate remains unchanged; no post-resize sleep or
stabilization mechanism was added.

### New candidate inventory and finalization authorization

The original 47 frozen paths matched before diagnosis. Retained media.spec.ts is
an additional modified tracked path; this authorized history update changes the
already-existing candidate review document. All other 46 original paths remain
byte-identical to that freeze. The retained media diagnostic hash is unchanged.
New inventory: **22 modified tracked + 26 new = 48 paths**. The full 47-path list
above plus tests/browser/media.spec.ts is exact; no other path was added.

No OAuth/Connections/media production/auth/session/CSRF/catalog/grant/encryption/
reader/service/isolation/runtime-grant change occurred. Permissions remain32;
real adapters remain disabled/UNVERIFIED; Hostinger UNVERIFIED; Phase8 absent.
Migrations remain eleven, 0000–0009 finalized bytes unchanged, 0010 still
b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce.

After this append, a NEW 48-path content freeze is recorded externally. A newly
authorized complete finalization gate will run once. No candidate documentation,
source, tests or migrations may change during/after that gate before a conditional
stage/commit/normal push. Gate outcome belongs in the final response/external
execution record; this frozen historical review file will not be edited to
retroactively make any earlier failure appear successful.
