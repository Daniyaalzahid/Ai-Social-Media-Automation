# Phase 2D implementation report

Historical implementation-gate results below precede the final targeted review. See [the final A–AI adversarial report](phase-2d-adversarial.md) for subsequent repairs, current counts and the review-only file inventory.

Review state: uncommitted on main. Base f16a3bb94dd7bda30b01c6aae282f279a8da2e60. No commit or push; Phase 3 has not started.

## A. Architecture

Current MySQL authority -> central authorization -> target-aware Team transactions -> safe DTO/API -> existing design system. Phase 2C still owns password/MFA/session/CSRF security. Browser role/permission arrays are never authority. Request-level React cache is scoped to one server render; mutations revalidate in their transaction.

## B–D. Exact roles, 28-permission catalog and final role matrix


Roles: OWNER, MARKETING_ADMIN, CONTENT_CREATOR, REVIEWER, VIEWER. One operational role per user. No role/permission editor.

| Permission | OWNER | MARKETING_ADMIN | CONTENT_CREATOR | REVIEWER | VIEWER |
|---|---|---|---|---|---|
| workspace.read | yes | yes | yes | yes | yes |
| content.read | yes | yes | yes | yes | yes |
| calendar.read | yes | yes | yes | yes | yes |
| analytics.read | yes | yes | — | — | yes |
| publishing_logs.read | yes | yes | — | — | — |
| content.create | yes | yes | yes | — | — |
| media.upload | yes | yes | yes | — | — |
| ai.generate | yes | yes | yes | — | — |
| content.edit_any | yes | yes | — | — | — |
| content.edit_assigned | yes | — | yes | — | — |
| content.submit | yes | yes | yes | — | — |
| content.review | yes | yes | — | yes | — |
| content.approve | yes | yes | — | yes | — |
| content.approve_self | yes | yes | — | — | — |
| content.schedule | yes | yes | — | — | — |
| content.publish | yes | yes | — | — | — |
| integrations.manage | yes | — | — | — | — |
| brand.manage | yes | — | — | — | — |
| settings.manage | yes | — | — | — | — |
| security.manage | yes | — | — | — | — |
| audit.read | yes | — | — | — | — |
| users.manage | yes | — | — | — | — |
| roles.assign | yes | — | — | — | — |
| password_reset.issue | yes | — | — | — | — |
| sessions.revoke_any | yes | — | — | — | — |
| password.change_own | yes | yes | yes | yes | yes |
| sessions.manage_own | yes | yes | yes | yes | yes |
| mfa.manage_own | yes | yes | yes | yes | yes |

No permission extension is needed: users.manage governs team read/invite/status, roles.assign governs assignment, sessions.revoke_any governs administrative revocation. Currently only Owner has these capabilities. Marketing Admin does not gain brand/integration/security powers merely from its title. Future scopes follow the existing catalog. Self logout/session management remains available to every role.


## E. Authorization service

requireAuthenticatedUser, requirePermission, requireAnyPermission, requireAllPermissions, can and requireOwner. SQL validates exact canonical IDs/codes and exact role-permission relationships; unknown/missing/extra/corrupt state fails closed. Fresh session status/version/MFA/role checks reuse Phase 2C. No wildcard, JWT or external cache.

## F. Target-aware and IDOR protection

All team mutations require Owner plus the specific catalog capability. UUID validity does not grant authority. Malformed/unknown targets, unknown roles, extra permission arrays, another session's proof and altered action commitments reject. Self role/status/invitation changes reject. Future resource policies can compose explicit permission checks with actor/resource predicates; no future content rules are implemented.

## G. Owner protection

No delete operation. No self role/status changes. Current locking reads count active canonical Owners before removing an Owner. The administrative guard serializes cross-user operations; sorted user locks preserve at least one active Owner. Concurrent cross-demotion and cross-disable tests retain exactly one Owner; the losing actor's stale session cannot administer.

## H–J. Invitation lifecycle, token and acceptance

Owner + users.manage + roles.assign + password/MFA step-up -> invited placeholder and canonical role -> one-time manual handoff -> recipient normalized email and compliant new password -> normal sign-in. Owner/Marketing Admin become pending_mfa and must finish existing enrollment before workspace access. Acceptance itself creates no session, challenge, factor or recovery material.

