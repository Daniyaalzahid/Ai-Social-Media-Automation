# Phase 6 implementation and adversarial review

**Verdict: READY FOR PHASE 6 REVIEW. Not finalized or committed.**

Base: `d143a300c8213178a49aa1b02cb6e21866572760` on main. Unstaged review
candidate; no commit/push and no Phase 7. Architecture and exact runtime grant
requirements: [phase-6.md](../architecture/phase-6.md).

## Interruption recovery and evidence

Resume preserved all existing work: 19 modified tracked paths and 19 new paths,
nothing staged, baseline/local/remote unchanged. The complete tracked diff and
per-file hashes were recorded outside the checkout before continuation. Existing
0009 and targeted tests were inspected rather than recreated. Documentation was
missing and is added by continuation. Final inventory below includes these docs.
No source reset, history rewrite or discarded work.

Evidence below is a sanitized account of observed failures, not a claim that a
subsequent pass retroactively explains an unrelated failure. Raw DB diagnostics,
local credentials and temporary evidence remain outside the repository. Test-only
DB diagnostics retain bounded operation/table/row-count/error-code/SQLSTATE data,
not parameters or values; replaced boundaries are restored in finally.

| Finding | Classification and evidence | Targeted resolution/regression |
|---|---|---|
| Trigger creation returned ER_BINLOG_CREATE_ROUTINE_NEED_SUPER (1419/HY000), binary logging enabled | Deployment incompatibility of the initial design | No triggers/SUPER/root/server-setting change. Append-only domain paths plus actual restricted runtime SQL denials; migration/admin identity remains separate. Hostinger grant capability UNVERIFIED. |
| Losing editor saw post sequence 2 but its nonlocking revision read saw no row under the older RR snapshot; result UNAVAILABLE | Production concurrency defect, captured at DB boundary | Current locking revision lookup beneath locked aggregate. Separate-pool stale loser must return CONFLICT, sequence [1,2], one winner. Isolation unchanged. |
| Cross-admin edits returned ER_LOCK_DEADLOCK/40001; copied authorship FK needed the opposite actor's user row | Production FK/lock-order defect | Inherited authors bind to same-post immutable originating revision and real creator through restrictive composite FK. No unchecked user ID or removed historical attribution. |
| Partial origin-FK repair still deadlocked through locking history index ranges while holding fresh inserts | Production response-read lock defect | Read immutable known-base lineage without range locks; build rich response in a fresh authorization transaction after committing mutation. Synchronized two-pool regression retained. |
| Reviewer DTO used as Creator editing state in two fixtures (no latest working ID is deliberately exposed to Reviewer) | TEST defects | Re-read with Creator identity; no production weakening or relaxed assertion. |
| Cleanup discovery time preceded release time; newly released asset fell outside that call's expired cutoff | Production cleanup timestamp defect | Release sets expiry to the cleanup discovery timestamp. Same-call deletion/quota assertions retained. |
| Escaped unpaired surrogate accepted by new Composer body decoder | Production input-boundary defect | Recursive well-formed Unicode rejection in Phase 6 decoder only. Shared authentication decoder unchanged. |
| Expired-media fixture set expiry before creation and violated the existing CHECK | TEST defect | Move fixture creation into the past too; preserve CHECK and actual expiry test. |
| Expired attach/cleanup test exposed ER_LOCK_DEADLOCK/40001: cleanup held media guard and waited for user FK S; attachment held user X and waited for guard | Production media FK lock inversion | Consistent sorted involved parent-user locks before media guard/asset/hold. Internal cleanup uses creator S for FK integrity, not human impersonation. Fresh authority and ownership rechecks. Five focused lock regressions and expanded 116 DB tests passed. |
| General media delivery accepted an expired Composer attached asset while contextual delivery rejected it | Production expiry inconsistency, isolated real MySQL test demonstrated resolved get instead of required 404 | Apply expiry to temporary/attached general reads/list; retained future state unchanged. Regression covers both delivery boundaries before cron. |

Targeted browser run initially passed21/23. The workflow fixture switched the
browser cookie to Reviewer immediately after clicking Creator submit, before its
CSRF-bound asynchronous request completed (safe status evidence:200,200,200,200,403).
The fixture now waits for the exact submitted-revision state before switching
actors. The mobile fixture tried a hidden drawer link; it now opens/closes the
existing drawer using real controls. Both are TEST defects, not auth changes.

