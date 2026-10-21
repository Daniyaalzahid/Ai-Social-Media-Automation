# Phase 9A — shared provider security design and contract freeze

Date: 2026-10-20 (Asia/Karachi). Design revision: 9A-CONTRACT-1.
Baseline: `4b9853a610811205e4d439082ffe20671dae5759`, branch main.
**DESIGN ONLY. Nothing in this document is implemented or enables a provider.**

## 1. Scope, freeze and evidence

This freezes the security responsibilities, trust boundaries, failure behavior and
explicit non-responsibilities of a small future provider transport layer. MUST,
MUST NOT and DENY describe the proposed contract, not claims about existing code.
Unresolved policy parameters are mandatory inputs, never permissive defaults.
Revision 1 is a **partial contract freeze**: invariants are reviewable; full shared
implementation readiness is **BLOCKED** by the concrete stop gates below. No
unresolved host, numeric bound, connector or provider semantic is declared frozen.

Preserved history: ORIGINAL_CODEX_DISCOVERY = BLOCKED after 25 unique official
sources failed before retrieval with proxy CONNECT 403. Subsequent reconciliation
= PARTIALLY_UNBLOCKED_FOR_DESIGN. The source ledger and bounded external claims
remain in [requirements](phase-9-provider-publishing-requirements.md), with
[capabilities](phase-9-provider-publishing-capability-matrix.md) and
[security review](phase-9-provider-security-review.md). This cycle makes no new
HTTP/documentation/provider request; the required live Git remote check is separate.

Evidence IDs below use that ledger: EY1 video upload, EY2 YouTube resumable URI,
EL1 LinkedIn organization Posts/version/role, EL2 image upload URL/binary/asset,
EL3 document capability URL, ET1 Direct Post/FILE_UPLOAD, ET3 chunks/upload URL,
ET4 publish_id/status. All are **EXTERNAL_OFFICIAL_EVIDENCE**; none is promoted to
VERIFIED_OFFICIAL. Facebook/Instagram remain UNVERIFIED and blocked on evidence.

Shared work is justified only by at least two evidenced providers or an existing
project security invariant. Commonality is in security/byte boundaries, not a common
upload protocol. Accepted design scope is HTTP request constraints, static endpoint
policy, issued-capability handling, credential audience, bounded reading, byte access,
safe errors/logging and typed references/read-only reconciliation.

Non-goals: provider framework, adapters or enablement; generic upload/resume/retry/
refresh; arbitrary-URL client; provider request schemas/hosts/versions invented from
memory; token exchange; schema/grants; UI/options implementation; publishing scheduler,
webhooks, workers, analytics, AI changes or deployment. Phase 8 stays immutable.

## 2. Current architecture and trust model

Read-only inspected:

- `src/server/publishing/{provider,policy,schema,service,media-hold}.ts`: test-only
  registration, immutable intent, once-claimed dispatch, normalized results, safe
  IDs, seven states, bounded holds and read-only status.
- `src/server/social/{provider,schema,service,crypto}.ts` and
  `src/server/security/sensitive.ts`: encrypted credential purposes/AAD, private
  service-local load(), identity/version checks, optional refresh lease/rotation,
  safe ordinary serialization. No public scoped credential broker exists yet.
- `src/server/media/storage.ts`: server-private keys and guarded FileHandle access;
  adapters must not receive this broad storage object or its path/key API.
- `src/server/ai/provider.ts`: existing fixed endpoint, redirect rejection and
  bounded response-reading pattern. Its OpenRouter schemas/numbers are not social
  upload policy; no extraction/refactor is authorized.
- `src/features/{ai,publishing}/model.ts`, migrations 0010/0011, runtime-grant
  declarations and permission catalog: options are empty today; publishing scope
  has no real credential/stream handoff; immutable tables remain narrowly granted.

Trust boundaries:

| Participant / data | Authority granted | Never trusted as |
|---|---|---|
| Authenticated browser / approved copy / AI output | Validated IDs and content only | Endpoint, header, URL, token, upload host or filesystem authority |
| Publishing coordinator | Validates current actor, immutable snapshot, destination, claim, connection version and scopes | Permission to rewrite content or retry a remote create |
| Registered provider adapter | Owns only evidenced provider wire semantics and endpoint keys | Arbitrary URL fetcher, credential-store reader or filesystem reader |
| Transport policy registry | Reviewed provider-specific endpoints/methods/audiences/limits/version rules | A browser/environment-configurable URL registry |
| Provider response | Untrusted bounded input, even after authenticated TLS | Automatically trusted upload URL, identity, content or terminal state |
| Credential/byte broker | Narrow server-side lookup using validated operation binding | Cross-workspace access or arbitrary connection/media-ID lookup |
| DB metadata / runtime configuration | Valid only after schema/provenance/policy checks | Capability URL provenance merely because a value is stored |
| Logs, audit, UI | Closed minimal projections | Raw error, token, URL, headers, provider body or media bytes |

All server code still shares the existing runtime trust domain. Opaque handles and
private constructors prevent accidental misuse; TypeScript brands alone are not
runtime authorization, nor isolation from malicious server code. Validate provenance
and binding at runtime, and minimize what adapters receive.

## 3. Conceptual inputs and call sequence

No API/code is added. Future interfaces should express these capabilities rather
than accepting a broad fetch URL/options object:

| Conceptual input | Required fields / invariant |
|---|---|
| OperationBinding | Canonical workspace, provider/platform, internal operation and snapshot IDs, intent hash, destination and authorization ID/version, capability/version ref, request purpose |
| EndpointPolicyHandle | Registry-issued endpoint key + allowed method, path/query builder, audiences, response/request/timeout policies; unconfigured policy cannot issue a handle |
| IssuedCapabilityHandle | Secret URL + validated provenance, exact OperationBinding, optional asset/session identity, expiry/deadline and request policy; no public constructor/deserialization |
| CredentialLease | Server-only purpose-authorized attachment operation scoped to provider/connection/version/audience/request class; not generic token lookup |
| ApprovedByteSource | Opaque immutable asset binding + validated MIME/size/hash, finite hold deadline and bounded stream/range capability; no path/key |
| RequestPolicy | Closed method/purpose, exact content types and bounds, redirect DENIED, mandatory cancellation and timeout profile |

Sequence: validate local authority/snapshot/claim -> acquire matching handles ->
validate complete request policy and destination -> obtain short-lived credential
attachment -> perform at most one request -> bound/validate response -> provider
adapter interprets evidence -> coordinator records a safe result under existing
state/CAS/audit rules -> dispose transient handles/streams in finally. No network
I/O under DB locks and no shared component silently initiates a second request.
Multi-request provider flows are explicit adapter steps, not transport retries.

Local request progress is represented conservatively as NOT_SENT_PROVEN or
MAY_HAVE_BEEN_SENT. Start in NOT_SENT_PROVEN only while no external send can occur;
move to MAY_HAVE_BEEN_SENT before handing off to the network unless the connector
can prove a stronger boundary. It must not move back based on a timeout/abort/error.
A bounded response is still just transport evidence, not publication success.

## 4. Two URL classes and static endpoint policy

**STATIC_PROVIDER_API_ENDPOINT (Class A):** selected by trusted adapter using a
registered endpoint key. User content, AI, environment arbitrary URLs and generic DB
metadata cannot select the authority. Provider ID is explicit. HTTPS only, exact
reviewed authority, canonical path construction and an endpoint-specific method/
query/credential audience policy are mandatory. Unconfigured = DENIED.

Allowed method universe for the initial security design is GET, HEAD, POST and PUT;
each endpoint must allow exactly its reviewed subset. This is a restriction, not
an assertion each provider needs each method. PATCH, DELETE, CONNECT, TRACE and all
other methods are denied absent separately reviewed contract revision. Method must
not be caller-controlled. GET/HEAD may be used for reconciliation only when verified
read-only; verb alone never proves absence of remote mutation.

Path/query builders accept only bounded typed identifiers/fields. Reject absolute,
protocol-relative, userinfo, encoded authority/control/backslash tricks and endpoint
changes; the serialized URL must retain the reviewed authority and path policy.
No provider credential in query unless a future official requirement and separate
secret-audience review explicitly changes this baseline. No Host/header override.
Exact API hostname lists/path/version/allowed query keys are provider-specific gaps;
documentation domains do not establish API hosts.

**PROVIDER_ISSUED_CAPABILITY_URL (Class B):** minted only from an expected field in
a bounded, parsed, authenticated provider response to an authorized operation.
Record local provider/workspace/operation/snapshot/destination/connection-version
binding and original issuance request provenance. Authenticated origin alone is
insufficient: validate returned authority, request class and credential audience
independently. Never accept capability URL from browser, approved text, AI, arbitrary
DB metadata, cross-provider handle or a copied plain string.

Class B must also bind an asset/session identity where the flow supplies one.
Provider-supplied identifiers cannot select a different local asset or destination.
Replay/concurrent-use rules are per verified session protocol plus local ownership;
not every resumable URL is single-use. A reissued URL is a separately validated
capability, not permission to expand hosts. No fabricated provider host rules.

## 5. Provider capability URL lifetime and classification

`PROVIDER_CAPABILITY_URL` is sensitive capability-bearing data unless proven otherwise.

| Surface | Frozen default |
|---|---|
| Operational logs / traces | REDACT completely; no URL/path/query or hash-as-diagnostic shortcut |
| Audit / normal domain errors | DO NOT STORE OR INCLUDE RAW |
| Browser / client / analytics | DO NOT EXPOSE / DO NOT STORE |
| Persistence | DENY BY DEFAULT |
| Reuse | Original operation/provider/destination/asset only; no cross-provider reuse |
| Lifetime | Request/flow-bounded in memory; validated expiry and local parent deadline; dispose on use completion/failure/abort |

Preserve the validated URL bytes needed for a signed request without normalizing
away a signature or stripping a required query. The safe classification goes to
logs, never a redacted-but-still-secret substring. URL userinfo remains prohibited.
Reject fragments rather than treating them as harmless hidden data. If provider TTL
is not established, only a reviewed finite local ephemeral lifetime can apply;
POLICY_VALUE_REQUIRED, no indefinite default. Do not equate local expiry with
provider revocation. Destroying local reference cannot revoke the remote capability.

Persistence needs explicit provider-specific recovery justification, an encrypted
store with authenticated operation/asset binding and expiry/deletion policy, and
separate schema/grant review. A URI hash may support identity comparison but cannot
replace the URI needed to resume. Arbitrary stored metadata is never rehydrated as
a trusted capability; any future approved checkpoint restoration must authenticate
ciphertext/provenance/binding and rerun current endpoint/audience/lifetime checks.
No such restoration or persistent session schema is part of current 9A scope.

## 6. SSRF, DNS and redirects

| Input / behavior | Frozen contract |
|---|---|
| URL parser | One canonical parser/serializer; reject malformed/ambiguous authority, control chars, unsupported encoding and credential-bearing userinfo |
| Scheme/port | HTTPS only, default TLS port only; no non-default-port exception is evidenced |
| Hostname | Exact reviewed authority policy; canonical DNS names only, no inferred broad suffix wildcard or unknown host |
| IP literals / local names | Deny IP literals, localhost/local aliases, loopback and local-only destinations, including alternate representations |
| Resolved addresses | Deny non-public/special-purpose destinations: RFC1918, loopback, link-local, unspecified, multicast/reserved and metadata ranges; IPv6 unique/local/link-local, mapped-address equivalents and mixed unsafe answers must not bypass policy |
| DNS rebinding / peer | Validation and actual connection must use an explicitly reviewed connector strategy; separate DNS preflight followed by ordinary independent fetch resolution is insufficient |
| TLS / connection reuse | Preserve original approved TLS hostname/SNI/certificate validation; pooling/proxies/connection reuse must not escape checked authority/address policy |
| Redirects | DENIED for both classes; do not follow before validation or on transport-library defaults |

