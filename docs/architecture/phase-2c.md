# Phase 2C — authenticated access

Phase 2C only. No reset, invitations, team/role UI, full permission/object authorization,
social, AI, publishing or scheduler implementation. No deployment is claimed.

## State machine and boundaries

UNAUTHENTICATED -> PASSWORD_VERIFIED -> MFA_REQUIRED or MFA_ENROLLMENT_REQUIRED
-> MFA_VERIFIED -> SESSION_ISSUED -> AUTHENTICATED.

A password-stage proof cannot itself access workspace routes. Owner and Marketing
Admin must have an active factor and verified second factor. Creator, Reviewer and
Viewer may complete a password-only login only when status is active and no active
MFA factor exists. Once a factor is active, those roles require it too. pending_mfa
always requires enrollment, regardless of role. Every mutation revalidates status,
canonical role identity, auth version and proof/session lifecycle under database locks.
Unexpected states fail closed. A session-limit result is available only after a valid
password proof. It grants no access and does not consume recovery material.

The existing Phase 2B password checker, dummy verification, Argon2 parameters,
capacity, challenge lifetimes, rate thresholds and cleanup remain unchanged.
The browser carries a restricted PASSWORD_VERIFIED proof in a separate HttpOnly
cookie; the raw proof is not returned to browser JavaScript. Only complete
verification can issue a fresh random workspace session. Public landing/login/error
surfaces remain public; internal pages and layout each enforce the server boundary.
Future data/services must also call that boundary and Phase 2D permissions; UI
visibility and placeholder links never imply operation authorization.

## TOTP and encrypted storage

otplib 13.5.0 (MIT), pinned, maintained package published/updated August 2026,
loads on Node 24.21.0, supports strict TypeScript and builds in server modules.
No custom HOTP/TOTP cryptography. Standard SHA-1 TOTP, 6 digits, 30 seconds,
20 random secret bytes (160 bits). Issuer: Bismillah Social AI (Bismillah Electronics).
Account URI label is the normalized account email. Manual setup is provided; no QR
library, external QR generator or external enrollment request exists.

Use server MySQL UTC time. Accept current step, plus previous step only during
first five seconds of current step. No future steps and no silent tolerance expansion.
Persist accepted step under a factor row lock; only strictly newer steps pass.
Verification and replay-state mutation commit together with the resulting security
mutation. The server's clock/NTP synchronization remains a hosting gate.

AES-256-GCM uses the independent existing MFA_ENCRYPTION_KEY, random 12-byte IV,
16-byte tag, stored key ID, and AAD binding user + method + key ID + format version.
Key must be canonical base64 encoding of 32 bytes. MFA_ENCRYPTION_KEY_ID is now
required by authentication runtime, restricted to 1–40 ASCII identifier characters.
The reader rejects unknown IDs rather than guessing another key; future deployment
must retain a configured historical key reader before rotating keys. No rotation
automation is implemented. The database never receives plaintext seeds. Enrollment
material exists only in restricted no-store responses and transient component memory.
JavaScript cannot guarantee erasure of all copied strings/garbage-collected memory.

## Enrollment, interruption and recovery

A live, purpose/user/version-bound PASSWORD_VERIFIED proof starts enrollment.
Pending encrypted seed is bound to that exact proof and its five-minute expiry.
Restarting/replacing pending enrollment generates a fresh seed. Old proofs are
superseded by the Phase 2B password service. Pending factors never authorize access;
abandoned rows may remain encrypted but cannot complete after expiry. A later valid
password proof can replace the pending row. Bootstrap is never inspected/reset here.

Valid possession proof atomically activates factor, records replay step, transitions
pending_mfa to active, consumes enrollment proof, generates recovery batch, records
required audit/events and creates session. A failed required write rolls back all
of these. Session capacity is checked before irreversible user-facing completion.

Ten independently random 128-bit codes, lowercase hexadecimal in four groups of
8 separated by hyphens. Exact representation accepted (no secret transformations).
SHA-256 with domain separation stored; hashes need no slow password KDF because
codes have high random entropy. Display plaintext once in a no-store response;
never browser persistence. user/factor lock and conditional used_at/revoked_at
update give one concurrent winner. Replacement revokes all unused old codes.

Password + a recovery code can satisfy MFA for one login. It does not disable MFA.
Factor replacement primitive requires a live session, password confirmation and
TOTP or a recovery code, then a one-use REPLACE_FACTOR proof. It revokes all sessions,
increments auth version, revokes other proofs/codes, destroys old seed and sets
pending_mfa. New enrollment must complete before any role regains access. A user
who first logs in using a recovery code needs a second unused code (or TOTP) for
replacement step-up. No hidden admin disable bypass or lost-factor-plus-lost-codes
exceptional recovery exists. Replacement/regeneration have no settings UI yet.

