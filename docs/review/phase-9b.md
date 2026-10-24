# Phase 9B — LinkedIn organization text-only contract review

Date: 2026-10-21 UTC. Research/design/repository reconciliation only.

## Immutable baseline and scope

Phase 9A CLOSED at `d43af21425572eae38d2d59bf59c4d88a91fa012`, message
`feat: establish phase 9a shared provider security foundation`.
Before research: branch main; HEAD, local main and directly verified live remote
main all equal that SHA; working tree and index clean. No baseline normalization.
Phase 9A implementation and docs/review/phase-9.md are immutable in this cycle.

Only these documentation files are added:
- `docs/research/phase-9b-linkedin-text-publishing-contract.md`
- `docs/review/phase-9b.md`

Target: future LinkedIn organization organic text-only PUBLIC MAIN_FEED creation
from existing approved immutable content, connection/destination and Phase 8 attempt,
using the Phase 9A security primitives. No personal posting, media, reshare, sponsored
or targeted distribution, edits/deletes, comments/reactions, analytics, scheduling,
OAuth work, other provider, SDK framework or UI redesign.

## Official evidence recovery

Six public Microsoft Learn documentation requests were attempted for Posts,
organization authorizations, organization access control, Marketing API versioning,
refresh tokens and rate limits. They returned URLError without retrieved bodies.
A bounded Posts-page curl check exited 56, HTTP status 000, proxy CONNECT denied.
No current official document was successfully retrieved or validated. No official
claim is classified VERIFIED_OFFICIAL in this research.

The user's supplied Posts endpoint, organization author, w_organization_social,
required header names/protocol, conceptual body, organization-action guidance and
201/x-restli-id response are EXTERNAL_OFFICIAL_EVIDENCE. The exact supported version,
organization-authorizations wire protocol/scopes, post-ID grammar, publication proof,
error non-creation guarantees, quota and token-refresh eligibility remain UNVERIFIED.
No specific role-list conflict was independently established. Supplied role examples
are not an authorization allowlist; organizationAcls is not a guessed fallback.
No LinkedIn API, organization query, authorization query, OAuth, token refresh, upload,
publication, deletion or credential operation was performed.

## Repository reconciliation and decisions

Connection storage supports provider/subject, version, selected destination,
access/optional refresh encrypted credentials, expiry/scopes/status and refresh lease.
Actual credential/account values were not read. remoteId is persisted from grant
metadata, not currently enforced as a LinkedIn numeric ID. Recommend bounded decimal
string identity and a server-derived organization URN; its proposed numeric length
is a project admission rule, not a provider maximum. Selection changes already have
purpose-bound step-up and version/AAD rotation. Phase 8 active-destination admission
does not currently require selected_id equality; the stricter LinkedIn policy is a
future explicit design decision, not baseline behavior falsely claimed.

Phase 8 snapshots/unique claims/events/safe IDs fit the narrow design:
**NO_SCHEMA_CHANGE_REQUIRED; migration 0012 needed: NO** for this design.
**NO_NEW_APPLICATION_PERMISSION_REQUIRED**; keep 32 permissions and content.publish
Owner/Marketing Admin YES, Creator/Reviewer/Viewer NO. No schema/grant modification.
If later verified contracts prove a necessary extra durable structure, revisit the
decision explicitly rather than invent a migration now.

Proposed commentary is the exact approved caption. Separate hashtags must already
be represented by the exact approved caption suffix or dispatch is rejected pending
normal edit/reapproval; never append/omit/duplicate them at provider time. Preserve
Unicode/LF and JSON encoding without rewriting/truncation. Commentary bounds <=3000
Unicode scalars and <=12000 UTF-8 bytes are PROJECT bounds; full JSON <=32 KiB.
Provider limits and commentary formatting semantics are not verified.

Native idempotency: NO_VERIFIED_NATIVE_IDEMPOTENCY, not a claim that none exists.
Use local attempt uniqueness and no redispatch after possible send. Provisional
201 + strictly bounded validated share/ugcPost URN maps to ACCEPTED, not fabricated
PUBLISHED. Missing/invalid ID, unexpected success/status or ambiguous send maps to
UNKNOWN; no auto retry, sleep or redirect. No error-status-only non-creation claims.
A read-only publication/status proof remains unverified and is an activation blocker.

Organization preflight: BLOCKED_BY_OFFICIAL_CONTRACT. Prefer action-based fresh
ORGANIC_SHARE_CREATE authorization bound to the exact member/token/organization,
not stale roles. Exact method/query/action/response/scopes/version and mandatory
provider semantics must be verified before implementing any request. Proposed project
policy checks at selection and immediately before publication with local revalidation;
it cannot atomically eliminate a provider-side revocation race. No cached allowlist.
Posting scope is supplied evidence; do not add unverified broader scopes.

Refresh classification: REFRESH_CONTRACT_UNVERIFIED. A sufficiently valid token can
support a one-shot request without refresh; expired/stale versions fail closed.
No real connection adapter exists in the baseline, so schema availability does not
establish an operational LinkedIn connection. No generic refresh or OAuth expansion.
Pinned server-owned reviewed version/profile is recommended; no concrete version,
latest behavior, user/runtime injection or invented sunset date is chosen.

## Required future contract deltas, not implementation

Phase 9A reuse is required, but not sufficient unchanged. Current transport does not
emit LinkedIn version/protocol headers, return x-restli-id or permit a verified
empty/header-based success; HTTP errors lose safe observed status. Production
registries remain empty/test-gated, the publishing intent lacks the trusted full
security Binding, and social credential loading is service-private. These are
explicit future review/implementation scopes, not permission to bypass the security
boundary or modify closed Phase 9A now.