No generic retry, arbitrary sleep, authentication change, isolation change,
permission change, dependency change or environment addition is used as a repair.
The cross-admin test synchronizes both preliminary reads before sorted parent
locks; it does not demand that both transactions simultaneously pass a lock which
is intentionally exclusive. Assertions still require both independent edits to
commit with intact lineage.

## A–BH: implementation and security review

| Item | Result/design |
|---|---|
| A Architecture | Server-authoritative immutable revision aggregate, scoped workflow and existing deterministic Phase 3/5 validation. |
| B Composer aggregate | Stable item/owner/initial assignment, serialized counter, independent latest and approved identities. |
| C Schema | Nine relational tables in 0009; no generic state JSON or mutable approved boolean. Bounded platform JSON is a typed value object. |
| D Migration | Only 0009; ten manifest entries. No triggers, catalog grants, startup DDL or Phase 7 schema. |
| E Permission catalog | Exactly 31; existing catalog/grants byte-identical. |
| F Permissions added | None. |
| G Role matrix | Owner/Admin workspace create/edit/submit/review/approve with explicit self capability; Creator own/initial-assigned create/edit/submit; Reviewer submitted review scope; Viewer approved text only. |
| H Object scope | Authenticated current authority plus authoritative item/revision/submission/attachment relation. UUID alone grants nothing. |
| I Self approval | Authorship lineage plus review+approve+approve_self required; explicit decision/audit flag. Role change never erases contribution. |
| J Viewer | Separate closed DTO: approved text, title, revision identity/sequence only; no newer draft/history/notes/media/facts/AI detail. |
| K Workflow states | DRAFT, IN_REVIEW, CHANGES_REQUESTED, REJECTED, APPROVED derived from exact revisions/submissions/decisions. |
| L Transitions | Explicit new revision; submit current valid revision; pending review gets one terminal decision. No direct state patch. |
| M Submission | Immutable exact revision plus current policy revalidation; unsupported prose rejects without rewrite. |
| N Active review | One pending submission per item, DB unique generated key. Editing creates separate draft while existing review continues. |
| O Decisions | APPROVED/REJECTED/CHANGES_REQUESTED with bounded note, actor and exact submission/revision, unique terminal decision. |
| P Concurrent reviewers | Independent pools: one wins; second conflicts. No last-write-wins/retry. |
| Q Approved semantics | Resolve exact approved immutable revision from authoritative decision. |
| R Edit after approval | New unapproved revision; previous approved revision remains historical and separately identifiable. |
| S Revisions | Append-only immutable revision/variants/facts/lineage/attachments; restricted runtime SELECT/INSERT only. |
| T Sequence | Aggregate lock and unique per-item sequence; server-generated monotonic counter. |
| U Optimistic concurrency | Expected revision required; current locking base lookup; stale request conflicts. |
| V Duplicate Save | Actor/request ID and parsed-command digest; same request/payload idempotent; changed payload conflicts. Fresh accepted identical Save deliberately adds revision. |
| W Provenance | Server source, actor, immutable origin lineage, resolved typed fact snapshot and Brand revision. |
| X AI import | Own completed authorized generation; exact server output and provider/model/source revision; no browser-forged source/output. |
| Y Human edit | MANUAL/HUMAN_EDITED/AI_GENERATED/AI_EDITED; editing never pretends untouched AI output. |
| Z Validation | Existing prepareGeneration/canonicalClaim/validateDraft reused; inverse exact phrase/fact assembly. Schema-valid arbitrary draft remains unvalidated. |
| AA Human claims | All 13 categories tested through human edit/save/submission path; unsupported protected claim prose rejects. |
| AB Approval-required claims | Workflow approval provides no new source authority; EXPLICIT_APPROVAL_REQUIRED remains unavailable. |
| AC Brand revision | Revision preserves creation validation revision; submission and decision record their current validation revision separately. |
| AD Policy change | Current policy/fact identity and literal rechecked at submit/approve; changes reject, never rewrite history. |
| AE Fact snapshots | Bounded typed stable record identity and resolved immutable value; mutable array index cannot retroactively authorize old content. |
| AF Platforms | Separate Facebook/Instagram/TikTok/YouTube/LinkedIn; selected subsets only. YouTube title/description/tags/hashtags distinct. |
| AG Bounds | 64 KiB/5s request; 32 KiB pack; 13 unique-category facts; 5 platforms; 4 media; history/list20; lineage200, reject excess. |
| AH Title | Internal title max160 code points, required nonblank; never treated as platform copy/protected factual authority. |
| AI Tags | Existing strict bounded Phase 5 tags/hashtags and current Brand constraints reused. |
| AJ Unicode/XSS | English/Roman Urdu/Urdu/mixed round trips; legitimate joiners preserved; malformed Unicode/control rejects. React text, no trusted HTML. |
| AK Attachments | Immutable revision-to-media relational references, storage lifecycle authoritative, no binary copies/paths in DTO. |
| AL Count/order | At most4 distinct media IDs; unique bounded position0–3. |
| AM Protection | Unattached24h, receiving30m, draft/submit7d, approval30d. Abandoned holds expire. No final publish retention invented. |
| AN Detach | New revision omits media; historical relation intact; previous bounded grace expires, not permanent heavy retention. |
| AO Cleanup races | Parent-user→guard→asset→hold order; fresh eligibility and binary checks; cleanup rechecks renewed hold. Final path-absence deletion and quota exactly-once retained. |
| AP Reviewer media | content.review + legitimate submitted same-item revision + immutable relation + live asset; no global media.read. |
| AQ Protected deletion | All human roles denied normal removal of attached/protected assets. Viewer gets no media. |
| AR Notes | Bounded1000-code-point internal decision note, not audit/body/provider payload. Required nonblank for rejection/change request. |
| AS Lists | Scope-filtered summaries, approved-only Viewer title and platforms; no private latest metadata. |
| AT Review queue | Pending submissions only; exact active submitted snapshot, not newer working revision. |
| AU History | Immutable attribution/source/policy/decision history; Reviewer submitted-only; Viewer none. |
| AV Pagination | Bounded20-row UUID keyset lists and sequence history cursor; closed filter schema, no browser SQL. |
| AW UI | Existing design tokens/components; plain Composer, source import, lists, exact review controls and history. No rich HTML/publishing. |
| AX Accessibility | Labelled inputs/fieldset/status, keyboard controls, confirmation naming revision; responsive320/375/390/768/1440 testing. No formal WCAG certification claimed. |
| AY Unsaved changes | Navigation/unload warning, failed save preserves dirty text, successful save clears; no browser persistence. |
| AZ CSRF | Existing session-bound token, exact Origin and Fetch Metadata on mutation; no GET state change. |
| BA IDOR | Cross-item/revision/submission/media substitutions deny in service and direct HTTP/document/Flight/prefetch paths. |
| BB Mass assignment | Closed command schemas, server ownership/state/source; duplicate escaped keys, bad Unicode/oversize reject. |
| BC Audit | Required mutation/revision/protection/submission/decision/audit DML atomic; failure injection proves rollback. Closed bounded record/action/flag metadata only. |
| BD Logging | No prose/facts/notes/media/secrets/raw DB error dumps in audit; bounded test diagnostics only. |
| BE Errors | Safe validation/policy-change/conflict/not-found/media-unavailable/unavailable classes; internal SQL not exposed. |
| BF Concurrency | Separate pools, stale edits, cross-admin lineage, duplicate submit, conflicting decision, edit/approve, attachment/remove/cleanup and hold-renewal tests. |
| BG Adversarial | Direct role/object attacks, historical fact change, human claim laundering, SQL privilege bypass, mass assignment/CSRF/RSC/XSS and audit fault injection. |
| BH Repairs | Evidence/classification and targeted resolutions recorded above; no retry/isolation/security weakening. |

