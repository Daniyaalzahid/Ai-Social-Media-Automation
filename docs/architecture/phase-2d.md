# Phase 2D — authorization and internal team administration

This design is recorded before authorization implementation. The explicit Phase 2D request supersedes the older Phase 2C scope in AGENTS.md. No later business features, public registration, password reset, exceptional MFA recovery, email delivery, or deployment are included.

## Exact unchanged canonical catalog

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

## Authority and target policy

A request-level server context validates the current opaque session, exact canonical role IDs/codes, all 28 canonical permission IDs/codes and exact five-role mappings from MySQL. Unknown/missing/extra/corrupt grants fail closed; no wildcard grants or browser-supplied permissions. Reads use explicit DTOs and bounded pagination. Mutation transactions revalidate session and catalog after locks, never rely on the earlier page/context. Future object policies compose permission + actor + resource predicates; no content logic is implemented.

Owner-only target administration is centralized. Self role/status changes and self-invitations are rejected (stricter than minimum self-demotion policy); self logout/revocation uses the existing path. No delete operation exists. At least one active Owner must remain after demotion/disable. An enabled privileged account lacking an active factor returns to pending_mfa; old sessions never revive.

## Required schema proposal

0005 adds a dedicated singleton team_administration_guard row for serializing cross-user administrative mutations without locking/reusing bootstrap state or changing installation-state grants. This is needed to serialize last-Owner checks and missing-account invitation creation consistently with Phase 2C's user-first single-user locks. Runtime receives SELECT/UPDATE on this nonsecret mutex only, no schema privileges.

Invitations gain intended_role_id, recipient_auth_version and issuer_auth_version snapshots. Existing unbound rows remain representable for forward migration but are never accepted. SQL enforces all-or-none bindings and positive versions, restrictive role FK. Email identity is immutable in this phase and bound through user_id; acceptance requires the intended normalized email. Hash domain binds purpose invitation/v1. Changes to recipient role/status or inviter authority/version invalidate outstanding invitations. No new permission codes or edits to 0000–0004.

## Recent authentication and API inventory

All team mutations, including invitation creation/reissue/revoke, require Phase 2C password + MFA step-up. Extend its closed action vocabulary with TEAM_* plus a SHA-256 commitment to the normalized action payload (target, desired role/status, or invitation email/name/role). Proof is 5 minutes, one-use, session/user/auth-version bound. No weaker timestamp-only confirmation. Step-up rotates cookie and invalidates prior proofs; proofs live in transient component memory only.

| Endpoint/action | Permission | Recent auth | CSRF | Target and audit |
|---|---|---|---|---|
| GET /api/team (list/detail by bounded page or id) | users.manage | no | read only | safe DTO only |
| POST /api/team step-up | mutation permission + owner | password/MFA | session-bound + Origin/Fetch Metadata | payload commitment; auth recent event |
| POST /api/team invite | users.manage + roles.assign | bound proof | same | normalized account, canonical role, created audit |
| POST /api/team revoke-invitation | users.manage | bound proof | same | invited target, revoke live invitations, audit |
| POST /api/team role | roles.assign | bound proof | same | canonical role, no self, last Owner, before/after audit |
| POST /api/team status | users.manage | bound proof | same | no self, password-bearing target, last Owner, audit |
| POST /api/team sessions | sessions.revoke_any | bound proof | same | no impersonation, all target sessions, audit |
| POST /api/invitations accept | invitation authority only | token + new password | anonymous pre-state + exact Origin/Fetch Metadata | generic public response, required audit |

Public invitation acceptance has account/network/global shared DB admission before hashing. Token 32 random bytes, domain-separated SHA-256 only, 24h authoritative SQL expiry. Reissue supersedes all previous live tokens under the administrative lock. Manual link is displayed once, using URL fragment so the bearer is not sent in HTTP URLs/access logs; recipient removes fragment immediately and holds it only in memory. No email provider, no browser persistence. Password setup calls the existing policy/hash service. Acceptance creates no session or password proof; recipient signs in through existing password -> optional/mandatory MFA flow. Privileged users remain pending_mfa until verified enrollment.

## Transactions and lock order

Administrative mutation/acceptance: guard singleton FOR UPDATE -> all involved users by sorted UUID FOR UPDATE -> canonical roles/catalog shared reads -> actor factor/session -> bound recent proof -> target role/invitation -> target sessions/challenges -> append audit/security events. Phase 2C takes only one user -> shared role -> factor -> proof/session/recovery. It never acquires the guard or another user; administrative code locks all users before child rows to avoid cycles. Rate admission commits separately before authentication/hash work. No generic retries or isolation change. Owner count uses current locking reads under the guard. Required mutation + audit + event commit together; errors roll back. MySQL DDL still implicitly commits; backup restoration/forward migration is the recovery path.

