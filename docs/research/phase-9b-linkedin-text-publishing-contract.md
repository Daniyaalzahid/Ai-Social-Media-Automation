# Phase 9B — LinkedIn organization text-only publishing contract

Research/design only, 2026-10-21 UTC. Immutable foundation:
`d43af21425572eae38d2d59bf59c4d88a91fa012` on `main`, Phase 9A CLOSED.
This document proposes future contracts; it does not register a profile, authorize
implementation, establish LinkedIn app eligibility, or enable a provider.

**Readiness: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.**
**Schema: NO_SCHEMA_CHANGE_REQUIRED** for the bounded design below.
**Permissions: NO_NEW_APPLICATION_PERMISSION_REQUIRED.**

## 1. Scope and exclusions

One LinkedIn organization, organic text-only post, PUBLIC visibility, MAIN_FEED,
from an existing immutable approved LinkedIn variant, selected authorized destination,
explicit human publication and purpose-bound recent-auth. Reuse Phase 8 snapshots,
unique operations/claims/events and Phase 9A secure transport. No direct HTTP bypass.

Exclude member/personal posting; images, video, documents, articles, carousels,
multi-image, polls, celebrations and reshares; sponsored/dark/targeted posts;
comments, likes/reactions, edits/deletes, analytics, scheduling, publish-time AI,
URL pull, uploads/resumable sessions, other providers, and a generic SDK/client.
No new settings dashboard, worker, cron, Docker, Redis or deployment requirement.
The future capability must reject unsupported inputs, not silently drop their fields.
All production provider registries remain empty in this research phase.

## 2. Evidence method and classifications

`VERIFIED_OFFICIAL` requires successful retrieval and validation of current official
documentation in this environment. `EXTERNAL_OFFICIAL_EVIDENCE` means claims supplied
in the user's Phase 9B request, not independently retrieved here. `UNVERIFIED` means
no sufficient exact contract. `CONFLICTING_OFFICIAL_EVIDENCE` requires an actual
identified conflict; different possible role lists alone do not prove one.
Repository observations are separately identified as baseline facts, not official
LinkedIn evidence. Design decisions/project limits are not provider claims.

Public documentation retrieval only was attempted, without credentials or provider
API traffic. Six Microsoft Learn URLs below failed through urllib (URLError).
A bounded curl check of the Posts page exited 56, HTTP status 000, proxy CONNECT
denied, with no document body. No page was retrieved, no current version/lifecycle
was validated, and no supplied claim is upgraded to VERIFIED_OFFICIAL. This is an
environment retrieval limitation, not evidence that the API or documentation is absent.

| ID | Official documentation URL / purpose | Retrieval | Contract classification |
| --- | --- | --- | --- |
| L1 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | Failed; no body | Supplied POST/text/header/request/201-ID claims: EXTERNAL_OFFICIAL_EVIDENCE |
| L2 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations | Failed; no body; exact canonical page not confirmed | Permission-based guidance/action supplied: EXTERNAL_OFFICIAL_EVIDENCE; exact wire contract: UNVERIFIED |
| L3 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control | Failed; no body | Current organizationAcls support, scopes and semantics: UNVERIFIED |
| L4 | https://learn.microsoft.com/en-us/linkedin/marketing/versioning | Failed; no body | Version header and sunset concept: EXTERNAL_OFFICIAL_EVIDENCE; supported production value/sunset: UNVERIFIED |
| L5 | https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens | Failed; no body | Actual grant eligibility, refresh requirements and rotation: UNVERIFIED |
| L6 | https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits | Failed; no body | Operation quota/reset/error/retry contract: UNVERIFIED |

Additional classifications: native idempotency support, publication visibility proof,
error schemas/non-creation guarantees, exact post-ID grammar, commentary formatting
semantics/provider limit and authorization-preflight scopes are UNVERIFIED. No
specific role-list contradiction was independently verified. The supplied warning
about role-list variation is retained; ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER
and CONTENT_ADMIN are examples only, never an application allowlist.

## 3. Repository reconciliation at the immutable commit

| Baseline path / symbol | Proven current behavior | Consequence for future slice |
| --- | --- | --- |
| `src/server/social/provider.ts`: SocialProvider, grantSchema, destinationSchema | Grant metadata, encrypted access/optional refresh integration; LINKEDIN_ORGANIZATION kind; productionProviders returns empty map | Storage shape exists, but a real LinkedIn OAuth/discovery adapter does not |
| `src/server/social/schema.ts`, migration 0010 | Authorizations, subjects, versions, expiry/scopes, optional refresh lease/expiry; destinations/selected ID; encrypted credential envelopes | No new connection table demonstrated necessary |
| `src/server/social/service.ts`: mutate/select, store/load, refresh | Step-up-bound selection; version increment and AAD re-encryption; credential load is private to service; guarded refresh hook | No public publishing credential reader already exists; do not bypass it via client data |
| `src/server/publishing/service.ts`: resolve/publish/append | Exact latest approved revision/decision, fresh confirmation, bound proof, frozen snapshot/hash, uniqueness, claimed dispatch and append-only outcomes | Preserve admission and transaction boundaries; do not initiate a second operation for ambiguous outcome |
| `src/server/publishing/provider.ts` | PublishingProvider.mode is only test; production map empty | A reviewed production seam must be separately authorized; not adapter-only registration |
| `src/server/publishing/service.ts`: createPublishingService | Rejects any registered provider outside test environment | Explicit narrow integration change is required, not a cast around this gate |
| `src/server/provider-security/transport.ts` | Secure profile factory; production factory profiles empty; fixed outbound headers; JSON-body success results only | LinkedIn headers/header-ID success are not currently expressible; see section 10 |
| `src/features/ai/model.ts`: LINKEDIN variant | caption plus separate hashtags; caption <=3000 Unicode code points, <=5 tags | No existing canonical commentary-plus-tags field; do not append after approval |
| `src/server/publishing/schema.ts`, migration 0011 | Content/options snapshots, destination/version/capability refs, bounded safe remote IDs and states | Existing persistence fits this text-only design |
| `src/server/publishing/web.ts`, `src/server/social/web.ts` | Production-facing factories consume empty registries | No current real provider route is enabled |

No database credentials, encrypted envelopes, actual tokens or account destination
values were read. Counts/identity of live connected accounts are not established.
The design must not pretend an operational approved LinkedIn connection exists merely
because its schema exists.

## 4. Endpoint, headers and pinned version

Proposed static endpoint: `POST https://api.linkedin.com/rest/posts` (L1 supplied
EXTERNAL_OFFICIAL_EVIDENCE). Fixed authority `api.linkedin.com`, HTTPS, port 443,
exact path `/rest/posts`, no redirects or alternate authorities. No URL may come
from content, browser input, a database arbitrary URL, response Location or redirect.
No native idempotency header is assumed.

| Header | Contract / source |
| --- | --- |
| Authorization | Bearer access token supplied only by bound encrypted credential reader; L1 EXTERNAL_OFFICIAL_EVIDENCE; never user-supplied header |
| Content-Type | application/json; L1 EXTERNAL_OFFICIAL_EVIDENCE |
| X-Restli-Protocol-Version | literal 2.0.0; L1 EXTERNAL_OFFICIAL_EVIDENCE |
| Linkedin-Version | one explicitly reviewed supported YYYYMM; header requirement EXTERNAL_OFFICIAL_EVIDENCE, actual production value UNVERIFIED |
| Accept / Accept-Encoding / connection | Existing Phase 9A policy: JSON as applicable, identity encoding, close; never ambient proxy configuration |

Recommend a server-owned reviewed LinkedIn profile/code constant containing the
version and its evidence/sunset record, not a new environment variable, user option,
post field, database URL or dynamic latest selector. Syntax validation alone (six
digits and a valid calendar month) is insufficient: membership in an approved,
currently supported version set is required. No concrete version is selected here.
Do not use the current calendar month, an old documentation example or latest.
A deliberate version change requires application/config review, official evidence,
fixtures and a new capabilityRef/profile revision. Bind version/profile revision to
the immutable intent through capabilityRef; never change a profile in place beneath
an admitted attempt. Sunset must disable new admission rather than silently fall back.
Unresolved/expired version means zero dispatches. No timer/automatic upgrade worker.

## 5. Application and organization authorization

Application layer: retain content.publish (Owner/Marketing Admin YES;
Creator/Reviewer/Viewer NO), content.read/integrations.read and existing recent-auth
and ownership checks. No linkedin.publish permission. External Page authorization
is additional; an application Owner is not automatically a LinkedIn administrator.

Posting scope `w_organization_social` is EXTERNAL_OFFICIAL_EVIDENCE for POST. Whether
it is sufficient for the app/product tier and narrow operation is not independently
verified. Do not add member-posting/read/admin scopes speculatively.

**Organization authorization preflight: BLOCKED_BY_OFFICIAL_CONTRACT.**

| Required item | Current evidence / unresolved contract |
| --- | --- |
| Resource | /organizationAuthorizations supplied concept; candidate REST authority/path must be verified, no request constructed |
| Action | ORGANIC_SHARE_CREATE supplied conceptual permission; exact encoding/enum/query semantics UNVERIFIED |
| Required scope/product access | UNVERIFIED; do not assume posting scope grants authorization-read access |
| Request method/finder/parameters | UNVERIFIED; no guessed q/member/organization/action query |
| Member binding | Must be the token's LinkedIn member/subject, not the application's connected_by user UUID; exact identity representation UNVERIFIED |
| Organization binding | Exact validated selected organization; no other organization/member result accepted |
| Response | Exact allow/deny fields, missing entries, batching, pagination and staleness UNVERIFIED |
| Headers/version | Must verify for this endpoint independently, not infer every Posts requirement applies identically |
| Mandatory according to LinkedIn | UNVERIFIED; project proposes fail-closed fresh action authorization before publishing |
| organizationAcls fallback | Current support/permissions/roles UNVERIFIED; not a guessed role-list substitute |

Future timing proposal: validate destination authority when connecting/selecting,
and revalidate immediately before each post creation using the verified action
contract, same member/token/organization/version and operation budget. Do not persist
an allow result as long-lived authority. Do not hold a DB transaction across remote
preflight. Re-read local lifecycle/version/selection and actor authorization after
preflight, immediately before credential release/send. Remote authorization can
still change after preflight: the provider must enforce the POST permission; never
claim the preflight atomically prevents all remote revocation races.
If current official evidence establishes equivalent authoritative POST-time checking
and a narrower safe alternative, review that alternative before changing this policy.
Preflight denial/unavailability means no POST. This is a project security gate, not
a claim that a separate remote preflight is officially mandatory.

## 6. Destination and token model

Persisted destination is the grant adapter's `metadata.destinations[].remoteId`,
stored verbatim in social_destinations.remote_id (varchar 200), kind
LINKEDIN_ORGANIZATION. Current generic validation admits digits or colon-containing
URN-shaped IDs; it does not enforce a LinkedIn numeric grammar. No actual stored
remote ID format was inferred from fixtures or inspected account data.

Recommend canonical numeric decimal organization ID, derived only from verified
discovery/authorization results. Proposed project grammar `[1-9][0-9]{0,19}` with
ASCII-only full-string matching; the 20-digit ceiling is a project admission bound,
not a verified LinkedIn maximum. Preserve as a string, never a JavaScript Number.
Derive `urn:li:organization:` plus that exact ID server-side. Reject whitespace,
percent encoding, signs, alternate entity URNs, leading zeroes, query/fragment/URL.
Any existing URN-form record needs explicit reviewed canonicalization/reselection;
no automatic rewrite or database migration is authorized. A verified valid ID outside
the proposed bound is unavailable until deliberate policy review, never truncated.

Destination selection already requires integrations.manage and purpose-bound step-up,
checks active same-brand/provider authorization membership, increments authorization
version and re-encrypts credentials under that version. However Phase 8 publishing
currently admits an active destination belonging to the authorization and does not
require equality to social_authorizations.selected_id. For this narrow proposed slice,
require the selected ID to equal the publish destination at admission and send-time;
this is a future explicit integration policy, not existing behavior falsely claimed.

Structural connection capabilities present: provider and remote subject, internal
connection ID, optimistic authorization version, selected destination, encrypted
access and optional refresh, access/refresh expiry, granted scopes, safe status and
refresh lease. No arbitrary organization-permission metadata bag exists. Compute
fresh action authorization in memory; no durable cache required for the design.

**Refresh classification: REFRESH_CONTRACT_UNVERIFIED.** A currently valid, correctly
scoped, sufficiently long-lived access token can serve a one-shot operation without
refresh. Expired/near-expiry/revoked or refresh-in-progress connections fail closed;
never refresh during an already-admitted publish attempt. A later refresh/reconnect
changes version and requires new admission/confirmation. Existing optional refresh
hook is infrastructure, not a verified LinkedIn refresh protocol. App-specific refresh
eligibility, issuance/rotation and token lifetime remain unverified; no generic
framework, OAuth expansion or credential-import path is designed as a workaround.
A real LinkedIn connection adapter is absent and needs separately verified/authorized
work or an independently established existing connection before activation.

## 7. Immutable commentary, hashtags and request mapping

Proposed closed body (all provider field semantics below remain supplied evidence,
not implementation-ready validation):