## Sessions, activity, rotation and revocation

Opaque 32-byte random base64url tokens. Only SHA-256 hashes stored. No JWT.
__Host-bsa-session: Secure, HttpOnly, SameSite=Lax, Path=/, no Domain. Flow and
anonymous CSRF state cookies use same attributes. HTTPS required for production;
modern browsers permit localhost Secure cookies for isolated development only.

Owner/Marketing Admin: 30-minute idle, 24-hour absolute. Other canonical roles:
2-hour idle, 7-day absolute. Five active sessions maximum. Sixth issuance is rejected,
never silently evicts another device. Count is a current locking read under user
lock, so independent pools serialize issuance. Live validation reads current user,
role, factor and session state and checks hash, revocation, idle/absolute expiry,
auth version, status, current role's shorter limits, and required MFA completion.
A promotion cannot inherit password-only access. Disabling/version changes invalidate
old sessions even without eager revocation.

GET, polling, prefetch, assets and health checks never touch activity. Explicit
CSRF-protected activity POST is emitted only in response to trusted browser click
or key events, at most once/minute by client, with authoritative server one-minute
touch throttle. No background heartbeat/timer. A hostile authenticated client/XSS
can simulate activity; this is an interaction policy, not proof of human presence.
Idle expiry is capped by original absolute expiry and current role's absolute limit.
Activity response refreshes cookie only to server idle expiry. Cookie never exceeds
server idle/absolute deadline; background validation does not refresh cookies.

Complete authentication/enrollment always issues a fresh token (no fixation).
Explicit rotation atomically changes stored hash on same session row, preserving
lifetime, and revokes outstanding bound action proofs. Concurrent rotation has one
winner; old token fails. Successful step-up also rotates the token and revokes older
proofs without extending lifetime. Callers must deliver the replacement token at
the secure cookie boundary before subsequent actions. Factor replacement revokes
all access instead of issuing a higher-privilege session. Logout revokes even expired
sessions and removes browser cookies; invalid/already revoked logout is safe.
Specific revocation is self-only; revoke-all is purpose-bound recent-auth action.
Cross-user administrative revocation requires later Phase 2D permissions, not a
role-name shortcut. No session-management UI is added.

## CSRF, origin and browser integration

APP_URL is the sole authoritative origin. No forwarded host/IP trust. Require exact
Origin, Sec-Fetch-Site=same-origin, Sec-Fetch-Mode=cors and Sec-Fetch-Dest=empty on
JSON POSTs. No state-changing GET. JSON stream capped at 4096 bytes before parse; fatal UTF-8 decoding prevents
silent password byte replacement;
closed action/request schemas. Browser errors sanitized and responses no-store.

Anonymous pre-login state: 32-byte random nonce + server timestamp + HMAC signature,
ten-minute expiry, HttpOnly cookie. CSRF token is domain-separated HMAC bound to
that cookie. After password/session transitions, CSRF binding uses corresponding
restricted challenge/session token. Different binding kinds/identifiers fail comparison.
CSRF material does not grant authentication; every dependent mutation revalidates
DB lifecycle. Thus consumed/revoked/expired proofs/sessions cannot mutate even if
an old matching CSRF value is supplied. HMAC comparison is timingSafeEqual. Logout
is protected even before/after invalid sessions. Only configured canonical 32-byte
SESSION_SECRET is accepted here; it must differ from other security keys. No new
environment variable names and no production secrets are required by build.

Next Request exposes no independently trustworthy socket address in this hosting
setup. Browser password/MFA admission deliberately shares one unattributed network
identity (::), rather than trusting forwarded headers. Global/account/challenge
buckets still apply unchanged. This conservative shared bucket can throttle legitimate
users (60/5 minutes); configuring verified proxy/network attribution is a deployment
gate. No guessed Hostinger header/allowlist is silently adopted.

Existing login design is retained; fieldset is enabled and wired to JSON boundary.
Accessible password, MFA, manual enrollment, recovery option, generic failure,
session-limit and expired restart states. Recovery codes shown once before navigation.
Password fields reset on submission, seeds removed on completion/restart, no local or
session storage. Sign out and interaction listener are minimal shell additions;
operational pages remain approved mock UI. Recent-auth and factor replacement
primitives are server-only, not exposed through an unapproved admin UI.

## Recent authentication

Five-minute, purpose-bound, session-bound, version-bound opaque challenge.
Password confirmation always; active/required MFA also requires current TOTP.
Recovery is allowed only for REPLACE_FACTOR. Closed purposes REPLACE_FACTOR,
REGENERATE_RECOVERY, REVOKE_SESSIONS. Authenticated presence and login timestamp
alone never authorize sensitive actions. Conditional transaction consumption is
single-use; wrong purpose/session/version, expiry and rotation/revocation reject it.
No generic client-controlled arbitrary action code. Proof issuance rotates session.

