# Phase 7 — social authorization foundation

This candidate implements shared authorization lifecycle machinery and safe UI.
**Real adapters are disabled. No provider connection or production readiness is
claimed.** Official documentation access is blocked; see the research record.
Phase 8 publishing/scheduling is absent. App login remains independent of OAuth.

## Permissions and object scope

The finalized 31-code catalog already contained integrations.manage for Owner.
Its integration-administration meaning is compatible. Only integrations.read is
new: count **32**. Owner and Marketing Admin explicitly have both; Creator has
read only; Reviewer/Viewer neither. No implication or alias mechanism.
All previous grants remain except the intentionally approved Marketing Admin
integrations.manage addition. Workspace brand is canonical BRAND_ID, not supplied
by a browser. Current authenticated identity and exact live catalog are rechecked
in mutation transactions and at both sides of provider work.

Creator receives a dedicated SafeDestination projection: opaque destination ID,
provider/type/display name/optional handle, coarse connection status and
UNVERIFIED future publishing classification. Management DTOs are separate; no
Creator credential/transaction/audit/connected-by/scope/expiry diagnostics. No
permission exposes ciphertext or plaintext. Human management is workspace-scoped,
not connected_by-scoped. connected_by is attribution, not lasting employee ownership.

## Step-up

Existing password/MFA recent-auth policy is reused; only its closed action family
extends to INTEGRATION_CONNECT/RECONNECT/SELECT/DISCONNECT plus SHA-256 commitment
to canonical brand and normalized operation payload. Existing five-minute,
single-use, session/user/version binding and session rotation remain unchanged.
Proof is consumed in the same transaction as the sensitive action. OAuth starts
only afterward. Persistent destination selection is administration; ordinary
safe reads require no step-up. Future Composer destination use is not authorized.

## Domain and database

0010 adds five tables: social_guard, social_transactions, social_authorizations,
social_credentials, social_destinations. Authorization identity/credential ownership
is separate from discovered destinations and selection. One encrypted access and
optional refresh token per authorization, not duplicated for every destination.
Unique brand/provider/remote-subject prevents duplicate grants. Max 20 authorizations
per workspace and max 20 active discovered destinations per authorization.

Composite destination foreign keys bind authorization + canonical brand + provider;
provider/type CHECK prevents cross-provider destinations. Selected ID is resolved
under the authorization lock and must belong to that active same authorization;
it is not accepted by possession alone. It is not a standalone database FK, so
privileged direct SQL remains outside this service invariant. IDs/remote identities
are never normalized into authority. Display names are untrusted escaped text.

PKCE envelope all-or-none CHECK uses explicit IS NULL / IS NOT NULL for every
member. No UNKNOWN-as-success assumption. Requested/granted scope arrays are
bounded, unique and validated. Ordinary app startup never runs migrations. DDL
implicitly commits; failed migration requires inspected isolated restoration or
reviewed forward recovery, not fictional DDL rollback. 0000–0009 remain immutable.

Runtime grants are table-specific: guard SELECT/UPDATE; transactions
SELECT/INSERT/UPDATE/DELETE; authorizations and destinations SELECT/INSERT/UPDATE;
credentials SELECT/INSERT/UPDATE/DELETE. No new runtime DDL/catalog/audit mutation.
The existing runtime identity is trusted server code; these grants do not create
separate per-feature database identities. DTO/service boundaries prevent ordinary
metadata reads from selecting credential rows. Phase 6 immutable-history grants
are preserved. Migration identity remains separate. Hostinger grant support must
be verified before production.

## OAuth transactions and callback

PENDING -> EXCHANGING -> COMPLETED or FAILED. Single-use 256-bit random state;
only domain-separated SHA-256 stored. Ten-minute transaction expiry. State binds
provider, canonical brand, initiating actor, session row and auth version. Session
must still validate at callback claim and completion. Different/disabled/revoked/
expired/stale identity or lost manage authority fails closed. A rotated token for
the same still-live session row remains that session; logout/revocation invalidates
it. No parallel social login cookie exists.