| Field | Source/value | Evidence |
| --- | --- | --- |
| author | validated server-derived organization URN | EXTERNAL_OFFICIAL_EVIDENCE |
| commentary | exact approved LinkedIn caption, subject to the admission policy below | EXTERNAL_OFFICIAL_EVIDENCE for field; mapping is project design |
| visibility | PUBLIC only | EXTERNAL_OFFICIAL_EVIDENCE |
| distribution.feedDistribution | MAIN_FEED only | EXTERNAL_OFFICIAL_EVIDENCE |
| distribution.targetEntities | empty array only | EXTERNAL_OFFICIAL_EVIDENCE |
| distribution.thirdPartyDistributionChannels | empty array only | EXTERNAL_OFFICIAL_EVIDENCE |
| lifecycleState | PUBLISHED request value | EXTERNAL_OFFICIAL_EVIDENCE; not by itself proof of resulting visibility |
| isReshareDisabledByAuthor | false, fixed as supplied | EXTERNAL_OFFICIAL_EVIDENCE; exact requirement/default still needs retrieval |

Reject unknown keys, nonempty targeting/distribution arrays, any content/media/article/
reshare/sponsored field, member author, unsupported visibility/feed, and any assets.
Require a nonblank approved caption; never silently ignore attached approved media.
Fixed transport fields and body shape are bound to the reviewed capability revision.
Do not derive them from browser JSON or arbitrary snapshot options.

The baseline snapshot freezes `{caption, hashtags}` and preview shows hashtags
separately; it does NOT freeze a precomposed commentary string. Appending hashtags
at provider dispatch would therefore introduce a new content mapping. Proposed
first-slice policy avoids that mutation:
- commentary is caption verbatim, no concatenation at dispatch;
- empty hashtags is directly admissible;
- when hashtags are nonempty, require the approved caption already ends with the
  exact suffix `two LF characters + approved hashtags joined by one ASCII space`,
  in the approved order. This is a validation comparison, never a rewrite;
- otherwise reject before dispatch and ask for an ordinary edited/reapproved revision
  containing the exact intended text. Never silently omit or duplicate approved tags.
The existing composer can edit caption and hashtags; no dashboard or automatic
publish-time formatter is needed. This is a proposed explicit product admission rule,
not a claim that existing approved revisions already satisfy it.

Project commentary admission: <=3000 Unicode scalar values (existing repository
limit) AND <=12000 UTF-8 bytes, plus the complete serialized JSON request <=32768
bytes. These are PROJECT limits, not verified LinkedIn limits. Provider maximum,
character counting and special commentary/little-text/mention escaping semantics
remain UNVERIFIED and block activation. If provider syntax requires text escaping
beyond JSON string encoding, approve those exact intended provider semantics before
publication; do not silently escape/rewrite approved text during dispatch.

Use well-formed Unicode; preserve code points, approved LF newlines and permitted
tabs without normalization, trimming, smart quotes, transliteration, URL rewriting,
regenerated hashtags or truncation. Existing repository text validation rejects CR
and invalid/control text; do not normalize CRLF after approval. JSON encode once
and measure the actual UTF-8 body; JSON escaping is representation, not text editing.
Snapshot hash/capabilityRef and exact text must match again before dispatch.

## 8. Success parser, safe post ID and state mapping

L1 supplied evidence: exact HTTP 201 plus x-restli-id carrying a created post ID.
Do not look for an ID in JSON, accept arbitrary 2xx, follow Location, infer an ID from
commentary, or accept missing/malformed/duplicate/coalesced header values.

Proposed parser: obtain exactly one case-insensitive x-restli-id occurrence from
bounded headers; no comma-joined duplicates. Require a string, ASCII, <=256 bytes,
no whitespace/control characters, URL, percent decoding, query, fragment or coercion.
Provisional full-string project allowlist:
`urn:li:(share|ugcPost):[1-9][0-9]{0,19}`.
Exact entity casing, accepted namespaces, ID grammar and bounds must be verified
for the selected version. This is a conservative project admission grammar, not an
independently verified complete LinkedIn identifier grammar. A valid provider ID
outside it after possible creation leads to UNKNOWN, never truncation or redispatch.

These bounded URNs fit Phase 9A SAFE_PROVIDER_ID / CONTENT reference and Phase 8
varbinary(256) event storage. Reuse providerReference binding, never treat an upload
session/capability URL or authorization-version reference as a post ID. No raw headers
or body persisted; only the validated ID enters existing remote_publication_id.

**Provisional 201 + valid ID mapping: ACCEPTED**, publicationId=validated URN,
processingId=null, publishedAt absent. Evidence establishes creation, not independently
verified public visibility/readiness or publication time. Do not use the request's
PUBLISHED field or current clock to manufacture provider publication proof.
ACCEPTED is the existing conservative state; PROCESSING is used only if an actual
verified provider observation requires it. A later PUBLISHED transition requires
verified publication semantics and a defensible timestamp. Whether 201 alone supplies
that proof or a read-only lookup is necessary is UNVERIFIED. No guessed lookup,
additional read scope, automatic polling worker or status endpoint is authorized.
Until resolved, claim only accepted creation, not synchronous completed publication;
this unresolved product/state contract blocks implementation readiness.

Response body presence/type/empty-body semantics need official confirmation. Proposed
header-based create response handling must allow a verified empty-body variant and
strictly bound any permitted body, rejecting unsupported encoding/format. Do not
force JSON decoding of an empty response, nor assume arbitrary HTML is acceptable.
Any body that is used must retain fatal UTF-8, duplicate-key rejection and limits.

## 9. Idempotency, HTTP outcomes and ambiguity

**Native idempotency: NO_VERIFIED_NATIVE_IDEMPOTENCY.** No official contract establishing
a native key was retrieved or supplied. This does not assert the API has no such
feature. Do not invent an idempotency header or send the local operation ID as one.

Preserve Phase 8 unique actor/request and unique revision/destination/platform/PUBLISH
constraints, request digest and single CREATED -> DISPATCHING claim. Repeat local
requests return the same operation; a different local request ID does not authorize
resending an ambiguous operation. These controls prevent local duplicate dispatch;
they cannot deduplicate a possibly executed remote request after a lost response.

| Observation | Proposed existing-state mapping | Send/retry policy |
| --- | --- | --- |
| Invalid content, author, version/profile, destination, stale approval/local auth before any post attempt | Reject admission/no operation, or local FAILED if an admitted record needs a terminal event | Zero POSTs; user may correct/reapprove, never automatic retry |
| Authorization-preflight deny/timeout/malformed result, before POST | No POST; local FAILED/access-unavailable classification where supported | No post creation was attempted; do not record preflight traffic as an ambiguous POST |
| DNS/connect/TLS failure with operation-specific no-send proof | FAILED with bounded local transport/unavailable code | No automatic retry; no-send must actually be established |
| Transport exposure MAY_HAVE_BEEN_SENT, even before observed body write | UNKNOWN | Preserve conservative Phase 9A exposure; do not downgrade it using a guessed byte count |
| Exact 201 + strictly valid ID + verified response framing | ACCEPTED as above | Persist bound safe ID once; never send creation again |
| 201 with absent/malformed/duplicate ID, invalid/oversized/unsupported response | UNKNOWN | Creation may have happened |
| Other 2xx, redirects, informational/final-protocol anomalies | UNKNOWN after possible send | No redirect follow or success inference |
| POST 400/401/403/404/409/version/header rejection | UNKNOWN under current evidence; FAILED only if a verified provider contract proves non-creation for that exact outcome | No blanket all-4xx permanence; no retry; preflight/local auth failures remain distinguishable |
| POST 429 | UNKNOWN unless verified rejection semantics prove non-creation; bounded RATE_LIMITED label only when justified | No automatic redispatch, Retry-After loop or sleep |
| POST 500/503 or other 5xx | UNKNOWN | Server error does not prove no creation |
| Reset/response timeout after possible send | UNKNOWN | Never reconnect-and-resend |
| Lost local DB outcome write after remote create | UNKNOWN/unconfirmed outward result; preserve operation and any safely committed ID | No recreate; read-only recovery only |

Phase 9A currently marks operationPossible at secure connection readiness, earlier
than proof of HTTP body transmission; preserve this conservative policy. A separate
read-only preflight transport instance must not contaminate the POST attempt's exposure
bit; both remain bound to the same operation and clipped parent budget. Existing
Phase 8 publish catches all thrown adapter errors as UNKNOWN, so future safe no-send
FAILED mapping needs a narrow explicit integration result, not an unchecked exception
or enum cast. FAILED/code/category constraints in migration 0011 remain authoritative.

Provider error JSON/schema and quotas are not verified: retain generic bounded safe
classifications, not arbitrary provider message/code extraction. Phase 9A bounds error
bodies at 16 KiB; retain response/header/depth/time bounds and never persist body text.
HTTP status is safe metadata only when actually observed and safely carried by the
transport. Numeric LinkedIn quotas: **UNVERIFIED_PROVIDER_QUOTA**. Existing human
confirmation, uniqueness, connection lifecycle and local admission controls still
apply; they are not a claim of a verified provider quota or a newly implemented
publish-rate limiter.

## 10. Phase 9A reuse and explicit compatibility blockers

Reuse checkedURL, static authority/path policy, secureAgent, HTTPS/443, redirect denial,
proxy isolation, bounded DNS, selected peer enforcement before HTTP, original-host
TLS/SNI >=1.2, credential audience/binding, Budget and abort/deadline behavior,
structuredBody, strict JSON ingestion where applicable, safeFault/exposure and safe
reference/diagnostic primitives. Text-only uses binding.media=false, no media broker,
capability issuance or media hold. The unrelated 32 MiB media project limit is unchanged.

The frozen transport is NOT sufficient as-is for L1:
1. ReviewedProfile has version metadata, but request() never emits Linkedin-Version
   or X-Restli-Protocol-Version and has no bounded static-header seam.
2. SafeTransportResult returns status/data/capability, not selected response headers;
   x-restli-id is discarded, so an adapter cannot parse it afterward.
3. Every success must have application/json and pass ingestJson; empty/header-only
   success cannot be represented by the current response classes.
4. HTTP >=400 is converted to NETWORK_AMBIGUOUS without exposing safe observed status;
   a richer narrow status classification needs an explicit safe transport result.
5. ProviderIntent lacks snapshot/authorization/destination internal binding fields
   required by Phase 9A Binding. Snapshot persistence has them, but the current
   provider call argument alone cannot reconstruct trusted authority.
6. Private social-service credential loading and empty/test-only provider registries
   require a reviewed server-side bridge. No existing production LinkedIn adapter
   can be assumed or enabled just by adding a profile.

Propose separately reviewed minimal contract deltas within the existing transport:
closed server-owned LinkedIn protocol/version headers (no caller arbitrary headers),
a bounded safe header-result mode with duplicate detection and x-restli-id parsing,
verified empty-response handling, and safe status metadata/error classification.
Keep all network, DNS, JSON, deadline and redaction infrastructure central. No fetch,
axios, second Agent, generic client, second parser or parallel SSRF layer. These are
future changes to closed Phase 9A primitives and require explicit authorization;
this document does not silently weaken or modify Phase 9A.

The connection bridge must load exact encrypted access under existing AES-GCM/AAD,
authorization/version/purpose binding, verify status/scopes/expiry/selection/member
and actor authority from trusted snapshot/DB state, and issue a short-lived audience
bound CredentialGrant (<=30 seconds, clipped to actual token/parent expiry). Do not
replace token expiry with 30 seconds or expose the credential to a browser. Reuse
existing guards/lock order in short transactions; remote work occurs outside locks.
No generic refresh service or new credential persistence purpose.

## 11. Persistence, audit and logging decisions

**NO_SCHEMA_CHANGE_REQUIRED** for this design. Migration 0010 already holds connection,
destination, subject, scopes/version and encrypted credentials. Migration 0011 holds
immutable content/options, authorization_version/destination/capability bindings,
unique operation identity, seven states, safe error classifications and 256-byte IDs.
Authorization preflight can be transient; no persistent capability/session required
for text-only. No 0012 proposal. Reopen schema decision only if verified later contracts
prove additional necessary durable data, not to compensate for missing interface seams.

**NO_NEW_APPLICATION_PERMISSION_REQUIRED**: retain 32 and content.publish role matrix.
No DB/schema/runtime-grant changes are justified by this documentation.

Reuse publish_events and publish.* audit transitions (initiated, dispatching,
accepted/published, failed, unknown), not another event store. Current audit metadata
contains reasonCode and record UUID in changedFields; do not claim it already stores
HTTP status or provider-specific payload. Safe provider IDs belong in existing bounded
event columns. If future safe status diagnostics are useful, use closed in-memory
structured diagnostic fields or a separately reviewed safe metadata extension, not
arbitrary JSON persistence or new schema. Do not emit an unrecorded PUBLISHED event.

Allow only static linkedin/organization_text_post labels, internal attempt/connection
IDs, validated safe post ID where needed, observed status, closed error category and
bounded durations/counts. Prefer internal destination ID to logging organization IDs;
no need to log member identity. Never log tokens, authorization/cookies, full URLs with
query data, capability/session references, commentary/full request, raw response/error
body, HTML, encrypted envelopes, or provider request echo. Approved content remains
in its existing authorized immutable snapshot, not duplicated into logs/audit.

## 12. Proposed minimal profile and future change surface