The contract proposes the smallest provider-specific mapping module, narrowly
reviewed existing-transport header/result changes, a bound credential/authority bridge,
and Phase 8 reviewed-production admission wiring. No second HTTP client/parser,
SSRF layer, timeout system or arbitrary header bag. A complete deterministic local
fake-provider matrix covers success/ID, statuses, bodies, ambiguity, revocation,
version/approval binding, duplicate claims, limits and redaction. No tests were created
or run. Any future real test needs separate explicit authorization and test-account/
public-side-effect/cleanup planning; none is performed here.

## Readiness and final preservation

**LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.** Security-critical gaps include current
authorization preflight contract, supported pinned version, response/publication
proof, provider text/ID/error contracts, connection prerequisites and explicit
transport compatibility changes. The design is not implementation authorization.
All five real providers remain DISABLED / UNVERIFIED; no production profile created.
No new Hostinger requirement beyond Phase 9A identified; Hostinger UNVERIFIED.

Read-only final integrity checks confirm baseline refs unchanged, index empty,
exactly the two authorized documentation paths untracked, no tracked changes.
All 12 migration manifest hashes unchanged, no 0012; permission catalog unchanged.
No production/test/config/package/lockfile/environment/grant changes. No Phase 9A
history changed. No validation suite, build, install, audit or secret scan run.
No staging, commit or push. STOP FOR REVIEW.

## External official evidence recovery reconciliation — 2026-10-21

The initial review above is preserved verbatim as INITIAL CODEX RETRIEVAL/history.
This addendum records newly supplied EXTERNAL OFFICIAL EVIDENCE and the current
decisions in contract section 15. No independent documentation retrieval was attempted
in this pass, and no claim was upgraded to VERIFIED_OFFICIAL. Baseline remains
main / HEAD / local / live remote d43af21425572eae38d2d59bf59c4d88a91fa012;
Phase 9A CLOSED. Only the same two documentation candidate files are changed.

Recovered official Posts evidence resolves the organization text-only POST endpoint,
version/protocol headers, w_organization_social posting permission, PUBLIC/MAIN_FEED/
PUBLISHED examples, and successful creation 201 with x-restli-id containing share or
ugcPost URNs. Native idempotency remains NO_VERIFIED_NATIVE_IDEMPOTENCY; use local
attempt uniqueness and UNKNOWN/no redispatch after possible send.

The supplied official Organization Authorizations and Getting Started pages are:
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/getting-started

They establish optional-but-recommended permission-oriented checks, operation families
GET/BATCH_GET/BATCH_FINDER, member/impersonator + organization + action binding, and
ORGANIC_SHARE_CREATE. The supplied Quick Start discovery guidance for organizationAcls
is complementary, not contradictory. Do not hard-code role examples or expand Page
or OAuth discovery. Project policy is now resolved: fresh action authorization for
the exact selected connection/member/organization before POST, with local version/
snapshot revalidation; preflight failure prevents dispatch and is definite FAILED.

Exact action-authorization wire request implementable: NO. Still missing are the
single GET resource-key/finder representation and encoding, person-versus-impersonator
parameter/identity semantics, organization/action key/nesting/escaping, required
least-privilege read scope/product entitlement, affirmative response envelope/binding/
missing-result semantics, and endpoint-specific version/header requirements. This is
POLICY_RESOLVED_WIRE_CONTRACT_PENDING and SECURITY_CRITICAL_UNRESOLVED, not a blanket
browse-only blocker. No trial POST or role-guessing fallback after preflight failure.

Final design maps strict 201 + exactly one accepted x-restli-id to PUBLISHED for this
admitted synchronous text-create operation. This supersedes the initial conservative
ACCEPTED choice; no asynchronous processing or read/status requirement is invented.
Existing publishedAt is a trusted local confirmation-observation timestamp constrained
by existing clock checks, not a claimed LinkedIn creation timestamp. Missing/malformed/
duplicate ID, unexpected success or ambiguous post-send outcome remains UNKNOWN.
The narrow share/ugcPost decimal grammar and <=256-byte outer bound are PROJECT policy,
not a claim about every provider-valid ID or official maximum.

Refresh is REFRESH_OPTIONAL_CONNECTION_LIFECYCLE. Externally supplied official refresh
documentation limits programmatic availability to approved Marketing Developer Platform
partners. Valid existing access token sufficient: YES; refresh required in this slice:
NO. Phase 7 explicitly supports absent refresh and does not require a refresh job.
Expired tokens without verified refresh do not dispatch; use the separately established
reconnection lifecycle. No 2-legged client-credentials publishing for Marketing APIs.

Concrete version selected: NO, VERSION_PIN_SELECTION_PENDING. It need not precede
pure adapter coding, but supported-version evidence and an explicit server-owned pin
must precede production profile freeze, complete implementation validation and any
real dispatch. No latest or dispatchable placeholder. This is not the only external
pending item: the authorization wire contract remains missing. Provider quota,
complete ID universe, error guarantees and optional refresh details do not independently
block safe narrow code when local bounds, conservative UNKNOWN and no retry are used.

Future seams are explicitly bounded: two typed profile-bound request headers
(Linkedin-Version and literal X-Restli-Protocol-Version), existing JSON content type
and bound Bearer injection, and one closed create-response metadata type containing
only status 201 plus validated safe postId. No raw Headers/Set-Cookie/Location map,
caller header dictionary, response persistence or second HTTP/JSON/security stack.
A dedicated header-based success class ignores/discards bounded body data rather than
inventing a body ID or parsing requirement; existing JSON classes remain strict.
Registry/credential/snapshot bridges are REPOSITORY_IMPLEMENTATION_GAP, not already
implemented integrations. Only one future reviewed LinkedIn organization organic
text PUBLIC MAIN_FEED capability may be admitted; other operations/providers stay off.

Schema remains NO_SCHEMA_CHANGE_REQUIRED, migration 0012 required NO; permissions
remain NO_NEW_APPLICATION_PERMISSION_REQUIRED, count 32 and unchanged role matrix.
Approved caption/hashtag immutability and pre-dispatch project admission remain intact.
No new Hostinger requirement identified; Hostinger UNVERIFIED. All real providers
remain DISABLED / UNVERIFIED, no production profile created or enabled.

