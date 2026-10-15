# Phase 2D final targeted adversarial review — A–AI

Base: `main`, `f16a3bb94dd7bda30b01c6aae282f279a8da2e60`. This review preserves the original 21 modified/24 new Phase 2D files. No staging, commit, push, reset or Phase 3 work. Fingerprints of the exact pre-review working tree were recorded outside the checkout to distinguish review changes from implementation changes.

## A. Overall adversarial verdict

The targeted source/SQL/service/HTTP/browser review found two demonstrated defects, described below. Core Team authority, Owner concurrency, invitation bindings, required audit atomicity and two-stage authorization passed the added real-MySQL attacks. The final full gate passed; results are recorded in AB–AH. This is tested application-boundary evidence, not a claim of production deployment readiness or complete security.

## B. Demonstrated defects and smallest repairs

1. **RSC/prefetch denial status:** documents returned 403, but after Next's `_rsc` normalization redirects the Flight response returned 200 with denial content. The evidence covered `/team`, `/connections`, `/settings`; no protected Team content appeared in those responses. Root cause: React/Next Flight streaming can commit status 200 before an asynchronous forbidden boundary resolves. Next also strips Flight headers before Proxy by default, so a conditional Proxy check cannot see them under that default. Repair: a denial-only RSC/prefetch preflight through the existing central authorization service, plus the installed Next version's documented `skipProxyUrlNormalize` flag to retain those headers. Request pathname—not query or a supplied routing header—selects the permission. Existing page/layout/API/mutation checks remain. Unknown/missing permission denies; missing/invalid session restarts login; DB failure returns sanitized unavailable. Positive controls require authorized Flight responses to remain 200 with `text/x-component`, preventing a deny-all workaround. Normal document design is preserved.
2. **Browser failure-artifact credential exposure:** a controlled public-canary navigation failure showed its full bearer-like URL in reporter output and `error-context.md`, even with trace/screenshot/video disabled and automatic page snapshots suppressed. Root cause: those settings do not sanitize exception messages, causes or matcher context. Repair: a test-only automatic fixture removes payload-bearing error details before report/artifact generation, retaining the failed result and test location. All browser specs use it. A regression runs isolated child tests with a public canary: ordinary diagnostics leak it; protected diagnostics do not; both child tests still exit failed. No real credential is used. No assertion, retry policy or CI failure condition was weakened.

Only `src/proxy.ts` and `next.config.ts` received production changes during this review. No business logic, authentication policy, schema, package or UI redesign changed.

## C. Authorization/catalog

Reviewed `src/server/db/catalog.ts`, deterministic seeds and `src/server/authorization/authorization.ts`. The database must contain exactly five canonical ID/code pairs, all 28 canonical permission pairs and exact role-permission relationships. Missing/extra/corrupt relationships fail closed before the returned context is used. Returning the corresponding closed policy array after exact DB agreement does not grant stale or browser-supplied capabilities. Unknown permission and empty requirements deny. Current session validation checks status, authentication version, current canonical role and required MFA. No wildcard/default allow or browser permission arrays.

Role-name uses outside the generic permission helpers were inventoried: canonical Owner identity for last-Owner/self/inviter/bootstrap invariants, and Owner/Marketing Admin for approved MFA/lifetime policy. They are explicit security invariants, not an inferred role hierarchy. Team mutations use centralized Owner + permission policy.

## D. Role matrix

All 28 permissions agree across seeds, actual MySQL role_permissions, both Phase 2D matrices, authorization contexts and route permissions. Unit coverage compares every documented matrix row to the catalog. Browser coverage compares each role's entire visible main navigation against its direct-route allow list.

| Role | Representative capability ALLOW | Representative DENY |
|---|---|---|
| OWNER | Team administration after required step-up | self role/status changes; unknown permission; invalid proof |
| MARKETING_ADMIN | operational content/publishing permission and allowed placeholders | any Team/Owner elevation/security administration |
| CONTENT_CREATOR | content.create/content.edit_assigned; allowed placeholders | Team/security administration |
| REVIEWER | content.review/content.approve permission | Team administration and unrelated operational powers |
| VIEWER | content/calendar/analytics read destinations | all Team mutations and Team list |

Future capability codes are permission checks only: no publishing/content/approval feature was implemented by this review.