Profile design only: provider LINKEDIN; one ORGANIZATION / ORGANIC / TEXT / PUBLIC /
MAIN_FEED capability, POST static /rest/posts, structured request, bound audience and
required verified scope set, explicit pinned supported version and revisioned ref.
No media, article, reshare, sponsored, targeting, member post, editing/deleting,
comments/reactions or analytics entry. Authorization preflight would be a separate
read-only verified static profile only after its exact action contract is recovered.
Production factory remains empty until separate enablement authorization.

| Proposed future path | Narrow responsibility; not created/changed here |
| --- | --- |
| `src/server/publishing/linkedin-text.ts` (new) | One provider's reviewed profile, strict body mapper, ID parser and result/ambiguity mapping; no network stack |
| `src/server/provider-security/transport.ts` | Explicitly authorized minimal static-header/safe-response-header/status seam, not arbitrary headers |
| `src/server/provider-security/response.ts` | Closed verified response-class addition only if needed; preserve strict JSON parser reuse |
| `src/server/social/service.ts` | Narrow trusted credential/authority bridge reusing crypto and existing locks; no generic refresh redesign |
| `src/server/publishing/provider.ts` | Reviewed production provider interface/registration boundary; retain test-only protections elsewhere |
| `src/server/publishing/service.ts` | Trusted snapshot Binding bridge, LinkedIn selection policy and safe explicit no-send outcome mapping; preserve claims/recent-auth/uniqueness |
| `src/server/publishing/web.ts` | Explicit opt-in wiring only after verification; keep disabled default |
| `tests/unit/linkedin-text.test.ts` (new) | Pure profile/body/ID/state mapping fixtures |
| existing provider-security transport tests | Local fake TLS/header/empty-response/status/security-delta regressions |
| `tests/database/publishing.test.ts` (existing) | Snapshot/version/destination/claim/event safety integration; exact file exists in baseline |

No provider folder hierarchy/SDK framework is needed for one operation. Exact final
file grouping is subject to a separately authorized implementation plan. The absent
real LinkedIn OAuth/discovery adapter is an upstream activation blocker, not permission
to create it in these files. Reuse Connections UI; no browser/UI expansion unless a
concrete approved-copy/destination display gap is demonstrated.

Future order: recover security-critical official evidence and pin the version;
freeze one profile/body/ID contract and separately approve the transport delta;
write strict mapping/parser tests; implement the minimal shared transport response/
header seam and credential bridge under explicit authorization; implement fresh action
preflight; integrate one adapter with Phase 8 claims/events; exercise local fake and
DB tests; change UI only for an actual demonstrated gap; run the separately approved
complete gate. Production registration/real provider verification remain disabled
until explicit later authorization. Do not implement merely because design is complete.

## 13. Future deterministic fake-provider matrix

Design fixtures only, reserved test authorities and generated synthetic credentials;
no real keys, remote API calls or scanner exemptions. Preserve assertions for zero
DNS/HTTP when local rejection is expected and exactly one POST when dispatch occurs.

| Case | Required outcome/assertion |
| --- | --- |
| 201 + one valid share/ugcPost ID | ACCEPTED with exact safe bound ID; no fabricated publishedAt; one creation |
| 201 missing/malformed/oversized/duplicate/comma-joined ID | UNKNOWN; no body-ID fallback or redispatch |
| Unexpected 200/202/204 or unsupported response body/type | UNKNOWN unless separately verified narrower semantics; no all-2xx success |
| POST 400, 401, 403, 404, 409 | Closed generic/UNKNOWN under current contract; distinct preflight denial prevents POST |
| POST 429 | No automatic retry/sleep; no assumption of non-creation |
| POST 500, 503 | UNKNOWN; no redispatch |
| Malformed JSON/error body, duplicate keys, fatal UTF-8 | Bounded safe failure, zero raw content in logs; UNKNOWN after possible send |
| Oversized body/header/error body, compression, wrong content type | Existing limits maintained; no unbounded reads; UNKNOWN after possible send |
| Reset before DNS/connect/TLS no-send proof | Explicit safe no-send classification; no automatic retry |
| Reset/response timeout after possible send | UNKNOWN even if subsequent call would appear likely to succeed |
| Redirect | Reject without contacting redirected authority; no token forwarding |
| Fresh action authorization denied/revoked/malformed | No POST; no fallback to cached roles |
| Wrong organization/member/subject | No POST; response/action binding cannot authorize another destination |
| Stale connection version, refresh lease, selection change | No POST or UNKNOWN if already possibly sent; reject cross-version credential grant |
| Stale approved snapshot/hash/proof, actor RBAC revoked | No POST, no replacement copy; exact revision and purpose-bound step-up retained |
| Hashtags absent from approved caption suffix, too-large/invalid text | Reject before dispatch; no mutation, omission or truncation |
| Nonempty media/targeting/member/unsupported fields | Reject before dispatch, do not silently convert to text-only |
| Duplicate submit/concurrent claim/DB outcome-write failure | One remote create at most locally; durable UNKNOWN path and no replacement operation |
| Version absent/latest/unsupported/sunset or attacker headers/URL | No dispatch; exact trusted reviewed header values only |
| Valid no-body response after contract verification | ID header parsed without inventing JSON; complete framing/limits verified |
| Safe diagnostics under hostile error/header/body content | No token, commentary, raw response, arbitrary message or capability leak |

Later manual verification would need a separately authorized dedicated test
organization/member, approved LinkedIn app/product/scopes and supported version,
explicit expected public-post side effects and cleanup plan, safe evidence capture,
and a decision on publication visibility/status proof. None is attempted here;
creating/deleting a test post, token refresh, organization query, authorization query
and LinkedIn application changes all require separate authorization.

## 14. Hostinger impact and readiness blockers

No new runtime requirement beyond Phase 9A is identified: the same server-side Node
HTTPS/DNS/TLS/crypto/database capabilities, bounded local process work and no worker
or public media endpoint. Outbound provider connectivity, TLS/SNI/peer behavior and
deployment secrets remain environment-specific. **Hostinger UNVERIFIED**; this design
and earlier local validation do not establish production compatibility.

Security-critical blockers:
1. Current official Posts/headers/request/ID/body/lifecycle/version documentation
   not independently retrievable; no supported production version pinned.
2. Organization authorization endpoint/action/query/member binding/response/scopes
   and ACL fallback semantics unverified: BLOCKED_BY_OFFICIAL_CONTRACT.
3. Header-based create response and 201 -> public PUBLISHED proof/status/timestamp
   unresolved; ACCEPTED is conservative, not verified completed publication.
4. Commentary format/provider bounds, error non-creation semantics, idempotency and
   quota contracts unverified; no guessed retry policy or numeric provider maximum.
5. The frozen shared transport lacks required header/response seams; narrowly bounded
   future deltas require explicit contract/implementation authorization.
6. Real LinkedIn connection/discovery/credential bridge and production provider gates
   are absent; token/refresh eligibility and exact identity authority are unverified.
7. Approve the proposed caption/hashtag admission rule and selected-destination policy
   before implementation; existing snapshots cannot be silently reformatted.

**Final classification: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.**
No implementation, provider profile, test, config, package, migration, permission,
credential action, real provider call, staging, commit or push is authorized here.

## 15. External official evidence recovery and reconciliation — 2026-10-21

This is the current decision record. Sections 1–14 above remain verbatim as the
**INITIAL CODEX RETRIEVAL** and discovery history; their earlier evidence labels,
provisional ACCEPTED success policy and blocker list describe that earlier state.
This **EXTERNAL OFFICIAL EVIDENCE RECOVERY** addendum supersedes conflicting current
conclusions explicitly below. No new independent documentation retrieval was performed
in this pass. Evidence was externally retrieved and supplied by the user from current
official Microsoft Learn documentation. All recovered claims below are therefore
**EXTERNAL_OFFICIAL_EVIDENCE**, not VERIFIED_OFFICIAL. Codex's earlier proxy failure
is historical and is not itself an implementation-readiness blocker.

### 15.1 Recovered source ledger

| Source | Supplied current official claims | Classification |
| --- | --- | --- |
| Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | Organic/sponsored create/retrieve; text-only organic support; replaces ugcPosts; POST /rest/posts; organization author; PUBLIC/MAIN_FEED/PUBLISHED examples; required version/protocol headers; w_organization_social; creation 201 and x-restli-id; share/ugcPost URN examples | EXTERNAL_OFFICIAL_EVIDENCE |
| Organization Authorizations: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations | Permission-based action authorization, contrasted with role-based ACLs; optional but recommended; GET/BATCH_GET/BATCH_FINDER; person/impersonator + organization + action binding; insufficient permission may return 403 | EXTERNAL_OFFICIAL_EVIDENCE |
| Getting Started: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/getting-started | Permission-oriented approach avoids tracking evolving Page roles; ORGANIC_SHARE_CREATE supported | EXTERNAL_OFFICIAL_EVIDENCE |
| Current LinkedIn Quick Start, as supplied (exact page URL not supplied in this pass) | organizationAcls remains relevant to Page discovery/access enumeration | EXTERNAL_OFFICIAL_EVIDENCE; no claim of independent retrieval |
| Refresh Tokens with OAuth 2.0: https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens | Programmatic refresh tokens available to approved Marketing Developer Platform partners; not every app receives them | EXTERNAL_OFFICIAL_EVIDENCE |
| Additional current Marketing authentication/versioning evidence supplied in this pass | Marketing APIs do not support 2-legged client-credentials OAuth; versioned /rest APIs have finite support lifetimes | EXTERNAL_OFFICIAL_EVIDENCE; no new exact supported-version value supplied |

OrganizationContentAuthorizationAction includes ORGANIC_SHARE_VIEW_AS_AUTHOR,
ORGANIC_SHARE_CREATE, ORGANIC_SHARE_EDIT, ORGANIC_SHARE_DELETE, DARK_SHARE_CREATE,
DARK_SHARE_EDIT, DARK_SHARE_DELETE and DARK_SHARE_VIEW_AS_AUTHOR. Only
ORGANIC_SHARE_CREATE is relevant to this slice; the others do not become capabilities.
Role examples are still not an authorization allowlist. The discovery/action endpoint
roles are complementary, not demonstrated conflicting official evidence.

### 15.2 Endpoint, request and permission decisions

Posting endpoint is resolved from supplied official evidence:
`POST https://api.linkedin.com/rest/posts`.

Required post headers remain:
- Authorization: Bearer access credential, injected only through the existing bound
  credential boundary; never caller/browser input.
- Content-Type: application/json, already supported for structured requests.
- X-Restli-Protocol-Version: 2.0.0, a fixed reviewed protocol value.
- Linkedin-Version: explicit supported YYYYMM from the server-owned reviewed profile.

The organization author, commentary, PUBLIC visibility, MAIN_FEED distribution and
PUBLISHED lifecycle request values are now sufficiently established for the narrow
mapper from the combined original and recovered supplied evidence. The original
fixed empty targeting/distribution arrays and isReshareDisabledByAuthor=false remain
part of that closed proposed request; this pass does not claim additional retrieved
field-default semantics beyond the supplied material. No sponsored/targeted/member/
media operation is added. Preserve the original immutable caption/hashtag admission,
Unicode/newline rules, project bounds and strict unknown-field rejection. Provider
formatting/length assumptions must not cause rewriting or silent omission.

Posting permission w_organization_social is resolved as
EXTERNAL_OFFICIAL_EVIDENCE. It covers organization posting (and broader provider
operations that this application does not expose). Do not request member publishing
permissions or add read/admin scopes just for convenience.

### 15.3 Organization authorization: policy resolved, wire contract pending

**Policy: RESOLVED.** Require an existing active member-authorized LinkedIn connection,
exact current authorization version, valid access token, granted posting scope,
selected active organization belonging to that same connection/brand, and fresh
ORGANIC_SHARE_CREATE action authorization immediately before POST. Local application
RBAC and publish-step-up remain additional requirements. The external permission
check is OPTIONAL BUT RECOMMENDED according to LinkedIn; this project's stricter
preflight requirement is a deliberate project policy, not a claim of provider mandate.
After preflight, recheck local lifecycle/selection/version and snapshot authority
before credential release/send. Provider enforcement at POST is still required to
handle a remote revocation race; a prior preflight is not an atomic permission lease.

Use organizationAcls only for discovery/access enumeration where an existing Phase 7
connection flow actually needs it. Use organizationAuthorizations for the specific
create action. Do not fall back to role guessing, stale cached roles, or a trial POST
following preflight denial. No Page-discovery implementation is added by this design.

**Exact organizationAuthorizations request implementable now: NO.**
The evidence establishes resource, operation families, action and conceptual binding,
but not a deterministic request/strict response parser. Missing wire information is:
1. Exact single-check GET resource-key/finder representation and canonical REST path
   for the selected version, including any composite-key syntax. GET/BATCH_GET/
   BATCH_FINDER support alone does not select or encode one of them.
2. Exact person versus impersonator parameter names, identity type/URN representation,
   whether the authenticated member is implicit or must be supplied, and how the
   stored token subject is bound to that value.
3. Exact organization/action key names and nesting, enum encoding and URI/Rest.li
   escaping rules; no guessed q parameter, URL concatenation or percent-encoding.
4. The least required OAuth permission/product entitlement for this read/check
   operation; posting scope must not be assumed sufficient for preflight.
5. Exact result envelope and affirmative permission field/value, with returned
   member/organization/action identity validation and deny/missing/partial/malformed
   response semantics. HTTP 200 alone is not an allow result; supplied 403 is a deny.