Exact safe connector/address-classification behavior is
**IMPLEMENTATION_RESEARCH_REQUIRED**. DNS pinning is neither declared necessary in
all deployments nor sufficient: an approach must also preserve TLS identity, handle
CNAMEs/multiple answers/IP families, connection reuse and any configured proxy,
and ensure an actual socket cannot reach a denied address. Do not replace hostname
TLS checks with a bare-IP HTTPS request. If the current supported Node transport
cannot enforce the chosen strategy without a dependency/configuration change, stop
for review rather than quietly weaken it or install tooling.

Static Class A redirect policy = **DENIED**.
Capability Class B redirect policy = **DENIED**.
SAME_AUTHORITY_ONLY and PROVIDER_POLICY_CONTROLLED are not enabled alternatives in
revision 1. A provider requiring redirects stays unsupported by this contract until
an evidence-backed revision specifies each allowed hop, method/body handling and
credential audience. Even same-authority automatic replay is not approved. Return
only a safe redirect classification; never echo Location. A 3xx is not proof a
side effect did not occur.

## 7. Credential audience and request handling

Credential tuple: credential type/purpose, provider, authorization ID/version,
workspace and intended destination, intended authority/audience, request class and
allowed endpoint policy. All must match OperationBinding. Token material must not
be accepted in the generic request body/header API.

Preferred future broker mints a lease from a validated publishing context and
attaches credentials inside the transport boundary. An adapter receives only the
purpose-authorized capability needed for that specific connection, not all token
rows, generic connection lookup, refresh token or the encryption key. If a protocol
absolutely requires adapter-visible access token material, separately review a
short-lived SensitiveValue scope; no ordinary string serialization or retained copy.
No new user permission or per-feature DB identity is assumed.

| Credential type | Provider / audience | Allowed class / rule |
|---|---|---|
| Access token | Exact originating provider authorization + verified API authority | Class A with explicit endpoint/purpose grant; no cross-provider or redirect forwarding |
| Refresh token | Exact provider's verified token endpoint contract | EXCLUDED from 9A publish transport and adapters; existing provider-specific refresh boundary only |
| Upload/session URL signature | Exact validated issued URL and original binding | Class B as received; no automatic bearer-token forwarding |
| Any bearer required on upload host | Only explicitly verified provider upload audience | Denied until evidenced policy; neither original API token nor API headers copied by default |
| OAuth code, app secret, browser cookie/session | Not publish transport credentials | Denied in 9A publish requests/logs/errors; no cookie jar or ambient credential forwarding |

Authorization and other secret headers are constructed only by trusted policy/broker;
caller-supplied Authorization, Cookie, Host, proxy/forwarding or conflicting framing
headers are forbidden. Header names/types/values are closed per endpoint, reject
CR/LF, duplicate/conflicting Content-Length/Transfer-Encoding and arbitrary overrides.
No credentials in body/query absent an explicitly reviewed protocol exception.
Attaching credentials requires live connection/status/scope/version and audience
checks at the appropriate admission boundary. A lease is finite, not authority to
reuse stale credentials after rotation/disconnect. JavaScript cannot guarantee full
plaintext zeroization; minimize lifetime/copies and never claim it does.

## 8. HTTP security envelope responsibilities

Preflight validates complete handles/bindings/policy, endpoint authority/method,
request content type and bounded body source, audience, abort/deadline and required
response bounds before any network send. Missing policy is a safe NOT_SENT_PROVEN
failure. Never substitute an environment-supplied URL or permissive method/body rule.

At most one HTTP attempt per invocation: no automatic retry, redirect, auth-refresh,
status lookup, chunk replay or upload reinitialization. Adapter decides its explicit
verified multi-step flow; coordinator authorizes its consequences. Request body
bytes must obey declared max, exact expected length if applicable, and streaming
byte-count accounting. Multipart overhead is explicitly bounded by provider-specific
framing policy, not counted as a silent extension of approved media bytes.

Return only a bounded private parsed response/approved headers to the provider mapper
plus safe transport status/stage metadata. Raw Response, socket, URL, Headers or
exception must not escape into domain/UI/logging. If a required provider response
header contains Location or a session secret, it goes directly into the restricted
capability-validation path; it is not part of a generic returned header bag.
Always close/cancel readers, body sources and requests on completion/error/abort.

## 9. Bounded response reader contract

Each endpoint profile must provide success and error body byte ceilings, allowed
content types/encodings, empty-body policy, maximum string length/JSON nesting/member/
array count and permitted response-header projections. All numeric values not
already applicable by an existing exact policy are **POLICY_VALUE_REQUIRED**.
Existing AI JSON limits are not automatically valid for social responses.

Content-Length is an untrusted early-rejection hint, never permission for unbounded
reading. Count actual bytes, including decoded bytes if compression is allowed;
compressed input and expansion must both be bounded. Unsupported encoding or inability
to bound decompression is a failure, not automatic decompression without a ceiling.
Validate content type before selecting parser; HTML/proxy/error pages become a
closed classification, never a snippet. JSON requires strict UTF-8, bounded structural
parse and closed provider schema; duplicate/prototype-related key handling must be
specified and tested before implementation is ready. Do not rely on a post-parse
schema to prevent huge pre-parse expansion.

On oversize or parser limit: stop reading/cancel; discard body, never parse a truncated
prefix or retain/log it. “Truncation” is safe metadata such as body_limit_exceeded,
not a copied truncated body. Empty/204 responses are allowed only by an evidenced
endpoint policy. Malformed/unexpected response after a possibly consequential send
preserves ambiguity; it cannot establish FAILED or invite a replay.

## 10. Private media byte-source and substitution defense

A future source is minted by a server broker using the immutable snapshot and active
operation, not by adapter-supplied storage path/key/URL. Required binding: provider,
canonical workspace, operation/snapshot/intent hash, media/asset identity and order,
exact MIME, length/hash, allowed read extent, lifecycle state and hold deadline.

The adapter may request a bounded stream for the already approved asset. It receives
no arbitrary FileHandle, directory reader, storage object/key, URL fetch or alternate
asset selection. A provider-specific verified range/chunk request can be supported
only within the bound asset extent, aggregate byte budget and explicit transfer
step; no generic seek/reopen/replay authority. Range/hash semantics stay specific.
Reopening does not extend hold or authorize automatic re-upload.

Before first byte: verify current operation/claim/destination binding, approved asset
relationship, allowed media lifecycle, unexpired nonrenewable hold, size/MIME/hash
and actual private object identity. While reading: count exact bytes, enforce range,
abort/deadline and hold, detect unexpected mutation/EOF/extra bytes, close in finally.
Hold expiry or deleted/unavailable bytes aborts; never expose publicly or fetch another
source. No hold extension beyond existing maximum 24h and no permanent retained copy.

**TOCTOU gate:** a preflight hash alone does not prove later streamed bytes are the
same. The future implementation must demonstrate a stable immutable backing object
or equivalently safe bounded verified byte snapshot across read/upload; an open inode
alone does not prove immutability. Choosing between existing storage guarantees and
a temporary private verified copy needs implementation research and storage-policy
review; no new copy is authorized here. A final hash mismatch after sending bytes
is too late to assert no side effect: mark ambiguity, abort and never swap/retry.
Streaming hash checks complement, not replace, pre-send integrity guarantees.

Shared upload boundary owns only bounded source/backpressure/byte accounting,
abort and resource cleanup. Adapter owns YouTube initialization/resume/offset,
LinkedIn asset initialization/post sequencing and TikTok chunks/finalization. No
universal upload algorithm, inferred chunk size or resumable guarantee is frozen.

## 11. Cancellation and timeout policy interface

Request policy must distinguish connection/TLS, response-header, body-read,
upload-inactivity and overall operation deadlines, plus optional issued-capability
expiry and media-hold deadline. Each numeric value is POLICY_VALUE_REQUIRED unless
an existing exact bound applies. All are finite/validated; absence cannot mean
infinity. Units and monotonic elapsed-time accounting must be explicit at implementation.

Existing Phase 8 dispatch deadline 30 seconds, status cooldown 30 seconds, confirmation
10 minutes, maximum hold 24 hours and event limit 100 are repository facts, unchanged.
They are not provider recommendations. Any requested transfer that cannot fit must
be rejected or returned for policy review, never stretch the parent deadline.
Effective deadline cannot exceed the earliest applicable parent/credential/capability/
media deadline. Combine caller abort and policy cancellation, remove listeners in
finally, close streams, ignore late result for success, and record safe outcome.
Cancellation means local work stopped; it does not retract transmitted bytes or
cancel a remote publish. No timeout/abort can automatically trigger another attempt.

## 12. Normalized errors and ambiguity

The prior discovery's 15 conceptual categories are **proposed taxonomy**, not all
implemented Phase 8 enum values. Current schema has eight safe codes INVALID,
UNAVAILABLE, ACCESS_LOST, UNSUPPORTED, RATE_LIMITED, REJECTED, PROCESSING_FAILED and
OUTCOME_UNKNOWN; providerResultSchema's FAILED branch is narrower: only REJECTED,
PROCESSING_FAILED, RATE_LIMITED with its existing three categories. Do not silently
expand either interface or migration enum through a shared-error design.

Future internal envelope has closed category, fixed request stage, provider enum,
internal operation reference, optional safe HTTP status, exposure classification
(NOT_SENT_PROVEN/MAY_HAVE_BEEN_SENT) and evidence classification. No message, raw
cause, stack, URL, arbitrary provider code/header/body or input reflection. It is
built by safe constructors, not spreading an Error object. Provider mappers own
specific verified error codes; unknown input fails closed. No new public/domain
error enum is authorized now.

| Conceptual category from discovery | Existing coarse safe-code candidate | Mandatory interpretation limit |
|---|---|---|
| AUTH_REQUIRED / PERMISSION_DENIED | ACCESS_LOST | Confirmed authority issue only; not proof publish failed |
| DESTINATION_INVALID / DESTINATION_REVOKED | INVALID / ACCESS_LOST | Verified destination evidence; never substitute destination |
| MEDIA_INVALID / MEDIA_TOO_LARGE | INVALID | No raw metadata/body; already-sent bytes may remain ambiguous |
| MEDIA_FORMAT_UNSUPPORTED | UNSUPPORTED | Verified rule, no silent conversion |
| CONTENT_INVALID | INVALID | No caption/hashtag rewrite |
| RATE_LIMITED | RATE_LIMITED | No automatic resend; terminal outcome still evidence-dependent |
| QUOTA_EXCEEDED | UNAVAILABLE | Distinction can remain closed internal classification; no new DB enum assumed |
| PROVIDER_TEMPORARY | UNAVAILABLE | Transient label does not establish no side effect |
| PROVIDER_REJECTED | REJECTED | Definitive documented rejection required before FAILED |
| PROCESSING_FAILED | PROCESSING_FAILED | Verified terminal processing evidence only |
| NETWORK_AMBIGUOUS | OUTCOME_UNKNOWN | UNKNOWN; never FAILED for convenience |
| UNKNOWN_PROVIDER_ERROR | UNAVAILABLE before proven no-send, otherwise OUTCOME_UNKNOWN | Unclassified body/status cannot prove failure |

These are design-level coarse projections, not implemented provider mappings.
Codes alone never choose a publishing state. Before dispatch a proven local policy
failure can deny admission. After possible send, timeout/reset/bad body/parse error/
audit failure/abort defaults to **UNKNOWN** unless verified provider evidence proves
another state. HTTP status alone is not sufficient generic evidence of publication,
non-publication or safe retry. Shared envelope never marks PUBLISHED or converts
uncertainty to FAILED; provider mapper/coordinator retain existing state authority.