## BI–BS: first complete review gate — historical BLOCKED result

The complete gate was executed ONCE against the frozen40-path candidate
`8e1b6f55e0559b2772cb178125b90419232686aff8009ad96fda3ce9434c4b9e`.
No candidate files changed during execution. This report was then updated with
results; no production/test repair followed the failed gate.

| Item/check | Result |
|---|---|
| BL npm ci | PASS,11.73s |
| BM lint | PASS,2.73s |
| BN strict typecheck | PASS,11.24s |
| BI unit/UI | 502 passed,27 files,16.08s reported test duration |
| BJ complete isolated MySQL | **643 passed,1 failed /644**,15 files,309.31s reported test duration |
| BK complete browser | NOT RUN after gate failure; targeted run21/23 initially, then the2 corrected scenarios passed with0 retries |
| BO secret scan | NOT RUN after gate failure |
| BP npm audit | NOT RUN after gate failure |
| BQ build | NOT RUN after gate failure |
| BR npm ls | NOT RUN after gate failure |
| BS final gate diff check | NOT RUN after gate failure; pre-gate targeted diff check passed |

Exact failure: `tests/database/foundation.test.ts:83`,
“does not seed users, passwords, MFA material or sessions”: expected0users,
received7. The assertion failed before its session/MFA zero-count assertions.
This is not evidence that seedCatalog created those users.