6. This endpoint's required headers and supported version semantics, rather than
   assuming every Posts header applies identically.
These are **POLICY_RESOLVED_WIRE_CONTRACT_PENDING** and **SECURITY_CRITICAL_UNRESOLVED**
for the adopted preflight policy, not a generic statement that docs are unavailable.
A preflight failure, 403, unparseable result or missing affirmative binding prevents
POST entirely: definite pre-dispatch FAILED, never UNKNOWN about a POST not attempted.
The remote read request has its own exposure tracking, not the create operation's bit.
No provider publication attempt is made to test permissions after preflight failure.

### 15.4 Success state: final design decision PUBLISHED

**201 + exactly one valid x-restli-id => PUBLISHED** for the admitted organization
organic text-only PUBLIC MAIN_FEED request with lifecycleState=PUBLISHED. This
supersedes section 8's provisional ACCEPTED mapping and the corresponding old fake
fixture row. Supplied official evidence calls this successful creation; no supplied
contract requires asynchronous processing for this text-only operation. Do not invent
an ACCEPTED -> PROCESSING path, polling endpoint or extra read permission merely
because the shared state machine offers those states.

Provider contract: exact 201 and a created post ID in x-restli-id. Project policy:
accept this combination as the terminal publication confirmation for this narrowly
admitted synchronous create. This does not promise perpetual public availability,
moderation immunity, propagation timing or independently measured audience visibility.
A valid ID alone or arbitrary 2xx alone is insufficient. Missing, duplicate,
malformed or inadmissible success metadata remains UNKNOWN after possible send.

The existing ProviderResult requires publishedAt. Use a trusted local response-
completion/confirmation observation timestamp meeting the existing non-future and
DB observed_at constraints; it is a PROJECT OBSERVATION TIME, not a claimed LinkedIn
creation timestamp. Never manufacture a provider-reported timestamp from a body or
use the request's intended lifecycle state as a timestamp. The future adapter/bridge
must keep this distinction explicit and validate clock constraints; unsafe/invalid
timestamp handling cannot produce a successful event. No schema change is needed.
This project timestamp decision replaces the earlier insistence on a provider timestamp
or status lookup. A separate status/visibility lookup is not required by the currently
supplied synchronous-create contract; no such endpoint is designed or called here.

Retain the full-string narrow project grammar
`urn:li:(share|ugcPost):[1-9][0-9]{0,19}` with outer ASCII maximum 256 bytes and exact
namespace case. The digit/length restrictions are PROJECT bounds; official examples
support these namespaces, not a complete universal LinkedIn Post-ID grammar or an
official maximum. Preserve string identity without numeric conversion, decoding,
trimming, URLs, other URNs or capability/session/authorization references. An actual
valid ID outside this acceptance policy after create is UNKNOWN, never truncation
or redispatch. Safe IDs fit existing event columns and bound CONTENT references.

### 15.5 Ambiguity and optional/non-blocking provider details

NO_VERIFIED_NATIVE_IDEMPOTENCY remains the correct conclusion. Existing local
attempt uniqueness and one dispatch claim are authoritative locally only. Do not
invent a key or infer remote deduplication from the local operation UUID.
Definite local/no-send failure and preflight rejection map to FAILED; possible send
without trustworthy final creation confirmation, reset after possible send, timeout,
malformed required success metadata and lost outcome persistence map to UNKNOWN.
No automatic retry or blind redispatch, including on 429 or 5xx. Preserve conservative
Phase 9A exposure; do not downgrade MAY_HAVE_BEEN_SENT by guessing body progress.

Unknown provider error schemas/non-creation guarantees are not blockers to a safe
first adapter: bounded generic classification and UNKNOWN after possible send are
sufficient without inventing guarantees. Exact numeric quota remains
UNVERIFIED_PROVIDER_QUOTA and is NON_BLOCKING_UNVERIFIED_PROVIDER_DETAIL. This does
not authorize more traffic, sleeping/retrying, or broader local admission.
Provider text limits/other URN forms are also non-blocking if this deliberately narrow
project acceptance policy fails closed without rewriting or retry. The request must
remain exact approved text; do not add formatting features requiring unverified
semantics. No new automatic provider behavior is inferred from these unknowns.

### 15.6 Token lifecycle: refresh is not required in this dispatch slice

**Valid existing access token sufficient: YES. Refresh required in Phase 9B: NO.**
Require CONNECTED/current version, selected organization, w_organization_social,
fresh action authorization and sufficient remaining token lifetime for the bounded
operation. Reject expired/near-expiry tokens before dispatch; never claim a credential's
30-second release window extends the token's actual expiry.

Programmatic refresh availability is conditional on approved Marketing Developer
Platform partner capability: EXTERNAL_OFFICIAL_EVIDENCE. Distinguish:
- A valid existing access token: narrow dispatch may proceed after all other checks.
- An approved refresh-capable connection: existing connection-lifecycle machinery may
  refresh only under separately verified/authorized provider rules; version change
  invalidates old publish admission. No refresh inside the publish attempt.
- An expired token without supported refresh: no dispatch; reconnect/reauthorize via
  the separately established connection flow, never client-credentials substitution.

Classification: **REFRESH_OPTIONAL_CONNECTION_LIFECYCLE**. Phase 7's optional refresh
method, nullable encrypted refresh token/expiry and no production refresh job do not
impose automatic refresh as a prerequisite to every valid access-token operation.
Exact refresh rotation/lifetime/app eligibility details remain unverified but are
non-blocking for this access-token-only dispatch precondition. This supersedes the
old broad REFRESH_CONTRACT_UNVERIFIED implementation blocker; it does not implement
or verify a LinkedIn refresh protocol or claim a real connection already exists.
Marketing API 2-legged client-credentials OAuth allowed: **NO**, on supplied external
official evidence. Keep the member-authorized connection model.

### 15.7 Version pin: bounded selection pending, not a guessed value

Concrete production YYYYMM selected: **NO**. Status: VERSION_PIN_SELECTION_PENDING.
The explicit server-owned supported-version/profile policy remains resolved. An exact
version is not required before coding pure mapper/parser/transport-integration logic;
therefore the special question 'must it be frozen before coding the adapter?' is
**NO**. It must be verified and frozen before the production profile is finalized,
implementation validation against that contract is declared complete, or any real
request/enablement occurs. No placeholder, current-month inference, dynamic latest,
user input or silent runtime fallback may be a dispatchable profile.

Obtain current supported-version/sunset evidence as a bounded configuration decision
immediately before the corresponding implementation/profile freeze. Verify the Posts
and authorization wire contracts against that same deliberate version choice. Changing
the value requires reviewed code/profile revision and snapshot-capability binding.
Version selection is not the only remaining external item: the action-authorization
request/scopes/affirmative response wire contract remains security-critical unresolved.
Finite lifetime is externally evidenced; a concrete support period/date is not guessed.

### 15.8 Smallest future typed transport and registration seams

These are designs, not edits to closed Phase 9A code:
- Add a closed reviewed LinkedIn-text protocol discriminator/profile extension carrying
  a pinned YYYYMM and fixed Rest.li 2.0.0. Existing transport emits only those two
  extra allowlisted header names from trusted immutable profile data; no arbitrary
  header record, caller values, CRLF, URL configuration or provider-response injection.
- Keep existing STRUCTURED Content-Type application/json and the existing
  CredentialGrant Bearer injection, with binding/audience/expiry checks. Do not invent
  a second Authorization injection path or expose credentials to the adapter caller.
- Add a closed LinkedIn-create response mode/result. Internally count duplicate raw
  x-restli-id fields and validate the bounded project URN before release; expose only
  typed metadata such as `{kind: LINKEDIN_POST_CREATED, status: 201, postId: SafeLinkedInPostId}`.
  This is conceptual schema notation, not new code. No unrestricted Headers object,
  Set-Cookie, Location, all-header map or arbitrary capability header persistence.
- Creation parsing depends on status/header, not JSON body. Permit empty or bounded
  opaque unconsumed-semantic body, drain/validate complete framing under existing
  size/deadline/encoding rules, then discard it without storing/logging. Do not require
  a JSON ID, infer body shape or interpret HTML/error echoes. Other JSON response
  classes retain fatal UTF-8/duplicate-key/depth/node checking unchanged; the new
  header-only semantics are explicit, not skipLibCheck-like error suppression.
- Carry only observed safe numeric status and closed fault metadata when needed for
  conservative errors. Missing/invalid success metadata stays UNKNOWN; no raw stderr,
  body, arbitrary provider message or header is made available as a diagnostic.
- Preserve secureAgent/peer/TLS/proxy/DNS/deadline/size/redaction behavior. Action
  preflight needs a separate read-only typed profile only once its wire contract is
  frozen. Never use a second fetch/axios/SDK/parser/SSRF stack as a workaround.

Future production registration: one explicitly reviewed LINKEDIN organization organic
text PUBLIC MAIN_FEED capability, with fixed endpoint, required posting scope, pinned
version, exact no-media mapper and safe success parser. Adapt the current test-only
PublishingProvider/service registration boundary narrowly; do not remove environment
checks globally. Trusted snapshot/connection authority and credential bridge are
REPOSITORY_IMPLEMENTATION_GAP items, not missing official documentation. Only this
reviewed identity may be admitted; META/TIKTOK/YOUTUBE/other LinkedIn capabilities,
OAuth/discovery expansion, member posting, media, edits/deletes, analytics and scheduling
remain disabled. Production maps remain EMPTY now. A valid already-established
connection is a precondition; absence of one is an operational activation prerequisite,
not authority to implement Page discovery or OAuth in this reconciliation.

### 15.9 Prior blocker disposition and current readiness

| Initial blocker/item | Reconciled disposition | Effect |
| --- | --- | --- |
| Posts endpoint/text-only/schema/header/posting scope not independently retrieved | RESOLVED_BY_EXTERNAL_OFFICIAL_EVIDENCE | No browse-only blocker; preserve provenance |
| Role lists/action endpoint policy | RESOLVED_BY_EXTERNAL_OFFICIAL_EVIDENCE | Optional-but-recommended permission model; project fresh preflight policy resolved |
| Exact organization authorization serialization/read scope/affirmative parser | POLICY_RESOLVED_WIRE_CONTRACT_PENDING; SECURITY_CRITICAL_UNRESOLVED | Deterministic secure preflight implementation remains blocked |
| ACL support/discovery versus action check | RESOLVED_BY_EXTERNAL_OFFICIAL_EVIDENCE | Complementary roles, not a contradiction; no discovery expansion |
| 201/header-ID success and state/timestamp decision | RESOLVED_BY_EXTERNAL_OFFICIAL_EVIDENCE plus explicit project policy | PUBLISHED; no invented processing/status lookup; observation timestamp defined |
| Complete provider URN universe or maximum | NON_BLOCKING_UNVERIFIED_PROVIDER_DETAIL | Narrow fail-closed project grammar remains enforceable |
| Native idempotency evidence absent | Policy resolved: NO_VERIFIED_NATIVE_IDEMPOTENCY | No blind retry; not itself a reason adapter cannot be coded |
| Concrete supported YYYYMM/sunset | VERSION_PIN_SELECTION_PENDING | Mandatory before reviewed profile freeze/enablement; not the only external pending item |
| Provider quotas/error schema/definitive error non-creation guarantees | NON_BLOCKING_UNVERIFIED_PROVIDER_DETAIL | Bounded generic/UNKNOWN behavior, no retry |
| Commentary provider maximum/advanced formatting | NON_BLOCKING_UNVERIFIED_PROVIDER_DETAIL for narrowly admitted literal text | Project bounds and no-mutation rule retained; do not add unsupported features |
| Refresh eligibility/rotation unknown | REFRESH_OPTIONAL_CONNECTION_LIFECYCLE | Valid-token dispatch need not implement refresh |
| Existing real LinkedIn connection/credential bridge/production registry | REPOSITORY_IMPLEMENTATION_GAP | Reuse model; do not pretend a working connection exists or expand OAuth scope |
| Phase 9A request/response header/empty-success seams | REPOSITORY_IMPLEMENTATION_GAP | Bounded typed design above; requires separate implementation authorization |
| Caption/hashtag and selected-destination admission | Project design retained | Exact approved text only; no runtime formatting or role bypass |
| Existing schema/application RBAC | Resolved by repository reconciliation | NO_SCHEMA_CHANGE_REQUIRED; NO_NEW_APPLICATION_PERMISSION_REQUIRED |

No migration 0012 is required for this design. Existing authorization/destination/
credential, snapshot/version, safe-ID/state/event structures remain sufficient.
Permissions stay 32, content.publish Owner/Marketing Admin YES, other three roles NO.
No new persistent permission result/refresh framework/capability session is required.
Future fake tests must replace the original 201 ACCEPTED expectation with PUBLISHED,
exercise observation timestamp bounds and typed header parsing, keep malformed-ID
UNKNOWN, and distinguish preflight 403/no POST from post-send ambiguity. The original
matrix otherwise remains relevant; no test code is changed here.

**CURRENT READINESS: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.**
The remaining decisive external blocker is deterministic organization authorization
wire/scopes/allow-response information under the chosen policy, not Codex browsing,
optional refresh or lack of numeric quotas. Version selection and concrete repository
seam implementation remain explicit subsequent work; do not call this READY while
that security-critical wire contract is missing. All five providers remain DISABLED /
UNVERIFIED, profiles 0; Hostinger UNVERIFIED with no new runtime requirement identified.
No implementation, provider/OAuth call, migration, test/config/package change,
staging, commit or push occurred. Phase 9A remains CLOSED and unchanged.