32 random bytes, base64url bearer, domain-separated SHA-256 stored only in invitations. 24-hour SQL-authoritative expiry. Stored role and recipient/issuer authentication-version snapshots; current issuer must remain active Owner. All-or-none SQL bindings; unbound legacy rows reject. Expired/revoked/consumed/superseded/mismatched invitations reject generically. Reissue revokes older links under the guard. Wrong-role invitation corrections leave the user invited, revoke the original link and require explicit reissue. No email provider or public registration.

Link uses a URL fragment to keep the token out of HTTP request URLs and referrers. Recipient clears it from history immediately and holds it only in component memory. Admin gets it only on creation; dismissal unmounts/clears it. No browser persistence, screenshots, traces or secret-bearing snapshots. A refresh before acceptance requires reopening the privately held link. Manual handoff must use a trusted private channel.

## K–M. Role, status and session consequences

Canonical role change increments auth_version and revokes sessions, outstanding challenges and invitations. A newly mandatory role without an active factor enters pending_mfa. Existing MFA material is preserved and never exposed. Invited users remain invited/passwordless on role correction. Disable requires a password-bearing account, increments version and revokes access; unaccepted invitations are revoked instead of disabling passwordless users. Re-enable chooses active or pending_mfa based on current canonical role/factor, increments version, and never revives old sessions. Administrative revoke-all leaves credentials valid for a future fresh sign-in but invalidates existing sessions and proofs. No impersonation or MFA reset/disable service.

## N. Recent authentication

Every Team mutation, including invitation creation/reissue/revocation, requires the existing Phase 2C password + MFA primitive. TEAM_* actions carry a SHA-256 commitment to exact normalized target/desired state. Proofs remain single-use, five-minute, purpose/session/user/auth-version bound. Step-up rotates the session token and invalidates older proofs. Current actor authorization is checked again at mutation time.

## O–P. UI and navigation

Team offers bounded/paginated member list and explicit safe member detail DTO, role/status/MFA indicator/session count, invite/reissue, role/status controls, invitation revocation and revoke-all sessions. Existing cards, controls, DM Sans, tokens and responsive shell are reused. Self-administration controls are omitted. Recovery/exceptional MFA administration remains absent. Responsive browser coverage includes 320/375/390/768 pixels and baseline desktop screens.

Server-filtered navigation and overview actions omit unauthorized destinations. Permitted future sections retain placeholder labels. Direct pages independently require route permissions. Proxy only overwrites a route-path header from Next's parsed URL; layout authorization runs before returning the shell, preserving HTTP 403 before streaming. Forged route headers do not bypass checks. Experimental Next authInterrupts/forbidden is pinned to the current reviewed Next version and covered by HTTP tests.

## Q. API/action authorization inventory

| Endpoint/action | Authentication | Permission | Recent auth | CSRF / target / audit |
|---|---|---|---|---|
| GET /api/team, optional id/page | current valid session | users.manage | no | explicit bounded DTO; UUID validation; no mutation |
| POST /api/team step-up | current valid session | Owner + corresponding mutation permission | password/MFA | exact Origin/Fetch Metadata + session CSRF; payload commitment; existing recent-auth audit |
| POST /api/team invite | current valid session | Owner + users.manage + roles.assign | bound single-use proof | canonical role, normalized email, self prohibition; atomic invitation-created audit/event |
| POST /api/team role | current valid session | Owner + roles.assign | bound single-use proof | current target/canonical role, owner/self protection; atomic before/after audit/event |
| POST /api/team status | current valid session | Owner + users.manage | bound single-use proof | target/status/MFA/owner/self validation; atomic enabled/disabled audit/event |
| POST /api/team sessions | current valid session | Owner + sessions.revoke_any | bound single-use proof | target validation; atomic sessions-revoked audit/event |
| POST /api/team revoke-invitation | current valid session | Owner + users.manage | bound single-use proof | invited target; atomic revoked audit/event |
| GET /api/invitations | anonymous | none | none | creates signed pre-state/CSRF only; no bearer lookup/consumption |
| POST /api/invitations | valid invitation authority | intended role/account binding | new password | pre-state CSRF + exact Origin/Fetch Metadata; shared DB admission before hashing; atomic accepted audit/event |

All mutation payloads use strict schemas, bounded 4096-byte streams, fatal UTF-8 decoding and duplicate-key rejection. Errors never return DB/crypto details or internal reasons. No state-changing GET.

## R–S. Transaction ordering and concurrency

