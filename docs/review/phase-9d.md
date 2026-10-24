# Phase 9D — LinkedIn Development integration

## Initial gap analysis and implementation plan — 2026-10-24

Baseline main/HEAD/local/live remote: 1ee7d070c2f9aabb22ec309f072822cc53292be6;
clean working tree, empty index;12 migrations/no0012;32 permissions;real profiles0.
Closed PRD/Phase7/Phase9B/Phase9C records reviewed; no broad research or real calls.

| Gap | Existing support | Bounded planned change |
| --- | --- | --- |
| A OAuth start | Phase7 step-up/state/redirect route | LinkedIn fixed authorization URL/profile |
| B callback | Session/provider/state/version replay guards | Supply trusted claimed-attempt context to real exchange |
| C code exchange | Generic interface, no real LinkedIn | Typed fixed confidential form request through Phase9A wire |
| D grant admission | Generic validated complete Grant | Strict LinkedIn token/scope/identity/destination admission |
| E expiry | Encrypted expiry-aware model | Bound returned TTL and subtract elapsed exchange time |
| F identity | Generic subject, no provider capture | Same-token /v2/userinfo opaque sub, app-namespaced; no person-URN conversion |
| G discovery | Destinations required before grant attach | Reuse strict bounded complete Approved authorization result |
| H selection | Existing stepped-up internal destination selection | Preserve; no arbitrary browser organization ID |
| I/J connection/credential versions | Existing AAD and immutable snapshot checks | Bind exact OAuth attempt and app namespace; preserve send rechecks |
| K production transport | Secure network/JSON; LinkedIn test-only | Shared secure wire, closed fixed OAuth/identity operations, branded reviewed profile |
| L/M preflight/publisher | Phase9B correct but test construction only | Reuse same mapper/parser/prepare flow in official factory |
| N version | Syntax only | Fixed202610 REVIEWED_CANDIDATE, review/support deadlines |
| O capability | Empty registries/test-only guards | Explicit reviewed admission; production default disabled; no env auto-enable |
| P audit | Existing safe integration/publishing events | Reuse; no raw token/identity response logging |
| Q tests | Existing Phase7/9B fake TLS/DB coverage | Add local TLS official-path and complete connection/publish regressions |

Planned production ADD: provider-security/linkedin-profile.ts; social/linkedin.ts;
server/linkedin-runtime.ts. Planned MODIFY: provider-security/transport.ts;
publishing/linkedin-text.ts, provider.ts, service.ts, web.ts; social/provider.ts,
service.ts, web.ts. Tests/helper additions and this review only. No UI needed: existing
Connections UI represents connect/status/verified selection and stays unconfigured
while registry disabled. No dependencies, packages, schema, migrations or permissions.

PKCE decision: use provider-evidenced confidential authorization-code exchange with
server secret and mandatory existing state; current LinkedIn web S256 contract remains
unverified. LinkedIn profile pkce=false; generic Phase7 PKCE support remains unchanged.
No silent claim that LinkedIn supports PKCE. Refresh remains unimplemented:
REFRESH_NOT_REQUIRED_FOR_INITIAL_VALIDATION. No real credentials or calls authorized.

## Implemented boundary and focused validation checkpoint

Production-capable construction now reuses the Phase7 callback/credential/destination
model and Phase9B immutable publisher. The web registries consult one server-only
runtime constructor which returns null before reading credentials while the frozen
review/enablement flags are false. Environment-variable presence cannot enable it.
No UI change was needed; the existing Connections workflow stays unconfigured.

The profile admits only ORGANIZATION_TEXT_ONLY /202610 REVIEWED_CANDIDATE. Review
window: 2026-10-24 inclusive to 2026-11-23 exclusive; monthly review and known
2027-10-15 support end are enforced locally, with a seven-day sunset margin.
Unknown/forged profiles, incomplete reviews, stale reviews and changed client app
identity fail closed. Neither configured candidate nor tests establish real approval.

Fixed connection operations: confidential POST /oauth/v2/accessToken on
www.linkedin.com; same-access-token GET /v2/userinfo on api.linkedin.com; then the
existing fixed organization authorization BatchFinder on api.linkedin.com. All share
the Phase9A DNS/IP/peer/TLS/timeout/header/body/JSON wire implementation; no raw fetch,
redirect following, generic header map or generic Rest.li client. Each operation
revalidates the claimed EXCHANGING attempt/session/user/provider/state/redirect/scopes
and reconnect version before sending; no DB lock spans remote work. Whole callback
retains the existing 15-second deadline. Responses never enter logs or persistent
shadow storage. Token expiry subtracts elapsed work. Scope evidence must contain
exactly the two posting/preflight grants plus openid/profile. Refresh is not exposed.

Identity: provider-returned opaque OIDC sub is admitted under project ASCII/length
bounds and namespaced with a SHA-256 digest of the server client ID; stored in the
existing 200-character subject column. No email, ID-token consumption, person-URN
conversion or browser identity input. Same bearer credential binds userinfo and
finder; the finder response must be member-consistent. Real OIDC-to-Marketing-person
identifier equivalence is neither assumed nor needed. Exact identity and discovery
operation currentness still require separately authorized external validation.