**Current readiness: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED**, specifically because the
adopted secure action preflight cannot yet be implemented deterministically from the
supplied wire/scopes/response evidence. This decision is not based solely on Codex's
retrieval limitation. Policy, success-state, token and version-strategy decisions are
now resolved separately from that gap; no implementation is authorized even if later
wire evidence resolves it.

Final integrity: both original document byte prefixes preserved; HEAD/local/live
remote unchanged; only the two Phase 9B documents are candidate files, index empty.
No Phase 9A production/test/config/history, packages/lockfile, migrations, permission,
provider, OAuth or credential change. No tests/gates or provider API calls performed.
No stage, commit or push. STOP FOR REVIEW.

## Contract-2 — organization authorization wire recovery — 2026-10-21

This is a separate chronological append after initial discovery and external official
evidence reconciliation. Baseline main / HEAD / local / live remote remains
 d43af21425572eae38d2d59bf59c4d88a91fa012; Phase 9A CLOSED. Only the same two
Phase 9B documentation files are candidate changes; index empty.

The single research target was the exact authenticated-member + selected-organization
+ ORGANIC_SHARE_CREATE preflight, not Posts/OAuth/refresh/schema redesign. Both exact
Microsoft Learn Organization Authorizations pages from the external evidence were
requested as public documentation: proxy CONNECT denied, curl exit 56, HTTP 000 and
zero body bytes. Public MicrosoftDocs candidate Markdown paths on main/master and
master README returned 404; repository metadata retrieval failed (URLError). No usable
current official schema, example or version-tied generated SDK was recovered. The
candidate source paths are not validated documentation edit links; their 404s do not
prove the endpoint or current reference is absent. No third-party normative source.
Prior supplied official claims remain EXTERNAL_OFFICIAL_EVIDENCE without downgrade.

Contract section 16 answers every wire question independently. Resource family,
GET/BATCH_GET/BATCH_FINDER operation families, conceptual person/impersonator/
organization/action binding, ORGANIC_SHARE_CREATE and possible 403 are established
externally. Still UNVERIFIED: exact single-check REST path and key/finder selector,
query/Rest.li encoding, implicit-member versus explicit person/impersonator identity,
organization/action representation, least read scope, endpoint product entitlement,
endpoint-specific headers/version, affirmative/negative response fields, exact binding
proof, response completeness/cardinality and pagination. No query example, List/tuple
syntax, q value, response field or OAuth scope is invented.

Exact authorization preflight implementable deterministically: NO. The required
next official evidence is a current single-check wire example/reference plus its
scope/product requirements and strict affirmative/negative response schema with
binding and pagination guarantees. A concrete request alone would not prove response
permission parsing. Externally supplied official evidence with those facts can resolve
this; Codex browsing is not intrinsically required.

Project decision remains binary and fail closed: fresh remote preflight on every
creation attempt, strict Phase 9A JSON/UTF-8/duplicate-key/depth/node/size handling,
all three bindings plus affirmative decision and complete results required. 0 matches
rejects; 1 can allow only after all checks; >1/duplicates/conflicts reject. These are
project cardinality rules, not a guessed API collection shape. Unknown pagination or
continuation rejects without auto-walking pages. No forever cache, role fallback,
trial POST, automatic retry or extra permission invented. The wire serializer remains
unselected pending exact official Rest.li syntax; no generic client is proposed.

Same logical connection/token purpose/version must serve preflight and post, with
selection/version/snapshot/actor revalidation before send. Existing canonical numeric
organization storage can derive either representation if an official wire contract
requires it; exact URN-wire compatibility remains unknown. Scope storage is already
bounded/general enough to represent a verified extra lookup scope, but no broader
scope is requested now. Product entitlement is distinct from OAuth/app RBAC and from
optional refresh-partner eligibility.

An important explicit future integration boundary is recorded: current Phase 8 marks
DISPATCHING before provider.publish and catches thrown errors as UNKNOWN. To keep
lookup uncertainty from being called ambiguous publication, future preflight belongs
before the post claim, outside DB locks. Admitted CREATED records may transition to
LOCAL FAILED with existing VALIDATION/AUTHORIZATION/CAPABILITY/TRANSPORT/rate-limit
categories and safe INVALID/ACCESS_LOST/UNSUPPORTED/UNAVAILABLE/RATE_LIMITED codes.
No post request or remote ID exists. Failure before admission need not manufacture
an operation. The current remote-oriented append/result seam needs a narrow future
local-failure path, not enum casts or a new state. Retry remains subject to existing
uniqueness; no automatic reset/delete/new-request-ID bypass is designed.

Typed LinkedIn request headers can be reused for lookup only when confirmed by that
endpoint's official contract. Existing credential injection and JSON Accept remain
project requirements; endpoint-specific version/protocol/content-type requirements
are UNKNOWN. No Posts requirement is reopened, no arbitrary header/query map or raw
response/credential logging is introduced. A future exact request/parser belongs in
the single bounded LinkedIn module and existing security/dispatch seams, not a generic
Rest.li SDK or second HTTP/JSON/security stack. No proposed implementation file created.

Contract-2 readiness: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED. This is specifically due
to missing deterministic authorization wire/scopes/affirmative-binding semantics,
not general retrieval access or optional refresh. VERSION_PIN_SELECTION_PENDING
remains bounded later work. The resolved Posts PUBLISHED success mapping, valid-token
sufficiency, no refresh requirement, no blind redispatch and exact commentary remain
unchanged. Schema NO_SCHEMA_CHANGE_REQUIRED, no 0012, no new application permission.
All provider profiles remain unimplemented/disabled; Hostinger UNVERIFIED.

Final integrity: prior document byte prefixes preserved; baseline refs unchanged,
only two documentation paths untracked, no tracked changes and index empty. No
Phase 9A history, production/test/config/package/lockfile/migration/permission change.
No /rest/posts, /organizationAuthorizations or any real LinkedIn API call. No OAuth,
validation suite, stage, commit or push. STOP FOR REVIEW.