Role/status changes increment auth_version, revoke all sessions and outstanding auth challenges/invitations. MFA material is preserved, never disclosed or administratively disabled. Administrative session revocation also invalidates outstanding proofs; re-enable cannot resurrect them. A request already authorized before revocation may complete; subsequent boundaries deny.

## Navigation and UI

Server-filtered navigation uses workspace.read, content.create, calendar.read, content.read, media.upload, content.review/approve, analytics.read, integrations.manage, brand.manage, users.manage, audit.read, settings.manage. Direct page checks repeat server authorization. Permitted unfinished destinations remain explicitly labeled placeholders. Design system requires settings.manage. Team uses the existing cards, typography, form controls and responsive layout; no visual redesign. DTO fields: UUID handle, display name, normalized email, canonical role, status, MFA enabled boolean, active-session count; no raw DB rows. IDs are handles, never authority.

## Events and deployment

Closed strict event schemas, bounded enum-only before/after role/status metadata; actor/target UUIDs as dedicated columns. No arbitrary metadata/request/error strings. Audit and security inserts are atomic and runtime has no update/delete grant on history. Database administrators remain privileged outside this guarantee. No new environment names or dependencies anticipated. Hostinger Node/native Argon2/AES-GCM/TLS/pool/NTP/HTTPS/proxy/secure-terminal gates remain unverified.

## Implementation review notes

Workspace Proxy overwrites a route-path header from Next's parsed URL and never trusts a client-supplied route header. Following the targeted adversarial review, RSC/prefetch requests also receive an early denial-only check through the same central MySQL authorization service, before Flight streaming begins. Page/API checks remain authoritative. `skipProxyUrlNormalize` preserves the Flight headers that Next otherwise strips before Proxy; query strings remain irrelevant to path authorization, and normal URL/RSC validation is not disabled. The workspace layout requires that route's permission before returning the shell, with independent page/API checks retained. This prevents streamed 200 responses for authorization denials. Next's documented experimental authInterrupts/forbidden renderer supplies the existing 403 design. Pinning/upgrading Next must retain HTTP/browser regressions for this boundary.

Invitation CSRF GET establishes an independent signed anonymous pre-state even when an interrupted login flow cookie exists. GET does not validate or consume invitation bearers. Team invitation display unmounts on dismissal; raw material is held only in transient UI state. A dismissed link is not retrievable. A browser refresh before recipient password setup requires reopening the original privately held link.

Invited-role correction is allowed only through the same Owner/roles.assign/recent-auth path. It leaves the recipient invited with no password/session, increments auth_version and revokes every earlier invitation. The Owner must explicitly reissue a link using the corrected current role. This avoids requiring a recipient to accept an accidentally overprivileged invitation merely to correct it.

Unauthorized mutation traffic is denied by preliminary current-session/catalog authorization before acquiring the administrative guard or any target user lock. Authorization is repeated under the mutation's sorted user locks, so this preliminary availability check cannot grant stale authority. A real MySQL regression holds the target or guard on a separate connection and proves Viewer denial completes before its release. The initial target-lock contention was reproduced before this repair; no retry or lock-order/isolation workaround was used.

## Final targeted adversarial review

See docs/review/phase-2d-adversarial.md for evidence and final results. The RSC gate is additive and can only deny/restart/unavailable or continue to existing guards; it does not issue sessions, grant permissions, extend activity, or replace transactional checks. It adds one bounded current-session/catalog lookup for RSC/prefetch requests. Existing document/UI behavior stays intact.

Playwright automatic page snapshots/traces/screenshots/video remain disabled. A credential-safe automatic fixture additionally removes error messages, cause, matcher context and payload details before failure reports/error-context artifacts are generated, retaining failed status and the test location. An isolated public-canary child-run regression proves both the original failure leak and protected output, without real credentials or any uploaded artifacts. Safe explicit diagnostic fields may be collected for root-cause analysis; assertions are not weakened.

Same-proof replays reject without repeating successful audit records. Already-achieved role/status operations reject even with a fresh proof. Explicit fresh-proof revoke-all/revoke-invitation may succeed again to invalidate current outstanding security state and audit that distinct request; they grant no access. No generic automatic retries are used.
