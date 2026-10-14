# Phase 2B — password-stage security and CLI Owner bootstrap

Phase 2A main baseline: 3f5f2618961eaee4a178754993d71135aa00df78. Phase 2B alone is
authorized, with no commit/push or Phase 2C. The existing UI remains an unchanged public
preview with disabled sign-in. No HTTP login/bootstrap endpoint, session, cookie, MFA factor,
QR, TOTP, recovery flow, CSRF integration, reset/invitation/team UI or provider integration.

## Argon2 compatibility gate

Pinned argon2 0.45.1 (MIT), maintained stable release published 2026-07-21. Official npm
metadata declares Node >=16.17; actual verification uses pinned Node 24.21.0/npm 11.19.0,
Debian 13 Linux x64, glibc 2.41 and the package's Linux x64 glibc prebuilt addon.
No root/compiler installation or hashing fallback. Official node-argon2 documents Ubuntu
22.04 prebuilt binaries and compatibility with newer glibc systems.

Before authentication code, an isolated Next 16.4.0 production fixture built with webpack,
traced argon2.glibc.node and successfully hashed/verified through its private Node route.
The same isolated fixture also built with the default Turbopack bundler and its production
Node server completed a real native hash/verify probe. That fixture exists outside the repository
and is not an application endpoint. The actual
project's default Turbopack production build also passes with the pinned package installed.
Next already lists Argon2 as a server external; keep authentication in Node, not Edge.
The npm allowScripts policy approves only argon2@0.45.1, not arbitrary package lifecycle scripts.

Policy: Argon2id, version 19, memoryCost 65536 KiB, timeCost 3, parallelism 1, 32-byte output,
random 16-byte salt. Five local hash timings: 148, 148, 149, 143, 148 ms; verification:
141, 141, 140, 147, 142 ms. Local median 148/141 ms. Parameters retain the requested 64 MiB/
three-pass starting point rather than assuming this fast cloud CPU represents Hostinger.
Expected native working memory is about 64 MiB plus Node/addon overhead per active operation.

One process-global active Argon2 operation and at most two FIFO waiters, each with a 750 ms
maximum wait. Saturation/timeout yields a safe generic error and authentication failure.
Hash, verification, dummy initialization and rehash share the cap. Multiple processes each
have this cap; database admission controls are shared. The adversarial review measured 2–3
simultaneous legitimate requests completing with the bounded queue while retaining about
64–65 MiB additional native working RSS; the original no-queue policy completed only one.
Concurrency was not increased. Timed-out work is removed and never runs later.
Deployment must verify actual Hostinger libc/architecture, native package retention and memory/
CPU budget multiplied by process count. Stop on incompatibility; no bcrypt fallback.

## Password policy and secret handling

15–128 Unicode scalar values, at most 512 UTF-8 bytes, valid well-formed Unicode strings.
Lone UTF-16 surrogates are rejected rather than implicitly replaced. No trimming, normalization,
case changes, composition requirements or truncation of accepted passwords. Spaces and
password-manager/pasted values are accepted. Canonically equivalent spellings remain different
passwords. CLI input is a single line; terminal editing is explicit, not password normalization.

The local public curated common-password list is only a rejection list, never account credentials.
Case folding is used only for blocklist comparison, not hashing. It covers obvious long common
variants but is not a comprehensive breached-password corpus. Review/maintain it operationally;
no password/hash is sent to an external service. No periodic expiration is implemented.

SensitiveValue uses a private field and redacted JSON/string/inspection. Its explicit reveal()
is only for native verification, parameterized DB persistence or intended challenge handoff.
Hashes/tokens never appear in public result JSON, logs, events, exception causes or snapshots.
Tests generate encoded hashes dynamically in memory/isolated MySQL, never checked-in hash fixtures.
Service errors sanitize native/driver failures without retaining unsafe causes.