## Lock ordering and incident regression

Rate admission (reviewed global -> network -> account -> challenge) commits before
access transaction. Cleanup still non-locking max-100 discovery -> exact PK delete
with expiry recheck, no range delete or retries. Within access: non-locking token
hint -> user FOR UPDATE -> current role FOR SHARE -> factor FOR UPDATE ->
proof/session FOR UPDATE -> recovery rows -> required audit/security appends.
All operations for a user acquire its row before dependent locks. Hints supply only
owner lookup; their snapshot never supplies authoritative state/counters.

Initial fifth/sixth test found repeatable-read snapshot anomaly: a non-locking count
could miss the previous issuer's commit after waiting for user lock. Targeted fix:
current FOR UPDATE session-count reads and current role FOR SHARE read. No isolation
change, retries or threshold changes. Separate-pool regression checks exactly five
live rows, one fifth winner, one sixth rejection, no silent revocation.

Test concurrency: same TOTP via distinct valid proofs, same recovery code,
enrollment completion, fifth/sixth issuance, rotation, logout/revocation. Single-use
operations commit one winner. Injected required audit/DB failures fail closed and
roll back activation, recovery generation, session issuance and proof consumption.

## Migration and grants

0004_phase2c_access_bindings.sql only: nullable auth_challenges.bound_session_id
FK -> sessions (RESTRICT both), nullable mfa_methods.enrollment_challenge_id
FK -> auth_challenges (RESTRICT both), CHECK active factor binding is null.
Nullable columns preserve old rows. Pending binding is enforced by service while
legacy foundation fixtures remain representable. Manifest checksum/order verified;
0000–0003 unchanged. Clean/upgrade/repeat/tamper and actual FK/CHECK tests included.
MySQL DDL implicitly commits: forward repair/backup restore, no rollback guarantee.
No application-startup migrations. New references change destructive fixture drop
ordering (recovery -> methods -> challenges -> sessions); safety guard remains first.

Runtime grants remain table-scoped: sessions/methods/codes/challenges/users need
SELECT/INSERT/UPDATE; rate housekeeping additionally DELETE; roles/assignments
SELECT; audit/security SELECT/INSERT only. No runtime schema privileges or audit
UPDATE/DELETE. Migration identity separate. DBA compromise can still edit history.

## Verification and isolated browser workflow

Unit/UI and guarded real MySQL use existing test commands/private isolated test env.
Playwright now uses a separate isolated development database bsa_dev_browser_tests
with loopback, exact bsa_dev_browser_migration identity and schema-only grants.
Global setup rejects production/mismatched identity/global grants; applies explicit
migrations/seeds as test tooling (not app startup), creates synthetic accounts and
passes ephemeral generated credentials to test workers in a private process
environment binding (BSA_BROWSER_FIXTURE), never test-result files or attachments.
Each visual test has its own user so preserved per-user challenge limits are tested
rather than bypassed. Runtime fixture identity has no DDL/audit mutation grants. CI provisions this
fixture using scripts/local-mysql.py browser and never uploads browser artifacts.
No production DB is ever used. Browser setup needs existing DEV_DATABASE_URL,
DEV_DATABASE_MIGRATION_URL, APP_URL=http://localhost:3100, independent test keys and
MFA key ID in a private environment file outside checkout. Invoke Playwright with
Node --env-file pointing there; Chromium executable may be configured externally.
Run python3 scripts/local-mysql.py start then python3 scripts/local-mysql.py browser
(with the pinned Node on PATH) to generate the private browser environment and
provision table-level runtime grants reproducibly. No configured application variable
is added; BSA_BROWSER_FIXTURE is generated inside test setup only.
Production build remains separately tested without database/secrets.

Next 16.4 emits duplicate global LayoutProps when both ignored .next/types and
.next/dev/types survive dev and build runs. Stop dev server and remove ignored
.next/dev output before production typecheck/build; do not weaken strict checking.
Do not run source edits/build and browser server concurrently during validation.
Browser traces, screenshots, video and automatic failure DOM copy are disabled because
they can capture authentication material. This changes diagnostics, not assertions.
A separate diagnostic captured NEXTJS-PORTAL intercepting the collapse control at
its center (16,940,44,44); development indicators are disabled, with no product UI change.

Retained hosting gates: actual Node version, native Argon2 package retention,
AES-GCM runtime, MySQL TLS/hostname verification, pool/connection limits, secure
bootstrap terminal, UTC clock synchronization, HTTPS/Secure cookie support,
configured origin and trusted proxy attribution. These tests do not certify Hostinger.