Rate admission commits separately before expensive password work. Administrative transactions: guard -> involved users in sorted UUID order -> current canonical catalog/actor role/factor/session -> bound proof -> target role/invitation -> sessions/challenges -> audit/events. Phase 2C single-user transactions never acquire the guard or another user's lock. Security decisions use locking/current reads rather than stale repeatable-read snapshots. No isolation or rate-threshold change, no generic retries. The reviewed Phase 2B key-discovery/exact-PK/expiry-recheck cleanup is unchanged.

Separate-pool tests cover cross-Owner role/status races, same-target role serialization/version increments, disable/revoke racing session use, exactly-one invitation acceptance and concurrent same-account invitations (one live latest link). A request validated before a revocation may complete; subsequent boundaries deny. Previous MFA/recovery/session-limit/rotation/enrollment and aggregate rate concurrency tests remain in the full suite.

## T. Audit and security events

Closed strict event vocabulary: team.invitation_created/revoked/accepted/invalid, team.role_changed, team.account_enabled/disabled, team.sessions_revoked, team.denied and last-owner denial vocabulary. Dedicated actor/target UUID columns; enum-only bounded before/after state metadata. No arbitrary request/error/metadata string channel. Required successful mutation + audit + event commit together; audit-insertion failure injection rolls back the mutation and proof consumption. Denials remain denied if optional telemetry cannot be written. Runtime history grants are SELECT/INSERT only, not UPDATE/DELETE; compromised DB administrators remain outside application append-only guarantees.

## U. Migration and grant changes

Only 0005_phase2d_administration.sql is new. It adds singleton guard (CHECK id=1, PK), invitation snapshot columns, all-or-none positive-version CHECK and restrictive role FK. Legacy all-null binding rows remain representable but are never accepted. 0000–0004 remain byte-for-byte unchanged. Clean install, Phase 2C upgrade, repeated migration, checksum tampering and direct SQL CHECK/FK enforcement are tested. No startup migration. MySQL DDL has implicit commits: recover by reviewed forward migration or isolated backup restoration, never false transactional rollback promises.

Runtime gains only SELECT/UPDATE on the mutex table; no schema-management privileges and no change to installation_state grants. Existing table-specific grants stay unchanged. Migration/test credentials remain separate and guarded. No new dependency or environment variable; only names-only .env.example remains tracked. Production was never contacted.

## V. Data exposure

Only member DTO fields id, displayName, email, canonical role, status, mfaEnabled and activeSessions cross the Team boundary. UUIDs are necessary administration handles, never authority. No password/session/recovery/challenge hashes, MFA ciphertext/seeds, signing keys, raw DB records or arbitrary metadata objects are serialized. Raw invitation is returned only by successful creation at its intended boundary. Tests use isolated synthetic identities; temporary MySQL configuration stays outside the checkout.

## W. Adversarial findings and targeted repairs

- Page-only forbidden checks initially ran after shell streaming and returned HTTP 200. The authoritative path is now checked before shell render; page/API checks remain independent. Real browser tests assert 403, including forged routing headers.
- Closed dialog retained its mounted form. One-time invitation display now unmounts and clears transient state on dismissal.
- Initial invitation role could not be corrected safely before acceptance. Protected role correction now revokes stale handoffs without activating the account; reissue is explicit.
- A Viewer mutation could wait on a protected target before being denied. A held-target MySQL test reproduced this availability issue. Preliminary current-session/catalog authorization now denies unauthorized traffic before guard/target acquisition, with authoritative authorization repeated inside the transaction. Separate-connection target/guard regressions preserve fail-closed behavior without retries.
- A consumed-proof fixture could timestamp consumption just before creation. MySQL correctly rejected it. Fixture timestamps now have valid ordering; lifecycle CHECK and production timing stayed unchanged.
- An older Phase 2C browser assertion expected a valid Viewer to enter every internal route. It now requires 403 on unauthorized routes, alongside preserved invalid-session denial tests.

Viewer/Creator/Reviewer/Marketing Admin cannot administer Team, promote themselves, use Owner targets or submit permission arrays. Disabled/stale actors reject, action proofs cannot cross sessions/targets/actions or replay, revoked links reject, concurrent acceptance has one winner, last active Owner survives. Client hiding is supplementary only. No exceptional MFA recovery or later business implementation was introduced.

## X–AC. Final verification