The Phase6 restricted-runtime SQL test resolves process.env against the primary
isolated test schema, calls contentActor(admin.db), commits application workflow
through the real restricted runtime account, and only closes connections in
finally. Its synthetic user/session/item/revision/submission/audit fixtures persist.
Targeted invocations therefore leave state for the foundation test, whose setup
migrates/seeds but never establishes an empty fixture database. This is a
TEST-ISOLATION defect/empty-database assumption; production seed logic is unchanged.
No claim is made that a repeat run proved deterministic reproduction: none was run.

At the first-gate stop, the proposed correction was (not implemented at that time): give this privilege test explicit
fixture ownership and teardown, and ensure the seed-empty assertion owns a fresh
isolated database rather than relying on global primary-schema emptiness. Preserve
real restricted-account SQL assertions, seed assertions and production behavior.
Do not clear unknown rows or weaken the expected-zero assertion merely to pass.

All other643 MySQL cases passed, including59 content cases,14 migration cases,
actual restricted-runtime SQL denials and both native legitimate authentication
attempts. Native evidence: request1 wait0.032ms/verify146.02ms; request2 queued
wait139.99ms/verify142.81ms. Both PASSWORD_VERIFIED, maximum active1, no DB errors.
The original historical Phase3 auth failure remains UNCLASSIFIED.

Counts relative to Phase5: unit461+37 content policy+4 UI=502;
MySQL584+59 content+1 exact Phase5 upgrade=644. No cases removed/skipped to repair
failures. Complete browser count is unverified; eight new content scenarios are
present, so expected total104 rather than the previous96.

Before this gate, targeted content/media105 tests and the earlier expanded
content/media/migration116 tests passed. Expiry/renewal regression subset4 passed;
corrected workflow/mobile browser subset2 passed. These do not replace the failed
complete gate. No rerun, retry, fixture cleanup or production repair was attempted
after the complete gate failed. At that stop Phase6 was NOT ready for approval/finalization. A separate authorized
repair cycle is recorded below; the first-gate result is not overwritten.

## Authorized failed-gate repair cycle

### Fixture isolation — TEST defect and TEST-ONLY correction

The privilege fixture now reserves its random actor UUID before setup and removes
only that actor's owned item/revision/variant/lineage/fact/attachment/submission/
decision/audit/session/role records in finally, using the guarded migration test
identity. Runtime privileges remain unchanged and direct SQL denial coverage remains.
Before/after primary user counts must match and the reserved actor must be absent.
Pre-existing unrelated rows, including historical fixture leftovers, are preserved;
there is no DELETE-all-users or name/email exclusion. Migration/admin fixture cleanup
is intentionally separate from the runtime account's immutable-history restrictions.

The seed-empty assertion owns bsa_test_clean under the existing exclusive test lease,
uses resetScratch's connected-identity/grant checks, creates a genuinely clean
installation, migrates and seeds, then repeats seeding. It still asserts exactly
zero users, sessions and MFA methods, additionally recovery codes/auth challenges.
It neither filters leftovers nor tolerates nonzero counts. It explicitly differs
from the primary runtime schema. Primary-schema leftovers cannot influence it.