APPLICATION_DUPLICATE_GUARD = existing local request/revision/destination uniqueness
and conditional dispatch claim. PROVIDER_NATIVE_IDEMPOTENCY = provider promise,
currently not established. PROVIDER_RECONCILIATION = read-only observation of original
remote identity. These are distinct; none authorizes blind redispatch.

## 13. Operation reference abstraction and storage

| Reference class | Meaning / sensitivity | Existing safe storage | Persistence default |
|---|---|---|---|
| NORMALIZED_PROVIDER_ID | Typed content/asset/publish ID, not interchangeable; bounded/format/ownership verified | remote_publication_id or remote_processing_id (256-byte safe grammar) candidate only if correct semantic role and grammar | Existing append-only events where purpose justified; safe projection, not arbitrary ID bags |
| SENSITIVE_PROVIDER_CAPABILITY | Credential-bearing URL/session handle | No safe home in existing ID columns, snapshot options or access/refresh credential purpose | DENIED |
| EPHEMERAL_UPLOAD_DESTINATION | Issued bound Class B capability for active flow | Process-local opaque handle only | DENIED; discard after bounded use |
| RESUMABLE_SESSION_REFERENCE | Provider-specific session identity, potentially secret URI + typed progress | No generic checkpoint store; safe non-secret ID alone fits only if provider supports it | DENIED until separate provider/schema decision |

Reference includes provider, workspace, operation/snapshot/intent, destination,
authorization binding, identity kind, capability/version and observation/provenance.
Secret and normalized-ID branches cannot be serialized through the same generic
string field. Hashing is not equivalent to encryption; don't persist raw URL in
processingId because it is a string. No schema or new grant is justified by the
stateless abstraction itself. No arbitrary DB metadata rehydration into authority.

## 14. UNKNOWN reconciliation contract

Minimum input: validated live actor/workspace authority, original operation/snapshot/
intent, provider/destination/authorization binding, compatible capability/version,
and trusted typed remote reference. Adapter owns a documented **read-only** lookup.
No create/init/finalize/upload/delete/edit/publish, refresh side effect or generic
retry inside reconcile; no reference means NO_SAFE_LOOKUP and operation stays UNKNOWN.
A resumable-session status observation can fit only if proven read-only; continuing
bytes does not fit this interface and requires a separate future decision.

Minimum output is a closed observation: provider state candidate among ACCEPTED,
PROCESSING,PUBLISHED,FAILED,UNKNOWN; optional safe typed content/processing ID;
normalized safe error; local observation timestamp; fixed evidence kind. Provider
reported timestamps are untrusted inputs validated separately. PUBLISHED must meet
current publication-ID/publishedAt requirements; terminal states need verified
provider predicates. A missing/deleted result or timeout is not proof it never posted.

Coordinator revalidates operation/destination/connection/version, normalizes the
observation, preserves immutable identity and applies existing state transitions and
CAS/event/audit transaction. The lookup cannot unconditionally overwrite a newer
state. Do not hold DB locks across I/O. Status needs existing read/log/publish object
checks, no new step-up; every new consequential publish keeps purpose-bound step-up.

Current gap: UNKNOWN results write null IDs and reconciliation reads latest event;
earlier known references can become inaccessible. Also refresh increments connection
version while snapshot retains old version. A shared interface must surface
REFERENCE_UNAVAILABLE or AUTHORIZATION_STALE safe classifications rather than invent
lookup IDs, bypass bindings or resend. Fixing reference retrieval/rotation behavior
is a separately authorized integration change, not hidden in this design freeze.

## 15. Logging, redaction and audit

Closed transport log allowlist: provider enum; validated internal operation ID;
canonical internal workspace reference if authorized for that log sink; endpoint key
(not path/URL); request class; allowed HTTP method; fixed stage; normalized outcome;
optional safe integer HTTP status; bounded elapsed/byte-count metadata; fixed response
classification. Numeric saturation/range values are POLICY_VALUE_REQUIRED. External
provider IDs are omitted by default; only a separately approved safe-format/type
projection could add them. Unknown keys/values normalize to a closed safe category,
not a reflected offending string.

Never log: credentials, Authorization, refresh token, OAuth code/state, cookies or
sessions, app secrets, capability URL/path/query/Location, raw header bag, request/
response body, private media, filename/storage key, raw Error/cause/stack or provider
free text. Redaction must use safe projections/allowlists, not solely regex secret
scrubbing of arbitrary serialized objects. Apply to nested exceptions, TLS/DNS errors,
HTTP instrumentation, proxy/access logs and trace hooks. No raw object fallback.
SensitiveValue ordinary redaction helps but explicit reveal still needs a narrow sink.

Operational logs diagnose request stages without authority. Audit records meaningful
coordinator actions: dispatch initiated, verified accepted/state changed, reconciliation
performed/denied or outcome unconfirmed, with internal IDs, actor attribution, safe
state/reason/time and existing transactional discipline. Audit must not store URL,
token, raw response or claim success because transport returned 2xx. Failed audit
record after possible remote action cannot undo the remote side effect: preserve
ambiguity and block resend. No new audit schema or grant is selected.

## 16. API version and token-refresh policy

LinkedIn EL1 establishes versioning/Rest.li requirements, but not exact header names/
values or supported date version. A future provider policy must pin verified adapter
configuration with an immutable capability-registry revision. Existing snapshot
capability_ref can reference that frozen definition if historic definitions remain
available and unmodified. No new persistent version column is selected merely for
versioning. Do not reinterpret an old ref using a mutable “latest” definition.
If the existing ref cannot encode/resolve required historic rules, return to schema
review. Never silently upgrade an in-flight operation on sunset; fail closed pending
provider-specific recovery. YouTube/TikTok version mechanisms remain UNKNOWN.

TOKEN_REFRESH = **PROVIDER_SPECIFIC / NOT_YET_JUSTIFIED_AS_SHARED**. Existing encrypted
store and lease/rotation safety can remain; actual token endpoints, lifetime, rotation
and grant rules are not established by current evidence. 9A must not add generic
refresh, automatic token replacement, broaden token-reader tolerance or give publish
adapters refresh-token access. Read-only status must not conceal token refresh.

## 17. Persistence and schema decisions

| Scope / data | Persistence decision | Existing representation / exact gap | Schema classification |
|---|---|---|---|
| 9A transport, validators, reader, redaction, byte handles | In memory, bounded, no new DB writer | Existing credentials/snapshot/events remain authoritative | NO_SCHEMA_CHANGE_PROVEN |
| LinkedIn organization text operation | Existing immutable snapshot + safe post ID, conditional on exact post contract | No upload/session required; version can use immutable capability_ref; options admission/role/ambiguity contracts unresolved | NO_SCHEMA_CHANGE_PROVEN |
| YouTube restartable video session/progress | Not allowed by default; provider-specific durable policy required if restart continuation promised | No encrypted URI/progress checkpoint; existing safe event IDs not suitable | SCHEMA_DECISION_BLOCKED |
| TikTok video session/publish_id | Ephemeral URL; normalized ID candidate; restart contract UNKNOWN | Existing processing ID may suffice after syntax/reference handling review; durable chunk progress not established | SCHEMA_DECISION_BLOCKED |
| LinkedIn single-image asset/session | Ephemeral URL possible; durable substep need UNKNOWN | Safe asset versus post identity and crash recovery not established | SCHEMA_DECISION_BLOCKED |

Overall migration decision stays **SCHEMA_DECISION_BLOCKED**; no concrete migration
0012 is authorized or designed. NO_SCHEMA_CHANGE_PROVEN is not a guarantee all future
provider requirements fit. No runtime grant expansion; immutable snapshots/assets/
events remain insert-only for runtime, operation updates narrow. No ledger editing.

## 18. Provider dependency matrix

REQUIRED means future security/flow prerequisite under this design, not implemented
or sufficiently verified. UNKNOWN preserves incomplete provider semantics. New schema
uses UNKNOWN where no field need is proven; that differs from claiming NOT_REQUIRED.
API version pinning means an exact provider API contract, not merely an internal
capability ref (required for every snapshot already).

| Requirement | LinkedIn Text | LinkedIn Image | YouTube Video | TikTok Video |
|---|---|---|---|---|
| Provider HTTP client | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| Static endpoint policy | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| Capability URL validator | NOT_REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| Private media byte source | NOT_REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| Upload streaming | NOT_REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| Persistent upload session | NOT_REQUIRED | UNKNOWN | UNKNOWN | UNKNOWN |
| Normalized errors | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| UNKNOWN reconciliation | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| API version pinning | REQUIRED | REQUIRED | UNKNOWN | UNKNOWN |
| Token refresh | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Provider options | REQUIRED | REQUIRED | REQUIRED | REQUIRED |
| New schema | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

YouTube persistent upload session is REQUIRED **if restart continuation is promised**;
that product guarantee is unresolved, so the unconditional matrix cell is UNKNOWN.
No-restart behavior must retain UNKNOWN and cannot substitute a new upload. LinkedIn
text requires organization/type/version/content/visibility/hashtag policy, but not a
media facility. Keep the first text slice free of unused upload persistence/streaming.

## 19. Phase 9A primitive decision table

Y = YouTube, L = LinkedIn, T = TikTok; all evidence is externally supplied. “Ready
later” assesses frozen responsibility versus remaining gate, not current authorization.