## Contract-3 — supplied exact single-GET wire evidence — 2026-10-21

This append follows initial research, external reconciliation and Contract-2 without
rewriting any of them. Immutable Phase 9A main / HEAD / local / live remote baseline:
d43af21425572eae38d2d59bf59c4d88a91fa012. Only the same two Phase 9B docs are candidate
files; index empty. No independent official retrieval or broader research was performed
in Contract-3. The newly supplied current Microsoft Learn reference evidence remains
EXTERNAL_OFFICIAL_EVIDENCE, not independently VERIFIED_OFFICIAL.

Contract section 17 resolves the exact single-GET strategy from the documented role
example: /rest/organizationAuthorizations/<compound-key>, whose fields are impersonator,
organization and nested action. The member is explicit as a trusted person URN, not
merely implicit in a Bearer token. Selected decimal organization ID derives its URN
server-side. Encode URN components once (colon -> %3A), preserve fixed Rest.li syntax,
never double encode, and do not add a guessed q/finder or BatchFinder collection.
GET/BATCH_GET/BATCH_FINDER authorizationActionsAndImpersonator support is retained as
evidence, but only single GET is selected. No pagination or multi-result selection.

The role example proves organizationRoleAuthorizationAction/actionType structure.
The semantic content type OrganizationContentAuthorizationAction and allowed
ORGANIC_SHARE_CREATE are supplied. However, the exact lower-camel wire member
organizationContentAuthorizationAction is only a conceptual candidate in the supplied
material. PascalCase naming and the analogous role example do not independently prove
its alias. **UNVERIFIED** is retained for that field only. One official current
content-action request/response or schema alias definition is the smallest remaining
normative wire evidence needed. Do not restore resolved Contract-2 unknowns as blockers.

Read permission is now externally established: rw_organization_admin, distinct from
posting w_organization_social. Example headers are Bearer Authorization, Rest.li
2.0.0, Linkedin-Version YYYYMM and Content-Type application/json. Existing Accept JSON
is project transport policy. The fixed-header seam must support the official JSON
Content-Type on bodyless GET without inventing a body or arbitrary header map.
Version header requirement is established; concrete supported pin remains pending.

Single-resource affirmative response is structurally bound by exact impersonator,
organization and confirmed content action/actionType plus exactly
status {com.linkedin.organization.Approved:{}}. Denied status with reasons is an
explicit external negative example; reasons are not needed for denial and are not
persisted/logged. Unknown/malformed union, mismatch, duplicate key, collection or 403
fails closed. Strict Phase 9A parsing and no raw response exposure remain mandatory.
There is no 200/nonempty/organization-only shortcut and no collection pagination.

Read-only Phase 7 inspection: generic bounded Grant.metadata.subject is stored verbatim
as social_authorizations.subject. It can hold person URNs, but no real LinkedIn adapter
establishes that an existing subject is the required person identity. Classification:
IDENTITY_REPRESENTATION_UNRESOLVED; storage sufficient, actual trusted member value not
proven. No account values were inspected. Bounded remediation is a reviewed LinkedIn
connection-profile/verified identity-capture contract using the existing subject field,
then exact validation/derivation in the trusted bridge. Do not fabricate from an app
UUID/OIDC sub or silently normalize old reconnect identities. Decimal-only acceptance
is a project restriction, not a claim about all provider person IDs. This solution
needs no migration and is not a second unresolved endpoint wire field.

Existing scope storage can represent both permissions. A future provider requiring
both scopes can mark partial grants LIMITED; dispatch must explicitly verify both,
since a legacy CONNECTED state may reflect an older requested set. Missing permission
requires separately authorized reconnect/re-consent, never a trial POST or scope edit
in this pass. Product entitlement remains PRODUCT_ENTITLEMENT_UNVERIFIED and separate
from OAuth scope or refresh-partner eligibility. Entitlement and a supported concrete
version are real-provider enablement gates, not inherently barriers to disabled-profile
code against deterministic fake tests. Real credentials/app approval/account identity
and separately authorized real verification are also enablement prerequisites.

Fresh preflight remains before every creation; same logical connection and credential
version, exact selected organization and trusted member, with current local authority
rechecked before send. Lookup/encoding/permission/Denied/403/malformed/mismatch/timeout/
DNS/TLS failure is local pre-dispatch FAILED, not publication UNKNOWN. Reuse Contract-2's
CREATED -> LOCAL FAILED design before the post dispatch claim; no new state or enum cast,
retry, role fallback, cache, auto-page traversal or operation-uniqueness bypass.

Schema remains NO_SCHEMA_CHANGE_REQUIRED, no 0012. Application RBAC remains 32 with
content.publish; no new app permission. No Posts/content/state/idempotency/refresh
contract was reopened. Shared transport seams stay closed and typed, with a tiny
LinkedIn-specific fixed compound-key serializer once the content alias is established.
No generic Rest.li client, second HTTP/parser/security layer or provider code created.

**CODE IMPLEMENTATION: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED**, specifically the
unproven exact content-action Rest.li union member. The identity capture gap has a
bounded existing-schema solution; concrete version, entitlement and real account
verification remain separate enablement work. **REAL LINKEDIN ENABLEMENT: DISABLED /
UNVERIFIED.** No real provider profile/call, OAuth action or change to Phase 9A.

Final preservation: original document prefixes retained, refs unchanged, only two
untracked docs, no tracked changes/index entries. No production/test/config/package/
lockfile/migration/permission change, test/gate execution, staging, commit or push.
STOP FOR REVIEW.

## Contract-4 — final content request-alias reconciliation — 2026-10-21

Preserve all earlier phases/Contracts verbatim. Baseline remains
 d43af21425572eae38d2d59bf59c4d88a91fa012; Phase 9A CLOSED, index empty and only the