Discovery reuses the bounded 16 KiB/20-record complete-result contract. Only Approved
organizations become canonical decimal IDs and internal destination records; no
manual provider-ID trust, role guessing, second page or silent partial success.
Selection rebinds encrypted access to the new version; official publishing requires
the same app namespace and existing current connection/credential checks. Every POST
still has fresh preflight. 201 plus exactly one admitted x-restli-id alone yields
PUBLISHED; possible-send uncertainty remains UNKNOWN with no redispatch.

Focused results: 358 unit/security/social tests across7 files PASS (3.00s), including
63 new Development cases;68 database tests across3 files PASS (19.09s), including19
new Development cases. Lint, public typecheck, secret scan and production build PASS.
No retries or timeout changes. Earlier focused runs caught and corrected a new
bytewise-JSON scope comparison (MySQL normalization) and new test fixture selection/
invalid-input assertion issues; these were corrected before gate eligibility.

Checkpoint:15 intended paths (7 new/8 modified), no deletion; no schema, migration,
permission, package, dependency, configuration or UI change. Historical12 migration
hashes intact/no0012;32 permissions and content.publish matrix unchanged. Registered
production profiles0; all providers DISABLED/UNVERIFIED. No implementation security,
schema or dependency blocker remains for deterministic local validation. Eligible for
one fresh complete gate; results pending below. No real OAuth/credentials/API calls/
posts/portal actions/deployment; Hostinger UNVERIFIED. Real enablement still requires
explicit admission, fresh version/operation reviews, app/products/tier approval,
trusted identity/discovery verification, real grants, and separately authorized real
validation. Phase9C/B history is unchanged.

## One complete gate — stopped at browser — 2026-10-24

PHASE_9D_GATE_FAILED. Implementation is NOT complete-gate validated. No gate rerun,
failed-test rerun, retry, timeout increase, cleanup, repair, staging, commit or push.
Node24.21.0/npm11.19.0; established NPM_CONFIG_CACHE=/workspace/.npm-cache.
Frozen pre-gate and post-gate/pre-review fingerprint both:
9f9a152b385cef6b84dd9331c48fbf1ac82e42da667ac0d47aebc232d0803e9e.
Candidate bytes remained unchanged during execution; index empty.

| Stage | Result | Command duration |
| --- | --- | --- |
| npm ci | PASS |9.854s|
| lint | PASS |5.337s|
| public typecheck | PASS; no LayoutProps duplicate |5.560s|
| secret scan | PASS |15.391s|
| audit | PASS; critical/high/moderate/low/total all0 |0.629s|
| complete Unit/UI |969 passed /0 failed /0 skipped |21.094s|
| complete MySQL |1007 passed /0 failed /0 skipped,21 files |374.157s|
| complete browser |111 passed /1 failed /0 skipped;0 retries |154.482s|
| production build |NOT RUN: stopped at browser |—|
| dependency tree |NOT RUN: stopped at browser |—|
| gate diff check/final success invariants |NOT RUN: stopped at browser |—|

Correction to the provisional focused checkpoint above: new Development unit cases
are49, not63. Focused total358 was correct; new Development database cases19 and
focused database total68 were correct. Complete Unit/UI includes49 new Development
cases and all15 typecheck-contract cases; State C passed in168.40ms without timeout.
The earlier focused production build passed; it is not a complete-gate build result.

First material failure: tests/browser/media.spec.ts:12, "upload UI keyboard/remove
and responsive widths retain the existing design". Existing safe structured metadata
identifies assertion assert-input-focused. Fixture sign-in, navigation and input.focus
completed; inputFocused=false, inputCount=1, inputDisabled=false, viewport1440x1000,
scrollWidth1425, status EMPTY, no observed media/auth requests. Failure was before
upload, viewport resizing or removal assertions. Credential-bearing raw error details
remain withheld by the existing secure reporter; no new diagnostic instrumentation.

Cause of focus loss is UNRESOLVED. Phase9D attribution NOT ESTABLISHED: this candidate
changes no media UI, media service, browser test or browser configuration. This is not
proof of non-causation and not evidence establishing flakiness. Historical browser
classification remains UNRESOLVED / NOT_REPRODUCED_ROOT_CAUSE_UNRESOLVED; flakiness
NOT ESTABLISHED. Smallest justified next action: separately authorize targeted,
safe diagnosis of this existing focus assertion; no implementation repair is yet
supported. No test or gate was rerun after failure.

Read-only post-failure integrity PASS:15 intended paths (7 new/8 modified/0 deleted),
no unexpected Git-visible artifacts; HEAD/local/live remote remain the immutable
baseline; index empty. All12 migration hashes unchanged, no0012;32 permissions;
content.publish Owner/Marketing Admin YES, Creator/Reviewer/Viewer NO. No schema,
grant, RBAC, dependency, package, config or Phase9B/C-document change. Registered
production profiles0; Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED/UNVERIFIED.
No real credentials, OAuth, LinkedIn/provider calls, posts, portal changes or deployment.
Hostinger UNVERIFIED. Only this bounded review result was appended after execution.
STOP FOR REVIEW; no success/commit recommendation is issued.