| Primitive | Shared evidence | Exact responsibility | Explicit non-responsibility | Sensitive inputs | Persistence | Schema need | Hostinger risk | Ready to implement later |
|---|---|---|---|---|---|---|---|---|
| HTTP security envelope | Y/L/T authorized outbound flows | Single bounded policy-bound request, cleanup and safe failure | Adapter semantics/retry/refresh/redirect-follow | Token/body/capability | None | NO_SCHEMA_CHANGE_PROVEN | Duration/connector UNKNOWN | BLOCKED: connector and numeric profiles |
| Static API endpoint validator | Y/L/T; SSRF invariant | Registry-only authority/path/method/audience | Invent host lists or accept arbitrary URLs | Credential audience | None | NO_SCHEMA_CHANGE_PROVEN | DNS/TLS UNKNOWN | Mechanism bounded; exact profiles blocked |
| Capability URL validator | EY2, EL2/EL3, ET3 | Provenance + identity/lifetime/host/audience binding | Trust URL because HTTPS/provider response | Sensitive URL | Denied default | NO_SCHEMA_CHANGE_PROVEN for validator | Dynamic host UNKNOWN | BLOCKED: host/expiry/connector policy |
| Redirect policy | Credential/SSRF invariant across Y/L/T | DENIED both classes, safe 3xx classification | Follow even same-host automatically | Location/token/body | None | NO_SCHEMA_CHANGE_PROVEN | Provider compatibility UNKNOWN | DENIED rule frozen; no allowances |
| Credential audience binding | Y/L/T authorization; Phase 7 invariant | Scoped broker/attachment to verified destination | Generic store lookup or upload-token forwarding | Access token/URL signature | Existing encrypted store | NO_SCHEMA_CHANGE_PROVEN | Secret/runtime checks UNVERIFIED | Scope frozen; provider audience profiles blocked |
| Bounded response reader | Y/L/T metadata + existing AI invariant | Pre-parse bounds/content type and closed output | Truncated/raw body diagnostics | Response may contain secrets | None | NO_SCHEMA_CHANGE_PROVEN | Memory/compression POTENTIAL_BLOCKER | BLOCKED: limits and parser strategy |
| Private media byte source | EY2, EL2, ET3; immutable approval | Scoped exact approved bytes within hold | Filesystem/key/URL reader or asset selection | Private media | No new retention | NO_SCHEMA_CHANGE_PROVEN | Private disk/immutability UNKNOWN | BLOCKED: stable-byte/TOCTOU proof |
| Upload streaming boundary | EY2, EL2, ET3 | Bounded stream/backpressure/abort/accounting | Generic chunks/resume/finalize | Media/capability | None inherent | NO_SCHEMA_CHANGE_PROVEN | Duration/memory POTENTIAL_BLOCKER | BLOCKED with byte-source/policy gates |
| Normalized errors | Existing closed surface + Y/L/T failures | Safe envelope, conservative exposure | Raw codes/messages or choose remote state generically | Raw error internal only | Existing safe event projections | NO_SCHEMA_CHANGE_PROVEN | Low mechanism risk; limits UNKNOWN | Envelope frozen; provider maps blocked |
| Sensitive URL redaction | EY2, EL3, ET3 | Closed projections, no raw serialized capability | Regex-only proof or retaining raw errors | Capability URLs | Never in logs/audit | NO_SCHEMA_CHANGE_PROVEN | Proxy/trace logs UNVERIFIED | Projection rule frozen |
| Operation references | EY2, EL2/EL3, ET4 | Typed bound secret vs safe identity | URLs as IDs, universal checkpoint | IDs/secret URI | Existing IDs; secrets denied | NO_SCHEMA_CHANGE_PROVEN for abstraction | Process lifetime UNKNOWN | Type boundary frozen; durable/reference integration blocked |
| UNKNOWN reconciliation | EY2, ET4; no-blind-redispatch invariant | Bound read-only observation and safe result | Resume/upload/create/retry/refresh | Reference/token | Original IDs where justified | NO_SCHEMA_CHANGE_PROVEN for interface | Async/request lifetime UNKNOWN | Interface frozen; exact lookups/integration blocked |
| API version policy | EL1; immutable snapshot invariant | Pin reviewed profile/capability definition | Invent versions or auto-upgrade | Safe metadata | Existing capability_ref candidate | NO_SCHEMA_CHANGE_PROVEN | Historical config UNKNOWN | LinkedIn-specific values blocked; no universal scheme |
| Token refresh | Publishing evidence insufficient | Exclude from shared scope | Generic refresh/automatic token recovery | Refresh token | Existing Phase 7 store only | No new field proven | UNKNOWN | NOT_YET_JUSTIFIED_AS_SHARED |

## 20. Hostinger and provider-slice gates

Hostinger overall remains UNVERIFIED. HTTP/TLS/DNS connector control, outbound
streaming duration, memory/body buffering, temporary private disk and immutable-byte
behavior, process termination and cross-restart checkpoint needs are unverified.
Large/long uploads and signed-URL secret logging are POTENTIAL_BLOCKER areas; exact
limits are UNKNOWN. No permanent worker, Redis, root, Docker, systemd, background
scheduler or indefinite process lifetime may be assumed. Process loss must not
trigger redispatch. Text-only avoids media/disk/session requirements but still
needs verified outbound and credential/response safeguards.

| Proposed slice | Exact shared dependencies | Provider-specific unresolved blockers | Readiness |
|---|---|---|---|
| LinkedIn ORGANIZATION_TEXT_ONLY | HTTP/static endpoint/audience/reader/error/redaction/reference/read-only status + version binding; NO upload machinery | Exact post payload/response and role-validation endpoint/eligible roles/freshness; app access; version/protocol values; visibility/content/hashtag policy; lost-create response recovery; actual ID grammar | READY_FOR_DESIGN |
| YouTube VIDEO_UPLOAD_ONLY | Above plus byte source/stream/capability validator; session-policy boundary | Significant privacy/category/made-for-kids/hashtag decisions; token/channel/project/audit contract; upload hosts/offset/expiry/finalization/publication proof; durable restart/schema decision; 24h media proof | READY_FOR_DESIGN |
| TikTok VIDEO_DIRECT_POST_ONLY | HTTP/static/capability/audience/byte/stream/reader/errors/references/status/redaction | Exact creator choices/privacy/interactions/disclosures/hashtags; audit/public eligibility; token/creator authority; upload hosts/chunk/TTL/status/failure predicates; 24h media proof | READY_FOR_DESIGN |

LinkedIn text cannot be promoted merely because there is no upload. Exact role
validation *design* remains incomplete: require current authorized member-to-org
eligibility before publish, but endpoint/role set/cache freshness need official
resolution. Existing scope/URN storage alone is insufficient. Generic ambiguity can
safely remain UNKNOWN, but meaningful provider reconciliation and immutable reference
handling still require a verified contract. No provider is READY_FOR_NARROW_IMPLEMENTATION.

YouTube excludes thumbnails, playlists, Shorts-specific semantics, analytics,
scheduling, comments and generated metadata. TikTok excludes photo, URL-pull,
analytics, scheduling and automatic privacy defaults. LinkedIn image is separate
from text; no extra document/video/multi-image capability is implied. Facebook and
Instagram remain BLOCKED_ON_OFFICIAL_EVIDENCE; their behavior is not inferred here.

## 21. Unresolved policy values and implementation stop gates

| Gate | Required resolution | Current status |
|---|---|---|
| Endpoint profiles | Official API/upload hosts, endpoint methods/path/query/header/audience and version rules | Provider-specific evidence gaps; UNKNOWN, deny unconfigured |
| Safe connector | DNS/address/peer/TLS/proxy/pooling enforcement compatible with existing Node/tooling | IMPLEMENTATION_RESEARCH_REQUIRED; no dependencies/config change authorized |
| Response profiles | Success/error/raw/decoded ceilings, content encodings/types, parser structure/string/header limits | POLICY_VALUE_REQUIRED; parser strategy research required |
| Request/stream profiles | Body/framing/range/aggregate budgets and backpressure memory bounds | POLICY_VALUE_REQUIRED; provider limits not invented |
| Timeouts/lifetimes | Connect/header/read/upload-idle/overall and ephemeral capability/credential lease bounds | POLICY_VALUE_REQUIRED within existing parent limits |
| Byte integrity | Stable approved object or equivalent verified bounded snapshot across upload | IMPLEMENTATION_RESEARCH_REQUIRED; preflight hash alone insufficient |
| Logging metadata | Exact finite duration/count ranges and sink/proxy/trace exclusions | POLICY_VALUE_REQUIRED; no raw object fallback |
| Reference/recovery integration | Original safe reference survival, provider status proof and rotation binding | Provider/integration design unresolved; no automatic retry |
| Durable sessions | Product restart promise, encrypted fields, TTL/cleanup/grants if needed | SCHEMA_DECISION_BLOCKED; persistence denied |
| Product/eligibility | Exact options/hashtag/visibility/role/audit/consent contracts | Unresolved per provider |

Failure to satisfy a gate disables the affected operation before network access;
never bypass it to make a provider work. If research proves a needed source/config/
dependency/migration/security change, seek separate scoped authorization with a
concrete design; no change is made in this design cycle.

Future implementation acceptance criteria (not tests run here): adversarial URL,
redirect/rebinding/proxy/peer checks; synthetic credential-family redaction across
errors/logging; bounded raw/decoded/structural responses; audience-crossing denial;
wrong workspace/provider/asset/operation handles; expired/revoked/version-stale
leases; media mismatch/TOCTOU/hold expiry; abort/cleanup/late result; no duplicate
request; safe reference loss; read-only reconcile refusing upload/reinit. Provider
protocol fixtures and real-world eligibility verification are separate later gates.

## 22. Permissions, schema and final readiness

Permissions remain 32. Reuse content.publish: Owner/Marketing Admin YES;
Creator/Reviewer/Viewer NO. Shared transport is not a new user-facing authority.
Existing content.read/integrations.read/publishing_logs.read and object controls
still apply; management remains integrations.manage. Every new consequential publish
keeps existing purpose-bound session/user/auth-version/single-use step-up. Read-only
reconciliation adds no step-up. No auth/MFA/CSRF/session/isolation/grant change.

- Phase 9A shared primitives schema: NO_SCHEMA_CHANGE_PROVEN.
- LinkedIn text schema: NO_SCHEMA_CHANGE_PROVEN.
- YouTube video schema: SCHEMA_DECISION_BLOCKED.
- TikTok video schema: SCHEMA_DECISION_BLOCKED.
- Overall migration decision: SCHEMA_DECISION_BLOCKED; no 0012.
- Phase 9A shared design readiness: **BLOCKED** for the full implementation contract
  until connector, numeric profiles, parser and byte-integrity gates resolve.
- LinkedIn text / YouTube video / TikTok video: **READY_FOR_DESIGN** only.

Frozen invariants are useful implementation constraints, but do not override these
unresolved gates. Phase 8 remains closed; provider evidence classifications and
PARTIALLY_UNBLOCKED_FOR_DESIGN history remain unchanged. All real providers remain
DISABLED / UNVERIFIED operationally. Private media hold max 24h, nonrenewable,
purpose-bound; no permanent DAM, URL-pull or scheduling. STOP FOR REVIEW.

---

# 9A-CONTRACT-2 — shared security policy resolution

Date: 2026-10-20 (Asia/Karachi). **DESIGN / POLICY FREEZE ONLY.**
All CONTRACT-1 bytes above remain historical and unchanged. This revision resolves
its shared policy gaps for a future bounded, stateless implementation; it does not
implement it. Decisions below are conservative **PROJECT POLICY**, not provider
limits, public-network standards completeness claims or newly verified official facts.
Original discovery BLOCKED and external reconciliation PARTIALLY_UNBLOCKED_FOR_DESIGN
remain preserved. Provider evidence remains EXTERNAL_OFFICIAL_EVIDENCE; no new
provider/documentation network request was made. Required live Git remote reads are
separate. No security test or full suite was executed.

## C2.1 Runtime evidence and chosen connector

Read-only inspected package.json/.nvmrc/package-lock.json, installed @types/node
24.19.2 declarations (https/http/net/tls/dns), and built-in runtime source locally.
Project pins Node >=24.21.0 <25, .nvmrc 24.21.0, npm 11.19.0; available pinned binary
reports v24.21.0, OpenSSL 3.5.8, default minimum TLSv1.2. Native runtime introspection
confirmed https.request/Agent.createConnection, tls.connect/checkServerIdentity,
dns.Resolver resolve4/resolve6/cancel, net.BlockList/SocketAddress.parse and
AbortSignal.any/timeout. No socket/resolver/request was invoked in that inspection.

**Classification: NATIVE_RUNTIME_SUFFICIENT. New dependency: NOT_REQUIRED for the
bounded contract.** Use node:https/http/net/tls/dns/stream/crypto, not a general fetch
wrapper or unreviewed transitive dispatcher. Zod is already installed. Existing
`decodeBrowserJson` provides fatal UTF-8, JSON syntax and escaped-duplicate-name
rejection; it is already used by the AI response reader. Reuse that validated-output
behavior with bounded structural traversal, not a new JSON grammar/parser package.
No auth helper refactor, package/config edit or runtime version change is authorized.

Chosen connector is a dedicated per-request asynchronous https.Agent connection
hook. Node's installed API explicitly supports callback-only socket creation; the
hook returns no socket synchronously. It obtains a fresh validated DNS set, selects
one approved numeric address, establishes one direct TCP connection, verifies its
peer, wraps that same socket with authenticated TLS for the original DNS hostname,
and only then invokes the Agent callback to expose the socket to HTTP. No HTTP
header/body/credential is released before this completes. Queued ClientRequest data
must not have another socket or fallback path. Test that guarantee explicitly.