two Phase 9B documentation files are candidate changes. Contract-4 researches no
other provider or resolved decision.

Current official Microsoft Learn evidence supplied externally establishes semantic
OrganizationContentAuthorizationAction, response/mapping type
OrganizationContentAuthorizationActionType, and ORGANIC_SHARE_CREATE. It also proves
role REQUEST organizationRoleAuthorizationAction differs from role RESPONSE
OrganizationRoleAuthorizationActionType. All are EXTERNAL_OFFICIAL_EVIDENCE, not a
claim that Codex independently retrieved them. Two bounded direct checks of the exact
authorization-reference and getting-started documentation pages again returned curl
56 / HTTP 000 / proxy CONNECT denied; no current explicit content request mapping
was recovered. No real LinkedIn API call was made.

Contract section 18 explicitly supersedes Contract-3's assertion that the request
alias must match the returned action key. Request and response branches must be
validated against their independent contracts. The future strict response parser
expects exactly OrganizationContentAuthorizationActionType with actionType
ORGANIC_SHARE_CREATE, exact impersonator and organization bindings, and the single
com.linkedin.organization.Approved status branch. All other structure/status/binding
fails closed before publication. The lower-camel request candidate is not an alternate
response key. No parser implementation or tests were added.

The request member organizationContentAuthorizationAction remains UNVERIFIED. Neither
PascalCase response/type naming nor the analogous role alias proves it. Required
closing evidence is a current official content request example, schema/union definition,
generated API reference or official source mapping explicitly identifying the REQUEST
alias. No acceptable mapping was supplied/recovered; no inferred literal, alternate
finder/role/ACL check, cache or trial POST is substituted.

Exactly one hard wire blocker remains:
CONTENT_AUTHORIZATION_REQUEST_UNION_KEY_UNVERIFIED.
Semantic type, response type and action enum are not additional blockers.

Actual member identity status remains IDENTITY_REPRESENTATION_UNRESOLVED; the existing
subject field fits a bounded verified connection-profile/identity-capture solution
without schema change. Lookup/posting scopes remain rw_organization_admin and
w_organization_social, with generic existing storage and reconnect/re-consent if a
grant is missing. Schema remains NO_SCHEMA_CHANGE_REQUIRED, no 0012, no app RBAC
addition. Version pin and product entitlement remain separate enablement/final-
validation gates. No real provider readiness is claimed.

CODE IMPLEMENTATION: LINKEDIN_TEXT_IMPLEMENTATION_BLOCKED.
REAL LINKEDIN ENABLEMENT: DISABLED / UNVERIFIED.
This is a missing explicit request-alias contract, not a claim that resolved semantics
or the response parser are unknown. No Phase 9A change, source/test/config/package/
migration/provider/OAuth change, test/gate execution, staging, commit or push.
Final integrity confirms the prior documentation prefixes preserved, original refs
unchanged, only the same two untracked docs and index empty. STOP FOR REVIEW.

## Contract-5 — official LinkedIn client / BatchFinder decision — 2026-10-24

Chronological append only: initial research and Contracts 2–4 remain verbatim.
Baseline main / HEAD / local / live remote remains
 d43af21425572eae38d2d59bf59c4d88a91fa012; Phase 9A CLOSED, index empty, only the
same two Phase 9B docs are candidate files. No implementation authorized here.

Official source recovery succeeded in this pass: linkedin-developers/
linkedin-api-python-client README and supporting client/encoder/header/response
source were fetched at pinned main/HEAD 6331e52f5ea59b326447efa67a9bf925ed2d9ec7,
HTTP 200. Main README and pinned README hashes matched:
a427c7cf40cb087a220c0b1d78854096213ac059d0fdda74192686cede2b1431.
Evidence class is VERIFIED_OFFICIAL_IMPLEMENTATION_EVIDENCE for the contents actually
retrieved, not a claim of current live API validation. Microsoft Learn's current
finder/member/action semantics remain the prior supplied EXTERNAL_OFFICIAL_EVIDENCE.
The README's example 202212 version is old, NOT selected and not evidence of support.
The SDK is beta and was neither installed nor imported/executed. No provider API call.

The official README explicitly demonstrates /organizationAuthorizations with finder
 authorizationActionsAndImpersonator and authorizationActions criteria using
OrganizationContentAuthorizationAction / ORGANIC_SHARE_DELETE. Microsoft Learn's
independently supplied action enum establishes ORGANIC_SHARE_CREATE, so one CREATE
criterion with the same discriminator is supported without a naming inference.
Source client.py inserts bq (not q); official encoder establishes List/object syntax,
constants map BATCH_FINDER to GET, and header construction emits X-RestLi-Method:
BATCH_FINDER. The fixed request target and sources are recorded in contract section 19.
No extra organization/member query, query tunneling or arbitrary parameters/headers.

Operation decision: BATCH_FINDER_SELECTED. Its explicit official content request
representation is stronger evidence than the unresolved single-GET content alias.
Microsoft Learn's role compound-key alias and the SDK's role criteria discriminator
have different casing. Therefore single-GET content alias stays UNVERIFIED; the old
lower-camel candidate is SUPERSEDED_UNVERIFIED_HYPOTHESIS. It is retired from this
slice, not silently verified or left as a fallback. The request/response distinction
also remains: response content type is OrganizationContentAuthorizationActionType,
not renamed to the new request discriminator.

The raw response has outer elements of ordered per-criterion results and inner
authorization elements. Require one criterion/result group, no isError/error, strict
bounded schema and the exact expected content action, consistent member binding,
valid status and exact selected organization. Other organizations cannot authorize
the target. Exactly one target Approved is required; Denied, duplicate/conflicting
results, unknown status/action or malformed data fails locally with zero Posts calls.
The generic SDK's permissive .get defaults are not the project parser.