## 16. Contract-2 — organization authorization wire recovery — 2026-10-21

Scope: only the fresh ORGANIC_SHARE_CREATE authorization lookup. This append keeps
the initial discovery and external-evidence reconciliation unchanged and does not
reopen resolved Posts/text/state/idempotency/token/schema/RBAC decisions. Phase 9A
remains CLOSED at d43af21425572eae38d2d59bf59c4d88a91fa012. No provider calls,
implementation, tests, configuration, packages or migrations are changed.

### 16.1 Targeted official-source recovery and limits

Contract-2 attempted these exact official Microsoft Learn documentation resources:
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/getting-started

Both curl requests exited 56, HTTP status 000, proxy CONNECT denied, zero body bytes.
For source recovery, candidate paths under the public MicrosoftDocs/linkedin-docs
repository on raw.githubusercontent.com were checked: the same two Markdown page
paths on main and master, and master README.md. All returned HTTP 404, not a usable
specification. Repository metadata retrieval through api.github.com also failed
(URLError). These candidate source paths were discovery probes, not validated edit
links or proof that a public current source repository exists. A 404 does not prove
that the endpoint/documentation is withdrawn. No current official SDK/generated
contract tied to a supported API version was recovered. No third-party source was
used as normative evidence; no speculative wire example is printed.

Previously supplied current official evidence remains EXTERNAL_OFFICIAL_EVIDENCE:
organizationAuthorizations is optional-but-recommended, permission-oriented;
GET/BATCH_GET/BATCH_FINDER retrieval families exist; member/person/impersonator,
organization and action can be bound; ORGANIC_SHARE_CREATE is relevant; insufficient
permission can return 403. This recovery does not downgrade those facts or upgrade
them to independently VERIFIED_OFFICIAL. Readiness below depends on the specific
wire gaps, not simply on the retrieval failure.

### 16.2 Required question ledger — each independently classified

| Question | Established evidence | Exact remaining item / decision |
| --- | --- | --- |
| A. REST endpoint | Resource family /organizationAuthorizations: EXTERNAL_OFFICIAL_EVIDENCE | Exact selected-version REST path/key template UNVERIFIED; do not assert /rest/organizationAuthorizations merely from naming |
| B. Single-check method | GET, BATCH_GET and BATCH_FINDER families supported externally | A GET retrieval exists, but the exact single-check operation/resource key versus finder is not selected; no executable recipe frozen |
| C. Finder/query selector | No exact selector supplied | Whether a finder is needed, exact q value if any, and query/key placement UNVERIFIED |
| D. Member/person | Conceptual person/impersonator binding supported externally | Implicit token member versus explicit person/impersonator parameter, exact URN/identifier type and argument names UNVERIFIED |
| E. Organization | Project can derive canonical urn:li:organization:<decimal> | Whether lookup accepts this as scalar/query/list/key/tuple and its exact encoding UNVERIFIED |
| F. Action | Compile-time ORGANIC_SHARE_CREATE: EXTERNAL_OFFICIAL_EVIDENCE | Scalar/list/List/key/structured action serialization and placement UNVERIFIED |
| G. Read scope | Posting scope remains w_organization_social | Least lookup scope not supplied; do not assume posting scope grants read/preflight access |
| H. Product entitlement | No endpoint-specific entitlement supplied | Exact product/program/tier requirement UNVERIFIED; do not import refresh-partner eligibility as a lookup entitlement |
| I. Headers | Member-authorized credential boundary and JSON parser are project requirements | Endpoint-specific official header list, Rest.li protocol requirement, version requirement and any applicable media type UNVERIFIED |
| J. Affirmative response | No exact positive schema supplied | Root envelope, permission field/enum, identity/action echoes and allowed auxiliary fields UNVERIFIED; 200/nonempty alone never authorizes |
| K. Binding | Must bind member AND organization AND create action | Exact response fields or officially guaranteed unique request-key/response correspondence needed; not recovered |
| L. Negative result | Insufficient permissions may yield 403, externally evidenced | Semantic denial via false/enum/empty/missing action and status distinctions UNVERIFIED; all fail closed regardless |
| M. Pagination | No selected lookup pagination contract supplied | Whether exact query is inherently single-result or can paginate UNVERIFIED; no proof of full-result completeness |
| N. Cardinality | Provider cardinality/schema not recovered | Project policy for 0/1/>1 candidate matches fixed below; do not invent an elements array |
| O. Version scheme | Marketing versioning policy already established | Whether and how this exact lookup requires Linkedin-Version in the selected operation remains UNVERIFIED; no endpoint-specific YES inferred |

**Exact authorization wire request implementable: NO.**
**Exact query serialization: NOT ESTABLISHED; no sample request invented.**
**Endpoint-specific version header required: UNKNOWN**, not a fabricated YES/NO.
The Posts API version/header contract remains resolved and is not reopened.

### 16.3 Evidence sufficient to close the wire gap

The missing evidence packet is concrete: a current official single-authorization
example or reference definition specifying (1) exact REST path, GET key/finder/query
names and representation, (2) authenticated identity/impersonator semantics,
(3) organization and ORGANIC_SHARE_CREATE serialization, including all Rest.li
escaping rules, (4) least OAuth scope and endpoint product entitlement, (5) required
headers/version, and (6) the exact successful/negative JSON schema with identity/action
binding, cardinality and pagination guarantees. Include the page's API/version context.
An official schema can supply these facts without a real API call. An HTTP request
example alone does not close strict response parsing or scope/product requirements.

Use official Microsoft Learn/current LinkedIn reference or a clearly current official
generated contract only. Do not adopt a tutorial, community collection, third-party
SDK, remembered Rest.li expression or role-list example. Supplied external official
examples with this specificity can resolve the gap without Codex direct retrieval.

A fixed tiny serializer might be sufficient after the exact syntax is known. It is
not yet possible to decide whether standard URL component encoding alone suffices:
URLSearchParams must not be assumed to preserve Rest.li structural delimiters or
URN/key escaping. No generic Rest.li client, arbitrary finder parameter interface
or caller-supplied query expression is proposed. No concrete tuple/List syntax is
frozen without official evidence.

### 16.4 Fixed project input and binary decision contract

The future internal input must be built only from the trusted immutable attempt and
current server-side connection state: workspace, operation/snapshot, authorization
ID/version, selected destination, token subject/member and action constant. Numeric
organization ID stays the canonical bounded decimal string; derive its organization
URN server-side. Wire compatibility with that canonical URN is not yet established;
if a verified endpoint needs a numeric component, derive it without arbitrary URN
storage or number coercion. No schema change is justified by the uncertainty.

Retain the existing project ID bound (positive canonical decimal, <=20 digits), the
fixed ORGANIC_SHARE_CREATE action and the existing subject bound (<=200 characters,
then the narrower verified identity grammar). All serialized components and the
complete request target need explicit finite admission bounds; a proposed project
target maximum is 4096 UTF-8 bytes, within the existing URL-length policy. Actual
encoding expansion is measured, never truncated. Input cannot select arbitrary action,
member, organization, endpoint, finder, URL, headers or credentials. Unknown schema or
encoding fails before network work. Product entitlement is separate from OAuth scope.

Strict decision model, design only:
1. Validate local selected destination/identity/version/scope and exact request encoding.
2. Make one verified, bounded remote lookup using the same logical credential version
   reserved for eventual posting, without starting the publication request.
3. Apply Phase 9A response limits, fatal UTF-8, duplicate-key rejection and depth/node
   bounds, followed by the exact official response schema once recovered.
4. Authorize only an affirmative result whose member, organization and exact action
   all match, with complete response coverage and no conflicting/extra authorization
   candidates. If identity is officially implicit, require evidence tying this exact
   authenticated request key and response to that member; do not invent missing echoes.
5. Revalidate current local connection/version/credential/selection and snapshot/actor
   authority immediately before the one Posts dispatch claim/send.

Unknown security-critical fields, duplicate JSON keys, unmatched identities, unexpected
action, missing positive decision, unknown enum, malformed status/body or unverifiable
request-response binding => NOT AUTHORIZED / UNVERIFIABLE, never a permissive success.
No generic response.data.length, elements.length or HTTP-200 test is sufficient.
The schema/parser field names remain intentionally unfrozen, not guessed placeholders
that could be implemented as if normative. Do not persist or log raw responses.

Project cardinality policy (applies after mapping the verified response format):
- 0 matching affirmative candidates: reject; absence never implies permission.
- 1 candidate: allow only if every binding/affirmative/completeness check succeeds.
- >1 candidates or any conflicting/duplicate result: reject as unverifiable, even if
  one entry is positive. Do not select the first result or silently deduplicate.
This does not claim the API returns a collection. Actual cardinality guarantees need
verification. Any continuation/more-results/partial-result indicator or unknown
pagination semantics prevents authorization. Prefer an officially verified exact
non-paginating lookup; do not auto-walk pages, broaden a finder or make another call
in order to turn an incomplete result into permission.

### 16.5 Freshness and connection/credential/destination binding

Default policy remains **FRESH REMOTE PREFLIGHT BEFORE EACH DISPATCH**. No evidence
supports an authorization cache lifetime, so do not cache across publish attempts.
Do not add automatic retry, backoff or sleep for lookup failure. Clip the lookup to
the existing bounded parent operation/deadline; a successful read is not a renewable
permission lease. LinkedIn must still enforce posting permission at actual POST.

Preflight version == eventual post version, and both use the same logical encrypted
access-credential row/purpose/version bound to the same authorization, member and
organization. The member is the LinkedIn token subject, not the app user's UUID.
Recheck CONNECTED, expiry, scope set, no refresh lease and selected destination under
existing short guarded transactions, then release before remote I/O. Any reconnect,
refresh, disconnect, reselection, actor/approval change or version mismatch aborts
before post send. No credential A preflight followed by credential B posting, no
access-token logging/fingerprint persistence, and no long DB lock across the request.
Existing short-lived audience-bound grants must be clipped to actual token expiry;
a grant expiry cannot extend token validity or switch authority.

Lookup read scope and product entitlement are **UNVERIFIED**. Once known, Phase 7 can
represent/check the scope in existing bounded scopes_json and validateGrant scope
allowlists without schema change, subject to the known <=30 scopes/150-character
scope bounds. A missing scope must fail closed, not silently request broader access.
Acquiring a new grant/reconnect remains separate authorization. A developer product
entitlement cannot be substituted with an app RBAC permission or assumed from a
refresh-token partnership. No new permanent entitlement cache is required here.

### 16.6 Preflight failure is local FAILED, not ambiguous publication

The future orchestration boundary must distinguish remote read traffic from post
creation. Phase 8 currently marks DISPATCHING before invoking provider.publish and
converts thrown publish errors to UNKNOWN. Simply throwing a preflight error from
that existing callback would therefore give the wrong publication semantics.

Proposed narrow integration: perform fresh preflight after admitted immutable CREATED
snapshot but before the post DISPATCHING claim. No DB transaction stays open across
the lookup. On success, reacquire/revalidate current snapshot/proof/version authority
and atomically claim dispatch once. On failure, atomically record CREATED -> FAILED,
with LOCAL boundary, no remote publication/processing ID and no published_at, using
existing safe error/category columns and ordinary event sequence/version checks.
If rejection occurs before admission, return a local validation/authorization error
without manufacturing an operation. No new state or migration is needed.

| Preflight observation | Proposed existing category / safe code | Publication behavior |
| --- | --- | --- |
| Local serialization invalid, invalid selected organization/identity | VALIDATION / INVALID | Reject before admission or local FAILED; zero POSTs |
| Missing required lookup/post scope, stale credential/version, revoked selection | AUTHORIZATION / ACCESS_LOST | Local FAILED; zero POSTs |
| Known missing product entitlement/profile eligibility | CAPABILITY / UNSUPPORTED | Local FAILED; zero POSTs |
| Lookup 401 or 403 | AUTHORIZATION / ACCESS_LOST | Local FAILED; no inference about token validity beyond safe denial |
| Lookup 404, unexpected status, malformed or incompletely bound response | AUTHORIZATION / UNAVAILABLE | Local FAILED/unverifiable; do not interpret resource absence as an allow |
| Lookup 429 | PROVIDER_RATE_LIMIT / RATE_LIMITED | Local FAILED, no retry or sleep |
| Lookup 5xx, timeout, DNS/connect/TLS failure | TRANSPORT / UNAVAILABLE | Local FAILED; only the read is uncertain, publication was never attempted |
| Structurally valid explicit negative authorization | AUTHORIZATION / ACCESS_LOST | Local FAILED; no trial POST or role fallback |
| Empty/duplicate/conflicting/paginated result | AUTHORIZATION / UNAVAILABLE | Local FAILED; zero POSTs |

These are design mappings to existing enums, not assertions about provider error-body
schemas or a new raw error parser. Preserve generic safe outward errors. The current
append helper/ProviderResult FAILED union is remote-oriented; future implementation
needs an explicit bounded local-failure path. Do not mislabel preflight denial as
REMOTE_REJECTED after posting, or force an unsafe enum cast to reuse that path.
The existing migration permits LOCAL FAILED records and CREATED -> FAILED transition.
Audit through existing safe record/reason events, not raw query/response data.