## E. Last-Owner concurrency

Real MySQL, independent pools: one active Owner with two simultaneous self-disable, self-demote or mixed attempts retains one active Owner. Two active Owners with cross-disable, cross-demote and mixed cross-disable/demotion retain one active Owner. The losing stale actor cannot finish administration. Owner demotion races their invitation administration; any invitation issued before demotion becomes unusable through issuer-version/current-role checks. Final committed Owner counts are asserted, not inferred from returned errors. No generic retry.

## F. Owner self-actions

Self disable, demotion, invitation and administrative self session-revoke reject; upper-case UUID manipulation does not bypass binary identity/self checks. The stricter V1 rule applies even with two Owners. Self logout/session management remains available through the existing Phase 2C path. There is no user-delete endpoint or authority-removal editor.

## G. Marketing Admin escalation

Marketing Admin cannot promote self/another user, invite an Owner, disable an Owner, revoke Owner sessions or revoke invitations. The same action matrix denies Viewer/Creator/Reviewer. Current Owner identity plus the precise canonical permission is required, independently of requested target role. No generic role-change capability silently elevates Marketing Admin.

## H. Target-aware IDOR

Every Team mutation validates action, actor, current target and intended canonical role. Malformed/nonexistent/self/changed targets deny safely where required. Broad permission plus a valid UUID alone is insufficient. Target selection never comes from a browser-supplied permission list. Authorized Owner operations against another permitted member are positive controls.

## I. Stale authorization

A deterministic query-boundary latch holds the administrative guard after preliminary authorization. Another connection changes actor role, status, authentication version or MFA-required state before the queued mutation acquires it. The in-transaction check rejects every case; target role and proof-consumption state remain unchanged. Marketing Admin demotion and Owner changes do not preserve prior authority.

## J. Role changes and sessions

Creator -> Marketing Admin: version increments, old password-only session/proofs revoke, account becomes pending_mfa without an active factor. Marketing Admin -> Viewer: version increments and old session, recent proof and password-stage proof revoke in committed DB state. Active MFA material remains encrypted and preserved. No old session becomes privileged through a role update.

## K. Disable/enable races

Disable races session validation, session issuance, an authorized mutation and recent-proof consumption. After disable commits, sessions are revoked and the user is disabled; a competing operation that completed first cannot leave usable authority afterward. Re-enable never revives old sessions or challenges. Passwordless invited users cannot be disabled/enabled through this path; invitation revocation is their control. Invitation acceptance additionally races inviter disable and recipient-role correction.

## L. Invitation tokens

32 random bytes from Node CSPRNG, 43-character base64url bearer; domain-separated SHA-256 only persisted. Table hash length/uniqueness constraints remain. Bearer is returned only after successful creation commit, never by DTO/list/read. Expired/revoked/consumed/malformed/random/superseded tokens reject. Token A with account B's email cannot accept B. No session is created by acceptance.

## M. Invitation role binding

Recipient role is resolved from the current canonical assignment plus the stored intended_role_id and recipient/issuer authentication-version snapshots. HTTP attempts to add Owner, Marketing Admin, arbitrary role IDs or permission arrays reject under strict schemas. Recipient cannot choose a role. Pre-acceptance role correction revokes old links, leaves the account invited/passwordless and requires explicit reissue. Canonical catalog corruption fails closed.

## N. Invitation concurrency

Separate pools exercise same-token consumption (exactly one winner), revoke/accept, supersede/accept, recipient role correction/accept, inviter disable/accept and competing same-email creation. Tests assert one user/role assignment, at most one live invitation, coherent password/status state, no orphan MFA/session state and no privileged session before mandatory MFA. If acceptance wins first, later revoke/reissue of an already accepted account rejects; if revocation/correction/supersession wins first, the original bearer rejects.

## O. Invitation disclosure

Canonical handoff uses a URL fragment, excluded from HTTP request URLs and Referer. The recipient immediately replaces history with `/invitation`, drops query/hash and holds the bearer only in component memory. Admin display clears/unmounts on dismissal; no token retrieval endpoint, storage persistence, analytics, external QR/email or console logging. Responses are private/no-store and invitation/auth responses use no-referrer. The demonstrated Playwright error-path leak was repaired as B describes. This does not promise protection from browser extensions, a compromised recipient device or an Owner sharing the bearer insecurely.