| Check | Final result |
|---|---|
| npm ci | Passed; 320 locked packages installed |
| Unit/UI | 235 passed, 16 files |
| Isolated real MySQL | 344 passed, 11 files; includes 55 Phase 2D tests |
| Chromium/browser | 49 passed; retries disabled |
| ESLint | Passed, zero warnings |
| Strict TypeScript | Passed |
| Production build | Passed, without live DB or production/provider secrets; internal routes dynamic |
| Secret scan | Passed; 168 working-tree files and 214 historical blobs across 7 commits |
| npm audit | Zero vulnerabilities |
| npm ls --all | Exit 0; no invalid/extraneous packages, no Prisma/Drizzle; platform-specific optional omissions are expected |
| git diff --check | Passed |
| Migration integrity | All six hashes/order verified; 0000–0004 match HEAD byte for byte |

0005 SHA-256: `9d973926b53e35a7721eacff046bbc347ff43b2a9a5558c6112ca28a2bbc716a`.

Runtime/dependencies remain Node 24.21.0, npm 11.19.0, Next 16.4.0, Kysely 0.29.6, mysql2 3.24.6 and argon2 0.45.1. No package/lockfile change or added environment variable. Argon2 remains Argon2id 64 MiB/3 passes/p1, salt16/output32, admission1 + 2 FIFO waiters/750ms. Native install-script approval remains limited to argon2. Original migrations, rate cleanup, thresholds, isolation and all MFA/session/CSRF policies are preserved.

Final MySQL concurrency run had no unexpected SecurityOperationError or deadlock. The availability defect was reproduced by a deliberately held target lock before repair; target and global-guard denial regressions now pass with the full suite. No retries were introduced to make tests pass.

## AD. Remaining deployment gates and limitations

Hostinger has not been tested: exact Node runtime, Argon2 native packaging, AES-GCM runtime, verified MySQL TLS, connection/lock limits, clock synchronization, HTTPS cookie behavior, proxy/origin trust and secure CLI terminal remain deployment gates. No trusted forwarded-IP configuration was guessed; browser traffic retains the existing unattributed network bucket. Experimental Next 403 rendering requires upgrade regression coverage. Manual handoff does not independently verify email ownership; the Owner must deliver the bearer privately to the intended recipient. Reissuing an existing invitation retains the existing display name; profile editing is outside this phase. No email delivery, password reset, arbitrary role editor, user deletion, impersonation, admin MFA bypass or Phase 3 feature. Team administration is Owner-only under the unchanged catalog. Catalog seeding is explicit deployment/maintenance tooling, not an online permission editor.

## AE. Files created/changed

- `AGENTS.md`
- `docs/architecture/phase-2d.md`
- `docs/review/phase-2d.md`
- `migrations/0005_phase2d_administration.sql`
- `migrations/manifest.json`
- `next.config.ts`
- `scripts/local-mysql.py`
- `src/app/(workspace)/[section]/page.tsx`
- `src/app/(workspace)/layout.tsx`
- `src/app/(workspace)/overview/page.tsx`
- `src/app/(workspace)/team/page.tsx`
- `src/app/(workspace)/ui-kit/page.tsx`
- `src/app/api/invitations/route.ts`
- `src/app/api/team/route.ts`
- `src/app/forbidden.tsx`
- `src/app/invitation/page.tsx`
- `src/components/shell/app-shell.tsx`
- `src/features/overview/overview.tsx`
- `src/features/team/invitation-form.tsx`
- `src/features/team/team-panel.tsx`
- `src/features/team/types.ts`
- `src/proxy.ts`
- `src/server/auth/access.ts`
- `src/server/authorization/authorization.ts`
- `src/server/authorization/routes.ts`
- `src/server/authorization/web.ts`
- `src/server/db/schema.ts`
- `src/server/security/browser-request.ts`
- `src/server/team/events.ts`
- `src/server/team/policy.ts`
- `src/server/team/service.ts`
- `src/server/team/web.ts`
- `src/styles/globals.css`
- `tests/browser/access-review.spec.ts`
- `tests/browser/setup.ts`
- `tests/browser/team.spec.ts`
- `tests/browser/ui.spec.ts`
- `tests/database/check-constraints.test.ts`
- `tests/database/foundation.test.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/database/phase2b-helpers.ts`
- `tests/database/team.test.ts`
- `tests/ui/team.test.tsx`
- `tests/unit/authorization.test.ts`
- `tests/unit/database-config.test.ts`

## AF. Git state

main remains at f16a3bb94dd7bda30b01c6aae282f279a8da2e60. 21 modified files and 24 new files are unstaged/untracked for review; the complete inventory is above. Nothing committed, staged or pushed. Phase 3 has not started.