Each request owns its Agent/socket; no keep-alive reuse, coalescing, session cache,
Happy Eyeballs/family fallback, alternate-address reconnect, automatic retry or
redirect. This deliberately trades connection efficiency/availability for a smaller
security contract. A provider-specific multi-step flow calls the same one-attempt
primitive explicitly with the unchanged operation binding and parent deadline.

### Five-layer pipeline

| Layer | Frozen invariant / failure rule |
|---|---|
| A URL | Canonical validated authority and policy-bound path/query; no arbitrary caller URL; provider/operation/audience match |
| B DNS | Fresh bounded A/AAAA result for original absolute name, all answers checked, one deterministic public-policy address selected; deny any unsafe or unresolved family error |
| C TCP | Connect only selected numeric address; disable auto family selection; exact peer-address/family/port equality checked before TLS and before releasing HTTP socket |
| D TLS | Original hostname as SNI and certificate identity, normal chain verification, explicit approved trust roots, TLS >=1.2, no early HTTP exposure |
| E HTTP | Closed method/header/body policy, no redirect, bounded identity-encoded response and safe mapper; status never chooses publish state |

The actual address check is in addition to connection binding, not after-the-fact
substitution for it. IP-literal dialing prevents a second DNS resolution after
validation; a custom lookup callback alone would need the same peer/TLS checks and
is not the selected initial design. DNS pinning alone is insufficient. The network
can route a public address internally beyond process visibility; transparent proxies
or unusual network routing remain deployment verification issues, not guarantees
this application can make.

## C2.2 URL, hostname and address rules

Both URL classes retain distinct provenance/audience rules from CONTRACT-1. Shared
syntax restrictions below apply before any credentials/HTTP request construction.

| Component | Decision | Exact policy |
|---|---|---|
| Scheme | NORMALIZE_THEN_VALIDATE | ASCII scheme case may normalize to https; all non-HTTPS rejected |
| Userinfo | REJECT | Any authority @ or username/password, including empty-user forms |
| Fragment | REJECT | Any fragment delimiter, even empty; never strip and proceed |
| Port | NORMALIZE_THEN_VALIDATE | Absent or literal 443 only; canonical default port omitted; alternate spellings such as 0443 and all other ports rejected |
| Host case | NORMALIZE_THEN_VALIDATE | ASCII lower-case then exact provider profile match |
| Host syntax | REJECT invalid | ASCII DNS labels only; label/total bounds, no empty labels, leading/trailing hyphen, underscore, wildcard, single-label/local name |
| IP literal / numeric alias | REJECT | Reject bracketed IPv6 and canonical IPv4; WHATWG-normalized hex/octal/integer/short IPv4 aliases also rejected; never treat as domain |
| Percent-encoded authority | REJECT | Any percent encoding in authority, not just known encodings |
| Unicode / IDN | REJECT | Raw non-ASCII hostname and xn-- punycode labels denied in revision 2; no provider exception evidenced |
| Trailing dot | REJECT | Do not silently strip to gain an allowlist match |
| Local names | REJECT | localhost and subdomains, .local, .localhost, .internal, .home.arpa; single-label names already denied |
| Malformed input | REJECT | Whitespace/control/backslash, malformed escapes, ambiguous authority, parser/serialization disagreement |
| Path/query | DEFER_TO_PROVIDER_PROFILE within restrictions | Static typed builder; capability value from authenticated response only; preserve reviewed signed bytes, reject authority/path escalation and dot-segment ambiguity |

Canonical parsing/serialization must not rewrite a signature-bearing capability
query or silently change its signed path. If it cannot be represented safely, deny.
Endpoint construction is not normalization of approved copy/hashtags/media.

Address policy uses native net.isIP and BlockList/subnet matching, with canonical
binary-address equality (SocketAddress normalization), not regex private-IP guesses.
Freeze the following conservative project policy, which intentionally rejects some
public special-purpose space rather than creating provider exceptions:

- IPv4: reject 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8,
  169.254.0.0/16, 172.16.0.0/12, **192.0.0.0/8**, 198.18.0.0/15,
  198.51.100.0/24, 203.0.113.0/24, 224.0.0.0/4, 240.0.0.0/4.
  This covers loopback/private/link-local/CGNAT/unspecified/multicast/reserved and
  known documentation/benchmark ranges conservatively. Denying all 192/8 is a
  deliberate availability restriction, not a claim that entire range is private.
- IPv6: permit only candidates inside 2000::/3, then reject 2001::/23,
  2001:db8::/32, 2002::/16 and 3fff::/20. Everything outside that candidate range
  is denied, including loopback/unspecified/ULA/link-local/multicast, NAT64/local
  translation and mapped/compatible address literals. This is a narrow frozen
  project allow-range plus exclusions, not a statement all other global addresses
  are inherently dangerous or that any allowed address is a provider.
- DNS records returning mapped IPv6 addresses are denied. An OS socket reporting
  an IPv4 peer in IPv4-mapped notation may normalize only to compare the exact
  already-selected IPv4 address; it cannot turn a rejected DNS record into an allow.
- Unknown address form, scope/zone ID, mixed unsafe answers or failed classification
  denies the whole resolution. No exceptions for private provider hosts.
- Matching a public range is necessary, never sufficient: exact official provider
  authority/audience policy and TLS identity are independently required.

These tables must be versioned/tested; future special-purpose allocation changes or
incompatible provider addresses require policy review, not dynamic exceptions during
coding. No outbound host list is inferred here. Missing official endpoint/upload
profile keeps that provider request disabled.

### DNS binding details

Use a request-private native Resolver, query both A and AAAA for the absolute DNS
name (controlled terminal-dot DNS query only; URL/SNI keep validated hostname).
Use one combined DNS deadline. ENODATA for a family is allowed if another has safe
answers; transient errors/timeout/malformed data deny rather than trusting only the
other family. NXDOMAIN/no safe answers denies. Inspect every returned address before
selection; too many answers denies, not truncates to ignore a private tail.
Sort approved answers by family then canonical numeric value, prefer IPv4 if present,
select exactly one; no fallback attempt on failure. Do not persist DNS results or
re-resolve during connect. Stop/cancel the request-private Resolver on abort/deadline;
ignore late callback results. No mutation of global resolver configuration.

At TCP connect and again at TLS completion, normalized remoteAddress/remoteFamily/
remotePort must match selected address and 443. A mismatch destroys the socket and
never releases it to HTTP. Request-specific approved address cannot be replaced by
another public answer. DNS/TCP/TLS failures are provably pre-HTTP only because the
socket is withheld from HTTP; absent this proof, classify conservatively ambiguous.

## C2.3 Proxy and TLS policy

**PROXY_DISABLED_FOR_PROVIDER_TRANSPORT.** No HTTP_PROXY/HTTPS_PROXY/ALL_PROXY/
NO_PROXY or runtime-equivalent ambient configuration is inherited. Use a private
Agent with empty proxyEnv and direct native socket construction; do not use global
agents/fetch/environment proxy auto-configuration. Do not unset global environment
or change repository environment schemas. If direct egress is impossible, transport
is unavailable: proxy support needs a separately reviewed contract, never fallback.
Local Node source inspection showed Agent proxy configuration is explicit via its
proxyEnv object. Required tests must prove ambient proxy flags cannot affect this
private path. Git/tool proxy behavior is outside this provider transport scope.

TLS minimum is explicit project policy TLSv1.2, allowing TLSv1.3/runtime-supported
stronger versions. Use native chain verification and tls.checkServerIdentity for
original hostname, rejectUnauthorized true, original SNI, no insecure downgrade or
custom verification bypass. Trust only the native bundled CA roots (tls.rootCertificates)
explicitly, not an ambient custom-CA injection. No custom CA in production without
separate review. Do not log certificates/hostname/errors. Test-only local CA injection
may exist only in isolated dependency-injected fixtures, impossible to select via
production config or user input. No TLS session cache/resumption/0-RTT in this initial
connector contract; no HTTP application bytes before authenticated TLS + peer checks.

## C2.4 Redirects, compression and body parsing

Redirects remain **DENIED** for both endpoint classes. On 3xx, do not follow or copy
Location, replay body or forward credentials. Return safe HTTP_REDIRECT_DENIED
internal classification, close request/body, expire the current ephemeral handle
locally, and preserve MAY_HAVE_BEEN_SENT. This does not prove remote revocation or
invalidate provider state. A provider adapter can report a documented conclusive
outcome if separately evidenced; it cannot direct the shared client to follow.
No generic 3xx-to-FAILED conversion.

Compression policy = **BOTH prevention and parser-bound enforcement, with rejection
rather than decompression** in revision 2. Send Accept-Encoding: identity; native
https.request does not automatically decompress. Reject Content-Encoding gzip, br,
deflate, stacked/unknown encodings; accept only absent or single identity. No zlib
pipeline is part of scope. The actual identity body bytes delivered to parser are
counted and bounded, not merely Content-Length. Compressed bomb input never reaches
JSON parsing. A future compressed mode would need a separate decoded/wire-bound
contract, not a permissive option hidden in implementation.

Classify by response policy and HTTP status; error responses always use the error
ceiling even if the success class is larger. Reject known oversized Content-Length
early. Missing length is allowed under streaming accounting; native strict HTTP
chunk framing allowed. Count actual bytes; conflicting/duplicate/invalid length,
length/transfer-encoding ambiguity, truncated body, premature close or incomplete
message is an error. Use native strict HTTP parsing, no insecureHTTPParser mode.
A dishonest too-small length cannot turn excess bytes into another response: one
request/socket, no pipelining/reuse, reject unsolicited remainder/protocol framing
errors, never deliver them as trusted JSON. Oversized/chunked bodies cancel immediately.
Response header bytes have a native parser ceiling; header count must reject overflow,
not silently truncate important fields. Raw headers never leave transport.

Success JSON accepts only the profile's exact content type (application/json by
default, parameters restricted to UTF-8 where present); no generic +json/HTML sniffing.
Upload 204/empty responses require an explicitly reviewed endpoint policy. Error
HTML/plain/proxy body is canceled/discarded and categorized; if expected error JSON
is present, bound/parse/map privately. No raw/truncated body retained or returned.

Parse only after full body fits its byte ceiling. Use existing fatal UTF-8 and
escaped-duplicate-key rejection behavior in decodeBrowserJson (JSON.parse followed
by validation before returning). Exact or escaped-equivalent duplicates are rejected.
Native JSON allocation is bounded by the small input cap; structural checks need not
pretend they run before allocation. Add iterative, non-recursive depth/node/member/
array/string checks before provider schema/mapping. Reject dangerous object keys
__proto__, constructor, prototype and ill-formed Unicode; no object spreading or
prototype merges from untrusted data. Reject non-finite JSON numeric results and
unsafe integers where an ID/offset schema requires integer exactness. Provider-specific
strict schemas follow generic checks; unknown fields never flow into domain objects.
No custom JSON grammar or new parser dependency. Existing helper remains unchanged
now; future reuse must pass expanded deterministic regression coverage.

## C2.5 Frozen numeric policy register

All values below are revision-2 **project constants**, not provider allowances.
Configurable = NO for callers/environment in this revision. Min=max for each fixed
policy constant; variable payload cardinalities are 0..maximum unless an explicitly
stated positive minimum applies. A reviewed later profile may lower a ceiling by
contract revision, never raise/override it ad hoc. Existing Phase 8 limits remain
unchanged. Values were selected for bounded metadata/error processing and existing
32 MiB media/64 KiB AI-response/32 KiB snapshot-content scales, not guessed provider
requirements. If official flow exceeds them, that capability fails closed pending
separate policy review; no claim all providers fit.