Callback URL is fixed path plus trusted configured APP_URL origin, never request
Host/forwarded host/returnTo. Only a fixed /connections result redirect is returned.
Callback parser bounds bytes and values, rejects malformed percent/UTF-8, duplicate
and escaped-equivalent security names, unexpected names, control characters and
code/error ambiguity. Codes are transient SensitiveValue values, never persisted.
State/PKCE are cleared or expired; provider errors/descriptions are not reflected.
Callback is the narrow OAuth navigation GET exception: state and initiating context
replace normal browser POST CSRF, not application authentication. Normal reads do
not mutate OAuth state. Ordinary management POSTs keep exact Origin/Fetch Metadata
and session CSRF; no CORS/CSP broadening.

Claim commits EXCHANGING before exchange: replay/ambiguous transport never causes
a second exchange. No database transaction/lock spans provider I/O. Completion
revalidates authority, expiry, version and identity. Reconnect cannot silently swap
remote subject. Provider failure retains no returned credential or raw response.
Late result after expiration/disconnect/authority loss cannot attach. Required audit
failure rolls back credential/domain completion. Failure is generic externally.

## Providers, PKCE and network trust

Small SocialProvider interface: authorizationURL, exchange, optional refresh/revoke.
No SDK, new dependency, user model/endpoint/scope choice or manual token paste.
Production registry is empty until current official exact protocol requirements
are reviewed. Thus this candidate makes **no outbound provider requests** and has
no configurable arbitrary endpoint. Real adapter endpoint allowlists, HTTP response
bounds/parsing and exact scope registries still need implementation and verification
with those adapters; they are not claimed covered by fake-provider tests.

Fake provider exists only under tests, injected directly into a test environment;
production/development constructor rejects test-mode providers. No fake route is
added to Next. A standalone loopback browser harness bundles the real Connections
component with the existing Vite toolchain and runs real domain/MySQL services.
Its synthetic step-up proof seam tests OAuth UI/domain flow, not password/MFA again.
Production step-up uses the existing access service. No real secrets are used.

Fake tests exercise S256 PKCE: verifier is 256-bit random, encrypted while pending,
challenge derived by SHA-256. Real provider PKCE remains unverified individually;
fake support must not be generalized to TikTok, Google, Meta or LinkedIn.

## Credential envelope

Dedicated existing TOKEN_ENCRYPTION_KEY is canonical base64 32 bytes, independent
of session/MFA/event keys. AES-256-GCM, random 12-byte IV and 16-byte tag; envelope
key ID primary-v1 and format v1. AAD commits key ID/provider/authorization ID/token
purpose/version. PKCE binds its transaction ID. Swaps/tamper/wrong key or unknown
ID fail. Maximum token/verifier plaintext and ciphertext 8192 bytes; no logging.
No per-provider key, new environment name or automatic rotation. Future rotation
requires an explicitly configured historical key reader; changing key under an
existing ID without retaining the old reader will require reauthorization.

Plaintext is transient SensitiveValue at provider/crypto boundary. Inspection and
JSON redact it, but JavaScript cannot guarantee zeroization of all string copies.
Neither metadata DTO, audit, log nor errors receive plaintext/ciphertext/raw body.
Provider application keys remain optional until that provider is enabled.

## Scopes, health and destination selection

Unrequested/duplicate/unknown scope shape or invalid destination kind rejects.
Actually granted scopes are recorded separately from requested ones. A strict
subset gives LIMITED, never assumed full consent. No connection success claims
publishing readiness. Selection requires separate bound step-up, live lifecycle,
exact authorization/provider/brand membership, discovered active ID and expected
version. Selection increments version and rebinds token AAD, invalidating stale
refresh completion. No automatic persistent selection on reconnect.