Stored PHC verification is restricted to Argon2id v19, supported salt/output sizes and bounded
costs (19456–65536 KiB, 2–6 passes, parallelism 1–4). Parameter ordering is parsed independently
of serialization order; malformed/unbounded hashes fail safely. Stronger stored costs are never
silently reduced. Safe older costs may upgrade after verification in the mutation/audit transaction;
newly blocklisted legacy passwords can verify but are not automatically rehashed against policy.
The adversarial review additionally rejects noncanonical numeric/base64 encodings and oversized
PHC strings before native verification. No static encoded password-hash fixtures are used.

## Authentication and restricted challenges

Private server-only facade; pure server modules also support Node CLI/tests. No client imports.
Email policy is explicitly trim + NFC + lowercase, syntax/length validation, with no provider-specific
rewriting. Password policy does not inherit email transformations.

Initialize a fresh random in-memory dummy hash once through the same capacity bound. Unknown/
invited/invalid-input attempts use dummy verification where appropriate. Existing bounded hashes
are verified even for disabled users. Unknown, wrong, disabled, invited/missing-role, stale-version,
saturated and rate-limited attempts return exactly the same client-safe failure shape/message.
Internal reason codes remain specific; exact constant response timing across DB/load is not claimed.

Successful password verification returns only PASSWORD_VERIFIED. Pending-MFA accounts identify
MFA_ENROLLMENT_REQUIRED for later completion. No session or factor is issued. A fresh user row
lock rechecks status, hash, role and authentication version after hashing; stale snapshots fail.
Phase 2C must independently enforce current role-specific MFA requirements and actual factor
state; an active account or this restricted proof alone is never evidence of completed MFA.

Migration 0003 adds only password_verified to auth_challenges.purpose. All earlier migrations,
constraints, indexes, grants and isolation tests remain. No new table or MFA material.
Challenges use random 256-bit base64url tokens, SHA-256-only database hashes, user/version/purpose/
action binding, DB-UTC five-minute lifetime, revocation and consumption fields. A new proof revokes
older unconsumed password proofs. Raw tokens are redacted handles until intentionally revealed.

Consumers validate hash, purpose, owner, current auth version/status, action, expiry, unconsumed and
unrevoked state. Atomic conditional updates under a user lock reject replay/concurrent consumption.
Consumption/revocation and required audit/security events commit together. Revocation requires
the token and binding, not merely a user ID. Challenge/network rate admission is enforced.
Consuming a proof alone does not authorize workspace access. MFA/session completion remains 2C.

## Security events and audit

Strict event/action/outcome/reason catalogs and Zod schemas; metadata contains only allowlisted
reasonCode values. No arbitrary metadata, headers, requests or Error objects. Actor/target IDs and
correlation UUIDs are explicit. Network pseudonyms use the existing 32-byte SECURITY_EVENT_HMAC_KEY.
Domain-separated HMACs cover network/account/challenge/global scopes. Account pseudonyms are stored
in rate rows rather than plaintext email audit metadata. No credential/hash material is logged.

Audit API appends only; no update/delete methods. Bootstrap, rehash and challenge mutations include
required audit/events in their DML transactions. Failed diagnostics never grant authentication;
if failure-event storage itself is unavailable, authentication still denies safely. Important
successful mutations fail closed. Runtime DB grants deny audit UPDATE/DELETE. Database administrators
can bypass these restrictions; no tamper-proof claim is made. Network values must originate from
NetworkIdentity.fromSocketAddress() using trusted server ingress, never arbitrary forwarded headers.
Production proxy trust is deliberately unresolved; no header-parsing guess is implemented.
IPv4 and IPv4-mapped IPv6 socket spellings share the same network pseudonym/bucket.

## Rate policy

Admission scopes: account 5/15 minutes, network 60/5 minutes, global password-stage 120/minute,
challenge 5/5 minutes. Counters reserve capacity before hashing, including attempts that later
fail. Successful password-stage completion clears the account counter; network/global counters
remain charged. Thus five failures are throttled, and repeated valid requests cannot bypass shared
cost controls. These are policy constants, not user-controlled environment knobs.