Focused normal-order68 tests passed; a second controlled ordering with shuffled
files/tests and fixed seed6009 also passed68. These are deliberate order variants,
not reruns of a failed test. Targeted filtering skipped81 unrelated cases each time;
those cases remain in the complete suite and are not permanently skipped.

### Nullable generation metadata — demonstrated PRODUCTION SCHEMA defect

Nullable group: generation_id, generation_provider, generation_model and
generation_brand_revision. MANUAL/HUMAN_EDITED require all NULL. AI_GENERATED/
AI_EDITED require a complete set; AI_EDITED retains the historical AI source rather
than mislabelling it purely manual. Current services derive the complete group from
the authoritative generation or immutable base; browser input cannot set these
fields. DTO validation also rejects null AI source revision metadata. Independent
DB enforcement is still necessary because the schema claims this invariant.

The old AI branch was:

    source IN('AI_GENERATED','AI_EDITED')
    AND generation_id IS NOT NULL
    AND generation_provider IS NOT NULL
    AND generation_model IS NOT NULL
    AND generation_brand_revision>0

An outside-checkout diagnostic held the existing test lease, verified the connected
isolated database/account/grants, inserted only transaction-owned synthetic rows,
and rolled the entire probe back. Actual MySQL accepted six of64 source/NULL-mask
combinations: the four legitimate states plus AI_GENERATED and AI_EDITED with only
generation_brand_revision NULL. MySQL separately reported NULL>0 as UNKNOWN.
The CHECK accepts UNKNOWN, so these were real invalid inserts, not a hypothetical
schema-inspection concern. No raw values/IDs/credentials were printed.

The smallest 0009 repair adds generation_brand_revision IS NOT NULL before >0.
All comparison-bearing nullable values now have explicit guards. No table/column,
role/grant/source semantics, finalized migration or application service changed.
No0010. The uncommitted disposable Phase6 test/development/browser fixtures were
reapplied with an explicit old-ledger fingerprint and finalized migration checks;
this is not production checksum rewriting or a transactional DDL rollback claim.

Old0009 SHA-256:
`48dd3c452ea2b0e7835521b0e36df5b7650ba67aa40ac001e8e9c4ab092be54c`

Repaired0009 SHA-256:
`f4c21f84c2127f6cced5d881151709fd4df55424f3a43b72d04f6efaa0fc0782`

The permanent direct-SQL matrix covers all16 NULL masks for each of four sources,
plus zero Brand revision for both AI sources:66 cases,4 valid and62 rejected by
ER_CHECK_CONSTRAINT_VIOLATED naming content_source. Expected inserts and invalid
writes are rolled back per probe. Existing real AI import/edit provenance coverage
is retained. Model/provider value matching remains server-derived; this targeted
CHECK repair enforces the documented source/group consistency, not a new schema.

### Second complete gate

Expanded targeted regressions passed209 tests across content125, media46,
foundation24 and migration14. This includes old concurrency/authorship/media/fact
repairs plus clean install/exact Phase5 upgrade/repeat/tamper and all restricted
runtime assertions. Focused68 tests passed in both normal and seed6009 shuffled
order. Strict typecheck passed after the repair. All ten hashes match;0000–0008
are byte-identical; package/lockfile/env/catalog unchanged.

The candidate still has19 modified tracked and21 new paths,40 total. Relative to
the failed-gate snapshot only seven paths changed: docs/architecture/phase-6.md,
docs/review/phase-6.md, migrations/0009_content_workflow.sql, migrations/manifest.json,
tests/database/content.test.ts, tests/database/foundation.test.ts and
tests/helpers/content-fixtures.ts. The SQL CHECK is the only production/schema
repair in this cycle; test isolation changed no production service.

The second complete gate ran ONCE against frozen fingerprint
`c1117910480effb2d09f1fe5e216920a5e69d8d96bfe64f0b8fd4f87ba058884`.
All40 paths remained byte-identical throughout execution. Only this review report
was subsequently updated with outcomes. No post-gate production/test repair.