| Policy | Value | Unit | Applies to / security purpose / rationale | Configurable | Minimum | Maximum |
|---|---|---|---|---|---|---|
| SMALL_JSON_RESPONSE | 65536 | bytes | Metadata success cap; matches existing AI bounded response scale | NO | 65536 | 65536 |
| PROVIDER_ERROR_RESPONSE | 16384 | bytes | Error JSON ceiling; smaller than success, enough for closed codes, not raw diagnostics | NO | 16384 | 16384 |
| STATUS_RESPONSE | 16384 | bytes | Read-only state metadata, minimal safe fields | NO | 16384 | 16384 |
| UPLOAD_INITIALIZATION_RESPONSE | 32768 | bytes | Bounded IDs/capability metadata; existing snapshot-content scale | NO | 32768 | 32768 |
| SMALL_STRUCTURED_REQUEST | 32768 | UTF-8 bytes | Serialize privately then check before send; approved-copy/metadata scale | NO | 32768 | 32768 |
| RESPONSE_HEADER_BYTES | 16384 | bytes | Native maxHeaderSize bound; prevents unbounded header/URL bags | NO | 16384 | 16384 |
| RESPONSE_HEADER_COUNT | 64 | fields | Reject overflow, never silently truncate; structured metadata needs few fields | NO | 64 | 64 |
| REQUEST_HEADER_BYTES / COUNT | 8192 / 32 | bytes / fields | Exact trusted headers only; finite credential/framing envelope | NO | 8192 / 32 | 8192 / 32 |
| JSON_DEPTH | 16 | containers | Iterative bounded traversal; root container depth 1 | NO | 16 | 16 |
| JSON_TOTAL_NODES | 2048 | values including root | Bounded parse result traversal; stop before walking excess nodes | NO | 2048 | 2048 |
| JSON_OBJECT_MEMBERS / TOTAL_MEMBERS | 128 / 1024 | keys | Bound per-object and aggregate maps | NO | 128 / 1024 | 128 / 1024 |
| JSON_ARRAY_ELEMENTS | 256 | elements per array | No generic bulk dataset reader | NO | 256 | 256 |
| JSON_STRING / KEY | 16384 / 128 | decoded UTF-8 bytes | Bound values and field names after duplicate decoding | NO | 16384 / 128 | 16384 / 128 |
| CAPABILITY_URL_LENGTH | 4096 | ASCII bytes | Finite opaque URI within init payload; not allowed log content | NO | 4096 | 4096 |
| HOSTNAME / LABEL_LENGTH | 253 / 63 | ASCII bytes | Canonical finite DNS syntax, nonempty labels | NO | 253 / 63 | 253 / 63 |
| DNS_ANSWER_COUNT | 16 | combined A+AAAA records | Bound validation work; any excess rejects entire answer | NO | 16 | 16 |
| MEDIA_CAPTURE_OPERATION_TOTAL | 33554432 | bytes | At most existing 32 MiB maximum single video; four 8 MiB images can fit | NO | 33554432 | 33554432 |
| MEDIA_BODY_MAX | 33554432 | media bytes per request | Exact selected approved extent, never arbitrary unbounded streaming | NO | 33554432 | 33554432 |
| MEDIA_FRAMING_MAX | 65536 | additional bytes per media request | Bounded multipart/control overhead; not silent extra media | NO | 65536 | 65536 |
| MEDIA_IO_CHUNK | 65536 | bytes | Existing 64 KiB hash-read scale; bounded private chunks/backpressure | NO | 65536 | 65536 |
| ACTIVE_MEDIA_OPERATION | 1 | per process | Bound private capture memory; reject BUSY, no queued worker | NO | 1 | 1 |
| DNS_TIMEOUT | 3000 | ms | Combined resolver budget; finite pre-connect work | NO | 3000 | 3000 |
| CONNECT_TIMEOUT | 3000 | ms | One TCP attempt after selected address; no fallback | NO | 3000 | 3000 |
| TLS_TIMEOUT | 3000 | ms | Handshake/identity/peer budget; no insecure fallback | NO | 3000 | 3000 |
| HEADER_TIMEOUT | 5000 | ms | Response-header wait after last request byte; total deadline also applies | NO | 5000 | 5000 |
| SMALL_RESPONSE_IDLE | 2000 | ms | Maximum gap between response-body progress | NO | 2000 | 2000 |
| MEDIA_UPLOAD_IDLE | 5000 | ms | No request-body write/drain progress; bounded memory/stall | NO | 5000 | 5000 |
| TOTAL_SMALL_REQUEST | 10000 | ms | DNS through response cleanup; fail closed rather than indefinite wait | NO | 10000 | 10000 |
| TOTAL_MEDIA_OPERATION | 30000 | ms | Existing Phase 8 dispatch ceiling; all steps/capture share one parent deadline | NO | 30000 | 30000 |
| RECONCILIATION_REQUEST | 10000 | ms | Read-only bounded status observation; not scheduling cadence | NO | 10000 | 10000 |
| EPHEMERAL_CAPABILITY_LIFETIME | 30000 | ms maximum | From issuance, clipped by original parent/hold/authorization/provider expiry | NO | 30000 | 30000 |
| CREDENTIAL_LEASE_LIFETIME | 30000 | ms maximum | One bound attempt only, clipped by parent/token expiry/version changes | NO | 30000 | 30000 |
| INTERNAL_OPERATION_REFERENCE | 36 | ASCII bytes | Existing canonical UUID only, no arbitrary provider-supplied value | NO | 36 | 36 |
| SAFE_PROVIDER_ID | 256 | ASCII bytes maximum | Existing safeId/event grammar; reject oversize rather than truncate | NO | 256 | 256 |
| SAFE_ERROR_SYMBOL | 32 | ASCII bytes maximum | Closed enum only; no raw error string even if shorter | NO | 32 | 32 |
| DIAGNOSTIC_LABEL | 64 | ASCII bytes maximum | Closed stage/profile labels, not free text | NO | 64 | 64 |
| LOG_RECORD | 2048 | serialized UTF-8 bytes | Closed projection; drop optional metrics if needed, never append raw object | NO | 2048 | 2048 |
| LOG_DURATION | 30000 | ms maximum | Saturating nonnegative integer duration, no high-cardinality timings | NO | 30000 | 30000 |
| LOG_BYTE_COUNT | 4294967295 | bytes maximum | Saturating unsigned 32-bit metadata only; never payload/secret | NO | 4294967295 | 4294967295 |
| MINIMUM_TLS / OUTBOUND_PORT | TLSv1.2 / 443 | protocol / port | Explicit strong floor/default HTTPS authority | NO | TLSv1.2 / 443 | Runtime-supported TLS / 443 |

Min=max in this table fixes the configured ceiling/duration, not a minimum allowed
payload length. UUID length is exactly 36; IDs 1..256; labels/errors are nonempty
allowlisted symbols within their maxima; positive media extents are 1..approved size.
Every counter uses checked finite arithmetic. Over-limit body/ID is rejected, never
silently truncated; only numeric operational metrics saturate. Node parser defaults
not explicitly specified here may not weaken these checks.

All timeouts are distinct phase budgets clipped by monotonic total and parent
deadlines; their sum is not permission to exceed a total. Small-request header budget
may therefore be curtailed after slow DNS/TLS. Set actual timers/abort destruction;
node socket.setTimeout notification alone is not enforcement. Upload-idle resets
only on actual bounded byte/write/drain progress, never mere timer activity; response
idle only on received bytes. Clear timers/listeners in finally and ignore late events.
No sleep/retry. Capability or credential lease lifetime never resets the original
dispatch deadline. A slow provider stays unsupported rather than increasing timeout
as a correctness fix.

## C2.6 Structured and media request boundary

Structured request: strict endpoint schema, serialize once to private UTF-8 bytes,
check 32768-byte limit before send, exact framing/content type, no caller overrides.
Media request: get expected bytes from approved metadata, never buffer merely to
learn size. Provider framing stays specific; total allowed emitted wire body is
selected approved media extent plus declared validated framing bounded by 65536,
never more than 33554432 media bytes per request. Account media and framing separately.
Chunk ranges are exact verified adapter-selected extents; no generic reupload/retry.

Chosen stable-byte strategy is a **bounded private in-memory verified capture**, not
filesystem locking or a claim existing files are immutable. Existing storage prevents
symlink/key abuse and returns a guarded descriptor; it does not prove an inode cannot
be written later. Before the first remote API/init/upload action of a media operation,
capture ALL selected approved assets into broker-private buffers whose aggregate
expected bytes fit 33554432. This limit is a new conservative future profile ceiling,
not a modification of current Phase 8's per-asset policy; combinations exceeding it
fail local admission. No disk spool, new retained asset or permanent storage.

Read each bound descriptor exactly to expected length plus a bounded EOF probe,
compute SHA-256 over captured bytes and compare the immutable approved hash before
any bytes/credential-bearing request can reach provider. Check initial/final descriptor
metadata as defense in depth; metadata alone is not identity proof. Close source
descriptors. Concurrent source mutation either yields the exact approved capture or
fails hash/length checks; later on-disk changes cannot affect the private capture.
Admit only one active captured-media operation per process; total capture payload
memory <=32 MiB, plus bounded I/O/framing/metadata/native TLS queues. No claim this
bounds the entire Node process RSS. Allocation/capacity failure is safe local denial,
not a reason to enlarge limits or spill to disk.

Private buffers/aliases are never returned to adapter/user/AI/store/logger. The trusted
transport consumes an opaque source and emits copied, <=65536-byte slices with
backpressure; no public writable view of backing capture. Adapter declares approved
ranges/framing, not replacement bytes. Internal counters/hash verify the media bytes
at the transport boundary; range hash expectations derive from the verified capture,
not user metadata. Full-source capture hash is authoritative before send; during/
after-send hashing is defense in depth, not the first integrity check. Buffer bytes
are reference-released and best-effort overwritten in finally; no JS guaranteed
zeroization claim. No resumable cross-process promise from this ephemeral capture.

Continue to recheck live authorization, operation claim, lifecycle and nonrenewable
hold before every remote step and on streamed chunk boundaries; abort on expiry/
revocation/change. No hold renewal, public fallback, asset substitution or retry.
Expected < actual, actual < expected, read failure/disappearance, invalid extent,
mutation or abort never silently succeeds. Before any operation send, use internal
LOCAL_PRE_DISPATCH_FAILURE with MEDIA/INVALID or existing MEDIA_UNAVAILABLE admission
error; not a provider rejection. Once this operation may have had an effect, abort
and preserve UNKNOWN even if the current failing chunk itself was not sent.

Hash timing is **BEFORE_UPLOAD + DURING_UPLOAD + AFTER_UPLOAD**, where pre-send
verification is over the exact private bytes subsequently consumed; final checks
cannot retroactively prove a bad upload harmless. This resolves TOCTOU without
assuming path, descriptor, hash-before-open or filesystem lifecycle alone is enough.
Hostinger memory/process availability remains a deployment gate; inability to meet
the fixed capture contract disables media, never weakens integrity.

## C2.7 Reference preservation and authorization rotation

Exact existing snapshot binding fields: publish_snapshots.id, brand_id, provider,
platform, authorization_id, authorization_version, destination_id,
destination_remote_id, capability_ref, intent_hash and revision_id/approval_decision_id.
These identify the approved connection/version/destination; no new identity field is
needed for the conservative rules below. social_authorizations.version and existing
credentials.version are checked, not inferred from token text. Current code increments
version for refresh/reconnect/selection; it does not persist a cryptographically
reliable reason-specific lineage proving “material-only rotation”.