## Refresh, disconnect and cleanup

Internal refresh primitive only, no browser action. Under guard, claim 30-second
lease and capture version/lease identity; provider deadline 15 seconds. Concurrent
claim rejects. An abandoned/expired refresh lease is not reused for another
ambiguous token exchange: safe reads show reconnect-required and explicit
reauthorization is needed. A failed refresh also requires reauthorization. Completion checks same version, exact lease and current lifecycle;
never overwrites newer/revoked credentials. Rotation atomically replaces encrypted
values; absent replacement refresh token preserves the old one. Failure marks
reconnect-required for that exact still-current lease only. No automatic retry.
Refresh reconciles discovered destinations, disables no-longer-discovered rows and
clears a removed selection. Real discovery semantics still require official review;
no production refresh job is installed.

Disconnect consumes step-up before deleting credentials and disabling selection/
destinations and in-flight target transactions. Local revocation is authoritative
before optional remote request. Remote failure never restores access; outcome is
confirmed or unconfirmed in safe audit. Reconnect is a new transaction/version,
not a health flag change. Provider-dependent remote revocation races must be tested
before a real adapter is enabled.

Expired transactions: max 100 non-locking candidate IDs, exact key deletion with
expiry recheck under social guard. Invoked on management admission and available
as an internal cleanup primitive; no public cleanup route/worker. Idle expired PKCE
cannot authorize work even before later housekeeping. No scheduled maintenance
is installed or production cleanup cadence verified.

## Rate controls and lock order

Starts/reconnects: max six per actor / ten minutes, 100 global / ten minutes.
Callbacks: 20 per active manager / ten minutes, 100 global / ten minutes, counted
before state lookup; invalid/replayed state cannot make extra provider calls.
Refresh: six attempts per authorization / ten minutes. Fixed windows, independent
social scope names in existing rate table; original auth thresholds unchanged.

Human operations: actor user -> role/factor/session/catalog -> social guard ->
proof/transaction/authorization -> credentials/destinations -> audit append.
Internal maintenance: social guard -> rate/authorization/credentials/transactions.
One guard makes missing-row and cross-manager domain updates deterministic. No
network I/O while locks held; no generic retries/sleeps/isolation changes.

## UI and scope

Existing design-system Connections page: per-provider setup state, safe status,
step-up confirmation, destination selection, connect/reconnect/disconnect controls
only for authorized managers and enabled adapters. Unverified providers have no
active connect button. Creator has safe read-only surface; Reviewer/Viewer denied
including direct HTTP/Flight/prefetch. No token fields, browser persistence, third-
party logo fetch or unsafe HTML. No publishing, scheduling or Phase 8 endpoints.

## Deployment gates

Hostinger and all production provider integrations remain UNVERIFIED. Retain all
previous Node/native Argon2/sharp/AES-GCM/MySQL TLS and connection/clock/HTTPS/
proxy/private storage/cron gates. Add official documentation review, client-secret
injection, TOKEN_ENCRYPTION_KEY behavior/key custody, credential-table grants,
correct registered HTTPS APP_URL callback, provider DNS/TLS/outbound access,
callback proxy/query log redaction and product/app-review verification. Tests do
not prove these external capabilities.

## Byte-exact envelope identity (authorized schema repair)

Both credential and PKCE CHECKs compare `CAST(key_id AS BINARY)` with
`CAST('primary-v1' AS BINARY)`. Table collation remains unchanged. This enforces
the existing writer/reader's byte-exact identity rather than PAD SPACE equivalence.
Explicit PKCE all-NULL/all-non-NULL guards remain unchanged. No trimming or
normalization occurs. The two repaired existing CHECKs retain their names/counts.
Direct MySQL tests compare parameter HEX/OCTET_LENGTH, reject whitespace, case,
control, NUL, empty and overlength variants, and verify rejected writes leave
canonical credential bytes or the original NULL PKCE group unchanged.