UNKNOWN remains authoritative only once creation may have been sent or outcome
persistence became ambiguous after creation. A lookup timeout/reset/possibly executed
GET alone does not create a duplicate-post UNKNOWN. No publication transport instance
may inherit a preflight read's operationPossible flag. Later user/operator action is
subject to existing uniqueness and approval rules; do not promise that changing a
request ID permits resending the same revision/destination after FAILED. Do not delete
an operation, reset its state or weaken uniqueness to manufacture a retry feature.

### 16.7 Typed header/query seam and smallest future surface

The already-proposed LinkedIn profile-bound request-header seam can be shared by a
verified authorization profile if its official contract confirms the same headers.
Posts requirements remain unchanged. For lookup, Authorization through the existing
credential boundary and Accept application/json are project transport requirements;
endpoint-specific Linkedin-Version/Rest.li/media-type requirements remain unverified.
Do not assert Content-Type application/json on an empty GET merely by copying POST.
When confirmed, reuse exactly those typed header values; no arbitrary map or new
Authorization injection path. Concrete production pin remains
VERSION_PIN_SELECTION_PENDING, without blocking a deterministic otherwise complete
contract solely because a value has not yet been selected.

A verified authorization query will also need a narrow trusted request mapper through
the existing static endpoint/profile transport, not a caller-controlled path/query.
Exact query field names/serializer cannot be designed as a finished seam until the
wire definition is recovered. Keep all DNS/TLS/peer/deadline/JSON/redaction enforcement
inside Phase 9A; no separate fetch/SDK, permissive parser or generic Rest.li framework.

If evidence resolves the ledger, the smallest implementation surface remains one
LinkedIn text module with profile constants, fixed auth request mapper, strict auth
response parser, Posts mapper and x-restli-id parser; existing transport's typed
header/query/result seams; trusted connection/snapshot credential bridge; narrow
Phase 8 registration/claim/local-failure integration; focused fake/DB tests. No files
are created for those responsibilities in Contract-2. Do not add discovery, OAuth,
refresh machinery, provider-general abstractions or new UI to solve a missing contract.

### 16.8 Contract-2 decision and invariants

**LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.** The specific security-critical unresolved
items are the exact single-check endpoint/method-key/finder/query serialization,
authenticated-member representation, organization/action encoding, lookup scope and
product entitlement, required version/headers, affirmative/negative response schema,
binding/cardinality/completeness/pagination guarantees. The binary gate cannot yet
be implemented deterministically; supplied conceptual action evidence is not enough
to invent request keys or interpret unknown JSON as permission.

Resolved contracts remain closed: Posts endpoint/scope, organization text PUBLIC /
MAIN_FEED, approved commentary, strict 201+ID -> PUBLISHED, no verified native
idempotency, ambiguous send -> UNKNOWN, no automatic redispatch, valid existing token
sufficient and no refresh implementation required. Preserve NO_SCHEMA_CHANGE_REQUIRED,
no 0012, existing content.publish/32 permissions. No persistent authorization cache is
needed. All five providers remain DISABLED / UNVERIFIED and production profiles 0;
Hostinger UNVERIFIED. Only this contract and Phase 9B review are appended. No Posts or
authorization endpoint, other real LinkedIn API, OAuth operation, test/gate, source,
config, package, migration, stage, commit or push is performed. STOP FOR REVIEW.

## 17. Contract-3 — exact single-GET reconciliation — 2026-10-21

This chronological append supersedes only the unresolved organization-authorization
items in Contract-2. Initial research, external recovery and Contract-2 remain verbatim.
Evidence source: current versioned Microsoft Learn Organization Authorizations page,
externally retrieved and supplied by the user:
https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations
No independent retrieval is claimed or attempted in Contract-3. Recovered claims
are EXTERNAL_OFFICIAL_EVIDENCE, not VERIFIED_OFFICIAL. No Posts, OAuth, refresh,
content, idempotency, schema or application RBAC contract is reopened.

### 17.1 Resolved single-resource operation

Choose the documented **single-resource GET**, not BatchFinder. The documented role
example establishes this compound-key path (placeholders are not real account data):

```text
GET https://api.linkedin.com/rest/organizationAuthorizations/(impersonator:{PERSON_URN},organization:{ORGANIZATION_URN},action:(organizationRoleAuthorizationAction:(actionType:ADMINISTRATOR_READ)))
```

The selected resource path is therefore `/rest/organizationAuthorizations/<compound-key>`;
known structural fields are impersonator, organization and action. No q/finder selector,
query collection, batching or List syntax is needed for this one exact-resource strategy.
GET/BATCH_GET/BATCH_FINDER authorizationActionsAndImpersonator support is supplied
external evidence, but the latter two operations are out of the narrow preflight.
ADMINISTRATOR_READ and organizationRoleAuthorizationAction are evidence of the
compound-key shape only; they must never be dispatched as the organic-create check.

The relevant semantic action type is OrganizationContentAuthorizationAction, and its
only admitted actionType is ORGANIC_SHARE_CREATE. The candidate lower-camel wire
member `organizationContentAuthorizationAction` is **UNVERIFIED**: neither the
PascalCase semantic type nor the role union's alias proves the exact content union
alias. This is the ONLY remaining unestablished authorization wire field. Do not
promote it to VERIFIED or a usable EXTERNAL_OFFICIAL_EVIDENCE wire literal merely
because it looks conventional. No independent schema/naming evidence is present.

The future content request template, explicitly non-executable until that alias is
established, is:

```text
GET https://api.linkedin.com/rest/organizationAuthorizations/(impersonator:{ENCODED_PERSON_URN},organization:{ENCODED_ORGANIZATION_URN},action:({CONFIRMED_CONTENT_ACTION_WIRE_MEMBER}:(actionType:ORGANIC_SHARE_CREATE)))
```

Closing evidence needed: one official schema/union alias definition or current official
content-action request/response example showing the exact member used inside action.
The alias must agree in the path key and returned action object. A semantic type name
alone, arbitrary lower-camel conversion, or another role example is insufficient.
No other resolved single-GET field is reopened while this one field is pending.

### 17.2 Fixed serializer and encoding design

All URNs are URL encoded exactly once, on supplied external official evidence.
For example, `urn:li:organization:12345` becomes
`urn%3Ali%3Aorganization%3A12345`; URN colons become %3A, not %253A.
Construct trusted raw person/organization URNs, then encode those two value components
once. Do not accept already encoded input, encode the entire compound path as a
single value, or double encode its percent signs. Preserve the fixed supplied Rest.li
parentheses/commas/field separators and action constant; no arbitrary structural
key/value map, arbitrary query, alternate action or caller URL is accepted.

Once the content alias is proven, a tiny LinkedIn-specific fixed path serializer is
sufficient. Inputs are only validated trusted person ID and canonical selected decimal
organization ID; actionType and all field names are compile-time constants. Derive
both URNs server-side, encode only their values and enforce the existing project
component/total URL bounds. No generic Rest.li client or broad encoding framework.
The requested decimal-person restriction is a PROJECT admission rule, not proof that
all LinkedIn person IDs are numeric; a real nonconforming identity must not be coerced
or fabricated to pass it. This does not create another unresolved wire alias question.

### 17.3 Member identity: storage fits, actual representation is not yet proven

**Repository classification: IDENTITY_REPRESENTATION_UNRESOLVED.**
Existing storage sufficient: YES. Existing trusted member value proven sufficient:
BLOCKED/UNRESOLVED for a concrete connection, not a demonstrated schema limitation.

Baseline facts from src/server/social/provider.ts and service.ts:
- grantSchema.subject is a bounded 1..200-character provider identity string; it
  permits numeric IDs and person URNs, but also other opaque identifiers.
- callback stores validated grant metadata.subject directly in
  social_authorizations.subject; the field is varchar(200). It does not store the
  application's connected_by UUID as that provider subject.
- reconnect verifies the returned subject equals the prior subject, while credentials
  are bound to provider/authorization/purpose/version through existing AES-GCM/AAD.
- productionProviders is empty; no real LinkedIn exchange/identity capture adapter
  establishes the semantics of subject. No credential/account values were inspected.

Consequently, do not assume subject is a LinkedIn person ID, split an arbitrary
subject/UUID/OIDC sub, or append urn:li:person: to an unrelated identifier. A valid
single GET explicitly requires the trusted impersonator person URN; identity is not
merely implicit in the Bearer token for this selected operation.

Bounded repository solution for future authorized work: require the LinkedIn connection
capture/profile contract to supply the provider-verified member person identity in
existing Grant.metadata.subject, in a declared canonical person-URN (or verified ID)
representation. The dispatch bridge validates that representation and its origin,
then derives exactly the expected person URN. Numeric-only fixture admission can be
implemented and tested without claiming a real account satisfies it. Existing
unproven identities require verified capture/re-consent before enablement; they
cannot be silently rewritten, especially because reconnect currently checks subject
equality. This is CONNECTION_PROFILE/OAUTH_IDENTITY_CAPTURE work, not a migration
or permission to build OAuth now. The bounded capture/validation boundary is sufficient
for future fake-provider code design; operational identity proof remains a real-
connection enablement prerequisite, not a second guessed endpoint wire field.

Organization remains the selected canonical decimal destination from the same
connection. Derive urn:li:organization:<decimal> and encode it exactly once; the
supplied compound key now establishes compatibility with this derived URN. No new
arbitrary-URN destination storage is needed.

### 17.4 Scope, entitlement and headers

**Authorization lookup permission: rw_organization_admin**, on supplied current
EXTERNAL_OFFICIAL_EVIDENCE. Its documented description is management of organization
Pages/reporting; it is distinct from **posting permission w_organization_social**.
This endpoint requires the broader provider permission for the adopted preflight;
do not substitute the posting scope or add an application RBAC permission.

Phase 7 scope storage/validation is sufficient for both: bounded scopes_json supports
multiple strings and validateGrant rejects unrequested scopes. With both in a future
reviewed LinkedIn requestedScopes set, a partial grant produces LIMITED under the
existing callback comparison. A legacy CONNECTED record may have been created under
a smaller old requested set, so always explicitly check both required scopes at
preflight/send admission instead of trusting status alone. Missing rw_organization_admin
means definite pre-dispatch FAILED, not trial posting. Acquiring it requires a separate
reconnect/re-consent through the existing protected lifecycle with appropriate product
access; no scope/config/token change occurs here. No schema change to store the scope.

**PRODUCT_ENTITLEMENT_UNVERIFIED** remains accurate for the exact developer product/
program access needed to obtain/use this permission. Do not infer it from the scope
name or optional refresh-partner eligibility. It is a REAL_PROVIDER_ENABLEMENT blocker,
not a blocker to isolated code/fake-provider implementation once the wire alias is
resolved. Provider registration must remain disabled until it is verified.

The supplied single-GET example establishes these profile-owned header values:
- Authorization: Bearer credential via existing bound credential injection.
- X-Restli-Protocol-Version: 2.0.0.
- Linkedin-Version: explicit supported YYYYMM.
- Content-Type: application/json, even though this GET has no application request body.
Existing Accept: application/json remains project transport policy; this pass does not
claim the example establishes it as a separately mandatory provider header.

Endpoint version header required: YES under the adopted supplied-example contract.
**VERSION_PIN_SELECTION_PENDING**: no concrete supported YYYYMM is chosen. Its selection
and support/sunset verification are PRODUCTION_ENABLEMENT blockers, not intrinsically
code-implementation blockers for disabled profiles with deterministic fake configuration.
Do not insert a dispatchable placeholder, latest, arbitrary runtime pin or stale example.

The typed LinkedIn request-header seam now also needs the fixed JSON Content-Type on
this bodyless GET: the current transport only emits it when request length is nonzero.
Allow that exact value in this reviewed profile; do not manufacture a GET body or new
arbitrary header dictionary. Reuse version/protocol fixed headers, credential boundary,
static authority plus fixed compound-key serializer, and central DNS/TLS/peer/budget
policy. This refines Contract-2's earlier caution about copying POST headers: the GET
example now supplies the relevant evidence directly.

### 17.5 Strict resource response and binary authorization

Single-resource response is one authorization object, not a collection. Supplied
external official structure has impersonator, action, organization and status. After
the exact content wire alias is confirmed, the sole affirmative shape is:

```text
impersonator = exact expected raw trusted person URN
action = exactly one confirmed content-action union member
  actionType = ORGANIC_SHARE_CREATE
organization = exact expected raw derived organization URN
status = exactly { "com.linkedin.organization.Approved": {} }
```

Returned URNs are compared in their response string representation to the expected
raw URNs, not to percent-encoded request values. Do not URL-decode/normalize an
unexpected response into equality. Apply Phase 9A bounded JSON/fatal UTF-8/duplicate-
key/depth/node checks, then a closed object/union parser. Require the exact expected
fields, one action union member and one status union member. Unknown security-critical
structure, missing/null/malformed fields, extra/ambiguous union members, different
impersonator/organization/actionType, or an unexpected collection fails closed.
The exact action-member literal is intentionally still unfrozen; an implementation
must not turn the candidate name above into a guessed parser key.

Approved is affirmative only when every binding and current local authority check
matches. Supplied explicit negative representation is
`status: { "com.linkedin.organization.Denied": { "reasons": [...] } }`.
Denied is always failure. Do not require reasons for the deny decision, inspect them
as authority, log/persist them or turn unknown status into approval. Any malformed
Denied branch also fails closed. Response 403 is definite pre-dispatch failure.