Pagination choice C: bounded fail-closed search. Maximum 1 lookup request/page and 20
inner authorization resources, 16 KiB existing STATUS_RESPONSE bound and existing
JSON/deadline/header limits. No pagination follow, next-link fetch, retry or sleep.
An allow requires complete results within the page: start=0, valid count/total,
total <=20 and equals returned resources, consistent count, no unresolved continuation.
Missing/partial/inconsistent paging is UNVERIFIABLE, even if a positive target is
present. Missing target on an incomplete first page is not claimed to prove Denied;
it simply cannot authorize this attempt. This strict project admission policy may
make some real accounts unavailable; it does not guess a provider quota/page size or
require inventing endpoint-specific advancement. No permissive first-match behavior.

Identity requirements separated:
- REQUEST: no explicit stored person URN required; supplied official finder semantics
  bind impersonator to the authenticated member using the Bearer credential.
- RESPONSE: bind to this exact secure request/connection version, validate consistent
  impersonator structure, compare exact trusted person URN when available, require
  selected organization and expected action/status. No cached result or fabricated ID.
- CONNECTION: authentic LinkedIn subject/grant/version remains required, but a numeric
  person field is no longer needed as request input. Capturing canonical identity
  supports extra verification; its absence alone is not a code wire blocker.
Same logical credential/version must serve lookup and post; revalidate local authority
and selection before send. Existing fresh-preflight/local FAILED and post-send UNKNOWN
separation remains. No connection refresh/OAuth/discovery or automatic retry expansion.

Lookup/post scopes remain rw_organization_admin and w_organization_social; existing
scope storage and content.publish/32 permissions suffice. NO_SCHEMA_CHANGE_REQUIRED;
no 0012, cache/cursor persistence or new credential storage purpose. Future changes
remain bounded typed transport/header/query/result and trusted Phase 8/connection
seams, one LinkedIn module and deterministic fake/DB tests, all separately authorized.
No SDK dependency, generic framework or parallel security stack.

Remaining security-critical wire blockers for this selected bounded code design: NONE.
Single-GET alias is not needed. CODE IMPLEMENTATION:
LINKEDIN_TEXT_READY_FOR_IMPLEMENTATION. This is readiness, NOT implementation or
production enablement authorization. REAL LINKEDIN ENABLEMENT: DISABLED / UNVERIFIED.
VERSION_PIN_SELECTION_PENDING, PRODUCT_ENTITLEMENT_UNVERIFIED, real credentials/app
approval/grants/identity/current-version checks and separately authorized real validation
remain enablement/final-validation gates. Profiles remain zero; all providers disabled;
Hostinger UNVERIFIED. No claim of live API success or deployment compatibility.

Final integrity: original document byte prefixes preserved; baseline refs unchanged,
only two documentation files untracked, index empty and no tracked changes. No Phase
9A/source/test/config/package/lockfile/migration/permission change, no tests/gate run,
no OAuth/provider call, stage, commit or push. STOP FOR REVIEW.

## Phase 9B implementation plan — 2026-10-24

Authorized Contract-5 implementation, test-only loopback provider, real profiles empty.
Planned ADD: src/server/provider-security/linkedin.ts; src/server/publishing/linkedin-text.ts;
tests/unit/linkedin-text.test.ts; tests/unit/linkedin-transport.test.ts;
tests/helpers/linkedin-fixtures.ts; tests/database/linkedin-publishing.test.ts.
Planned MODIFY: src/server/provider-security/transport.ts; src/server/publishing/provider.ts;
src/server/publishing/service.ts; this review by append only.
LEAVE UNCHANGED: contract document, Phase 9A history, UI, configs, package/lock,
dependencies, schema/migrations, grants, permissions and all real provider registries.
No real LinkedIn/OAuth call or production version/profile enablement is authorized.


## Phase 9B bounded implementation and single complete gate — 2026-10-24

Baseline: main; HEAD, local main and directly verified live remote main remain
`d43af21425572eae38d2d59bf59c4d88a91fa012`. Initial candidate was only the two
approved Phase 9B documents, with an empty index. Contract-1 through Contract-5
history is preserved; the approved research contract is byte-for-byte unchanged.

Actual file plan matches the plan above. Added production modules:
`src/server/provider-security/linkedin.ts` and `src/server/publishing/linkedin-text.ts`.
Modified production modules: `src/server/provider-security/transport.ts`,
`src/server/publishing/provider.ts`, `src/server/publishing/service.ts`.
Added tests: `tests/unit/linkedin-text.test.ts`, `tests/unit/linkedin-transport.test.ts`,
`tests/database/linkedin-publishing.test.ts`, plus `tests/helpers/linkedin-fixtures.ts`.
Only this review receives implementation evidence. No UI, config, package, lockfile,
dependency, schema, migration, grant, permission or production-registry change.

Implemented Contract-5 boundary: fixed GET BatchFinder
`authorizationActionsAndImpersonator`, request discriminator
`OrganizationContentAuthorizationAction`, action `ORGANIC_SHARE_CREATE`.
Lookup requires `rw_organization_admin`; posting requires `w_organization_social`.
One request/page, at most 20 resources, 16 KiB authorization response. Complete
paging and exactly one Approved selected organization are required; inconsistent
member/action/organization/status, duplicates, partial paging, malformed/unknown
security-critical structures or lookup failure fail closed. No pagination loop or
lookup retry. The authenticated member is implicit in the finder request; a trusted
stored person URN is compared exactly when available, while opaque legacy subjects
are never fabricated into person URNs. No identity/schema expansion.

The trusted Phase 8 bridge binds snapshot, intent hash, selected destination,
connection/authorization/credential version, scopes and credential lifetime.
Fresh remote preflight occurs before DISPATCHING, then local authority is revalidated
before POST. Local failures append existing FAILED / LOCAL events, with no new state.
Secure credential injection uses the existing encryption/AAD boundary and short-lived
grants. Typed profile-owned headers supply Linkedin-Version, Rest.li 2.0.0, JSON and
BATCH_FINDER only for lookup; no arbitrary header/query map is accepted. Typed creation
metadata exposes only a validated x-restli-id, never raw Headers or response bodies.
Phase 9A bounded TLS/network/JSON protections remain in use, with separate preflight
and POST exposure tracking.

