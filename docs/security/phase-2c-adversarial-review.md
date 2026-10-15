# Phase 2C adversarial review

Review of the actual uncommitted Phase 2C implementation above base
`d21d05662367e64a5f6e475ffab2f1cf72a53e98`. No commit, push, Phase 2D,
UI redesign, policy expansion, dependency upgrade or migration rewrite.

## Demonstrated defects and targeted repairs

| Defect demonstrated before repair | Smallest repair | Regression |
| --- | --- | --- |
| JSON.parse silently accepted duplicate action/password names, including escaped-equivalent keys | Reject duplicate names after fatal UTF-8 decoding and syntax validation; retain bounded stream and strict action schema | Unit and real HTTP duplicate-field tests |
| A 43-character non-ASCII CSRF value could reach timingSafeEqual with unequal byte lengths and throw | Require canonical base64url shape and compare byte lengths before timingSafeEqual | Unit and HTTP malformed-token tests |
| Noncanonical identity strings could collide in slash-separated GCM AAD tuples | Require UUID user/method identities and constrained key ID before encryption/decryption; preserve existing valid v1 AAD bytes | Ambiguous tuple rejection and valid-identity ciphertext substitution tests |
| Logout that observed an old token before rotation could miss the successor while waiting for the user lock | Remember the observed stable session ID and revoke that same user-owned lineage using a current locking read | Ten controlled separate-pool rotation/logout trials |
| Malformed logout token threw instead of safe idempotent logout | Reject malformed token as a no-op before transaction | Malformed logout regression |
| Validation/rotation could return an old longer cookie deadline after a stricter-role change before activity touch | Return minimum of stored idle/absolute deadlines and current-role idle/absolute deadlines | Real MySQL promotion-before-touch regression |

No generic retries, isolation changes, threshold changes, crypto-policy changes or
new schema were introduced. Password hashing, capacity, challenge policy and
bounded exact-primary-key rate cleanup remain unchanged from Phase 2B.

## Enforced transitions

| Starting proof/state | Required server checks | Result |
| --- | --- | --- |
| Unauthenticated + password | Phase 2B password verification, admission, current user/version | Restricted PASSWORD_VERIFIED proof only |
| PASSWORD_VERIFIED + active factor | Live purpose/action/user/version-bound proof and current canonical role/status | MFA_REQUIRED; no session |
| PASSWORD_VERIFIED + mandatory role or pending_mfa + absent/pending factor | Same current checks | MFA_ENROLLMENT_REQUIRED; no session |
| PASSWORD_VERIFIED + active optional-MFA user + no active factor | Current role is Creator/Reviewer/Viewer, current status active, session capacity | New password-only session; consume proof atomically |
| Live password proof + start enrollment | No active factor, current user/version/role | Encrypted pending factor bound to exact proof and expiry |
| Matching pending factor + valid TOTP | Current proof, binding, expiry, replay state and capacity | Activate, generate recovery batch, consume proof, issue MFA session and audit in one transaction |
| Active factor + valid TOTP/recovery | Current proof/user/version/role, capacity, unused code/newer step | Consume second factor/proof, issue MFA session and required records atomically |
| Authenticated + recent-auth request | Live session, password, required/active MFA; closed action vocabulary | Rotate session and issue five-minute purpose/session/version-bound action proof |
| REPLACE_FACTOR action proof | Current session/proof and one-use consumption | Revoke all sessions/proofs/codes, increment version, pending_mfa and new restricted enrollment; no session |
| REGENERATE_RECOVERY action proof | Current session/proof and one-use consumption | Revoke unused old batch, generate new one once |
| REVOKE_SESSIONS action proof | Current session/proof and one-use consumption | Revoke all current sessions atomically |

Unexpected states deny. Current role identity/code is checked under a shared lock;
user/factor/proof/session reads are current locking reads. Pending factors cannot
satisfy session MFA. Bootstrap state is never reset or reopened.

## Concurrency and timing

Order: rate admission commits first, then non-authoritative token-owner hint ->
user FOR UPDATE -> canonical role FOR SHARE -> factor FOR UPDATE -> current
proof/session FOR UPDATE -> recovery rows -> required audit/security inserts.
The user lock serializes same-user security mutations across independent pools.
No transaction relies on a pre-lock snapshot count.

Tests assert final database state, not just result counts: eight eligible proofs
compete at four sessions and create one row, preserving five total and consuming
only the successful proof. Challenge admission additionally limits competing work;
not every rejected call reaches the capacity count. Expired/revoked sessions release
capacity. Same TOTP, same recovery code, enrollment completion, rotation and
single-use action proofs have one winner. Factor replacement leaves no live access.

Logout observing the predecessor before rotation revokes its rotated lineage.
If rotation committed before logout's initial lookup, the stale token cannot identify
a lineage and logout is a no-op. Revoke-all includes issuance serialized before it;
a separately authorized fresh login serialized afterward may succeed. It is not a
permanent account lock.

Current TOTP step is accepted once; previous step is accepted only in [0,5000) ms
of the next step, only if not previously accepted. Future codes and rejected/replayed
codes never advance stored replay state. Tests combine deterministic result-clock
injection with real MySQL locks, including an unused previous step followed by the
current step and replay rejection. No tolerance widening.