Freeze **DENY_CROSS_VERSION_BY_DEFAULT**, including read-only remote reconciliation.
Same connection ID/destination/scopes plus a new version is necessary but insufficient
to prove unchanged approved authority. A future exception would need verified refresh
semantics, durable lineage and actor/destination/scope/subject/version proofs and
separate approval. It is excluded, not left for an implementer to choose. Never
rewrite the immutable snapshot, use old revoked token material or request a new grant
merely to inspect an uncertain old operation.

| Connection event | New dispatch | Continuing upload | Remote status reconciliation |
|---|---|---|---|
| Same connected identity/version, current scopes/destination | Normal admission + new purpose-bound step-up/claim | Only already-authorized explicit step with live hold/capability | Existing actor/object/log checks + original reference; read-only, no new step-up |
| Token rotates and version increments | Deny old intent; a genuinely new operation requires new approval/confirmation and existing uniqueness rules, never resend workaround | Stop/abort; if effect possible preserve UNKNOWN | Deny with AUTHORIZATION_STALE; local history may still be read |
| Scope, subject, destination selection or reconnect changes | Deny old version/context | Stop/abort, no new destination/token substitution | Deny; same ID alone is insufficient |
| REVOKED/DISCONNECTED/EXPIRED/REAUTH_REQUIRED or current RECONNECT_REQUIRED/LIMITED/refresh lease | Deny remote action | Stop/abort; no stale capability continuation | Deny remote action, no token refresh hidden in lookup; local authorized history remains available |

Recheck at step admission and throughout transfer at chunk/response boundaries.
Local invalidation cannot retract already transmitted bytes or guarantee zero bytes
after a race with concurrent revocation; short leases and abort reduce exposure,
never justify accepting an unconfirmed outcome. No DB lock spans I/O. This policy
may reduce recovery availability after refresh; that is explicit, safe and compatible
with immutable authority. A genuine new operation is not an authorized duplicate of
an uncertain revision/destination operation.

Reference preservation strategy for future integration: safe IDs already exist in
append-only publish_events even when latest UNKNOWN has null IDs. Inspect at most
existing 100 events for the operation in sequence order, validate every candidate
against snapshot/provider/capability/typed role, and recover a compatible proven
reference from history without overwriting snapshot or prior events. Null in a newer
UNKNOWN event does not erase earlier evidence. Do not conflate asset ID with content
ID, combine unrelated references or guess IDs from messages. Conflicting same-role
identities or absent evidence => NO_SAFE_LOOKUP/UNKNOWN, no network request.
Apply provider-specific reference semantics before accepting an ID. Atomic CAS on
state/version when recording a later observation prevents stale lookup overwrites.

This is a **design for a future source integration change**, not a claim the current
latest-event-only implementation already does it. Existing bounded history is enough
for the conservative safe-ID preservation rule; no new column/grant is needed.
Secret session URI/progress cannot be recovered from those safe ID fields; persistent
resume remains denied and provider-specific SCHEMA_DECISION_BLOCKED.

| Reference type | Sensitive | Persist default | Encrypt | Log | Audit raw | Browser | Retention | Rotation rule |
|---|---|---|---|---|---|---|---|---|
| SAFE_PROVIDER_ID | Not secret, still identity/PII-sensitive | Only existing validated purpose-bound event fields | Not required for strict safe ID | Omitted by default | NO | No new exposure; existing safe DTO only | Existing immutable operation history; no new retention duration selected | Original provider/destination/version; never reassociate across rotation |
| SENSITIVE_PROVIDER_CAPABILITY | YES | DENY | Mandatory if future separately approved persistence | OMIT | NO | NO | At most ephemeral parent/expiry bound, no raw persisted copy | Invalidate local handle on any auth-version/context change |
| EPHEMERAL_UPLOAD_DESTINATION | YES | DENY | No store; encrypt if future exception reviewed | OMIT | NO | NO | <=30000 ms from issuance and earlier parent/provider/hold expiry; dispose after use/failure | No cross-version or cross-operation reuse |
| RESUMABLE_SESSION_REFERENCE | Treat as YES unless safe ID proven | DENY in shared scope | Required for future secret checkpoint | OMIT | NO | NO | Ephemeral parent only; durable expiry policy deferred with provider resume | No automatic credential/authority rebinding; continuation excluded from reconcile |
| AUTHORIZATION_VERSION_REFERENCE | Not token; internal authority metadata | Existing immutable snapshot | No new encryption required | Validated internal projection only | Only safe internal attribution, not credentials | No new exposure | Existing snapshot/history lifecycle | Immutable N; mismatch denies remote action |

## C2.8 Ambiguity and transport facts

Exposure is tracked per request AND at operation level. A later request proven not
sent cannot erase a possible effect from an earlier initialization/upload/post step.
Below, “not sent” refers to the failing request; the safe local-pre-dispatch consequence
assumes this operation has no prior possible effect. TLS/TCP pre-send proof depends
on the selected connector withholding HTTP socket; without it, default UNKNOWN.
No automatic retry is permitted, even for proven no-send.

| Scenario | Request definitely not sent | Provider effect possible | Normalized local result | Publish state consequence | Automatic retry |
|---|---|---|---|---|---|
| URL rejected | YES | NO for first operation step | LOCAL_PRE_DISPATCH_FAILURE / INVALID | Deny admission; no automatic remote FAILED | NO |
| DNS rejected | YES | NO for first step | LOCAL_PRE_DISPATCH_FAILURE / UNAVAILABLE | Deny admission; retain prior UNKNOWN if any earlier effect | NO |
| TLS validation failure | YES with socket-withholding proof | NO HTTP effect for first step | LOCAL_PRE_DISPATCH_FAILURE / UNAVAILABLE | Deny; no provider rejection claim | NO |
| Connect timeout | YES with connector proof | NO HTTP effect for first step | LOCAL_PRE_DISPATCH_FAILURE / UNAVAILABLE | Deny; prior effect still UNKNOWN | NO |
| Reset before request bytes | YES only with explicit no-HTTP-handoff proof | NO only with that proof | LOCAL_PRE_DISPATCH_FAILURE; otherwise OUTCOME_UNKNOWN | Deny if proven; otherwise UNKNOWN | NO |
| Reset after partial request | NO | YES | NETWORK_AMBIGUOUS / OUTCOME_UNKNOWN | UNKNOWN | NO |
| Reset after full request | NO | YES | NETWORK_AMBIGUOUS / OUTCOME_UNKNOWN | UNKNOWN | NO |
| Response timeout | NO | YES | NETWORK_AMBIGUOUS / OUTCOME_UNKNOWN | UNKNOWN | NO |
| 2xx parser failure | NO | YES | UNKNOWN_PROVIDER_ERROR / OUTCOME_UNKNOWN | UNKNOWN, not PUBLISHED | NO |
| Media hash mismatch before any operation send | YES | NO | LOCAL_PRE_DISPATCH_FAILURE / MEDIA / INVALID | Deny admission; no provider failure | NO |
| Media mutation during upload | NO if any request might have been sent | YES | Local media-integrity failure + OUTCOME_UNKNOWN | Abort and UNKNOWN; final hash cannot undo sent bytes | NO |

bytesWritten/flush counters are observability, not proof provider received or rejected
anything. Once HTTP handoff can occur, conservatively MAY_HAVE_BEEN_SENT even if a
counter reads zero. Only documented provider evidence can later establish another
state. HTTP 2xx never automatically means PUBLISHED; 4xx/5xx/3xx never generically
prove no side effect. Adapter owns verified status/error mapping; shared layer only
reports safe transport facts. Existing state machine and enum remain unchanged;
local symbols are internal classifications, not new DB enum values. Before-send
errors use existing admission/error projections; no generic catch maps them blindly
to remote FAILED. After-send parser/timeout/abort/audit ambiguity means UNKNOWN,
not a retryable failure. Read-only reconciliation failure preserves last proven
state/uncertainty; it cannot initiate a publishing side effect.

## C2.9 Logging, diagnostics and immutable policy profiles

Read-only logging inspection found: generic safe publishing route failure projection;
SensitiveValue redacted ordinary serialization; DB connection intentionally has no
query logger; Next config suppresses incoming OAuth callback logging but does not
establish outbound secret redaction; browser secure-test rewrites errors to generic
safe location; publishing diagnostic helper extracts only allowlisted codes/constraints.
No dedicated server provider HTTP logger or root instrumentation.ts was found in
this checkout. This is bounded source inspection, not proof framework/deployment
instrumentation can never log a URL. Native HTTP/Agent debug output can include request
options; Node source has debug hooks. Future provider activation must fail if native
NODE_DEBUG/NODE_DEBUG_NATIVE is enabled, insecure TLS is requested or unreviewed
outbound instrumentation would observe raw URLs/headers. Do not mutate global env.
Explicit bundled CA and dedicated direct connector prevent ambient trust/proxy
inheritance; production deployment must verify no tracing wrapper intercepts raw input.

Safe event projection: provider enum, internal operation UUID, fixed request/endpoint
policy key, normalized safe result/stage, safe HTTP integer status 100..599 where
present, elapsed ms and saturating byte counts. Hostname/path/query are **OMITTED**
for both URL classes; endpoint key is sufficient. External provider IDs omitted by
default; if separately approved, validate exact grammar/<=256 bytes, never truncate.
Error/diagnostic strings are closed symbols, not arbitrary strings matching a length.
Unknown object properties are discarded without invoking getters or serializing an
Error/cause/stack; no raw fallback. Apply 2048-byte record cap, drop optional metrics
if needed, preserve minimal fixed classification, never spill oversized data.
Operational metrics are not audit evidence. Audit keeps meaningful coordinator
intent/state/observation and safe IDs/time, never transport raw details. Existing
transactional audit discipline unchanged. Audit failure after possible remote effect
still preserves UNKNOWN. Synthetic secret tests must cover framework/test/native
error paths before implementation is accepted.

Freeze an immutable server-owned policy profile: provider, capability/version ref,
request purpose, endpoint class/key, exact reviewed authority/path/query/method,
credential audience, body class, response/error class, exact schemas, timeout class,
redirect DENIED, compression IDENTITY_ONLY, and compatible operation binding.
No arbitrary caller/environment overrides, extra headers, URLs, numeric increases or
profile mutation. Shared code owns HTTPS/address/peer/TLS/redirect/byte/error invariants;
adapter/registry owns official hosts/upload rules/schema/version/scopes and final
provider-state semantics. An unconfigured provider profile cannot issue a request
handle, so shared implementation can be tested without enabling a real provider.
No profiles invented for Meta or other providers in this design.

## C2.10 Required security policy table

Detailed exact numeric definitions and min/max are in C2.5. Configurable NO means
no caller/environment override; provider facts remain separately reviewed profiles.