No collection pagination is needed: NO. Do not introduce BatchFinder, a paging loop
or result selection. A missing resource/404, zero object, multiple objects, array,
wrapper collection or continuation semantics is unexpected/unverifiable and fails
closed. The former generic 0/1/>1 project policy now specializes to exactly one
structurally valid single resource, not counting matches in an invented elements array.
No HTTP 200 alone, matching organization alone or nonempty JSON authorizes posting.

### 17.6 Freshness, credential binding and failures unchanged

Fresh remote preflight before EVERY post dispatch; no cross-attempt cache, trial POST,
role fallback or stale reuse. The same logical connection/access credential version
serves the exact person/org/action preflight and creation. Recheck CONNECTED, expiry,
both scopes, no refresh lease, selected destination, approval and actor authority
immediately before send; abort if reconnect/refresh/reselection/version changes.
Do not hold DB locks across the lookup or log credential material. Project token
validity requirement now explicitly includes both granted scopes; refresh in this
publishing slice is still not required.

Keep the Contract-2 preflight-before-DISPATCHING integration design and LOCAL FAILED
path using existing states/events. Serialization failure, invalid destination, missing
scope, 403, Denied, malformed result, any binding mismatch, unknown status or lookup
DNS/connect/TLS/timeout fails CLOSED BEFORE PUBLICATION. No POST has started, hence
none is publication UNKNOWN. Before admission, reject locally without inventing a
record; after admission, CREATED -> FAILED is available. UNKNOWN remains for actual
post dispatch after possible send or ambiguous outcome persistence. No retry or
operation-uniqueness bypass is added.

### 17.7 Code readiness versus enablement — final Contract-3 decision

| Item | Classification / effect |
| --- | --- |
| Single GET endpoint/key, explicit impersonator/org URNs, one-resource response/no pagination, headers, read scope, Approved/Denied | RESOLVED_BY_EXTERNAL_OFFICIAL_EVIDENCE |
| Exact content-action wire union member | UNVERIFIED; sole remaining normative wire CODE IMPLEMENTATION blocker |
| Actual trusted LinkedIn member subject semantics | IDENTITY_REPRESENTATION_UNRESOLVED; bounded connection-profile/capture solution fits existing subject field; no schema blocker; must be proven for real connection enablement |
| Both scopes | Existing storage sufficient; missing grants require separately authorized reconnect/re-consent before real use |
| Concrete supported YYYYMM | VERSION_PIN_SELECTION_PENDING; production profile/real-provider enablement gate, not pure code blocker |
| Product/program entitlement | PRODUCT_ENTITLEMENT_UNVERIFIED; real-provider enablement gate |
| Credentials, app approval, real-account identity/grants and authorized real verification | REAL_PROVIDER_ENABLEMENT prerequisites; do not claim availability |
| Typed Phase 9A header/path/result seams and trusted dispatch bridge | Bounded REPOSITORY_IMPLEMENTATION_GAP; future explicit authorization required, not a reason to invent a wire alias |
| Persistence | NO_SCHEMA_CHANGE_REQUIRED; no 0012; subject and granted-scope capture do not require new tables/columns |
| Application RBAC | NO_NEW_APPLICATION_PERMISSION_REQUIRED; 32/content.publish unchanged |

**CODE IMPLEMENTATION: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.**
Smallest remaining blocker: an official schema/alias definition or current content-
action GET/response example proving the exact Rest.li action union member corresponding
to OrganizationContentAuthorizationAction. Do not keep the old endpoint/scope/header/
response/pagination blockers after this evidence, but do not infer this alias from
PascalCase alone. Once confirmed, the bounded trusted identity capture/validation
solution permits deterministic fake-provider design without a schema change; version,
entitlement and account validation still gate production enablement separately.

**REAL LINKEDIN ENABLEMENT: DISABLED / UNVERIFIED.** No profile is created/enabled and
no real provider call is authorized. Existing resolved Posts/PUBLISHED/idempotency/
ambiguity/immutable commentary/optional refresh contracts remain intact. Hostinger
UNVERIFIED. Only the two documentation files are appended; no Phase 9A, production,
test/config/package/migration change, OAuth action, stage, commit or push. STOP FOR REVIEW.

## 18. Contract-4 — request/response union asymmetry — 2026-10-21

Documentation-only append; all previous discovery/reconciliation and Contract-2/3
content remains verbatim. Immutable baseline is Phase 9A commit
d43af21425572eae38d2d59bf59c4d88a91fa012. No resolved Phase 9B contract is reopened.
This pass concerns only the content authorization REQUEST union key and the supplied
request/response-label distinction.

### 18.1 Evidence and explicitly different names

New current official Microsoft Learn evidence was externally retrieved and supplied
by the user. Source resources:
- Organization Authorizations: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations
- Getting Started: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/getting-started

Classification remains EXTERNAL_OFFICIAL_EVIDENCE. Two bounded direct documentation
retrieval checks in Contract-4 each exited curl 56, HTTP 000, proxy CONNECT denied.
No usable page/schema body or explicit content request-alias mapping was independently
recovered, and no independently VERIFIED_OFFICIAL claim is made. No LinkedIn API
request was sent. The blocker is absence of explicit mapping evidence, not a rule
that only Codex's own retrieval could resolve it.

| Meaning / wire direction | Exact evidenced or candidate name | Status |
| --- | --- | --- |
| Semantic content authorization category | OrganizationContentAuthorizationAction | EXTERNAL_OFFICIAL_EVIDENCE |
| Content mapping/response authorization type | OrganizationContentAuthorizationActionType | EXTERNAL_OFFICIAL_EVIDENCE |
| Allowed action for this slice | ORGANIC_SHARE_CREATE | EXTERNAL_OFFICIAL_EVIDENCE |
| Role REQUEST union alias | organizationRoleAuthorizationAction | EXTERNAL_OFFICIAL_EVIDENCE |
| Role RESPONSE action type key | OrganizationRoleAuthorizationActionType | EXTERNAL_OFFICIAL_EVIDENCE |
| Content REQUEST union alias | NOT ESTABLISHED; organizationContentAuthorizationAction is only a candidate | UNVERIFIED |

The documented role example is asymmetric:

```text
REQUEST action:(organizationRoleAuthorizationAction:(actionType:ADMINISTRATOR_READ))
RESPONSE action: { "OrganizationRoleAuthorizationActionType": { "actionType": "ADMINISTRATOR_READ" } }
```

This is evidence about that particular role request/response mapping, not proof of
an automatic transformation for other union branches. Do not lowercase/remove Type,
copy a response key into a request, or infer the content alias by analogy.

**Correction to Contract-3:** the statement in section 17.1 that an alias must agree
in the path key and returned action object is superseded. REQUEST and RESPONSE labels
must each match their own official wire contract; they need not be identical.
Contract-3's response placeholder must not be implemented using the candidate
lower-camel request alias. This correction preserves the old text as chronology
rather than rewriting what was known at that point.

### 18.2 Sole request-side wire field still unresolved

The established surrounding single-GET key is unchanged:

```text
GET /rest/organizationAuthorizations/(impersonator:{ENCODED_PERSON_URN},organization:{ENCODED_ORGANIZATION_URN},action:({EXACT_CONTENT_REQUEST_UNION_KEY}:(actionType:ORGANIC_SHARE_CREATE)))
```

This is a non-executable contract template: EXACT_CONTENT_REQUEST_UNION_KEY is NOT
resolved and may not be filled from naming convention. All other key fields, explicit
member/organization URNs, encode-once rule, single-GET/no-finder strategy, headers and
scope decisions remain as resolved in Contract-3. Do not switch to another operation,
role/ACL check, cached result, missing preflight or trial POST to bypass this field.

Acceptable closing evidence is exactly one of:
- a current official Microsoft Learn content-action request example;
- an official LinkedIn Rest.li schema/type definition specifying the request alias;
- an official generated API schema/documentation identifying that branch;
- an official LinkedIn/Microsoft source artifact explicitly mapping
  OrganizationContentAuthorizationActionType to its Rest.li REQUEST alias.

No such mapping was supplied or recovered in Contract-4. The current semantic type,
action enum, response type and role example do not establish it. Third-party examples,
AI inference and structural plausibility cannot fill the field. If acceptable evidence
later confirms organizationContentAuthorizationAction, record that provenance then;
it is not verified now. Do not create a serializer accepting this guessed literal
under a 'likely' default or silently make it dispatchable.

**Only remaining hard wire blocker:**
`CONTENT_AUTHORIZATION_REQUEST_UNION_KEY_UNVERIFIED`.

### 18.3 Response parser key is independently established

The future strict RESPONSE parser may now use exactly:

```text
action: {
  "OrganizationContentAuthorizationActionType": {
    "actionType": "ORGANIC_SHARE_CREATE"
  }
}
```

This response key is EXTERNAL_OFFICIAL_EVIDENCE from the supplied current contract,
not inferred from any request alias. Preserve strict central bounded JSON, fatal
UTF-8, duplicate-key, depth/node and response-size handling. Authorize only when:
- impersonator exactly matches the expected raw trusted person URN;
- organization exactly matches the selected server-derived raw organization URN;
- action contains exactly the evidenced content response type and its actionType
  is exactly ORGANIC_SHARE_CREATE;
- status is exactly the single affirmative com.linkedin.organization.Approved branch
  with the required empty payload;
- the current local snapshot/actor/connection/credential/selection checks still match.

Missing/malformed/extra security-critical structure, a role response, lower-camel
candidate response key, wrong action/member/organization, Denied, unknown/ambiguous
status or unexpected collection fails CLOSED BEFORE POST. Do not accept the request
key as an alternate response spelling without official evidence. This separates the
resolved strict response parser from the unresolved one request field. No response
parser or test code is created in this pass.

### 18.4 Other readiness dimensions remain separate

Member identity remains IDENTITY_REPRESENTATION_UNRESOLVED for actual existing
connections. Existing subject storage can hold a person URN; a reviewed LinkedIn
connection/profile must establish its trusted semantics through verified identity
capture, not fabrication from an app UUID/OIDC sub. This is a bounded implementation/
integration requirement with the existing-schema solution recorded in Contract-3,
not the same request-wire blocker and not a reason to add a column or migration.

Lookup scope remains rw_organization_admin; posting scope remains w_organization_social.
Phase 7 generic scope storage is sufficient. Missing grants require fail-closed
admission and separately authorized reconnect/re-consent, never a guessed scope or
role bypass. Schema remains NO_SCHEMA_CHANGE_REQUIRED; no migration 0012 and no new
application permission. Existing content.publish/32-role matrix remains unchanged.

VERSION_PIN_SELECTION_PENDING is still a production-enablement/final-validation gate:
no stale/current-month/latest guess. PRODUCT_ENTITLEMENT_UNVERIFIED remains a real-
provider enablement gate. Disabled-profile code/fake-provider planning does not itself
establish real credentials, member capture, app/product access or real-provider
verification. All providers remain production DISABLED / UNVERIFIED with zero profiles;
Hostinger remains UNVERIFIED. No resolved Posts, PUBLISHED mapping, exact approved text,
no-idempotency/no-redispatch, optional-refresh or ambiguity policy is changed here.

### 18.5 Contract-4 result

**CODE IMPLEMENTATION: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.**
Exactly one missing security-critical request wire field is carried forward:
CONTENT_AUTHORIZATION_REQUEST_UNION_KEY_UNVERIFIED. The semantic action and response
content type are resolved; do not list them as additional wire blockers. Readiness may
be reconsidered only after acceptable official request-alias evidence is recorded,
with bounded identity/seam work and production enablement gates kept distinct.

**REAL LINKEDIN ENABLEMENT: DISABLED / UNVERIFIED.**
Only this document and the Phase 9B review were appended. No source, test, config,
package, migration, Phase 9A history, provider/API/OAuth action, stage, commit or push.
STOP FOR REVIEW.

## 19. Contract-5 — official LinkedIn client and BatchFinder selection — 2026-10-24

Append-only reconciliation: initial discovery and Contracts 2–4 remain verbatim.
Baseline Phase 9A is CLOSED at d43af21425572eae38d2d59bf59c4d88a91fa012.
This section supersedes only the selected preflight operation and its request/identity/
cardinality decisions. Resolved Posts, exact commentary, state/ambiguity, scopes,
optional refresh, schema and application RBAC contracts remain unchanged.

**Operation decision: BATCH_FINDER_SELECTED.**
**Code readiness: LINKEDIN_TEXT_READY_FOR_IMPLEMENTATION.**
**Real LinkedIn enablement: DISABLED / UNVERIFIED.**
No implementation is authorized by these classifications.

### 19.1 Official implementation evidence actually retrieved

The supplied official repository was independently retrieved as public documentation/
source, without installing, importing or executing its SDK and without provider calls:
`linkedin-developers/linkedin-api-python-client`.
Git's live main/HEAD resolved to `6331e52f5ea59b326447efa67a9bf925ed2d9ec7`.
README fetched from main and then this pinned commit matched byte-for-byte (HTTP 200).
Supporting files below were retrieved at the same immutable commit.