MySQL transactions create/lock scope rows in deterministic global/network/account/challenge
order, reject blocked gates before inserting lower-scope identities, check all scopes before
incrementing any, then update counters atomically. Both password and challenge paths use a
global admission scope. Backoff starts at 30 seconds, doubles after
permitted probes, caps at 15 minutes and never exceeds the original window expiry. Blocked retries
do not increment/extend the block. Fixed expiry resets the window, preventing permanent lockout.
Known-account short-term denial by attackers remains an inherent account-throttling tradeoff;
network/global limits and fixed windows bound it. Conservative thresholds may need office-NAT tuning.
Admission performs indexed candidate selection and primary-key cleanup of at most 100 expired rows per call, including blocked
requests. Together with global admission and early gate rejection this prevents rotating
identifiers from creating unbounded live rate state. Expired rows may remain while traffic is
idle and are removed on subsequent admissions. No worker/scheduler is introduced.

## CLI bootstrap

Run owner:bootstrap only from a secure interactive terminal with intentionally selected admin/
migration DB identity and reviewed migrations/seeds. No arguments, --password, password environment
workflow, visible password fallback or HTTPS route. Non-TTY execution fails before opening a DB.
Node raw TTY input hides password/confirmation, supports Unicode and explicit backspace, aborts
on cancellation/control sequences/signals/input errors, rejects malformed UTF-8, bounds input
and attempts terminal restoration on every settlement. Real PTY tests verify
the generated input is not echoed. Password references are released after use; JavaScript strings
cannot promise cryptographic memory erasure.

Operator types BOOTSTRAP <environment> <database> before connection. DB/account identity is verified
before password prompts and again at the mutation boundary. Nonproduction uses existing local
migration credentials; test mode also requires the destructive guard. Production capability selects
DATABASE_MIGRATION_URL explicitly, requires explicit matching production modes, verified TLS/DNS,
same database/host as DATABASE_URL, and a different administrative username. It is implementation
for a future separately authorized deployment, not permission to execute against production now.

Password validation/hash precedes the critical DML transaction. Lock installation_state, reject
consumed/missing marker or ANY existing Owner (including disabled), lock and verify the full
canonical role/permission/assignment matrix (including Owner code/ID),
insert pending_mfa user and Owner assignment, permanently mark initial identity/consumption, append
audit/success event and commit. No sessions/challenges/MFA secrets/recovery codes are created.
Failure rolls back user/role/marker/success events; sanitized failure events may append separately.
Disable/demotion never modifies the marker; last-usable-Owner administrative enforcement remains
later work. Interrupted enrollment must resume through the later restricted flow, never bootstrap.

## Configuration, tests and deployment boundaries

No new environment variable names. Existing SECURITY_EVENT_HMAC_KEY is required only when the private
authentication service is initialized. SESSION_SECRET/MFA encryption keys are not used to implement
sessions/factors in this phase. Providers remain optional and builds need no production secrets.
Bootstrap reuses existing DEV/TEST migration URLs or future DATABASE_MIGRATION_URL, never password
environment variables. Development/test always retain isolated credentials and MySQL guards.

Use the Phase 2A rootless local MySQL workflow and npm run test:db. Tests use guarded disposable
scratch schemas and dynamically generated test credentials; no production or AI/social connections.
Test coverage includes native password policy/verification/capacity, dummy/generic errors, auth-version
races, restricted token binding/expiry/replay/consumption concurrency, DB rate atomicity/backoff,
event rejection, audit rollback, canonical/consumed/inactive/concurrent bootstrap, and real PTY input.
Preserve all Phase 0/1/2A checks. Verify production build, Chromium browser suite, audit, secret scan,
strict types, lint and dependency tree before reporting. Do not commit/push or proceed to Phase 2C.

## Adversarial review measurements