| Policy | Decision | Rationale | Numeric value if any | Configurable | Implementation primitive | Test requirement | Remaining unknown |
|---|---|---|---|---|---|---|---|
| HTTPS | Required, static/issued classes separate | Protect identity and credentials | Port 443 | NO | URL parser + profile | Scheme/port/authority attacks | Provider host profiles |
| Redirects | DENIED both classes | Prevent replay/audience leaks | 0 hops | NO | Native request without follow | 3xx never follows/leaks Location | Provider compatibility |
| Proxy inheritance | DISABLED | No silent destination bypass | None | NO | Private direct Agent/socket, empty proxyEnv | All ambient proxy forms ignored | Hostinger direct egress |
| DNS validation | Check entire bounded A/AAAA set | Reject private/rebound input | 16 answers, 3000 ms | NO | Native Resolver + BlockList | Mixed unsafe and changed DNS | Provider address compatibility |
| Actual connection | Bind one numeric target, peer check before HTTP | Prevent validation/connect TOCTOU | One socket, no fallback | NO | net.connect + async Agent callback + TLS | Wrong peer gets zero HTTP | Deployment routing |
| Private IP rejection | Conservative frozen ranges | Fail closed, no provider exception | C2.2 CIDRs | NO | Native BlockList/SocketAddress | IPv4/IPv6/mapped/special edges | Future registry/policy review |
| TLS verification | Chain + original-host check, bundled roots | Prevent MITM/insecure inheritance | TLS >=1.2 | NO | tls.connect/checkServerIdentity | Wrong cert/name, no HTTP release | Hosting TLS support |
| Response compression | identity requested, compressed rejected | No decompression bomb/parser expansion | No decompressor | NO | Native HTTPS raw response | gzip/br/deflate never reaches JSON | Provider identity support |
| Response byte bounds | Class-specific actual-byte caps | Bounded metadata/parser memory | 16/32/64 KiB | NO | Stream accounting + cancellation | Oversize/missing/chunked/dishonest length | Provider payload fit |
| Error body bounds | Smaller cap, no raw retention | Prevent HTML/body leakage | 16 KiB | NO | Bounded error classifier/mapper | HTML/plain/JSON never reflected | Specific error mappings |
| JSON parsing | Fatal UTF-8/duplicate rejection + iterative structure + strict schema | Prevent ambiguity/prototype/domain poisoning | Depth16, nodes2048; C2.5 | NO | Existing decoder, native JSON, bounded traversal/Zod | Duplicate escaped keys, malformed/oversize/deep | Provider schemas |
| Structured request bounds | Serialize/check before send | Finite metadata body | 32 KiB | NO | Private UTF-8 buffer | Oversize blocks send | Exact fields/options |
| Media byte accounting | Exact approved extent; framing separate | No silent over/short read | 32 MiB +64 KiB framing | NO | Opaque capture + metered stream | Short/over-read/abort/invalid range | Provider framing |
| Media integrity | Capture/hash before any remote action; private stream | Eliminate mutable-source TOCTOU | Aggregate32 MiB, chunk64 KiB | NO | Existing guarded open + SHA-256 + private memory | Source mutation cannot change sent bytes | Hosting memory capacity |
| Connection timeout | Separate DNS/TCP budgets | Bound pre-send work | 3000 ms each | NO | Timers/abort + resolver/socket cleanup | Stalled resolver/connect | Operational fit |
| Response timeout | Header and body idle bounded | Avoid indefinite waiting | 5000 /2000 ms | NO | Native events + monotonic deadlines | Header/body stall | Operational fit |
| Upload idle timeout | Progress-based | Bound stalled upload resources | 5000 ms | NO | Writable/drain progress + abort | Zero progress triggers abort/UNKNOWN | Operational fit |
| Total request lifetime | Small/status/media classes, clipped parents | No deadline renewal | 10000/10000/30000 ms | NO | Monotonic parent budget | Late result/step reset cannot extend | Provider duration fit |
| Logging limits | Closed projections, sensitive values omitted | No truncated-secret logging | IDs256, labels64, errors32, record2048 bytes | NO | Safe field constructors | Nested secret sentinels absent | Hosting/framework sinks |
| Capability retention | Denied persistence; ephemeral bounded only | No new secret store/session schema | <=30000 ms and earlier expiry | NO | Opaque process-local handle/finally | Expired/rotated/other operation denied | Provider TTL/durable needs |

## C2.11 Required runtime capability table

API support is verified by installed declarations/local runtime/source inspection;
behavioral guarantees must still pass the future implementation tests. No implementation
or test proof is claimed now. Existing dependency column means reuse is available,
not that a transitive package becomes a supported direct dependency.

| Requirement | Node native support | Existing dependency support | New dependency needed | Confidence | Blocker |
|---|---|---|---|---|---|
| Custom DNS lookup/resolution | Resolver A/AAAA/cancel; net lookup hook | Not needed | NO | High API support | Future deterministic correctness tests |
| Connection destination enforcement | Numeric net.connect, remoteAddress/family/port, async Agent hook | Not needed | NO | High support; assembly untested | Must prove no HTTP before callback/peer/TLS validation |
| TLS verification | tls.connect/checkServerIdentity/bundled roots/SNI | Not needed | NO | High | Deployment trust/routing tests |
| Redirect denial | https.request returns 3xx, no automatic follow | Not needed | NO | High | Future zero-follow tests |
| Streaming upload | ClientRequest Writable + stream backpressure/abort | Not needed | NO | High | Bounded capture/framing integration tests |
| Streaming response bounds | IncomingMessage readable + strict framing/header cap | Not needed | NO | High | Short/extra/chunked/native parser tests |
| Decompression bounds | No automatic decompression in selected native path; reject nonidentity | Not needed | NO | High for chosen restricted policy | Compressed input denial tests |
| AbortSignal/timeouts | AbortSignal/timers, request/socket destroy, Resolver.cancel | Not needed | NO | High | Timers must enforce destruction; late-event cleanup tests |
| Safe URL parsing | WHATWG URL + net.isIP/BlockList/SocketAddress | Existing strict validation patterns | NO | High primitives; policy composition untested | Adversarial normalization/CIDR tests |

No new dependency is currently justified; no fragile custom DNS/TLS/HTTP/JSON protocol
parser is proposed. Thin policy orchestration/byte accounting still needs careful
implementation/tests. If supported native APIs cannot satisfy this contract in coding,
STOP with exact evidence; do not add a library or downgrade requirements automatically.

## C2.12 Deterministic future implementation test contract

No tests are created or run in this cycle. Future implementation MUST pass these
bounded cases with synthetic data, fake clocks/resolver and isolated local TLS/HTTP
fixtures only, no real provider network, sleeps, retries or public-DNS dependency.
Test-only root/address injection must be constructor-only and unavailable in production;
production policy denial itself must be tested unmodified. Local test success may
exercise an isolated test connector profile, never imply loopback provider allowance.

| Area | Required cases / evidence |
|---|---|
| URL syntax | Non-HTTPS/userinfo/empty @/fragment/non443/0443/percent authority/backslash/controls/trailing dot/Unicode/xn--/integer-hex-octal-IP/single-local-label all rejected before lookup; case/default443 canonical accepted only matching profile |
| Address policy | Every frozen CIDR boundary and adjacent allowed candidate; IPv4/IPv6 local/multicast/CGNAT/translated/mapped/special forms; no regex or numeric alias bypass |
| DNS/peer | Mixed public/private answers, too many, failed AAAA, rebinding between preflight and hypothetical second lookup, wrong connected peer/family/port, late resolver callback; no HTTP reaches rejected peer, exactly one selected dial |
| TLS/proxy | Valid test chain/name vs wrong/expired/untrusted/name mismatch; original SNI after numeric dial; no header before validated callback; all proxy env/runtime variants cannot route this client; custom-CA/insecure/debug mode fails activation |
| Redirect/audience | 301/302/303/307/308 never follow/replay; signed Location omitted; wrong provider/workspace/connection/version/credential audience denied; upload never inherits bearer/header bag |
| Response framing | Oversized Content-Length, missing length, valid chunked, oversized chunks, truncated/dishonest length, conflicting framing, extra response bytes, header bytes/count overflow; all bounded and safe |
| Compression/content | gzip/br/deflate bomb rejected without decompression; unexpected/HTML/plain success/error types never enter logs or JSON; empty response only explicitly allowed profile |
| JSON | Invalid UTF-8/JSON, top-level mismatch, exact/escaped duplicate keys, prototype keys, depth/nodes/member/array/string boundary, unsafe ID integer; strict schema prevents unknown fields entering DTO |
| Request/media | Structured body boundary before send; exact captured approved hash; short read, over-read, disappearing source, hash mismatch, concurrent source mutation, unauthorized range, framing overflow; no alternate asset selection |
| Integrity/cleanup | Mutate original after verified capture: emitted bytes still approved; no writable buffer alias exposed; capture/memory admission/hold expiry; release/overwrite buffers, readers/socket/timers/listeners on every outcome |
| Exposure/deadlines | URL/DNS/TCP/TLS/pre-handoff reset prove no HTTP; reset partial/full body/response timeout/2xx parse error preserve UNKNOWN; operation-level prior effect not erased by a later local no-send; no automatic second request |
| Authorization/references | Rotate N->N+1 even same destination/scopes denied; reconnect/revoke/expire/change scopes denied at every step; local history still readable by authorized actor; cross-workspace/provider reference rejected |
| Reference recovery | UNKNOWN null latest IDs recover compatible earlier proven typed ID within <=100 events; conflict/missing/role confusion yields no lookup; CAS rejects stale observation; never upload/init/finalize from status |
| Observability | Synthetic password/bearer/API key/OAuth code/state/cookie/session/PKCE/refresh/database URL/capability URL in errors/headers/body/nested cause never appears in log/audit/browser/test report; strict caps, no getters/raw fallback |

Test fixtures must prove no owned residue/open listener/socket/timer after pass or
expected denial. No real credentials. Every later actual validation failure follows
its separately authorized stop policy, not an invitation to weaken this contract.

## C2.13 Scope inventory, schema and readiness

MUST IMPLEMENT IN FUTURE 9A (only after separate authorization): immutable unconfigured-
by-default policy registry/handles; canonical URL/address checks; dedicated direct
native connector and TLS/audience enforcement; one-attempt bounded request/response;
strict existing decoder + structural validation; private verified capture/byte
accounting; safe error/log projections; typed reference/history-preservation and
conservative auth-version checks; read-only observation/CAS integration interfaces;
deterministic synthetic tests above. Do not perform unrelated auth/AI refactors.

MUST REMAIN PROVIDER-SPECIFIC: official authorities/endpoints/upload-host rules,
scopes/role/creator/token semantics, response schemas/final-state predicates, versions,
framing/chunks/init/resume/finalization and product options/consent/hashtag mapping.
No generic token refresh, upload protocol or native-idempotency claim.
DEFER: persistent capability/session store and cross-process resume; cross-version
credential bridge; custom proxy/CA/compression/redirect exceptions; scheduling,
webhooks/polling workers, thumbnails/extra provider features and deployment verification.

Existing snapshot/event/credential fields are sufficient to express conservative
binding and safe-ID history recovery. Phase 9A schema classification:
**NO_SCHEMA_CHANGE_PROVEN**. Overall media-provider schema remains
SCHEMA_DECISION_BLOCKED for any future durable restart promise; no 0012 created.

**9A-CONTRACT-2: POLICY_RESOLVED — READY_FOR_IMPLEMENTATION** for this bounded,
stateless, deny-unconfigured shared scope, subject to separate implementation
authorization and the mandatory acceptance tests. All seven shared blockers now
have explicit testable decisions. Readiness is a design assessment, not a claim APIs
were behavior-tested, production profiles exist or deployment is verified. Contract-1
BLOCKED remains the historical result. No shared security decision is left for the
coder to invent; inability to implement these exact constraints requires a new stop.

All provider slices stay READY_FOR_DESIGN (LinkedIn text, YouTube video, TikTok video).
Unknown official endpoint/host/metadata/status/eligibility facts remain provider gates
that prevent enabling any request profile. LinkedIn text does not need media capture;
media-provider limitations and 24h sufficiency remain UNKNOWN. Hostinger remains
UNVERIFIED for direct egress/proxy independence, DNS/actual-peer/TLS control, streaming/
request deadlines, capture memory/private storage/process loss and log/instrumentation
behavior. No worker/Redis/root/Docker/systemd/permanent storage requirement introduced.
No source/test/package/environment/grant/permission/migration or runtime state changed.
STOP FOR REVIEW; no implementation or provider activity authorized.