Evidence class: **VERIFIED_OFFICIAL_IMPLEMENTATION_EVIDENCE** for the artifact's actual
contents, distinct from the still externally supplied current Microsoft Learn server
contract. This is not verification against a live LinkedIn API or proof that the
README example's old version remains supported. The README describes the SDK as beta;
use it as explicit serialization evidence, not a reason to copy every SDK behavior.

| Pinned official artifact | Relevant evidence |
| --- | --- |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/README.md#L302-L343 | organizationAuthorizations BatchFinder example, finder and criteria names, uppercase content/role request discriminators, ordered results |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/client.py | batch_finder inserts bq and the finder-criteria parameter, encodes them and selects BATCH_FINDER |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/utils/encoder.py | Rest.li List/object punctuation, string component quoting, sorted query names/object keys |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/utils/query_tunneling.py | Short BATCH_FINDER query uses GET; automatic SDK tunneling exists but is not adopted |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/common/constants.py | /rest versioned base, BATCH_FINDER -> GET, structural encoding constants |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/utils/api.py | Actual request header construction, including X-RestLi-Method |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/response_formatter.py | Raw top-level elements contains per-criterion results; each has elements/paging/metadata/error/isError |
| https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/response.py | BatchFinderResult and paging start/count/total meanings; result order corresponds to criteria |

README SHA-256:
a427c7cf40cb087a220c0b1d78854096213ac059d0fdda74192686cede2b1431.
Client source SHA-256:
fee1868081338a87afb8d7e7c7c0739564617edbeea7bdeacd29f5542efe4b45.
The README's example version 202212 is NOT selected, copied into a production profile
or taken as supported-version evidence. No SDK dependency, Python runtime requirement,
SDK HTTP session, proxy behavior, retries or query tunneling is adopted.

The previously supplied current Microsoft Learn finder name and authenticated-member
semantics remain EXTERNAL_OFFICIAL_EVIDENCE. Their combination with explicit official
client serialization is sufficient for this bounded disabled-profile implementation
design. Current supported version and entitlement still require enablement review.

### 19.2 Why change operation instead of guessing the single-GET alias

| Operation | Proven request representation | Security cost / decision |
| --- | --- | --- |
| Single-resource GET | Role compound-key alias only; content alias still unverified | Exact target request and no paging are attractive, but would require an inferred content key; RETIRED from this slice |
| BatchFinder authorizationActionsAndImpersonator | Official client explicitly uses OrganizationContentAuthorizationAction in authorizationActions criteria | Needs strict selected-organization search/completeness policy; SELECTED because wire evidence is stronger |

Official client role BatchFinder discriminator is OrganizationRoleAuthorizationAction;
Microsoft Learn role single-GET alias is organizationRoleAuthorizationAction. This
difference directly prevents transferring casing between request forms. Contract-4's
request/response distinction also remains valid. The content response type remains
independently evidenced OrganizationContentAuthorizationActionType; it is not renamed
just because a request uses OrganizationContentAuthorizationAction.

The previous lower-camel candidate organizationContentAuthorizationAction is recorded
as **SUPERSEDED_UNVERIFIED_HYPOTHESIS**. Single-GET content alias remains UNVERIFIED but
is no longer required, exposed as a fallback, or a Phase 9B code blocker. No role/ACL
fallback, trial post, missing preflight or alternative generic finder is introduced.

### 19.3 Frozen narrow BatchFinder request

Exactly one action criterion; no role criterion and no user-selected action:

```text
resource_path = /organizationAuthorizations
finder_name = authorizationActionsAndImpersonator
finder_criteria name = authorizationActions
finder_criteria value = [
  { "OrganizationContentAuthorizationAction": { "actionType": "ORGANIC_SHARE_CREATE" } }
]
```

The official README example uses ORGANIC_SHARE_DELETE. The substituted CREATE enum
is independently supported by the supplied current Microsoft Learn content-action
contract. The discriminator is unchanged. Do not substitute the unresolved single-GET
alias or a response Type-suffixed key into these criteria.

The inspected official encoder and client establish this fixed short request target:

```text
GET /rest/organizationAuthorizations?authorizationActions=List((OrganizationContentAuthorizationAction:(actionType:ORGANIC_SHARE_CREATE)))&bq=authorizationActionsAndImpersonator
```

The query selector is **bq**, not q. This serialization is derived from retrieved
LinkedIn-authored encoder/client code, not from naming or third-party examples.
It has one criterion and no organization/member query parameter. It is a fixed
server-owned request target, not an arbitrary query builder. No double encoding,
caller-provided Rest.li expressions or broad list of actions. No need to serialize
person/org URNs in this request. The selected organization remains bound in the local
operation and subsequent response comparison, not added as an unsupported query.

Use the existing typed LinkedIn header seam with:
- Authorization through the existing bound CredentialGrant.
- Linkedin-Version from the explicit reviewed pinned profile.
- X-Restli-Protocol-Version: 2.0.0.
- X-RestLi-Method: BATCH_FINDER, fixed for this read-only profile (official client evidence).
- Content-Type: application/json for this bodyless GET; Accept JSON is existing policy.

HTTP header name case is insensitive; preserve the semantic hyphenated header names.
Do not copy an unused constants-file spelling or introduce unrestricted headers.
Retain Phase 9A Connection close and proxy isolation, not the SDK's session/Keep-Alive.
The fixed query is short; bound the whole target to 1024 UTF-8 bytes as PROJECT policy.
No SDK-style automatic POST query tunneling or method override is needed/allowed;
reject a target exceeding the bound rather than turning the lookup into another method.

### 19.4 Strict raw response wrapper, criteria and resource bindings

The official client does not return a flat list of organizations. Its formatter maps
raw top-level elements to ordered per-criterion results, each with its own elements.
Future parsing must operate on raw bounded JSON, not assume the SDK's response.results
property exists in the wire response. For exactly one sent criterion require exactly
one per-criterion result in the outer elements array. Its authorization elements are
then the only candidate resources; no cross-criterion or first-batch search.

Use Phase 9A STATUS_RESPONSE limits (16 KiB), fatal UTF-8, duplicate-key rejection,
depth/node limits and the strict authorization schema. Per-result isError must be
absent/false; error must be absent/null. Error, malformed or additional result groups
fail closed. Recognized metadata is bounded and discarded, never used to authorize.
Unknown security-critical fields/union members fail closed. The SDK's permissive
.get defaults are not this project's validation policy.

Each authorization resource must have valid organization/person identity structure,
exact action response type OrganizationContentAuthorizationActionType with actionType
ORGANIC_SHARE_CREATE, and a recognized single Approved/Denied status union. Do not
change that response key to the request discriminator. Other actions, mixed members,
unknown statuses, malformed resources or duplicate/conflicting target results cause
failure, not partial acceptance. Denied reasons are bounded and discarded, not logged.

Search only for the exact server-derived selected organization URN. Other valid
organizations cannot authorize the selected one; ignore them for the allow decision
while still validating the page's action/member/status structure. Exactly one target
resource must exist and be Approved with the exact expected content action. Target
Denied, missing target, duplicate target, unexpected action or untrusted bindings =>
NOT AUTHORIZED / UNVERIFIABLE, zero Posts dispatch. HTTP 200 or an Approved resource
for any other organization is insufficient.

### 19.5 Explicit pagination choice: bounded fail-closed search, no continuation

Select option **C: fail closed whenever the bounded result cannot establish the target**.
For the first implementation, maximum lookup requests/pages = **1**, action criteria =
**1**, authorization resources inspected = **20**, body <=16 KiB and the existing
parent/request/depth/node/header limits. These are PROJECT bounds, not LinkedIn quotas
or a claimed provider page size. No guessed start/count query parameters are added.

Do not call absence on the first page proof of denial. It is an unverifiable preflight
failure, with no publication attempt. To avoid hidden duplicate/conflicting target
results on later pages, an allow decision requires a complete result set within this
one response, not merely finding an Approved target somewhere on page one:
- inner paging must establish start=0, a finite nonnegative integer count/total;
- total must be <=20 and equal the number of returned authorization elements;
- count must agree with the returned complete resource set under this deliberately
  strict project parser; inconsistent values fail closed;
- no next/continuation/partial-result semantics may remain unresolved.
If paging is absent, unknown, contradictory, partial, indicates more results, or the
result exceeds the bound, fail as UNVERIFIABLE even if an Approved target is present.
This does not assert the API always returns totals or complete pages. It is permissible
for some legitimate accounts to be unavailable under this small initial capability.
No automatic page follow, retry, backoff, broad finder, or arbitrary next-link fetch.

The official client documents paging fields, optionality and result grouping, but does
not prove organization cardinality/uniqueness across hidden pages. The conservative
complete-response condition avoids relying on such an unverified guarantee. It also
removes the need to invent endpoint-specific paging advancement syntax. A future request
to improve account coverage needs separate evidence/authorization, not a silent limit
increase. Fake fixtures must cover missing/partial/inconsistent paging, out-of-bound
totals, absent target, one Approved target, duplicate/conflicting targets and malformed
other-organization entries. No tests are written or run in this reconciliation.

### 19.6 Identity requirements separated

**REQUEST_IDENTITY_REQUIREMENT:** no explicit stored person URN or person decimal ID
is required in this finder request. Supplied current official finder semantics bind
impersonator to the bearer-authenticated member. Do not add an unsupported impersonator
query or derive a person identifier from an arbitrary subject to fill one.

**RESPONSE_IDENTITY_VERIFICATION_REQUIREMENT:** bind the lookup response to this exact
finder request over the authenticated secure channel and the same logical credential/
connection version. Require structurally valid returned impersonator URNs and one
consistent impersonator across the complete result. If a trusted provider-verified
canonical person URN is available, require exact equality; a mismatch never passes.
When it is not available, the documented authenticated-member finder semantics plus
the bound Bearer request establish member association; do not use another account's
cached response. This is not an unverified 'member implicit' assumption for single GET:
it is the independently supplied rule for this selected finder. No token payload
parsing, fabricated URN or additional identity query/scope is introduced.

**CONNECTION_IDENTITY_CAPTURE_REQUIREMENT:** retain trusted provider subject and the
current versioned connection/credential model. Phase 7 must still establish an authentic
LinkedIn connection. Capturing a canonical person URN is useful for explicit comparison,
but is not an input prerequisite of this finder and must not independently block its
pure code implementation. Existing identity representation uncertainty remains a
bounded connection integration/real-account requirement, not a missing numeric-person
field needing migration. No member identity logging is required for audit.

Fresh preflight before every post, no cache, same logical credential and connection
version across lookup and eventual post, exact selected organization and snapshot/actor
revalidation remain mandatory. Reconnect/refresh/reselection/version change aborts
before post send. The lookup uses its own transport exposure state and never causes
publication UNKNOWN merely because a GET timed out. All lookup ambiguity/Denied/403/
missing scope/malformed/incomplete results fail locally before the post dispatch claim.
Existing no-retry/local FAILED semantics remain; no operation-uniqueness bypass.

### 19.7 Readiness and future implementation surface

Lookup permission stays rw_organization_admin; posting stays w_organization_social.
Generic Phase 7 scope storage remains sufficient; missing grants need separately
authorized reconnect/re-consent. NO_NEW_APPLICATION_PERMISSION_REQUIRED, content.publish
and its 32-permission role matrix unchanged. NO_SCHEMA_CHANGE_REQUIRED; no 0012.
No persistent paging cursor/cache or new credential-purpose storage is introduced.

Bounded future work remains one LinkedIn-specific profile/fixed request mapper and
strict raw BatchFinder parser, existing secure transport's typed fixed header/query/
result seams, trusted credential/snapshot bridge, and Phase 8 local-failure/claim/registry
integration with deterministic fake/DB tests. No Python SDK dependency or runtime,
generic Rest.li client, second HTTP/JSON/security layer, Page discovery or OAuth/refresh
expansion is authorized. Existing production registration gates must only admit the
reviewed LinkedIn organization organic text PUBLIC MAIN_FEED capability; other providers,
member posting, media/edit/delete/analytics/scheduling remain disabled.

**Remaining security-critical wire blockers for the selected bounded code design: NONE.**
The unresolved single-GET alias is retired from the design, not falsely verified.
BatchFinder request representation, action enum, wrapper/criteria binding and bounded
fail-closed completeness policy are now deterministic from official implementation
and supplied current official contract evidence. Code does not have to accept every
account/page shape to be secure; unsupported/incomplete responses are denied.

**CODE IMPLEMENTATION: LINKEDIN_TEXT_READY_FOR_IMPLEMENTATION.**
This is a design-readiness decision, NOT implementation authorization or completed
implementation validation. Existing repository seams still need separately authorized
code/tests; readiness does not pretend they are already implemented.

**REAL LINKEDIN ENABLEMENT: DISABLED / UNVERIFIED.**
VERSION_PIN_SELECTION_PENDING and PRODUCT_ENTITLEMENT_UNVERIFIED remain production-
enablement/final-validation gates, along with real credentials/app approval, exact
connection grants/identity, current-version verification and separately authorized
real-provider validation. No old example version, dispatchable placeholder, automatic
latest or real call is allowed. The SDK artifact does not prove app/product entitlement,
actual grants, live server behavior or deployment/Hostinger compatibility. Hostinger
remains UNVERIFIED. Production profiles remain zero, all real providers off.

Only the same two Phase 9B documents are appended. No implementation, tests, source,
config/package/dependency, migration, OAuth action, provider call, stage, commit or push.
STOP FOR REVIEW.