Selected capacity remains one active native operation, with two bounded waiters rather than
raising active memory consumption. Actual service bursts of 1/2/3/4/5 native hashes completed
1/2/3/3/3 operations; excess work failed immediately. Sample successful latencies were 201 ms;
187/350 ms; 168/378/549 ms; 158/295/442 ms; and 167/332/514 ms respectively. Sampled process RSS
was 49–50 MiB baseline and 114 MiB peak (64–65 MiB increase). Sampling is not a guaranteed
peak-memory bound, and the full Next process has additional baseline memory.

Rebenchmark with unchanged hashing parameters: five hash samples 154/169/159/157/150 ms
(median 157 ms); verification 208/168/180/193/183 ms (median 183 ms). Shared cloud load varies.
Seven interleaved authentication samples per normal failure category had medians: unknown
170 ms, wrong 181 ms, disabled 175 ms, invited 171 ms, incomplete 172 ms. Their ranges overlapped;
no material account-existence timing distinction was established by these local samples.
Rate-denied samples were 5–14 ms and queued capacity timeouts about 764–766 ms. These differences
identify admission/load states, not account existence, because gates are applied independently
of account lookup. Neither exact constant-time behavior nor equal timing for all safe legacy
hash costs is claimed. Do not add expensive dummy hashing to known blocked work.

Real PTY tests cover hidden confirmation, Ctrl+C, external SIGINT, input errors, malformed UTF-8,
restoration and two separate CLI processes racing the same guarded test database. Canonical
seed corruption fails closed. Post-write failure injections after each bootstrap DML step
prove rollback and subsequent retry. Failure injection also covers rate admission, restricted
authentication proof creation, consumption and required audit/security writes. No production
connection or credentials, session issuance, MFA material or Phase 2C feature is involved.

## Captured cleanup deadlock and targeted repair

A temporary direct harness outside the checkout invoked the actual rate service, using two
independent pools with two connections each and 16 admissions per batch. MySQL 8.0.46 used
REPEATABLE READ, with five-second acquisition timeout and 50-second lock-wait timeout.
The first 70 scenarios without expired rows passed; the first expired-row scenario captured
ER_LOCK_DEADLOCK / errno 1213 / SQLSTATE 40001 during cleanup, about 6.8 ms after request start.
InnoDB recorded a cleanup DELETE competing with account upsert, including PRIMARY record/gap
and insert-intention locks. Diagnostic exports omitted SQL values, LOCK_DATA and credentials.
This establishes the captured defect; the older uncaptured historical failure cannot be
retrospectively assigned an error code with certainty.

The old range DELETE used the expiry index and then primary record locks, conflicting with
admission's primary-first locking/insertion. Cleanup-only concurrent range deletes also
reproduced 1213. A controlled primary-lock/expiry-renewal experiment reproduced the same
lock inversion. READ COMMITTED had a different observed lock footprint; no isolation or
server logging/security setting was changed in the application.

Repair: a non-locking read selects at most 100 expired composite keys. Each is deleted in a
separate primary-key autocommit statement with expiry rechecked under the row lock. This
avoids broad range-mutation locks, skips deleted/renewed candidates safely, and keeps the
existing bound. There are no retries. Admission thresholds, hashing, scope order and atomic
counter transactions are unchanged. Cleanup can execute up to 100 bounded point deletes
when expired candidates exist; this trades extra round trips for simpler lock behavior.

Regressions cover cleanup alongside an uncommitted live gate, candidate renewal, and the
expiry-index/primary-key lock inversion, plus final aggregate counter assertions.
Post-repair direct stress completed 100 REPEATABLE READ scenarios (60 empty-start, 40 with
105 expired rows). All preserved 120 admissions, eight blocked admissions and 20 blocked
rotating-identifier probes. Final state was one global row at 120 attempts, 120 account rows
at one attempt each, and no network/probe rows. No unexpected failures or retries occurred.
No mathematical guarantee of race absence or Hostinger compatibility is claimed.