POST maps only organization organic text PUBLIC MAIN_FEED to `/rest/posts`.
Approved commentary is sent exactly; hashtag handling validates the already approved
suffix and never appends. Media, unsupported fields and invalid admission bounds are
rejected before dispatch; no AI, normalization, truncation or URL rewriting occurs.
Project post ID grammar is `^urn:li:(share|ugcPost):[1-9][0-9]{0,19}$`, with an additional
256-byte bound. Exact 201 plus one valid ID maps to PUBLISHED; published_at records
local confirmation time, not a claimed provider creation timestamp. Missing or invalid
success evidence after possible send is UNKNOWN. Definite no-send is FAILED locally;
possible post-send failures are UNKNOWN with no blind redispatch or native idempotency
claim. A failure while recording a confirmed response cannot become a no-send result.

Only a test-environment factory exists, pinned to local TLS loopback using a synthetic
CA while preserving original host/SNI verification. Production provider registries
remain empty; there is no dispatchable real LinkedIn profile. Fake version 202601 is
only deterministic test configuration, not a supported production-version assertion.

Focused validation chronology (not complete-gate reruns): initial new unit/transport
subset 99 passed. The first database selection collected zero tests because the
existing isolated MySQL server was stopped; its existing verified state was restarted
without recreating users, grants or schema. The next focused database run had 1 pass
and 20 fixture failures caused by a reused unique synthetic provider identity; test
fixtures were corrected to use unique identities and matching response members.
Implementation review also tightened post-response observation ambiguity and added
its regression. Final focused security/LinkedIn subset: 272 passed across 5 files,
1.42s. Final focused database subset: 43 passed across 2 files, 12.49s (including all
21 new LinkedIn database cases and 22 existing publishing cases). Final focused public
typecheck, lint and secret scan passed. Test retries were zero; timeout policies were
unchanged. These focused results do not substitute for the failed complete gate.

Single complete gate: candidate bytes frozen at fingerprint
`14a62f8c96ac49841c06ce48de38e67f589874d98b78cb45849b84bdb65e1a8a`.
Temporary runner initialization was corrected before any gate command started; no
application validation stage was executed by those initialization attempts.
Effective npm cache: `/workspace/.npm-cache`; pinned Node/npm environment retained.
Each executed gate stage ran once:

| Stage | Result | Duration |
| --- | --- | --- |
| npm ci | PASS | 11.285s |
| lint | PASS | 4.179s |
| public typecheck | PASS; no LayoutProps duplicate | 2.615s |
| secret scan | PASS | 12.408s |
| audit (`npm audit --audit-level=low`) | FAIL, exit 1 | 1.890s |

Audit stopping evidence: 3 vulnerable packages, critical 1 / high 1 / moderate 1 /
low 0 / total 3: Next.js (critical), undici (high), fast-uri (moderate).
Reported Next advisories: GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r,
GHSA-673q-mjm6-r5xr. undici: GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472,
GHSA-xjj6-f33q-929c. fast-uri: GHSA-w74x-v6f9-j3xg, GHSA-xhq7-xmqj-769h,
GHSA-wjr9-j795-jxcr, GHSA-333x-w4r6-6crp. No audit fix, package change,
diagnosis or audit rerun was performed. Secret scan covered 322 repository files
and 516 unique historical blobs across 15 commits without printing credentials.

STOPPED at audit. Complete Unit/UI, complete MySQL, browser, production build,
npm ls and gate diff-check were NOT RUN. Browser retry count is not applicable
because the browser stage was not reached. No gate failure rerun, test retry,
timeout increase, generated-output cleanup or candidate mutation during the gate.
Post-gate/pre-review fingerprint equals the pre-gate fingerprint above; all Git-visible
candidate bytes and tracked baseline bytes remained unchanged during execution.

Read-only final integrity (not continuation of the stopped executable gate): all 12
migration manifest hashes match, 0000–0011 only, no 0012. 0010 SHA-256:
`b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`;
0011 SHA-256: `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`.
Permission catalog and role matrix unchanged: 32 permissions; content.publish Owner
YES, Marketing Admin YES, Creator NO, Reviewer NO, Viewer NO. No DB/schema/runtime
grant change or new application permission. Existing public typecheck/build config,
Phase 9A review, primary/dedicated tsconfigs and synthetic test JSX Preserve remain
unchanged. Candidate: 11 paths, 8 new, 3 modified, 0 deleted, no unexpected files;
index empty. No stage, commit or push.

All five real providers (Facebook, Instagram, TikTok, YouTube, LinkedIn) remain
DISABLED / UNVERIFIED; real production profiles 0. No real provider, OAuth, refresh,
authorization or Posts API call, and no real post was created. Hostinger UNVERIFIED.
Production YYYYMM selection, product entitlement, app approval, real credentials,
both grants, verified identity capture/destination, separately authorized real preflight
and text-post validation, and deployment compatibility remain enablement gates.
Historical browser evidence is unchanged; no fresh browser evidence was produced.

Final classification: PHASE_9B_COMPLETE_GATE_FAILED. Implementation is not classified
validated pending commit. No repair/rerun follows this result. STOP FOR REVIEW.


## Phase 9B bounded dependency remediation and fresh complete gate — 2026-10-24

Chronology preserved: the preceding implementation record and original complete gate
failure at audit remain unchanged. The subsequent read-only dependency diagnosis
established that package.json and package-lock.json were identical to the closed
Phase 9A baseline: the vulnerable dependency graph predated Phase 9B, rather than
being introduced by its LinkedIn implementation. This entry records the separately
authorized bounded remediation, focused compatibility, and one new complete gate.