| Final report item | Second complete gate result |
|---|---|
| BL npm ci | PASS,9.08s |
| BM lint | PASS,3.04s |
| BN strict typecheck | PASS,2.47s |
| BI unit/UI | **502 passed**,27 files,16.33s test duration |
| BJ isolated MySQL | **710 passed**,15 files,334.55s test duration |
| BO secret scan | PASS,253 repository files and381 historical blobs across11 commits; no credential output |
| BP npm audit | **0 vulnerabilities** |
| BQ production build | PASS,20.69s; no production DB/provider credential required |
| BK complete browser | **104 passed,0 retries**,146.07s command duration |
| BR npm ls --all | PASS; no invalid/extraneous/Prisma/Drizzle packages. Missing optional platform/peer packages are informational. |
| BS git diff --check | PASS |

Second-gate native authentication evidence: both PASSWORD_VERIFIED; request1
wait0.074ms/native145.66ms, request2 queued wait140.09ms/native175.99ms. Maximum
active1; no DB errors or unexpected CAPACITY result. First-gate native observations
above and the historical unclassified Phase3 failure are preserved unchanged.

No unexplained flaky result occurred in this repair cycle. The old failures and
targeted diagnostic classifications remain documented rather than erased. No
retry, sleep, increased timeout, softened assertion, isolation or authentication
change was introduced. Passing this gate means ready for review, not finalization.
Expected counts:502 unit/UI unchanged;710 MySQL (644+66 explicit provenance cases);
104 browser (96 Phase5+8 Phase6),0 retries. No production authentication, deadline,
rate, grant, isolation, dependency or environment changes.

## BT–BU: migrations and deployment

All ten manifest hashes are verified against files; 0000–0008 compared byte-for-byte
with baseline. 0009 checksum is recorded in manifest. Clean install, exact Phase 5
upgrade preserving existing data, repeat, tamper, FK/CHECK violations and actual
restricted-runtime privileges are tested. MySQL DDL implicitly commits: production
recovery is forward migration/backup restoration, never a false rollback promise.

Hostinger remains UNVERIFIED. Apply and verify table/column-scoped runtime grants
before deployment; no broad runtime UPDATE/DELETE/DDL. Migration/admin identity is
separate. Retain all earlier Node/native Argon2/sharp/mp4box/AES-GCM/MySQL TLS/pool/
clock/HTTPS/proxy/SSH/private storage/quota/streaming/cron gates. Production
OpenRouter remains UNVERIFIED. No live provider/production credential is required.
Original Phase 3 historical authentication failure remains unclassified; no
production authentication changes are made here.

## BV: candidate inventory

Modified tracked (19):

- `AGENTS.md`
- `migrations/manifest.json`
- `scripts/local-mysql.py`
- `src/app/(workspace)/[section]/page.tsx`
- `src/app/(workspace)/create-post/page.tsx`
- `src/proxy.ts`
- `src/server/authorization/routes.ts`
- `src/server/brand/service.ts`
- `src/server/db/schema.ts`
- `src/server/media/service.ts`
- `src/styles/globals.css`
- `tests/browser/ai.spec.ts`
- `tests/browser/setup.ts`
- `tests/browser/ui.spec.ts`
- `tests/database/check-constraints.test.ts`
- `tests/database/foundation.test.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/database/phase2b-helpers.ts`
- `tests/unit/database-config.test.ts`

New (21):

- `docs/architecture/phase-6.md`
- `docs/review/phase-6.md`
- `migrations/0009_content_workflow.sql`
- `src/app/(workspace)/approvals/page.tsx`
- `src/app/(workspace)/content/[id]/page.tsx`
- `src/app/(workspace)/content/page.tsx`
- `src/app/api/content/[postId]/revisions/[revisionId]/media/[mediaId]/route.ts`
- `src/app/api/content/route.ts`
- `src/features/content/model.ts`
- `src/features/content/workspace.tsx`
- `src/server/content/http.ts`
- `src/server/content/page-options.ts`
- `src/server/content/policy.ts`
- `src/server/content/service.ts`
- `src/server/content/web.ts`
- `tests/browser/content.spec.ts`
- `tests/database/content.test.ts`
- `tests/helpers/content-database-diagnostic.ts`
- `tests/helpers/content-fixtures.ts`
- `tests/ui/content.test.tsx`
- `tests/unit/content.test.ts`