## P. Recent-auth proofs

All Team mutations require an explicit password/MFA-derived Phase 2C action proof. Commitment includes exact normalized payload, target and requested role/status. Tests attack wrong action/target, wrong purpose/version, expired/revoked/consumed proof, rotation, disabled/stale actor and another valid session of the same Owner. Cross-session proof fails; the original intended session remains a positive control. Consumption and mutation/audit commit together. No parallel weaker confirmation mechanism.

## Q. CSRF inventory

Invite/reissue, invitation revoke, acceptance/password setup, role change, disable, enable, administrative session revoke and step-up retain browser CSRF controls. Each Team mutation's HTTP test uses a genuinely valid proof, attempts missing/wrong/non-ASCII/cross-state token, wrong Origin/Fetch Metadata and GET mutation, then requires the authorized POST control to succeed. A rotated session rejects its prior CSRF token even when supplied a newly valid action proof. Anonymous acceptance separately validates its signed pre-state, Origin and metadata; role injection never reaches setup. No state-changing GET was added.

## R. Target-lock repair

Preliminary current-session/catalog authorization rejects non-Owners before the global guard or another user's row. Existing independent-connection tests hold the target or guard and prove denial completes before release. The additional stale-authority latch tests prove the inside-transaction authorization still occurs after locks; preauthorization is an availability check, never a cached grant.

## S. HTTP denial and streaming

Before repair: tested documents 403; terminal RSC/prefetch 200, without protected content. After repair: document/RSC/prefetch negative controls 403; authorized Flight controls remain valid. Tests follow bounded Next normalization redirects rather than mistaking a 307 `_rsc` normalization response for a final denial. They also attack supplied route headers, nested/unknown routes and existing unauthenticated/expired/revoked/disabled session boundaries. Page/API guards are still required even if Proxy is bypassed by a different future route.

## T. Team DTO exposure

Explicit fields only: id handle, displayName, normalized email, canonical role, status, MFA-enabled boolean and active-session count. No password/session/invitation/recovery hash, raw session token, auth_version, MFA ciphertext/seed/key ID, signing secret or raw database row is serialized. The creation response's one-time invitation and step-up response's restricted action proof are intentional boundaries with no-store protection. UI accepts no permission arrays.

## U. Navigation and direct access

Every role's sidebar hrefs match its documented server route allow list. Hidden Team/settings/connections destinations still deny direct requests; authorized unfinished destinations remain placeholders. Permission visibility does not authorize any action. Owner, Marketing Admin, Creator, Reviewer and Viewer get explicit representative allow/deny coverage, not inherited hierarchy assumptions.

## V. Audit atomicity and redaction

For invite, revoke, accept, role change, disable, enable and administrative session revoke, a test-only query plugin throws at the required audit INSERT after preceding real DML. User/role/session/challenge/invitation/audit state and successful security-event count remain unchanged. Retrying that same unconsumed proof/bearer through the healthy service succeeds once, and replay adds no second successful mutation/audit. This tests real DML rollback without changing production failure behavior or relying on transactional DDL.

Closed event types and bounded enum-only before/after state reject password/hash/token/proof/CSRF/MFA/recovery/request/header/cookie metadata keys and arbitrary objects. Successful and failed event storage is checked against operation material using boolean assertions, never payload dumps. Runtime history privileges remain SELECT/INSERT only; database administrators are outside the append-oriented application guarantee.

## W. Migration 0005

No SQL migration changed. Clean install, exact 0000–0004 Phase 2C upgrade, repeat and checksum tamper tests remain. Upgrade coverage now includes a genuinely usable existing account, valid encrypted factor and hashed opaque session; snapshots remain unchanged and the session validates after 0005. Legacy invitation bindings remain null/unusable. Direct MySQL writes prove singleton, positive/all-or-none invitation bindings and restrictive role FK enforcement. MySQL DDL implicitly commits and can lock tables: use explicit maintenance migration plus backup/forward recovery, never startup migration or false rollback guarantees.

## X. Transaction ordering and deadlocks