Idle and absolute comparisons reject at expiry, including +1 ms, and accept -1 ms
when other conditions hold. Explicit activity touches only at >=60000 ms, never
past absolute expiry; background validation does not touch. MySQL UTC time is
authoritative; NTP and hosting clock checks remain deployment requirements.

The two early apparent clock failures are now classified as deterministic test
fixture interference, with authoritative historical binary-log evidence and forced
interleaving regressions. One test read a competing execution's session through an
unscoped assertion even though its own session was correctly touched; another
execution deleted a valid proof before continuation. No production clock defect or
fake-Date leakage was involved. See [clock closure](phase-2c-clock-closure.md) for
exact log positions, time-source inventory, boundary/skew tests and the worker-owned
non-waiting test fixture lease. Production authentication logic is unchanged by closure.

## Cryptography, HTTP and browser boundary

AES-256-GCM: canonical independent 32-byte key, random 12-byte IV, 16-byte tag,
key ID, fixed purpose/version and canonical user/method AAD. Substitution and
malformed key/nonce/tag/ciphertext fail with sanitized errors. Ten recovery codes
use 16 random bytes each; hexadecimal encoding and inserted hyphens preserve all
128 bits. Only domain-separated SHA-256 hashes are persisted. Sessions and action
proofs use fresh 32-byte tokens; only hashes persist. JavaScript memory erasure
cannot be guaranteed.

All cookie set/delete paths use __Host prefix, Secure, HttpOnly, SameSite=Lax,
Path=/ and no Domain. No development weakening or alternate accepted session name.
Anonymous CSRF uses random signed expiring state; CSRF HMAC is bound to state kind
and identifier. Exact configured APP_URL origin and exact Fetch Metadata are
required. Cross-state/session/rotation substitution fails; authenticated mutations
also revalidate database lifecycle. Matching stale CSRF alone grants no access.
Forwarded host/network headers never establish trust. GET cannot logout or extend
activity; auth GET may initialize anonymous CSRF cookie only.

Fatal UTF-8 decoding precedes JSON parsing; duplicate names (including escapes),
unknown/nested fields, malformed JSON/content types and oversized bodies reject.
No password trim, normalization, replacement or truncation was introduced.

Each workspace page AND layout invokes the server authentication guard. Tests
cover all 13 actual routes, unknown/nested paths, random/stale/incompatible states
and RSC-prefetch denial. Production build marks workspace routes dynamic; protected
paths are absent from the static manifest. Anonymous production requests have
private/no-store redirects. Development authenticated responses use no-store.
Authenticated browser testing uses the guarded isolated development database;
no production database/environment is repurposed for testing.

## Events, artifacts, migrations and deployment

Access event inputs are strict schemas with closed event/outcome vocabulary and
UUID-or-null identity; callers cannot supply metadata. Stored reasonCode is derived
from the closed event type. Required mutation events/audit writes share transactions;
injected failures roll back factor/session/proof changes. Runtime grants allow
append only for audit/security; a database administrator remains able to change data.

Playwright has zero retries and disables trace, screenshot, video and automatic
failure DOM-copy snapshots. Reporter is list; CI uploads no browser artifacts.
Assertion source contexts may still be created on failure; reviewed contexts contain
source expressions, not DOM/network/secret values. Tests must continue using safe
boolean/count assertions around secret-bearing objects. No guarantee is made for
arbitrary future test code that explicitly logs/attaches secrets.

Production client chunks are inspected for configured private values and server
implementation markers, in addition to import-boundary tests. Secret-bearing browser
fixtures remain in process memory/private environment outside the checkout.

0004 adds only two nullable RESTRICT foreign keys and active-factor binding CHECK.
Clean install, exact Phase 2B upgrade preserving valid rows, repeat, tampering and
real violating-write tests cover it. 0000–0003 are byte-identical to HEAD; all five
manifest checksums match. DDL implicitly commits; recover by forward repair or
backup restoration. No application-startup migration.

Pinned otplib 13.5.0, @noble/hashes 2.4.0 and @scure/base 2.4.0 are unchanged during
review. Argon2 remains 0.45.1 and the only explicitly approved install script.
Hostinger is untested: Node/native Argon2, AES-GCM, MySQL TLS/connection limits,
clock sync, HTTPS, origin/proxy attribution and secure terminal remain gates.
The shared unattributed browser network bucket deliberately fails conservatively
and may throttle legitimate users until verified proxy attribution is configured.

## Final observed verification

- npm ci: passed with locked dependencies.
- Unit/UI: 217 passed, 14 files.
- Isolated real MySQL: 265 passed, 9 files, including 63 adversarial review cases.
- Chromium/browser: 40 passed, zero retries.
- Production build, lint, strict typecheck, secret scan, npm audit, npm ls --all,
  git diff --check: passed. Audit reported zero vulnerabilities.
- All five migration hashes match; original four migrations unchanged.
- No review changes to UI, dependencies, environment names or migrations.
- HEAD remains the Phase 2B base; all Phase 2C work is unstaged/uncommitted.

These were the pre-closure verification counts. The separate clock-closure record
contains the new verification totals and closes the historical fixture anomalies.
Neither review certifies production hosting.