## BW: Git policy

main at the finalized Phase 5 baseline; all Phase 6 changes unstaged. Nothing
staged, committed or pushed. No Phase 7. Package, lockfile, environment and
production authentication fingerprints are checked against baseline.

## Explicit policy answers

| Question | YES/NO |
|---|---|
| New canonical permissions added? | NO |
| Existing grants changed? | NO |
| Creator can self-approve? | NO |
| Reviewer can edit content? | NO |
| Owner can self-approve? | YES, explicit capability and audit |
| Marketing Admin can self-approve? | YES, explicit capability and audit |
| Viewer can read approved content? | YES, text/minimal approved metadata only |
| Approval applies to exact immutable revision? | YES |
| Editing approved content invalidates approval for new revision? | YES, the new revision has no approval |
| Old approved revision remains historical? | YES |
| Browser can directly set workflow state or attribution? | NO |
| Human edits reuse deterministic claim validation? | YES |
| Workflow approval authorizes otherwise-forbidden claims? | NO |
| AI generation mandatory or OpenRouter required for manual Composer? | NO |
| AI provenance can be forged by browser? | NO |
| Reviewer received global media.read? | NO |
| Reviewer media access contextual only? | YES |
| Attached media protected from orphan cleanup? | YES, bounded protection |
| Heavy media permanently retained? | NO |
| Live OpenRouter required for CI or real API key used? | NO |
| Social OAuth, publishing or scheduling added? | NO |
| S3, Redis, Docker/root/permanent worker required? | NO |
| Production authentication changed? | NO |
| Generic retry or arbitrary sleep added? | NO |
| Argon2 parameters, active1/queue2/750ms or rate controls changed? | NO |
| Transaction isolation changed? | NO |
| Finalized migrations0000–0008 changed? | NO |
| Uncommitted0009 changed for proven NULL defect? | YES, explicit guard only; both hashes above |
| Dependencies or environment names changed? | NO |
| Anything staged, committed or pushed? | NO |
| Phase7 started? | NO |
| Hostinger or production OpenRouter verified? | NO |

## Verified final migration manifest

| File | SHA-256 |
|---|---|
| 0000_phase2a_security_foundation.sql | `f1bd8bb9ec302a9e67c8a25d70dde8f7707fdbdfbe3e0d4e263ef88f4b33f799` |
| 0001_security_invariants.sql | `6e3725de5e3eb5af2141e0e6d41e9269f607d8610c6c7e59153e38d4fec35e02` |
| 0002_review_integrity.sql | `429a62df6842fd1bb0261baaf51b6121305cc1b3576682f51b9b5dce87f5a811` |
| 0003_password_verified_challenges.sql | `978abcf2a7456c1259c5208442eebdeb9e78233b1d692c40f2ef2e2cded7a401` |
| 0004_phase2c_access_bindings.sql | `48130cb75ecc20db6e1aec08fdb475f73b07e5a73eef6515cad3af2b7ca55925` |
| 0005_phase2d_administration.sql | `9d973926b53e35a7721eacff046bbc347ff43b2a9a5558c6112ca28a2bbc716a` |
| 0006_brand_brain.sql | `ac785551c2ca5070c2e62de90877788005c8f4a2ff02e5c74bb0cad50c895c37` |
| 0007_temporary_media.sql | `01495fcf7d3945d951935f807c9f952eb149ef59b8449c9083884c85642a9d4a` |
| 0008_ai_generations.sql | `d081f12d4575f5b9b1092fada7d761445f6dcaff90c364b0cd0d3f4566e0c7f1` |
| 0009_content_workflow.sql | `f4c21f84c2127f6cced5d881151709fd4df55424f3a43b72d04f6efaa0fc0782` |

All ten file hashes and deterministic ordering were verified after the successful
gate;0000–0008 also compared byte-for-byte with the finalized baseline. No0010.

Final main HEAD remains d143a300c8213178a49aa1b02cb6e21866572760. Inventory remains
19 modified tracked +21 new =40 explained Phase6 paths. Index empty. No credentials,
private env values, DB/media/diagnostic/browser/build artifacts enter the candidate.
Hostinger remains UNVERIFIED, including required runtime grant application/verification.