Baseline main / HEAD / local main / directly verified live remote main:
`d43af21425572eae38d2d59bf59c4d88a91fa012`. Initial index empty; initial candidate
11 paths (8 new, 3 modified, 0 deleted), fingerprint
`3d4b8331cdfb5c85f6a4efacf20ac5572a725e3bfba7f2d7cc2c0e872c1335b1`.
Established Node 24.21.0 / npm 11.19.0 used throughout dependency resolution and
validation; npm cache `/workspace/.npm-cache`. Engines/packageManager unchanged.

Only dependency metadata changed before validation:
- package.json: exact Next pin 16.4.0 -> 16.4.1, and no other field change.
- package-lock.json: Next 16.4.1, @next/env 16.4.1, eight existing optional @next/swc-*
  entries 16.4.1, undici 8.11.2 -> 8.12.2, fast-uri 3.1.8 -> 3.1.9, plus the root
  Next reference and the published Next optional sharp constraint ^0.35.5.
  Installed sharp remains 0.35.5. No packages added/deleted or unrelated record churn.

Normal npm resolution generated the reviewed lock in a temporary copy, then an exact
next@16.4.1 install synchronized the repository graph. A supported npm time cutoff
was used while resolving the missing undici lock entry to retain the authorized
8.12.2 rather than newer 8.12.3; the fast-uri entry was resolved separately to 3.1.9
without reopening the retained undici resolution. Repository metadata received only
the approved graph. No direct transitive dependencies, overrides, parent upgrades,
npm update, audit fix/force, package-upgrade tools or cache cleanup. jsdom 30.1.2,
secretlint 13.0.7, both AJV 8.20.0 parents and React/React DOM 19.3.0 remain unchanged.
No vulnerable old Next/undici/fast-uri copy remains in the resolved graph.

Focused compatibility, before the complete gate: npm ls next/undici/fast-uri all
PASS with exact approved versions; npm audit PASS with 0 vulnerabilities; lint,
public typecheck and secret scan PASS. The same 272 LinkedIn/security cases across
five files PASS (1.62s test-reported), the same 43 database cases across two files
PASS (14.59s test-reported), and an additional existing 12-case jsdom UI selection
PASS (1.33s). No tests changed. Focused production build PASS (15.285s command),
with legitimate dev-generated routes present and no cleanup. Public typecheck still
uses next typegen && tsc --noEmit -p tsconfig.typecheck.json. No code/config change
was necessary for Next 16.4.1 or React 19.3.0 compatibility.

Before the new complete gate, all original candidate bytes except package.json and
package-lock.json matched the pre-remediation snapshot, including implementation,
tests, contract, review, migrations, permission catalog and configurations.
Production registries remained empty and test LinkedIn remained loopback-only.
Frozen candidate: 13 paths, 8 new, 5 modified, 0 deleted; empty index; fingerprint
`b146656a32113dedfa6078c47f500be8d78345c7b3ef88f1db18de5cb48c02de`.

Exactly ONE fresh complete gate ran from the beginning in this remediation cycle.
Every executable stage ran once. Zero failure reruns, zero test/browser retries,
no timeout increase, no candidate mutation during execution, no generated cleanup.

| Complete-gate stage | Result | Command duration |
| --- | --- | --- |
| npm ci | PASS | 9.835s |
| lint | PASS | 3.546s |
| public typecheck | PASS; LayoutProps duplicate absent | 2.745s |
| secret scan | PASS | 12.552s |
| audit | PASS; critical/high/moderate/low/total all 0 | 0.662s |
| Unit/UI | 920 passed, 0 failed, 0 skipped | 22.011s |
| MySQL | 988 passed, 0 failed, 0 skipped | 372.752s |
| Browser | 112 passed, 0 failed, 0 skipped; 0 retries | 142.367s |
| Production build | PASS, Next 16.4.1, TypeScript checked | 4.425s |
| npm ls --all | PASS | 0.442s |
| git diff --check | PASS | 0.006s |
| Final migration/permission/provider/candidate invariants | PASS | read-only |

The full Unit/UI suite includes 15 passing typecheck/build-contract cases. State C
PASS in 138.45ms with no timeout; production-phase config regression PASS. Build
artifact config proves ./tsconfig.typecheck.json selected, ignoreBuildErrors false,
useTypeScriptCli true; primary/dedicated tsconfigs and phase-bounded next.config.ts
unchanged. Build log confirms TypeScript ran; no LayoutProps TS2300. Pre/post-build
dev routes remained present and byte-identical, SHA-256
`f404695096264d2e948b5c223467aef548692e89cfbae2a47e49fd38017202d9`.
Build emitted a dynamic filesystem tracing warning in unchanged media/storage.ts;
no source change, suppression or workaround was applied.

Final pre-review candidate fingerprint equals the frozen gate fingerprint above.
All 12 historical migration hashes match the manifest and baseline, 0000–0011,
no 0012. 0010: b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce;
0011: 4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652.
32 permissions unchanged; content.publish Owner YES, Marketing Admin YES, Creator
NO, Reviewer NO, Viewer NO. No DB/schema/grant change. Phase 9B implementation,
tests and approved contract unchanged by this remediation; this successful entry
is the only authorized review append after the gate. No deleted/unexpected files.

Production profiles 0. Facebook, Instagram, TikTok, YouTube and LinkedIn remain
DISABLED / UNVERIFIED. No real LinkedIn/provider/OAuth/refresh/authorization/posts
call and no real post. VERSION_PIN_SELECTION_PENDING and PRODUCT_ENTITLEMENT_UNVERIFIED
remain. Real app approval, credentials, both granted scopes, verified identity and
destination, separately authorized real preflight/text-post validation, and Hostinger
compatibility remain production-enablement gates. Hostinger UNVERIFIED. Historical
browser classifications remain unchanged; this records a fresh complete browser pass,
not an inference of historical flakiness.

Final classification: PHASE_9B_IMPLEMENTATION_VALIDATED_PENDING_COMMIT.
Real LinkedIn remains DISABLED / UNVERIFIED. No stage, commit, push or provider
enablement. STOP FOR REVIEW.