Preauthorization transaction commits first. Mutation order: guard -> involved user UUID equality locks in sorted order -> current actor role/factor/session/catalog -> bound action proof -> current target role/invitation/factor -> sessions/challenges/invalidation -> audit/events. Last-Owner count is a current locking read under the guard. Invitation acceptance: rate admission -> bounded password hash -> guard -> sorted recipient/issuer users -> catalog/current invitation/role/version/status -> password and acceptance -> audit/events. All affected users are locked before child security state.

Phase 2C uses one user -> role/factor -> session/proof/recovery; it never acquires the administrative guard or another user's lock. This avoids cycles with the cross-user path. A worker-local test diagnostic hook captures only MySQL code/errno/SQLSTATE/command before sanitization if a test fails; it never prints SQL/parameters/messages/credentials. No production diagnostic behavior, retry, isolation, rate threshold or cleanup-index change was introduced.

## Y. Replay and HTTP inputs

Same consumed proof or invitation always rejects. Already-achieved role/status change with a fresh proof safely rejects. A separately authorized fresh-proof revoke request can invalidate any newly outstanding state and audit that distinct request even if no sessions/invitations remain; it grants no authority. No automatic retries.

Both Phase 2D endpoints are exercised with malformed UTF-8/JSON, literal/escaped duplicate fields, unsupported Content-Type, >4096 bytes, malformed UUID and unexpected properties. They fail closed with sanitized responses; application failure codes are not exposed. Body rejection currently uses each existing endpoint's generic error status (including generic unavailable where applicable), without performing mutations. No input assertion was relaxed.

## Z. Hostinger and manual delivery limitations

No production deployment/DB access occurred. Gates remain for exact Node/native Argon2, AES-GCM runtime, MySQL TLS and connection limits, clock synchronization, HTTPS cookies, proxy/origin trust and secure CLI input. The RSC preflight adds a bounded DB lookup on Flight/prefetch requests; verify deployment support and pool budget. Next's experimental forbidden renderer and Proxy normalization behavior require upgrade regressions. No native/password/MFA/session/rate policy changed.

Manual handoff proves bearer possession + compliant password setup + required MFA, not email ownership. Neither UI nor documentation claims verified email ownership. Owner must deliver the one-time bearer to the intended recipient through a trusted private channel. No email provider, password reset, exceptional MFA reset/disable, user impersonation or Phase 3 feature was added.

## AA. Files changed during this review only

15 files differ from the exact pre-review working tree:

- `docs/architecture/phase-2d.md`
- `docs/review/phase-2d-adversarial.md`
- `docs/review/phase-2d.md`
- `next.config.ts`
- `src/proxy.ts`
- `tests/browser/access-review.spec.ts`
- `tests/browser/auth.spec.ts`
- `tests/browser/secure-test.ts`
- `tests/browser/team.spec.ts`
- `tests/browser/ui.spec.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/database/team.test.ts`
- `tests/helpers/mysql-review-diagnostics.ts`
- `tests/unit/authorization.test.ts`
- `tests/unit/browser-artifact-safety.test.ts`

## AB–AH. Final gate

- **AB — Unit/UI:** 237 passed across 17 files, including the isolated expected-failure public-canary controls.
- **AC — Isolated MySQL:** 387 passed across 11 files, including 98 Team tests. No unexpected concurrency failure/deadlock.
- **AD — Browser:** 59 passed, retries 0; all browser specs executed.
- **AE — Install/lint/typecheck/build:** npm ci, zero-warning lint, strict typecheck and production build passed. Build requires no live DB or production credentials.
- **AF — Security/dependencies:** npm audit: 0 vulnerabilities; npm ls --all: exit 0, no invalid/extraneous dependency state. Secret scan passed: 172 repository files and 214 unique historical blobs across 7 commits; no credential contents printed.
- **AG — Migration integrity:** all six manifest SHA-256 values match their files and pre-review fingerprints; 0000–0004 also match base HEAD. Migration order remains 0000–0005. No migration changed during this review.
- **AH — Whitespace:** git diff --check passed; repeated after final report update.

## AI. Git state

Main remains at `f16a3bb94dd7bda30b01c6aae282f279a8da2e60`. Final status: 22 modified tracked files and 28 untracked files; index empty. All implementation/review changes remain unstaged/untracked for approval. Only `.env.example` is present among repository environment files; no new generated binary/log/build/test artifacts are included. No commit, push, branch rewrite, discard/reset or Phase 3 work.
