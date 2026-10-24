# Phase 9C — LinkedIn production enablement Contract-1

Date: 2026-10-24 (Asia/Karachi). Research and design only.
Primary result: **PHASE_9C_CONTRACT_1_PARTIALLY_BLOCKED**.
Phase 9B remains CLOSED; real LinkedIn remains DISABLED / UNVERIFIED.

## 1. Baseline and authority

Branch main, HEAD/local main/directly verified live remote main:
`7d9f43777a68fe0b47c0a4bcebf9a8ffc52ac593`.
Commit: `feat: add bounded linkedin organization text publishing`.
Parent verified: `d43af21425572eae38d2d59bf59c4d88a91fa012`.
Working tree CLEAN and index EMPTY before research. Production OAuth/publishing
registries are empty; real production provider profiles 0. Migration manifest
has 12 unchanged SQL files, 0000–0011; no 0012. Permission catalog has 32 entries;
content.publish: Owner YES, Marketing Admin YES, Creator/Reviewer/Viewer NO.

This document does not authorize implementation, production configuration, OAuth,
credential entry, token exchange/refresh, real identity/discovery/preflight, posting,
deployment, provider enablement, staging, commit or push. Public official source
retrieval only. No SDK was installed or executed; a temporary public Git checkout
was used only to inspect official source at a fixed commit.

## 2. Evidence discipline and source register

All retrievals below occurred on **2026-10-24**. Publication/commit dates are separate
from retrieval date. A successful public source fetch is not app entitlement or
live API validation. Unretrieved pages provide NO new normative content here.
Prior Phase 9B EXTERNAL_OFFICIAL_EVIDENCE retains that provenance; it is not silently
promoted to independently retrieved current Microsoft Learn documentation.
No CURRENT_OFFICIAL_DOCUMENTATION body from Microsoft Learn was retrievable.

### 2.1 Current Microsoft Learn / developer-documentation attempts

Publisher for L1–L8: Microsoft Learn, LinkedIn documentation. Publisher for L9:
LinkedIn Developer. Titles are intended reference titles; page bodies, visible
update dates and selected API views were unavailable. Classification for new
current claims from these attempts: **UNVERIFIED**. Each public HTTPS request failed
at the outbound proxy with `Tunnel connection failed: 403 Forbidden`. This does not
prove the API is unavailable, that the app was denied, or that a feature was removed.

| ID | Intended source / URL | Currentness evidence obtained |
| --- | --- | --- |
| L1 | Marketing API Versioning — https://learn.microsoft.com/en-us/linkedin/marketing/versioning | No body/date/version list/sunset schedule |
| L2 | Posts API — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | No current versioned operation schema |
| L3 | Organization Authorizations — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations | No current enum, permission, status or paging reference |
| L4 | Authorization Code Flow — https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow | No current redirect/PKCE/lifetime rules |
| L5 | Sign In with LinkedIn using OpenID Connect — https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 | No current identity response/stability contract |
| L6 | Refresh Tokens with OAuth 2.0 — https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens | No current program eligibility or rotation/lifetime rules |
| L7 | Rate Limits — https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits | No current endpoint/tier quotas |
| L8 | Error Handling — https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/error-handling | No current operation-specific safe-retry guarantee |
| L9 | Community Management API product — https://developer.linkedin.com/product-catalog/marketing/community-management-api | No current product/tier/approval terms |
| L10 | Community Management access target — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api/access | Proxy 403; even current page availability/title unconfirmed |

Official raw-source recovery was also attempted under MicrosoftDocs/linkedin-docs:
`https://raw.githubusercontent.com/MicrosoftDocs/linkedin-docs/main/linkedin/` plus
marketing/versioning.md, community-management API overview/access-tiers, Posts,
Organization Authorizations/getting-started, OIDC, authorization-code, refresh,
rate-limit and error-handling paths. These returned HTTP 404. README.md on main,
master and live also returned 404. These are failed discovery attempts, not proof
of official API behavior or a claim that an authoritative current mirror was found.
No unofficial mirror, third-party tutorial or naming inference was used.

### 2.2 Successfully retrieved official LinkedIn implementation

Publisher/owner: **linkedin-developers**, repository
https://github.com/linkedin-developers/linkedin-api-python-client .
Direct public Git HEAD/main verification and immutable source retrieval both identify
commit **6331e52f5ea59b326447efa67a9bf925ed2d9ec7**. Its commit timestamp is
**2023-11-20T16:36:05+05:30**. Classification: **OFFICIAL_IMPLEMENTATION_EVIDENCE**,
with explicit historical-age limitation. A current-main retrieval does not turn a
2023 artifact into a current Marketing API release/support statement.
README marks the client beta; examples contain versions 202212 and 202302 and legacy
identity/member-post scopes. No version in those examples is selected for production.

All I-source URLs below use the immutable prefix:
https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/
Each was read, not executed. The raw.githubusercontent.com equivalent returned HTTP
200; examples/CHANGELOG were read from the same public Git commit.

| ID | Path / document title | Exact evidence and limitation |
| --- | --- | --- |
| I1 | [README.md](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/README.md) — LinkedIn API Python Client | Organization authorization BatchFinder example, uppercase content discriminator; /userinfo example says openid + profile; beta and stale version examples |
| I2 | [linkedin_api/clients/restli/client.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/client.py) — RestliClient | batch_finder places finder in bq and criteria in authorizationActions; ordered per-criterion results; no endpoint-specific default/max page size |
| I3 | [linkedin_api/clients/restli/utils/encoder.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/utils/encoder.py) — Rest.li parameter encoder | Sorted keys; List(...) and (...) structured values; primitive strings URL encoded once |
| I4 | [linkedin_api/clients/restli/utils/api.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/utils/api.py) — URL/header helpers | Version chooses /rest; protocol 2.0.0; Bearer; LinkedIn-Version; JSON; X-RestLi-Method |
| I5 | [linkedin_api/common/constants.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/common/constants.py) — protocol constants | BATCH_FINDER maps to GET; /v2 and /rest bases; OAuth /oauth/v2 base; created ID x-restli-id. Actual emitted headers in I4 take precedence over an unused enum typo |
| I6 | [linkedin_api/clients/restli/response_formatter.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/response_formatter.py) — response formatters | Raw outer elements -> per-criterion inner elements/paging/metadata/error/isError |
| I7 | [linkedin_api/clients/restli/response.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/restli/response.py) — response classes | BatchFinderResult paging is optional in generic client; start/count/total fields; no mandatory total guarantee for this endpoint |
| I8 | [linkedin_api/clients/auth/client.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/auth/client.py) — AuthClient | POST /oauth/v2/accessToken with form authorization_code, code, client_id, client_secret, redirect_uri; separate refresh/introspection helpers |
| I9 | [linkedin_api/clients/auth/response.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/auth/response.py) — auth response classes | expires_in TTL; refresh fields only if enabled; scope documented comma-separated; introspection active/auth_type/client_id/expires_at/scope/status. No current numeric lifetime promise |
| I10 | [linkedin_api/clients/auth/response_formatter.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/auth/response_formatter.py) — auth formatters | Actual token/introspection field names consumed; scope/refresh can be absent; absence cannot prove full grants |
| I11 | [linkedin_api/clients/auth/utils/oauth.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/linkedin_api/clients/auth/utils/oauth.py) — member authorization URL builder | response_type=code, redirect_uri, space-separated requested scopes; optional state in this client; no PKCE parameters in this helper |
| I12 | [examples/create_posts.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/examples/create_posts.py) — create-post examples | /posts text commentary, PUBLIC, MAIN_FEED, PUBLISHED, empty target/channel arrays. MEMBER author, version 202302, legacy scope: not current organization entitlement evidence |
| I13 | [examples/get_profile.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/examples/get_profile.py) — member profile | Historical /v2/me and r_liteprofile, not proof of current availability under Community Management/OIDC |
| I14 | [examples/oauth_member_auth_redirect.py](https://github.com/linkedin-developers/linkedin-api-python-client/blob/6331e52f5ea59b326447efa67a9bf925ed2d9ec7/examples/oauth_member_auth_redirect.py) and examples/README.md | Historical localhost callback demonstration only. Its token-printing/weak sample handling is explicitly NOT adopted |
| I15 | CHANGELOG.md | Only links to GitHub release notes; no supported Marketing API version/sunset statement |

Selected exact retrieved artifact SHA-256 values for evidence reproducibility:
README a427c7cf40cb087a220c0b1d78854096213ac059d0fdda74192686cede2b1431;
client.py fee1868081338a87afb8d7e7c7c0739564617edbeea7bdeacd29f5542efe4b45;
encoder.py 77929247f82e8b587663ece91e23865cb9b0a8c23883a9e246cb47e60f511b47;
response_formatter.py 6bcb23ebb565bcac59fdc74f84e3f220133bfaf0ba0276b21dbb7f5ee2d11efb.

### 2.3 Historical evidence retained, not reverified as current

Closed docs/research/phase-9b-linkedin-text-publishing-contract.md records externally
recovered Microsoft Learn evidence for organization-author permissions, action enum,
Approved/Denied unions, 201 + x-restli-id, share/ugcPost examples and conditional
Marketing Developer Platform partner refresh. Its source classification here is HISTORICAL_OFFICIAL_DOCUMENTATION, retaining
EXTERNAL_OFFICIAL_EVIDENCE provenance for this production-currentness decision.
No current official contradiction was established; lack of retrieval is not a
contradiction and does not reopen or invalidate the closed fake-tested implementation.

## 3. Version and entitlement decisions

PRODUCTION_LINKEDIN_VERSION: **VERSION_SELECTION_BLOCKED**. No YYYYMM selected.
Current supported-version list, exact sunset dates, finite support duration, operation
availability and support for ONE common pin across /rest/posts and
/rest/organizationAuthorizations remain UNVERIFIED. 202212/202302 examples and the
Phase 9B test-only 202601 value are not candidates. Do not infer 202610 from the date.

Project operational policy (design only): one reviewed server-owned YYYYMM for both
operations after current release-specific evidence supports it. No user/UI/DB free-text
selection or dynamic latest. Maintain a reviewed evidence record, official sunset if
known, owner, next-review date and local stop date. Human review at least monthly
and on provider deprecation notices; next review no later than 30 days after approval.
Fail closed after the local review/stop date, and before official sunset with an
explicit operational margin (proposed seven days). These are PROJECT bounds, not
LinkedIn's advertised support period. If sunset cannot be established, no production
enablement. Do not silently advance the pin or fall back to another version.

Community Management API is the relevant product RESEARCH TARGET from L9/historical
research; **exact currently required entitlement/access tier for BOTH operations is
UNVERIFIED**. Do not claim product access merely from scope names or successful SDK
serialization. Confirm current product name, whether Development or Standard tiers
exist for these operations, access to both rw_organization_admin and
w_organization_social, applicable app review, associated Page/admin verification,
business verification and partner conditions from current official reference and
later a separately authorized app-configuration review.

Development-tier organization/member restrictions, app-admin association, eligible
test organizations, numeric quotas and whether it suffices for a controlled validation
are UNVERIFIED. Standard-tier/customer-organization requirements, qualification and
review are UNVERIFIED. No access application or tier upgrade is requested here.
Do not infer that all Page roles or all organizations are eligible for either tier. Exact current organization/member role requirements are UNVERIFIED; no ADMINISTRATOR/CONTENT_ADMIN role-name check is substituted for fresh ORGANIC_SHARE_CREATE authorization.

## 4. Scopes, OAuth, identity and redirects

### 4.1 Minimal scopes and grants

Frozen operation scopes remain lookup **rw_organization_admin**, post
**w_organization_social** (historical external L3/L2 evidence, not newly current-
verified). Exact current product/tier availability remains a gate. Member authorization
is the design: no client-credentials organization publishing. I8's generic 2-legged
helper is not evidence that Marketing APIs permit it.

I1's /userinfo example expressly identifies **openid + profile** and the Sign In with
LinkedIn using OpenID Connect product. These are an OFFICIAL_IMPLEMENTATION_EVIDENCE
identity candidate, not current minimum-scope/product-availability verification.
**email is rejected as unnecessary** for this slice absent a new proven requirement.
No w_member_social, r_liteprofile, ad, analytics, media or broad read scope is added
because a historical example uses it. Establish current minimum identity scope(s)
before freezing a future requestedScopes allowlist.

Phase 7 stores requested and actually granted scopes separately, max 30 unique bounded
values. It rejects unrequested scopes; a strict subset becomes LIMITED; Phase 9B also
requires both publishing/preflight scopes. Missing grants require reconnect/re-consent,
never a local status upgrade or assumed inherited consent. Callback scope is not
trusted proof of grants. I9/I10 expose scope and introspection active/client_id/expiry;
use a reviewed exact response/introspection contract before claiming reliable grant
inspection. Do not assume a field is always present, or fabricate requested scopes
when absent. Future parser must respect verified delimiter/schema, client binding,
3-legged context and expiry. No introspection was performed.

### 4.2 OAuth flow and security

I8/I11 corroborate server-side member authorization-code flow:
GET https://www.linkedin.com/oauth/v2/authorization with response_type=code,
client_id, exact redirect_uri, requested scopes and project-mandatory state;
POST https://www.linkedin.com/oauth/v2/accessToken using form encoding with code,
client_id, client_secret, grant_type=authorization_code and the same redirect_uri.
These are documentation-only endpoint descriptions; neither URL was called.

Authorization-code flow: REQUIRED by project design, supported by official client.
State: OPTIONAL in I11's helper; current official platform requirement UNVERIFIED;
**REQUIRED by existing repository policy**. Existing random 256-bit, hashed,
ten-minute, single-use state binds provider/brand/actor/session/auth version and
callback URI. Claim commits EXCHANGING before provider I/O; no automatic replay.
PKCE: **UNVERIFIED for the current LinkedIn confidential-web flow**. Its absence
from an old client is not evidence of UNSUPPORTED. Existing provider-specific S256
support/encrypted verifier must remain; do not choose pkce=false merely because the
old example omits it. Verify current support/requirement before real profile design.

Client secret in I8 is server-side form input, never browser/DB free text/source/log.
Future setup uses approved hosting secret controls, existing independent encryption
key boundary and least-privilege server access. Do not invent/create environment
variables or request credentials in this research. No raw tokens/codes/secret values
in chat, issues, docs, fixtures or shell history. No example token printing is adopted.

Redirect current provider rules: exact matching/case/normalization, HTTPS exceptions,
query restrictions and fragment behavior remain UNVERIFIED because L4 was unavailable.
I14 shows a historical localhost callback, not blanket current development approval.
PROJECT policy remains HTTPS production origin plus fixed
`/api/oauth/linkedin/callback`, computed from trusted APP_URL; no incoming Host,
forwarded-host, returnTo, query or fragment input. Intended production URL must be
registered and checked byte-for-byte later; actual registration/current provider
matching rules remain unverified. Do not invent a Hostinger domain or register it.

### 4.3 Trusted member identity

Candidate: I1 /userinfo + I4/I5 unversioned base gives
GET https://api.linkedin.com/v2/userinfo with the SAME fresh member token; scopes
candidate openid/profile. No call was made. Current claim schema (including sub),
issuer/audience/app scoping, identifier stability and relationship to Marketing
`urn:li:person:...` are **UNVERIFIED**. I13's /v2/me legacy id/person example is not a
current alternative automatically available under the required entitlement.

Classification: **MEMBER_IDENTITY_CAPTURE_BLOCKED** pending those exact semantics.
Existing subject string (1–200 bytes/characters within admitted ASCII identifier
shape) can store a verified opaque subject/person URN if the actual contract fits;
no new persistence need has been shown. Do NOT turn an OIDC sub or arbitrary legacy
subject into a person URN. Phase 9B compares a trusted stored person URN when available;
otherwise it checks consistent person URNs within the bearer-bound finder response.
This is not evidence that OIDC sub and Marketing person IDs are interchangeable.
The future connection profile must capture identity before attaching a grant, bind
it to the expected server-owned app/issuer, reject mismatches/reconnect swaps and
review invalidation if the configured application identity changes. Never use email
as the stable subject or parse an unverified ID token into trusted identity. If a
future design consumes ID tokens, its signature/issuer/audience/expiry/nonce contract
requires separate review; it is not implicitly covered by the current service.

## 5. Organization discovery, binding and pagination

Future trusted lifecycle: secure OAuth exchange -> verified member identity ->
provider-verified organization authorizations -> canonical organization IDs -> user
selects an opaque INTERNAL destination ID -> server binds that active destination to
brand/provider/authorization/current version -> fresh remote action preflight before
every POST. Typing an organization ID never establishes authority.

The frozen finder can supply organization URNs in its authorization resources. If
current endpoint evidence confirms complete Approved ORGANIC_SHARE_CREATE results,
those can seed a bounded verified destination list (max 20) with a safe server-generated
label; a separate display-name API is not inherently required for authorization.
Current complete discovery semantics, any needed official Page metadata lookup and
required discovery scope remain UNVERIFIED. organizationAcls may concern discovery;
it is not a role-guess fallback for action authorization. No additional scope or
endpoint is selected without evidence. Derived canonical positive decimal IDs must
fit 1–20 digits; selected org URN is constructed server-side, never accepted as an
arbitrary trusted post value.

Phase 7 already stores authorization, generic subject/scopes/expiry, discovered
LINKEDIN_ORGANIZATION destinations, active status and separate selected_id. Selection
requires step-up and same live authorization/brand/provider membership, increments
version and rebinds token AAD. Reconnect cannot swap subject and resets selection.
Grant admission requires 1–20 verified destinations: OAuth success alone cannot
attach a destination-less trusted connection under the current interface.

Exact frozen preflight request (I1–I5 independently corroborate structural encoding;
ORGANIC_SHARE_CREATE/authenticated-member semantics retain historical external evidence):

```text
GET https://api.linkedin.com/rest/organizationAuthorizations?authorizationActions=List((OrganizationContentAuthorizationAction:(actionType:ORGANIC_SHARE_CREATE)))&bq=authorizationActionsAndImpersonator
```

Typed headers: Bearer via credential boundary; Linkedin-Version reviewed YYYYMM;
X-Restli-Protocol-Version 2.0.0; X-RestLi-Method BATCH_FINDER; JSON Content-Type/Accept.
Request discriminator is uppercase OrganizationContentAuthorizationAction. Response
parser expects OrganizationContentAuthorizationActionType; do not interchange those
or revive the unverified lower-camel single-GET alias. No explicit person input is
added to this bearer-member finder. Current operation/version/permission/enum and
member-semantics revalidation is still incomplete; BatchFinder current validity:
**UNRESOLVED**, with structure corroborated and no demonstrated contradiction.

I6/I7 confirm raw outer elements and per-criterion inner elements/paging/error shape;
results correspond to requested criteria order. They do not promise mandatory total,
endpoint default count, max count, current paging field semantics or a target-org
filter. Default page size UNVERIFIED; maximum UNVERIFIED; request count=20 support
UNVERIFIED. The existing fixed path does NOT request count/start. Do not silently add
such parameters or claim it receives exactly 20 by default.

PROJECT admission remains one request/page, <=20 resources, <=16 KiB; one criteria
result; required start=0 and count=total=number of returned resources; exact action;
consistent impersonator and known trusted member match where available; exactly one
selected organization with sole Approved status. Denied, missing/partial/oversized
paging, missing/duplicate target, conflicting member/action/status, error, malformed
body or unknown security-critical structure fails closed before POST. No second page,
truncation, authorization cache, role guessing or trial post.

**One-request policy still safe: YES as a fail-closed security policy.** Whether the
current API can produce an admissible complete response for an eligible organization
is UNRESOLVED. Optional generic-client paging is a concrete availability uncertainty;
it does not prove an endpoint contradiction. No
PREFLIGHT_PAGINATION_CONTRACT_CONFLICT is established. If current official evidence
later proves required pagination or mandatory response semantics cannot satisfy the
frozen policy, stop with that classification and request review; never weaken it.

## 6. Posts, IDs, errors and ambiguity

Frozen request: POST https://api.linkedin.com/rest/posts; server-derived organization
author; exact approved commentary; visibility PUBLIC; distribution MAIN_FEED with
empty targetEntities/thirdPartyDistributionChannels; lifecycleState PUBLISHED;
isReshareDisabledByAuthor false; no media/member posting/edit/delete/scheduling.
I12 corroborates the text body fields, but is a 202302 MEMBER example, not current
organization-specific normative proof. Current Posts API validity/field changes:
**UNRESOLVED** until L2's supported versioned organization schema can be rechecked.
No material incompatibility has been proved; closed Phase 9B remains unchanged.

Headers retained: server-injected Authorization Bearer, server-pinned Linkedin-Version,
X-Restli-Protocol-Version 2.0.0, Content-Type application/json, Accept application/json.
The transport requests identity encoding and refuses compressed responses/redirects.
No arbitrary caller-controlled headers. Exact 201 plus one valid x-restli-id remains
the historical externally supported creation contract and PROJECT PUBLISHED mapping;
missing/malformed/duplicate success metadata is not successful publication. I5/I6
corroborate created-ID header handling, not a current operation-specific 201 guarantee.
PUBLISHED timestamp is local confirmation time, not invented provider creation time.

Project grammar remains `^urn:li:(share|ugcPost):[1-9][0-9]{0,19}$`, <=256 bytes.
Current sufficiency classification: **PROJECT_GRAMMAR_REQUIRES_REVIEW**, because the
current organization-create response reference is unavailable, not because a new
valid form was observed. Historical share/ugcPost examples remain compatible. Do not
broaden the grammar or accept arbitrary URNs, URLs or capability references.

Current numeric quotas: **UNVERIFIED_PROVIDER_QUOTA**, separately for preflight,
Posts and OAuth/token endpoints. App-tier dependence, portal-only quotas, endpoint
headers and exhaustion/reset rules remain unverified. SDK paging examples are not
quotas. Project byte/time limits and Phase 7 rate controls are not LinkedIn quotas.

| Response/failure | Future policy; current official specifics |
| --- | --- |
| 401 | Preflight fails before post; inspect authorization lifecycle through safe categories only. Current endpoint-specific meaning/re-auth contract UNVERIFIED |
| 403 | Preflight fails before post; historical L3 says insufficient permissions. No assumption of exact missing scope vs entitlement vs role from status alone |
| 404 | Preflight fails closed; do not infer authoritative absence from ambiguous resource/version/application context; exact API meaning UNVERIFIED |
| 409 / 422 | Operation-specific semantics UNVERIFIED; no assumption of duplicate detection, idempotency or safe resubmission |
| 429 | Fail closed in preflight; do not blindly repeat a possibly sent POST; exact rate/reset/Retry-After guarantees UNVERIFIED |
| 5xx / timeout / DNS/connect/TLS | Lookup uncertainty is FAILED before publication. Actual POST uses definite-no-send vs possible-send exposure; possible-send => UNKNOWN |
| Version/scope/entitlement errors | Exact current error code/body union UNVERIFIED. No automatic fallback version, added scope, role bypass or trial post |

Any authorization-preflight failure maps to existing LOCAL FAILED, not publication
UNKNOWN, because POST has not begun. After possible POST bytes, no trustworthy final
success => UNKNOWN. No blind redispatch or hidden retry loops. Existing Phase 8 local
attempt uniqueness remains authoritative; do not conflate request IDs with idempotency.
**NO_VERIFIED_NATIVE_IDEMPOTENCY**: no current official native create-idempotency
mechanism was recovered. This is absence of verified evidence, not proof none exists.

Deletion/rollback: current official organization DELETE path/permissions/status are
UNVERIFIED (L2 unavailable). Do not implement DELETE or infer it from a generic SDK
method. Prefer separately verified, authorized Page-admin manual UI deletion for the
first controlled post if removal is desired; its availability must be checked before
posting. API deletion is a separate future surface requiring exact evidence and
authorization. Deletion cannot be promised to reverse prior public exposure.

## 7. Token lifecycle and storage

Current default access-token lifetime, product-dependent/long-lived alternatives,
refresh lifetime and rotation/reuse semantics: **UNVERIFIED**, no numbers invented.
I9/I10 establish expires_in and optional refresh_token/refresh_token_expires_in fields,
not universal issuance or numeric durations. Historical external L6 evidence makes
programmatic refresh conditional on approved Marketing Developer Platform partner
access; exact current eligibility remains unverified. Do not assume every connection
gets refresh tokens or copy a generic refresh implementation into this phase.

**REFRESH_NOT_REQUIRED_FOR_INITIAL_VALIDATION** as a bounded project design decision:
a freshly obtained, unexpired member access token with verified identity, both grants,
verified destination and sufficient remaining request budget can serve an explicitly
authorized initial validation. Existing services admit null refresh credentials and
fail when access expires. Long-term unattended use/refresh is a separate lifecycle
requirement; token expiry never licenses an automatic ambiguous retry.

**EXISTING_CREDENTIAL_MODEL_SUFFICIENT_FOR_INITIAL_VALIDATION** for the planned
bounded Bearer-token model, conditional on the verified response fitting existing
admission bounds. Phase 7 encrypts access/optional refresh with AES-256-GCM using
independent existing TOKEN_ENCRYPTION_KEY, random IV/tag, key ID and AAD binding
provider/authorization/purpose/version. It stores scopes, access/refresh expiries,
connection version and selected destination separately from credentials. Tokens are
SensitiveValue objects, bounded to 8192 bytes; expiry admission is explicit and
positive (access expiresIn <=31536000 seconds; refresh <=63072000 are PROJECT caps,
not provider lifetimes). No real secret was inspected.

No token_type DB column is needed for a profile that admits only verified Bearer
semantics; future OAuth parsing must reject an incompatible type rather than silently
assume it. The exact current token response is a contract gate. Refresh lease/version
logic exists but no real LinkedIn refresh adapter or job is configured. No new secret
file, generic token persistence, key rotation scheme or schema is proposed.

## 8. Repository reconciliation and smallest future code surface

| Repository source | Existing support | Still needed before real enablement |
| --- | --- | --- |
| src/server/social/provider.ts | Generic official/test connection interface, grant validation, requested scopes, nullable refresh; productionProviders() empty | Reviewed LinkedIn OAuth/identity/discovery adapter and typed secret-aware form exchange; current exact wire/scopes/PKCE evidence |
| src/server/social/service.ts / policy.ts | State, callback parsing, step-up, grant/selection/version lifecycle, no provider I/O under DB lock, encrypted PKCE/credentials | Implement trusted real identity and verified destination capture inside complete Grant; no arbitrary ID admission |
| src/server/social/crypto.ts / schema.ts | Purpose-bound authenticated encryption; subject/scopes/expiry/credential-version persistence | Configure existing server secret boundary only after separate approval; verify actual token/subject bounds |
| src/server/provider-security/linkedin.ts | Fixed BatchFinder/Posts paths, scope constants and strict ID/version syntax | Reviewed operational pin/expiry policy; regex alone is not supported-version verification |
| src/server/provider-security/transport.ts / network.ts / response.ts | HTTPS443, DNS/IP/peer/TLS binding, no redirect/proxy/compression, bounded fatal-UTF8/duplicate-key JSON, typed result metadata | LinkedIn typed seam currently rejects non-test environments and requires loopback hooks. Future production construction must be separately reviewed, never pass test hooks in production |
| src/server/publishing/linkedin-text.ts | Pure mapping, strict authorization parser, fresh preflight, version-bound credentials, exact success/UNKNOWN policy | Only createTestLinkedInProvider exists; a production-specific reviewed construction path is absent |
| src/server/publishing/provider.ts / service.ts | Preparation bridge, immutable attempt/approval/scope/destination/version checks, empty production registry | PublishingProvider.mode is test-only and service rejects populated providers outside test. Explicit bounded production registration support must precede real dispatch |
| next.config.ts / tsconfig.typecheck.json / package files | Closed typecheck/build repair; Next16.4.1 and validated dependency graph | No changes proposed |

The OAuth client-secret form exchange is not implemented by the existing LinkedIn
JSON-only transport seam; it must not be emulated by arbitrary headers/URL/body
injection. Future design should add only reviewed operation-specific confidential
OAuth and identity/discovery boundaries while preserving existing network/secret
policies. No SDK installation, generic Rest.li client, second security stack or test
factory exposed in production. This is an implementation gap, not a Phase 9B defect.

Schema decision: **NO_SCHEMA_CHANGE_REQUIRED** for the currently planned bounded
identity/grant/destination design. No concrete missing persistence requirement was
established. Final identity/token semantics must fit existing strict bounds before
implementation; if they prove a real storage gap, reclassify explicitly rather than
invent fields now. No 0012. Application RBAC remains separate: content.publish for
publishing, existing integrations.manage/read and step-up for connection management.
No new application permission; external OAuth scopes do not expand local RBAC.

Future production profile requirements: fixed official authority and paths; one
supported reviewed server-owned YYYYMM and stop date; typed required headers/result
metadata; exactly the two proven operation scopes plus justified identity scope(s);
organization/organic/text/PUBLIC/MAIN_FEED only; no media/member/schedule/delete;
confirmed entitlement/tier and per-app approval; explicit unverified/validated state;
same current connection/credential/destination binding. No profile was created.

## 9. Gap matrix and readiness

| Requirement | Evidence | Repository support | Status | Next action |
| --- | --- | --- | --- | --- |
| Supported common API pin/sunset | L1 unavailable; I1 versions stale | Syntax-only version check | BLOCKED | Obtain current versioned operation support/sunset evidence |
| Product and scopes at required tier | Historical L2/L3; L9/L10 unavailable | Generic scope allowlist/storage | BLOCKED | Establish exact program/tier/scope eligibility |
| Actual app/product approval | No app inspection permitted | Empty real registries | EXTERNAL_APPROVAL_REQUIRED | Later authorized app review; no application now |
| Development/Standard restrictions | Current reference unavailable | No assumed tier | UNVERIFIED | Verify organizations/members/quotas/customer access/review |
| OAuth state/step-up/version storage | Repository | Implemented | SATISFIED_BY_EXISTING_CODE | Preserve |
| LinkedIn OAuth/PKCE/redirect contract | I8/I11; L4 unavailable | Generic flow only | BLOCKED | Verify current confidential-web details before adapter |
| Real callback and client credentials | No production setup | Trusted-origin fixed callback; secret abstractions | EXTERNAL_CONFIGURATION_REQUIRED | Separate safe hosting/app setup authorization |
| Member identity | I1 OIDC vs I13 legacy; L5 unavailable | Generic subject, no real capture | BLOCKED | Recover current identifier schema/stability/app binding |
| Organization discovery | I1/I6 and historical L3 | Destination model/selection exists | IMPLEMENTATION_REQUIRED | Reviewed provider-verified bounded discovery after wire confirmation |
| Current preflight schema/paging | I1–I7 structural; current L3 unavailable | Strict one-page parser | BLOCKED | Verify current endpoint can establish complete bounded result |
| Posts current organization semantics | Historical L2; I12 member example | Frozen mapper/success parser | UNVERIFIED | Revalidate current versioned organization-create reference |
| Credential encryption/expiry storage | Repository/I9 | Existing sufficient bounded model | SATISFIED_BY_EXISTING_CODE | Verify actual response fits before activation |
| Initial fresh-token/no-refresh policy | Repository expires/null-refresh support | Fail on expired access | DESIGN_READY_NOT_CONFIGURED | Use only under later explicit live validation approval |
| Long-term refresh entitlement/rotation | Historical L6; I9 optional fields | Generic lease only | UNVERIFIED | Separate future lifecycle contract |
| Production transport/registration | Repository hard guards | Test-only factory/seam; empty registries | IMPLEMENTATION_REQUIRED | Separately authorize bounded real construction after contracts |
| Version operational stop policy | Project design, not provider rule | Not configured/implemented | DESIGN_READY_NOT_CONFIGURED | Review and separately authorize bounded implementation |
| Hosting/account prerequisites | Local deployment record only | Local gate passed, no deployment | UNVERIFIED | Verify actual account/runtime/network/secrets/DB later |
| First real OAuth/preflight/post | No live activity | No production profile | REAL_PROVIDER_VALIDATION_REQUIRED | Explicit approvals, one step at a time |

Secondary readiness (design/current evidence, not runtime enablement):
VERSION_READINESS BLOCKED; ENTITLEMENT_READINESS BLOCKED; OAUTH_READINESS PARTIAL;
MEMBER_IDENTITY_READINESS BLOCKED; ORGANIZATION_IDENTITY_READINESS PARTIAL;
PREFLIGHT_READINESS PARTIAL; POST_CONTRACT_READINESS PARTIAL;
TOKEN_LIFECYCLE_READINESS PARTIAL; HOSTING_READINESS UNVERIFIED;
REAL_VALIDATION_READINESS BLOCKED.

Separate blocker classes:
- CODE: no real OAuth/identity/discovery adapter, no production LinkedIn factory,
  test-only transport and publishing registration guards, operational version policy absent.
- CONFIGURATION: final HTTPS APP_URL/callback, one supported pin/review stop, reviewed
  server secret references and app/issuer binding not configured.
- LINKEDIN APPROVAL: exact current Community Management/other program, tier eligibility,
  scope issuance, app/Page/business verification and actual approval not established.
- CREDENTIAL: no real credentials requested, entered or validated; no live grant.
- IDENTITY: current userinfo subject semantics/Marketing-person relationship and
  complete provider-verified organization discovery not deterministic yet.
- HOSTING: actual Node24/MySQL/outbound DNS/TLS/HTTPS/secrets account compatibility unknown.
- REAL VALIDATION: all real OAuth/identity/discovery/preflight/post remain unperformed
  and require separate approval plus implemented reviewed production boundaries.
- DOCUMENTATION UNCERTAINTY: current version list/sunset, product/tier rules, PKCE and
  redirects, lifetime/rotation, endpoint paging/count/status schema, current Posts/ID
  and delete/error/quota contracts. No proven current contradiction with Phase 9B.

## 10. Hosting, safe app setup and secret policy

Hostinger remains **UNVERIFIED**. Required later checks: exact Node24.21-compatible
runtime/npm11.19/build/start and App Router support; outbound HTTPS443 to separately
reviewed API/OAuth hosts; DNS answers and ability to connect to the chosen verified IP;
original-host/SNI TLS1.2+ trust-store validation; no ambient proxy or redirect dependency;
bounded request execution/resource capacity; server-only environment secrets; final
HTTPS callback route and trusted origin; existing private storage where applicable;
MySQL CHECK/transaction/locking/TLS and least-privilege grants/encryption-key retention.
No assumption of configurable root services, Docker, VPS, permanent worker or Redis.
Immediate explicit validation does not require cron; no refresh scheduler is proposed.
No account login, deployment, DNS/env edit or credential entry was performed.

Future app configuration checklist (review only, do not collect values in chat):
[ ] confirm authorized developer-app owner/admin; associated Page and admin/verification
requirements from current official policy; [ ] exact product/tier and approvals for
both scopes; [ ] minimum identity product/scopes; [ ] intended organization/member
eligibility; [ ] exact registered HTTPS callback; [ ] client ID/secret EXISTENCE in
approved server secret controls, never printed; [ ] current version support/sunset and
review stop; [ ] scope grant/expiry verification; [ ] supported identity and verified
organization selection; [ ] hosting checks; [ ] reviewed production code enabled only
through separate authorization and safe tests/gate before any real call.

Secrets enter through approved hosting/server secret controls with restricted operator
access, not ChatGPT/Codex prompts, issues, source, docs, fixtures or shell history.
OAuth code stays in the callback/exchange boundary; tokens enter encrypted storage
only through validated grants. Never manual token paste to bypass OAuth/identity.
Redact callback queries and errors; persist only existing bounded safe audit metadata.

## 11. Enablement gates, future validation ladder and first-post policy

Gate dependencies (design only):
A supported common version -> I current preflight + J current Posts contract.
B exact product entitlement -> C tier -> E both operation scopes/identity grants.
D exact callback/security contract + F credential model + G trusted member identity
+ H verified destination capture + I/J + reviewed production implementation are
prerequisites for any live connection. K hosting verification is also required before
production callback/dispatch. L separately authorized OAuth must enumerate necessary
identity/discovery operations; M separately authorized read-only real preflight follows
a valid bound connection. N separately authorized real post additionally requires an
approved immutable text snapshot and complete fresh authorization. A–K are not
satisfied merely by obtaining credentials or a passing local gate.

| Level | Proposed separate activity | Stop gate |
| --- | --- | --- |
| 0 | Current official evidence and exact entitlement requirements | Stop until supported pin/current schema/tier/identity gaps are resolved |
| 1 | Authorized developer-app setup/approval review | Stop if product/tier/Page/member eligibility or required scope availability is unproved |
| 2 | Offline OAuth/callback/secret-boundary configuration review | No login/exchange; stop unless exact callback, PKCE/state decision and hosting/code controls pass |
| 3 | Explicitly authorized member OAuth connection | No initiation until all operations needed by complete Grant are approved; never log/expose code/token |
| 4 | Authorized same-token authenticated identity verification | Mismatch, missing verified subject or expiry => abort/discard grant before attach |
| 5 | Authorized verified-organization discovery and selection | No arbitrary IDs, incomplete discovery or >20 destination truncation; stop before trusted attachment/selection |
| 6 | Separately authorized read-only exact action preflight | No POST; require bound complete Approved target and safe metadata only |
| 7 | Controlled-post dry contract review | No remote write; freeze exact organization/text/window/approver/cleanup and ambiguity handling |
| 8 | Separately authorized one minimal real organization text post | Recheck fresh authorization/current version; one send; no fallback/retry if uncertain |
| 9 | Safe confirmation, manual observation and preapproved cleanup | UNKNOWN => operator investigation, no blind resend; deletion requires its own preapproval |

Levels 3–5 are logically distinct approvals, but current exchange requires a COMPLETE
Grant containing identity and verified destinations. Securely preapprove all required
identity/discovery calls before starting OAuth, or stop before level 3. Do not pause
with a plaintext token awaiting another chat approval, persist a partial grant, add
secret files, or assume the generic 15-second exchange deadline covers unbounded
work. If the real flow cannot fit reviewed existing admission bounds, stop for a
separate bounded design decision, not a silent timeout/schema change.

First real post: no organization, content or time window is chosen now. Later approval
must name the exact already verified selected organization and current connection,
actual authorized app operator with content.publish and required step-up, exact
approved text and immutable snapshot hash, one bounded time window, public visibility,
named human observer and a preapproved remain-public vs manual-delete decision.
Confirm authorized Page-admin cleanup is available before a removable test post.
Only capture bounded status, validated provider ID, local confirmation/attempt times
and existing safe audit codes; never credential headers/raw bodies/extra user data.
No auto-published placeholder, AI, append/truncation/normalization or text rewrite.
201 + valid ID confirms per frozen policy; missing trustworthy response is UNKNOWN.
Before any new operator attempt, reconcile possible prior publication and existing
attempt uniqueness; never automatically redispatch UNKNOWN. No automatic API delete,
revoke or refresh is implied by posting authorization.

## 12. Contract-1 result and next bounded step

**PHASE_9C_CONTRACT_1_PARTIALLY_BLOCKED**: repository/security/validation-ladder design
and official request-structure evidence are available, but production-current version,
entitlement/tier, identity and endpoint paging/schema requirements are not sufficiently
deterministic for enablement implementation or real validation. This is not a new
Phase 9B failure and does not claim all official documentation is inaccessible:
the official client source was independently retrieved, with its 2023 limitation.

Exactly ONE recommended Contract-2 scope: **VERSION_AND_ENTITLEMENT_RECONCILIATION**.
Obtain current versioned Microsoft Learn support/sunset and both-operation program/
tier/scope evidence, preserving provenance if externally supplied. This is the
largest upstream prerequisite; no next step is authorized by this recommendation.
No pin should be selected from stale client examples to bypass this gate.

Only this research document and docs/review/phase-9c.md may be candidate changes.
No package/source/test/config/migration/permission/Phase9A/Phase9B history change,
no test or complete gate, no credential/provider/OAuth activity, no stage/commit/push.
STOP FOR REVIEW.


# CONTRACT-2 — Version and entitlement reconciliation

Research date: **2026-10-24 (Asia/Karachi)**.
Primary result: **PHASE_9C_CONTRACT_2_BLOCKED**.
Version result: **VERSION_SELECTION_BLOCKED**.
Entitlement result: **ENTITLEMENT_BLOCKED**.
This append preserves all Contract-1 history and does not change any closed code.

## C2.1 Baseline and bounded scope

main; HEAD/local main/direct live remote main verified before research:
`7d9f43777a68fe0b47c0a4bcebf9a8ffc52ac593`. Initial candidate was exactly this
research document and docs/review/phase-9c.md; no tracked changes, empty index.
Production profiles 0; LinkedIn DISABLED / UNVERIFIED; migrations 12 with all manifest
hashes intact, 0000–0011, no 0012; permissions 32. No real app/account, intended
organization, credential or authenticated provider state was inspected.

Scope: CURRENT supported common Marketing API version and CURRENT product/tier/scope
eligibility for organizationAuthorizations plus organization organic Posts create.
No expansion into identity, OAuth, refresh or pagination implementation/design.
Contract-1's MEMBER_IDENTITY_CAPTURE_BLOCKED, fail-closed one-request preflight and
REFRESH_NOT_REQUIRED_FOR_INITIAL_VALIDATION decisions remain unchanged.

## C2.2 Retrieval strategy, source register and provenance

Every retrieval/lookup below was on **2026-10-24**. Requests used public official URLs
without LinkedIn credentials, cookies or authenticated provider APIs. No access-control
bypass, proxy/TLS change, login, scraping evasion or search-snippet authority was used.
Canonical pages were followed by bounded official search/index, localized Learn,
LinkedIn public product and official Git/raw-source alternatives. A blocked page is
not evidence of provider denial/discontinuation, nor proof that documentation is absent.

### Current documentation/product attempts

For V/A/P/T source rows, publisher is Microsoft Learn / LinkedIn documentation.
For D rows, publisher is LinkedIn Developer. Titles describe the intended reference;
where content was not retrieved, actual current page title/availability, update date,
API view/version and substantive requirements are **not visible / UNVERIFIED**.
All rows returned proxy `Tunnel connection failed: 403 Forbidden` before a source
body was obtained. Classification: **UNVERIFIED**, including search rows because no
search result body was retrieved. No SEARCH_INDEX_ONLY result was available.

| ID | Title / public official URL | Method |
| --- | --- | --- |
| V1 | Marketing API Versioning — https://learn.microsoft.com/en-us/linkedin/marketing/versioning | Canonical English |
| V2 | Official Learn versioning search — https://learn.microsoft.com/api/search?search=LinkedIn%20Marketing%20API%20versioning&locale=en-us | Official search/index alternative |
| V3 | Versioning — https://learn.microsoft.com/fr-fr/linkedin/marketing/versioning | Localized official rendering |
| A1 | Organization Authorizations — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations | Canonical English |
| A2 | Official Learn organization authorization/scope search — https://learn.microsoft.com/api/search?search=LinkedIn%20organizationAuthorizations%20rw_organization_admin&locale=en-us | Official search/index alternative |
| A3 | Organization Authorizations — https://learn.microsoft.com/fr-fr/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations | Localized official rendering |
| P1 | Posts API — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | Canonical English |
| P2 | Official Learn Posts/scope search — https://learn.microsoft.com/api/search?search=LinkedIn%20Posts%20API%20w_organization_social&locale=en-us | Official search/index alternative |
| P3 | Posts API — https://learn.microsoft.com/fr-fr/linkedin/marketing/community-management/shares/posts-api | Localized official rendering |
| T1 | Community Management overview target — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api/overview | Intended overview reference; page existence not confirmed |
| T2 | Community Management access-tier target — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api/access-tiers | Intended tier reference; page existence not confirmed |
| T3 | Community Management access target — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api/access | Intended access reference; page existence not confirmed |
| T4 | Official Learn tier search — https://learn.microsoft.com/api/search?search=LinkedIn%20Community%20Management%20Development%20Standard%20access&locale=en-us | Official search/index alternative |
| T5 | Community Management overview target — https://learn.microsoft.com/fr-fr/linkedin/marketing/community-management/community-management-api/overview | Localized official alternative; page existence not confirmed |
| D1 | Community Management API product — https://developer.linkedin.com/product-catalog/marketing/community-management-api | Developer product catalog |
| D2 | Community Management product target — https://www.linkedin.com/developers/products/community-management-api | Alternate public official product route; not app inspection |
| D3 | LinkedIn Developer products — https://www.linkedin.com/developers/products | Public product index alternative |

No CURRENT_OFFICIAL_DOCUMENTATION or CURRENT_OFFICIAL_PRODUCT_DOCUMENTATION body was
retrieved in this pass. No fact about supported YYYYMM, tier, scope eligibility or
approval is established from these unavailable pages or an assumed title.

### Official repository/source alternatives

| ID | Source / title / publisher | Retrieval and visible date/version | Classification and permissible conclusion |
| --- | --- | --- | --- |
| G1 | https://api.github.com/orgs/linkedin-developers/repos?per_page=100 — public LinkedIn developer repository index; GitHub/LinkedIn | Proxy 403; no index body/date | UNVERIFIED; not even a usable search listing |
| G2 | https://github.com/MicrosoftDocs/linkedin-docs.git — intended official documentation source; MicrosoftDocs | Public Git ref lookup exit128; no refs/content retrieved; prompting disabled, no auth workaround | UNVERIFIED; no source for current Learn metadata. Contract-1's raw 404s are not silently treated as valid current docs |
| G3 | https://github.com/linkedin-developers/linkedin-api-python-client.git — official Python client; LinkedIn | Public HEAD/main reconfirmed 6331e52f5ea59b326447efa67a9bf925ed2d9ec7; Contract-1 recorded commit date 2023-11-20 | OFFICIAL_IMPLEMENTATION_EVIDENCE; historical-age limitation remains. No new support/product policy |
| G4 | https://raw.githubusercontent.com/linkedin-developers/linkedin-api-js-client/main/README.md — guessed default-branch route; LinkedIn | HTTP404; not treated as proof repository is absent | UNVERIFIED for this route; resolved using public HEAD below |
| G5 | https://github.com/linkedin-developers/linkedin-api-js-client.git — official JavaScript client; LinkedIn | Public HEAD e4a1fae1f829b370a339477a071d8affe0f6fd3b; no main ref returned; commit update date not obtained | OFFICIAL_IMPLEMENTATION_EVIDENCE for repository identity/ref only |
| G6 | [README.md](https://github.com/linkedin-developers/linkedin-api-js-client/blob/e4a1fae1f829b370a339477a071d8affe0f6fd3b/README.md) — LinkedIn API JavaScript Client; LinkedIn | Immutable raw equivalent HTTP200; beta warning; API examples 202209/202210/202212; no current support/update date | OFFICIAL_IMPLEMENTATION_EVIDENCE, supporting historical structure only |
| G7 | [package.json](https://github.com/linkedin-developers/linkedin-api-js-client/blob/e4a1fae1f829b370a339477a071d8affe0f6fd3b/package.json) — official client package metadata; LinkedIn | Immutable raw equivalent HTTP200; library version0.3.0, author LinkedIn; no API support date | OFFICIAL_IMPLEMENTATION_EVIDENCE; library version is NOT an API version |
| G8 | [CHANGELOG.md](https://github.com/linkedin-developers/linkedin-api-js-client/blob/e4a1fae1f829b370a339477a071d8affe0f6fd3b/CHANGELOG.md) — client release notes; LinkedIn | Immutable raw equivalent HTTP200; visible 0.3.0 heading dated 2023-02-07 | OFFICIAL_IMPLEMENTATION_EVIDENCE; library release date, not Marketing API lifecycle evidence |

G6 independently corroborates versionString syntax YYYYMM (also generic YYYYMM.RR),
versioned API selection and the BatchFinder name/content request discriminator already
frozen in Phase 9B. It neither lists currently supported API versions nor maps the two
operations to Community Management product/tier/scopes. Generic request interfaces,
Sign In product prerequisites, historical member/advertising examples and library
retry features do not establish this organization's production eligibility. No SDK,
source example, npm install, script or client method was executed.

Historical Phase 9B externally recovered Microsoft Learn evidence is classified here
as HISTORICAL_OFFICIAL_DOCUMENTATION, retaining its EXTERNAL_OFFICIAL_EVIDENCE
provenance. It supports the frozen endpoints/scopes, but cannot establish current
version/tier/approval. Search snippets were not used at all. Evidence categories in
this appendix are exactly those allowed by Contract-2; no unavailable page is labeled
CURRENT merely because its URL was attempted on today's date.

## C2.3 Version decision and operational contract

| Question | Contract-2 finding |
| --- | --- |
| Current supported/latest and previous versions | UNVERIFIED; no current official version list retrieved |
| Production candidate YYYYMM | NONE — VERSION_SELECTION_BLOCKED |
| Current calendar release cadence | UNVERIFIED; YYYYMM syntax does not prove monthly release/support cadence |
| Sunset cadence/minimum support window | UNVERIFIED; no numeric duration inferred |
| Header format | Historical official clients corroborate explicit LinkedIn-Version YYYYMM; project retains one reviewed YYYYMM |
| Current /rest header requirement | Historical operation evidence retained; current normative revalidation unavailable |
| Requests without version | Current /rest behavior UNVERIFIED. SDK's generic unversioned /v2 path is not proof that Marketing /rest accepts omission |
| Unsupported/sunset version response | Exact current status/code/body UNVERIFIED; no automatic fallback/version retry |
| organizationAuthorizations on a candidate | UNVERIFIED; no candidate or release-specific support proof |
| Posts organization organic create on a candidate | UNVERIFIED; no candidate or release-specific support proof |
| Common supported version established | NO; absence of proof, not proof that separate versions are needed |
| Selected support end / remaining window | UNVERIFIED; cannot compare newest/oldest supported choices |

PRODUCTION_LINKEDIN_VERSION_CANDIDATE: **NOT SELECTED**.
VERSION_SELECTED_AT: **UNSET** (research date is not a selection date).
VERSION_REVIEW_BY: **UNSET** until a supported pin is actually approved.
VERSION_SUPPORT_END: **UNVERIFIED**.
No 2022/2023 example, Phase9B synthetic 202601 value, or date-derived 202610 is promoted
into a candidate. No independent per-operation version is invented.

Monthly human review is **retained as PROJECT policy**, not newly confirmed from an
unretrieved provider lifecycle statement. There is no evidence-backed reason to weaken
it or claim provider confirmation. Once a version is established, next review <=30
days after approval, with recorded source/support end and an explicitly reviewed
pre-sunset safety margin (Contract-1 proposed seven days). Supported-version evidence
must leave adequate remaining operational/review time; do not automatically select
the oldest or newest release. An exact candidate cannot be ranked without that evidence.

Future design remains server-owned typed pin, no caller/UI/DB free-text or per-request
version control, no dynamic latest. Local review deadline or official support stop
whichever is earlier must disable/fail closed production LinkedIn dispatch until an
explicit new review. Token validity, Page role or apparent endpoint success must not
override expiry. No pin, dates, runtime flags or configuration were implemented.

## C2.4 Product, access, scope and app-approval decisions

REQUIRED_PRODUCT: **REQUIRED_PRODUCT_UNVERIFIED**.
Community Management API remains a research target, not an established current product
name/entitlement. Do not import a historical product name into current production setup.
One product satisfying both operations: **UNVERIFIED**. Both scopes obtainable by one
app in one qualifying tier: **UNVERIFIED**. The official client examples cannot prove
this, and current product/access references were not retrieved.

### Operation → entitlement decision matrix

| Operation | Official current product | Required tier | Required scope | Member/Page requirement | App review requirement | Current evidence status |
| --- | --- | --- | --- | --- | --- | --- |
| GET /rest/organizationAuthorizations | UNVERIFIED | UNVERIFIED | Frozen rw_organization_admin; historical purpose: manage organization pages/retrieve reporting, lookup permission documented in prior evidence | Current qualifying roles/Page association/admin verification UNVERIFIED; no role-name bypass | Current Development provisioning/Standard approval path UNVERIFIED | Historical external operation/scope evidence plus official client structure; current mapping UNVERIFIED |
| POST /rest/posts, organization organic text | UNVERIFIED | UNVERIFIED | Frozen w_organization_social; historical purpose: post/comment/like on an organization subject to organization authorization | Current eligible member/Page roles and app-associated organization constraints UNVERIFIED; fresh ORGANIC_SHARE_CREATE remains required | Current product/tier/app review requirement UNVERIFIED | Historical external operation/scope evidence; no current product/version mapping |

The scopes' current existence and product/tier availability are not independently
reverified. Member-authorized consent remains the project connection design, but no
current grant availability/consent policy is claimed from the SDK's generic OAuth
support. No scope is requested/added; neither one substitutes for the other.
Missing required grants require reconnect/re-consent under the existing bounded
connection contract; requested scope strings alone never prove grants or entitlement.

### Development / Standard validation matrix

The labels Development and Standard are questions carried from Contract-1, not current
confirmed tier names. Each cell below is UNVERIFIED until a current official reference
establishes exact names and rules; no renamed tier model is invented.

| Requirement | Development access | Standard access | Exact unknown |
| --- | --- | --- | --- |
| Organization restrictions | UNVERIFIED | UNVERIFIED | App-associated/test organizations, app-admin linkage, unrelated customer eligibility |
| Member restrictions | UNVERIFIED | UNVERIFIED | Developer/admin membership and qualifying Page role rules |
| Authorization lookup | UNVERIFIED | UNVERIFIED | Endpoint access under the tier/product and both scopes |
| Organic organization posting | UNVERIFIED | UNVERIFIED | Whether controlled organization text create is allowed |
| Scope availability | UNVERIFIED | UNVERIFIED | rw_organization_admin and w_organization_social jointly issuable to one app |
| Quota | UNVERIFIED | UNVERIFIED | Tier-specific calls/limits/portal visibility; UNVERIFIED_PROVIDER_QUOTA |
| App review | UNVERIFIED | UNVERIFIED | Automatic vs reviewed Development access; Standard application/review criteria |
| Page association | UNVERIFIED | UNVERIFIED | Required app/Page relationship, Page-admin app verification and tier dependency |
| Production suitability | UNVERIFIED | UNVERIFIED | General/customer production vs bounded controlled validation permission |

Development controlled-validation sufficiency: **UNVERIFIED**. It is not classified
DEVELOPMENT_ACCESS_POTENTIALLY_SUFFICIENT_FOR_CONTROLLED_VALIDATION without evidence.
Standard required for production, arbitrary client organizations, organizations not
tied to app admins, scale or intended Bismillah Electronics organization: **UNVERIFIED**.
No assertion that Standard is mandatory merely because of its name.

Current required app submission materials (privacy policy, terms, use-case description,
demo/screencast), review criteria and automatic/reviewed provisioning are UNVERIFIED.
Page association, who must be Page admin, Page-admin app verification, and whether each
applies to each tier are UNVERIFIED. Business, company, Page, app and domain verification
are distinct processes; no requirement for any of them is inferred from another or
from another provider. Exact entitlement-relevant member roles remain UNVERIFIED; do
not substitute ADMINISTRATOR/CONTENT_ADMIN checks for permission-based authorization.

Whether the current app needs explicit LinkedIn review/approval for either operation
against the intended organization is UNVERIFIED as an official rule. PROJECT future
safety gate still requires positive confirmation that the actual app is entitled,
required grants are available and the organization is eligible before any controlled
provider request. This is not a claim that LinkedIn mandates a particular review.
Actual user app approval verified: **NO**. Actual intended organization eligibility
verified: **NO / UNVERIFIED**. No app/account was inspected or inferred to exist.

Tier-relevant quotas: **UNVERIFIED_PROVIDER_QUOTA**. No numeric quota, header/reset
behavior, per-app/member/endpoint split or portal entitlement was invented.

## C2.5 Version × entitlement compatibility and Phase 9B check

**VERSION_ENTITLEMENT_COMPATIBILITY_UNVERIFIED**.
No supported common version, exact current product, tier or same-app joint scope
availability has been established simultaneously. No isolated positive API example
can close those coupled prerequisites. There is no evidence of a conflict either.

Phase 9B contradiction found: **NO**. No current official content demonstrates a
change to rw_organization_admin, w_organization_social, /rest/organizationAuthorizations,
/rest/posts, organization organic availability or versioned REST. Failed retrieval
and historical supporting SDKs do not justify PHASE_9B_PRODUCTION_CONTRACT_CONTRADICTION.
The closed implementation and its API mapping remain unchanged. This is unresolved
production-current evidence, not proof that the frozen contract is currently valid.

No OAuth/member identity investigation was expanded: MEMBER_IDENTITY_CAPTURE_BLOCKED
remains; no new identity scope or endpoint decision. No pagination redesign: one-request
policy remains safe fail-closed, current API admissibility unresolved. No token/refresh
research expansion: REFRESH_NOT_REQUIRED_FOR_INITIAL_VALIDATION and PARTIAL token
lifecycle readiness remain as recorded in Contract-1.

## C2.6 Repository reconciliation and future configuration boundary

Read-only evidence: src/server/provider-security/linkedin.ts only checks YYYYMM syntax;
there is no production-supported pin/review/support-date policy. LinkedIn typed
transport remains test-environment/loopback gated; createTestLinkedInProvider is the
only factory; PublishingProvider and populated publishing-service registrations remain
test-only; productionProviders() and productionPublishingProviders() remain empty.
These are implementation barriers, not production settings to flip.

Future work is a **combination** of bounded code, server/external configuration and
provider approval/eligibility confirmation. Code eventually required: **YES**.
External configuration required: **YES**. External entitlement/approval confirmation
required before enablement: **YES**; exact provider-mandated review process unresolved.
Do not construe the last answer as proof that every tier requires a review application.

Future version design needs a typed server-owned fixed YYYYMM and evidence-backed
selection/review/support metadata, production profile binding, startup/dispatch
fail-closed validation and no caller override. No candidate exists to configure now.
Future entitlement representation should prefer a reviewed external app-access record
and server-owned profile/deployment evidence: exact product/tier, both scope eligibility,
app-binding reference, source/review/validation dates and explicit unverified/approved
status. Actual connection grants/expiry/version remain in existing validated storage.
Do not trust a browser input or arbitrary DB boolean/free text as provider approval;
do not add a product/tier table or migration merely to store a research uncertainty.

Schema: **NO_SCHEMA_CHANGE_REQUIRED**; no concrete new persistence need emerged.
Internal permissions: **no change**, 32; content.publish remains the app publishing
permission, external OAuth scopes remain separate. No migration0012, registry change,
version config, new secrets, package change, source/test/config or environment edit.

### Future app-fact checklist — not an inspection request

[ ] app existence and authorized owner/admin; [ ] associated LinkedIn Page and verified
relationship if currently required; [ ] exact approved product/access program;
[ ] actual tier and eligibility restrictions; [ ] both scopes available to this SAME
app/tier; [ ] actual review/provisioning status and required materials; [ ] Page/member
requirements and intended organization eligibility; [ ] applicable business/app/domain
verification; [ ] registered redirect URI facts for later OAuth contract; [ ] supported
common version/support end and review date; [ ] quota source/portal limits if applicable.
Do not ask for client IDs, secrets, tokens, codes, passwords or cookies. No real app
configuration/portal login, actual organization check or credential handling occurred.

## C2.7 Readiness, evidence needed and exactly one next contract

VERSION readiness: **VERSION_SELECTION_BLOCKED**.
Remaining version gaps: current supported list and lifecycle, a deliberate common
candidate with endpoint-specific support and adequate remaining window, exact sunset
and unsupported/missing-header semantics. No VERSION_SELECTED_AT/REVIEW_BY fabricated.

ENTITLEMENT readiness: **ENTITLEMENT_BLOCKED**.
Remaining entitlement gaps: exact current product per operation, current tier names,
per-tier organization/member/operation/scope/quotas, joint same-app grant eligibility,
Page association and app/business verification, exact review/provisioning path and
actual app/organization facts (the latter remain separately authorized external work).

Primary result: **PHASE_9C_CONTRACT_2_BLOCKED**. Supporting historical SDK structure
was recovered through bounded alternatives, but neither target production-current
contract was resolved. This pass has completed its authorized research; it does not
license implementation or another automatic research/enablement cycle.

Exactly ONE recommended Contract-3 scope:
**CURRENT_OFFICIAL_VERSION_AND_ENTITLEMENT_EVIDENCE_RECOVERY**.
This deliberately precedes OAuth/identity, profile configuration and real app review:
obtain retrievable current official version-support/sunset plus operation-to-product/
tier/scope/approval reference bodies, or externally retrieved official bodies with
URL, update/API-view and retrieval provenance. A snippet or old client example is
insufficient. This is the largest remaining prerequisite and is a recommendation,
not authorization. Do not simply repeat blocked requests without new evidence access.

Append-only integrity: preserve Contract-1 byte prefixes in both Phase 9C documents;
all tracked files/Phase9A9B history unchanged; only these two documents remain the
candidate. No tests/gate, provider/OAuth/token/userinfo/organization/Posts call, real
post, credentials, app configuration, provider enablement, stage, commit or push.
STOP FOR REVIEW.


# CONTRACT-3 — Externally recovered current official evidence reconciliation

Reconciliation date: **2026-10-24 (Asia/Karachi)**.
Primary result: **PHASE_9C_CONTRACT_3_PARTIALLY_BLOCKED**.
Version: **VERSION_PARTIALLY_RESOLVED**.
Entitlement: **ENTITLEMENT_READY_FOR_APP_REVIEW**.
Compatibility: **VERSION_ENTITLEMENT_PARTIALLY_RESOLVED**.
No implementation or provider enablement is authorized by these design classifications.

## C3.1 Baseline, chronology and admission

Before reconciliation: main; HEAD/local main/directly verified live remote main all
`7d9f43777a68fe0b47c0a4bcebf9a8ffc52ac593`; only the two approved Phase9C documents
were candidate files, index EMPTY. Candidate fingerprint:
`4198876c63079e6e615345a746bc5da4c422cf7b957c79eff8982d7a612f3e09`.
Migrations12 with manifest hashes intact, 0000–0011, no0012; permissions32; production
OAuth/publishing profiles0; LinkedIn DISABLED / UNVERIFIED.

Contract-1 PARTIALLY_BLOCKED and Contract-2 BLOCKED remain historical results with
original bytes preserved. Their proxy403 retrieval record is not evidence that
Microsoft Learn content or provider capabilities do not exist. New evidence below
was supplied by the user as independently recovered from official sources outside
that blocked path. Codex did NOT fetch these page bodies in Contract-3. No broad web
research, real app inspection or provider/API/OAuth request was repeated.

Admission uses the supplied CURRENT_OFFICIAL_DOCUMENTATION / CURRENT_OFFICIAL_PRODUCT_DOCUMENTATION
designations, with a separate provenance qualifier:
**EXTERNALLY_RECOVERED_CURRENT_OFFICIAL_DOCUMENTATION**. This qualifier records who
retrieved the evidence, not a claim of Codex verification or of actual app approval.
Historical/indexed renderings are separately identified. Facts do not exceed the
supplied excerpts; missing URL/update metadata is explicitly retained as missing.

## C3.2 Supplied source register

**10 distinct titled source documents** were supplied. There are **9 explicit source
URLs/renderings across 8 titles**; Organization Authorizations has two renderings.
The Community Management Migration Guide and Quick Start titles/claims were supplied
without exact URLs. They are recorded without invented links. All supplied retrieval
dates: **2026-10-24**, externally retrieved. Publisher throughout: **Microsoft Learn /
LinkedIn Marketing API documentation**. Update dates are NOT SUPPLIED except App
Review (2026-02-11). Current API views are below, not inferred from the retrieval date.

| ID | Title / supplied URL | View/update information | Classification | Exact supported claims |
| --- | --- | --- | --- | --- |
| E1 | Migrations - LinkedIn — https://learn.microsoft.com/en-us/linkedin/marketing/integrations/migrations?view=li-lms-2026-10 | View2026-10; update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered | Listed Active versions and sunset dates; 202511 warning |
| E2 | Recent Marketing API Changes - LinkedIn — https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes?view=li-lms-2026-09 | View2026-09; body explicitly says October2026 / 202610 Latest; update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered | Current latest global Marketing version202610, despite page-view parameter |
| E3 | LinkedIn Marketing API Versioning — https://learn.microsoft.com/en-us/linkedin/marketing/versioning | No explicit API view/update date supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered | Versioned /rest base, Linkedin-Version YYYYMM, monthly cadence, stable supported minimum one year before sunset, send documentation-matching version |
| E4 | Posts API - LinkedIn — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-09 | View2026-09; update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered | Organic/text-only posts, replacement of ugcPosts, version/Rest.li headers, w_organization_social and listed Page roles; not direct202610 operation proof |
| E5a | Organization Authorizations - LinkedIn — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations?view=li-lms-2026-03 | View2026-03; globally Active per E1 until2027-03-16; update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered for this active rendering | Supplied Organization Authorizations packet corroborates rw_organization_admin, content action category/discriminator and ORGANIC_SHARE_CREATE; not direct202610 proof |
| E5b | Organization Authorizations - LinkedIn — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-authorizations/organization-authorizations?view=li-lms-2025-10 | Independently indexed older view2025-10; its current support/sunset status not supplied | HISTORICAL_OFFICIAL_DOCUMENTATION; external historical/indexed corroboration | Do not promote an indexed older rendering to current202610 support; no extra claim solely from indexing |
| E6 | Community Management - Overview — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview?view=li-lms-2026-10 | View2026-10; update date not supplied | CURRENT_OFFICIAL_PRODUCT_DOCUMENTATION, externally recovered | Community Management API, Vetted Product, Development/Standard tiers, initial limited access and Standard upgrade/full access/screencast |
| E7 | Migration Guide for Community Management API — exact URL NOT SUPPLIED | Current2026 rendering asserted; exact view/update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered; incomplete locator metadata | Page Access management -> rw_organization_admin; organization/brand content management -> w_organization_social plus broader unused product scopes |
| E8 | Increasing Access - LinkedIn — https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-09 | View2026-09/current2026 renderings; update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered | Both required scopes are Community Management member/3-legged permissions; Development approval/progression, quotas/restrictions/testing term; separate Standard approval/live-production role |
| E9 | Community Management App Review — https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-03 | View2026-03; last updated2026-02-11 | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered | Legal/commercial eligibility, business email/org/domain/Page verification and super-admin involvement; Development and Standard review prerequisites/materials |
| E10 | Quick Start - LinkedIn — exact URL NOT SUPPLIED | Current2026 rendering asserted; exact view/update date not supplied | CURRENT_OFFICIAL_DOCUMENTATION, externally recovered; incomplete locator metadata | Correct use-case permissions, app Auth availability check, accessible Pages, build/test then Standard progression; no authorization role fallback |

E5's supplied claims are a recovered reference packet; this appendix does not pretend
Codex isolated every quoted field from each rendering. Missing E7/E10 locators should
be completed in the evidence record when available; they are provenance limitations,
not grounds to discard corroborated supplied facts or invent URLs. E6/E8/E9 with
explicit URLs independently establish the product/permissions/review model used below.
The source count is not a count of successful Codex HTTP retrievals: those are zero
for these supplied page bodies in Contract-3.

## C3.3 Global version support and deliberate candidate

E1 establishes the following supplied Active rows. This is the recovered subset, not
an assertion that no omitted release exists. In particular do not infer the status of
an omitted202512 or202510 from absence in this packet.

| Version | Supplied status | Supplied sunset |
| --- | --- | --- |
| 202610 | Active | 2027-10-15 |
| 202609 | Active | 2027-09-15 |
| 202608 | Active | 2027-08-17 |
| 202607 | Active | 2027-07-15 |
| 202606 | Active | 2027-06-15 |
| 202605 | Active | 2027-05-15 |
| 202604 | Active | 2027-04-15 |
| 202603 | Active | 2027-03-16 |
| 202602 | Active | 2027-02-15 |
| 202601 | Active | 2027-01-15 |
| 202511 | Active | 2026-11-16 |

The E1 warning specifically identifies 202511 sunset on2026-11-16. E2 explicitly
calls **October2026 / version202610 Latest**. Its view2026-09 parameter does not erase
that explicit global release statement, but cannot prove an operation schema migrated.
E3 establishes monthly versions and stable support for at least one year before
sunset, explicit Linkedin-Version YYYYMM, and https://api.linkedin.com/rest/.

**GLOBAL_VERSION_SUPPORT: ESTABLISHED for202610.**
**GLOBAL_VERSION_CANDIDATE = 202610.**
**GLOBAL_CANDIDATE_REVIEWED_AT = 2026-10-24.**
**CANDIDATE_VERSION_SUPPORT_END = 2027-10-15.**

202610 is a deliberate candidate because it is explicitly Active/current in recovered
sources and has an operational window extending to2027-10-15; it is not selected by
calendar inference or a dynamic latest rule. The short remaining window of202511 is
not attractive for a new production design. Remaining operation evidence below stops
this candidate from becoming a final runtime pin. Do not label it fully frozen or
configured. VERSION_SELECTED_AT for a final production pin remains UNSET.

## C3.4 Operation-specific currentness and version result

| Layer/operation | Evidence | Contract-3 classification | Exact remaining gap |
| --- | --- | --- | --- |
| Global Marketing API version202610 | E1/E2/E3 | Active/latest global candidate with2027-10-15 sunset | Resolved globally, not a guarantee for every resource |
| Posts API | E4 current view2026-09 supports organic/text-only org operation/scope and versioned headers; E1 makes202609 Active | **POSTS_202610_STRONGLY_SUPPORTED_NOT_DIRECTLY_CONFIRMED** | No supplied202610 operation reference or resource-specific migration/no-breaking-change assurance for the frozen request/response |
| Organization Authorizations | E5a active2026-03 rendering plus E5 packet corroborates required scope/action; E8 program permissions | **ORGANIZATION_AUTHORIZATIONS_CURRENT_BUT_202610_NOT_DIRECTLY_CONFIRMED** | No supplied202610 resource/finder reference or explicit carry-forward support for the selected operation |

The active global release plus adjacent/current operation evidence supports an
informed candidate, not a claim that every resource is unchanged in202610. No complete
operation-specific change list was supplied, so absence of a mentioned breaking change
is not treated as proof there are none. No separate operation pin is invented.
Common operation version established: **PARTIAL** (global candidate established;
direct common202610 applicability not yet established).

Version result: **VERSION_PARTIALLY_RESOLVED**. Do not retain the old claim that no
current global version/support evidence exists, and do not promote to
VERSION_READY_FOR_CONFIGURATION_DESIGN before the two exact operation gaps close.

Monthly human review is now supported as a PROJECT review cadence by the official
monthly release model and finite lifecycle: **MONTHLY_REVIEW_CONFIRMED as project
policy**, not an assertion that LinkedIn mandates our exact review interval.
Retain review <=30days; proposed next candidate review no later than2026-11-23.
This is a design review deadline, not runtime configuration. Future production pin
must bind an evidence-backed support end; locally configured review expiry or an
earlier pre-sunset stop must fail closed. Contract-1's proposed seven-day sunset
margin would imply no later than2027-10-08 for this candidate, subject to explicit
operational approval; no provider time-of-day/timezone was supplied or invented.
Server-owned one pin only; no user/UI/DB free text, per-request selection, dynamic
latest, version fallback, silent advance or ignored expired-review state.

## C3.5 Entitlement, scopes and operation/product mapping

**REQUIRED_PRODUCT = Community Management API.**
**AVAILABILITY_MODEL = Vetted Product.**
**TIERS = Development Tier / Standard Tier.**
E6/E8/E9 resolve the formerly unknown program names/model and review progression.

| Operation | Product mapping | Required frozen scope | Current evidence/limits |
| --- | --- | --- | --- |
| Organization authorization lookup | Community Management API Page Access management | rw_organization_admin | E5/E7/E8: organization administration/authorization scope, manage organization Pages/retrieve reporting; current program mapping established, exact202610 operation still pending |
| Organization organic text create | Community Management API organization/brand content management | w_organization_social | E4/E7/E8: organization posting/commenting/liking and organic/text Posts support; current program mapping established, exact202610 operation still pending |

**SAME_PRODUCT_SUPPORTS_BOTH = YES.**
**SAME_APPROVED_APP_CAN_REQUEST_BOTH = YES at documented product-eligibility level.**
E8 lists both as permissions available to developers approved for Community Management
API access, each a **Member Permission / 3-legged permission**. This is not proof
that an actual app's Auth configuration exposes either, that either scope has been
consented/granted, that a token is valid, or that any organization action is authorized.
Approval, actual app configuration and member grant verification remain separate.

No r_organization_social or w_member_social is added merely because E7 lists broader
content-management capabilities. Frozen lookup/post scopes remain exactly the narrow
pair; external scopes remain separate from internal content.publish/RBAC.

E4 lists Page role restrictions for w_organization_social:
**ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER, CONTENT_ADMIN**. Record the supplied
list without inventing a narrower or broader provider list. It is scope/Page-role
eligibility evidence, not a local replacement for fresh ORGANIC_SHARE_CREATE permission.
In particular being in that list is not asserted to prove organic-create approval.
No role-name bypass, organizationAcls substitution or trial post is permitted.

## C3.6 Development, Standard, quotas and exact-call limits

| Requirement | Development Tier | Standard Tier | What remains unverified |
| --- | --- | --- | --- |
| Entry | All Community Management apps begin here after relevant approval | Separate application/upgrade from Development | Actual app existence/access/approval |
| Purpose | Build/test integration; limited capabilities | Full-featured capability; live production | Actual declared-use-case approval |
| Timing | Complete integration/testing within twelve months of access | Development prerequisites/integration precede application | Actual access date/deadline |
| App quota | 500 API calls per app per24hours | Listed Development restrictions absent | Standard/general/endpoint quotas are not proved unlimited |
| Member quota | 100 API calls per member of an app per24hours | Listed Development restrictions absent | Exact counting/reset and endpoint-specific quotas |
| BATCH_GET | Not allowed | No listed Development restriction | Do not conflate BATCH_GET with BatchFinder |
| Social Actions push notifications | Disabled | No listed Development restriction | Not part of this narrow slice |
| Required permissions | Community Management scope list includes the two member permissions | Same documented product; actual grants still required | Exact real app Auth scope availability and call eligibility |
| Exact Phase9B BatchFinder call | Not directly proven usable in Development by supplied content | Full-featured program description, not real resource execution proof | Current selected-version operation and eligible real connection |

**BATCH_GET is not BatchFinder.** The explicit BATCH_GET prohibition does not by itself
prohibit GET BatchFinder authorizationActionsAndImpersonator. Equally, absence of an
explicit BatchFinder prohibition is not affirmative proof that this precise call is
usable in Development. No generic GET ban is inferred from the named Rest.li restriction.

**DEVELOPMENT_TIER_SUITABLE_IN_PRINCIPLE_FOR_CONTROLLED_VALIDATION** is supported by
E6/E8's build/test purpose and approved program permissions, subject to limits and the
remaining exact-call/version/connection/organization gates. This is in-principle design
suitability, not permission to execute a call or a claim the exact preflight is verified.

**STANDARD_TIER_REQUIRED_FOR_LIVE_PRODUCTION** is adopted as this project's production
enablement gate under E6/E8's Development build/test versus Standard live-production
program description. This does not imply Development cannot make any controlled real
calls or that initial controlled validation must already possess Standard. It does not
establish arbitrary customer/Bismillah organization eligibility. No application is
submitted and no organization is queried here.

The former all-quotas-unknown conclusion is now refined: the two supplied Development
24hour quotas are known. Standard/endpoint-specific counting/reset/additional limits
remain **UNVERIFIED_PROVIDER_QUOTA**. No numeric Standard quota or unlimited allowance
is invented. No new retry machinery or relaxed project time/size bound follows.

## C3.7 App/Page/business review requirements

E9 supplied last-updated2026-02-11, retrieved externally2026-10-24:

| Requirement | Contract-3 result / supported scope |
| --- | --- |
| REGISTERED_LEGAL_ORGANIZATION_REQUIRED | YES, Community Management commercial use eligibility |
| COMMERCIAL_USE_CASE_REQUIRED | YES, registered legal organizations/commercial use cases |
| BUSINESS_EMAIL_VERIFICATION_REQUIRED | YES, Development access review |
| ORGANIZATION_VERIFICATION_REQUIRED | YES, Development access review |
| ORGANIZATION_WEBSITE_DOMAIN_VERIFICATION_REQUIRED | YES, Development access review |
| LINKEDIN_PAGE_APP_VERIFICATION_REQUIRED | YES, application verified by Page associated with same organization |
| SUPER_ADMIN_INVOLVEMENT_REQUIRED | YES, appropriate Page super admin for that app/Page verification |
| PRIVACY_POLICY_REQUIRED_FOR_STANDARD | YES, valid privacy policy reviewed for Standard |
| Development review | Relevant access approval; approved use case plus the above verified prerequisites |
| Standard review | Development prerequisites first, integration completed, access request form and screen recording; separate approval |
| Standard review criteria | Approved use case, privacy policy, terms/restrictions, security/privacy/trust, data storage and demonstrated core functionality |
| Standard Page Management demonstration | Complete OAuth flow for Page data, posting to the Page through the app, other functionality relevant to declared use case |

Super-admin app verification is distinct from the publishing member's eligible Page
role. Do not require every OAuth member to be a super admin on that basis. Do not
invent a public verification badge, a specific DNS challenge, legal document format,
review turnaround, fee, or an approved-use-case taxonomy absent supplied evidence.
No claim of Bismillah Electronics legal/business/Page/domain compliance is made.

The documented progression is approval into Development -> build/integrate/test ->
Standard application with evidence -> separate Standard approval -> authorized live
production. A Standard screencast that requires posting does not authorize a real post
now. A future Development validation and recording need their own reviewed code,
version/identity/destination/preflight contract and explicit real-call approvals.
Only declared relevant functionality should be demonstrated; this does not expand
Phase9B into media, member posts, analytics, edit/delete or scheduling.

E10's correct permissions/app Auth/Page-access checks support this progression, but
its accessible-Page guidance does not replace the frozen action-authorization boundary.
No actual app review, portal inspection, access request or scope consent occurred.

## C3.8 Blocker disposition and readiness distinction

| Former blocker | Contract-3 disposition |
| --- | --- |
| No current global supported version/latest/sunset | RESOLVED by E1/E2/E3 for global candidate202610 and the supplied Active subset |
| Product name/model and tier names unknown | RESOLVED by E6/E8: Community Management API, Vetted Product, Development/Standard |
| Both operation scopes under one program/same approved app | RESOLVED at documented request-eligibility level by E4/E5/E7/E8; actual grants remain unverified |
| Development/Standard purpose, principal limits and progression unknown | RESOLVED to supplied extent by E6/E8; exact BatchFinder call in Development remains unproved |
| Legal/business/Page app-review prerequisites and Standard materials unknown | RESOLVED to supplied extent by E9; actual app/org qualification remains unverified |
| Exact common202610 operation support | REMAINS: Posts direct202610 schema/migration assurance and Organization Authorizations selected-finder202610 applicability |
| Full source locator metadata | REMAINS: exact E7/E10 URL/view and most update dates not supplied; corroborated program claims still admitted |
| Current identity/OAuth/destination/preflight completeness/hosting/live validation | OUT OF SCOPE; separate gates unchanged |

**ENTITLEMENT_READY_FOR_APP_REVIEW** means the documented product, tiers, narrow
permissions, member/Page constraints and application-review path are sufficiently
specified to review app requirements. No material product/tier/scope-policy gap blocks
that design-level review. It does NOT mean the exact BatchFinder request is proven
available in Development or that an app is approved. Exact-call availability is a
remaining operation/version and controlled-validation gate; it cannot be dismissed
before real use. No newly imagined prerequisite is added solely because Codex did
not independently retrieve pages admitted as supplied current evidence.

**VERSION_ENTITLEMENT_PARTIALLY_RESOLVED**: global support and the product/scope/review
model now align for design, but direct common202610 operation support is missing.
No real-account compatibility or overall production enablement is claimed.
**PHASE_9B_PRODUCTION_CONTRACT_CONTRADICTION: NOT FOUND.** Supplied evidence corroborates
both frozen scopes, organization organic/text Posts, versioned REST, content discriminator
and ORGANIC_SHARE_CREATE. No source/code/test/config change follows this reconciliation.

## C3.9 Remaining gates and bounded next work

Actual app state remains **UNVERIFIED**: no assumption an app exists or is verified,
has Development/Standard approval, exposes/granted either scope, has a verified Page
or eligible organization, or that the user is a Page super admin. Actual approval,
actual scope grants and actual organization eligibility verified: all **NO**.

Remaining identity gate: MEMBER_IDENTITY_CAPTURE_BLOCKED, including trusted identifier
semantics and OIDC sub/person-URN relationship. Remaining OAuth gate: exact current
confidential-web/PKCE/redirect contract and a reviewed real adapter. Remaining destination
gate: provider-verified bounded organization discovery and trusted connection/version
selection. Remaining preflight gate: exact selected-version operation compatibility,
Development exact-call availability and unchanged one-request completeness policy.
Remaining hosting gate: Hostinger Node/Next/MySQL/outbound DNS/IP/TLS/HTTPS callback/
server-secret requirements are UNVERIFIED. No work on those gates was performed here.
Refresh/initial-valid-token decision and all ambiguity/no-redispatch policies remain.

Schema remains **NO_SCHEMA_CHANGE_REQUIRED**, no0012. Permission count32, no internal
RBAC change. Production profiles0; LinkedIn and all five real providers remain
DISABLED / UNVERIFIED. No real credentials/OAuth/provider/userinfo/discovery/preflight/
Posts calls or app configuration. No production YYYYMM was installed/frozen in code.
Version policy/profile/production registry implementation remains separately authorized
future work, not enabled by source admission or app-review readiness.

Exactly ONE recommended Contract-4: **OPERATION_VERSION_CURRENTNESS**.
Resolve direct202610 applicability for the frozen Posts organization-create contract
and Organization Authorizations BatchFinder, including Development exact-call access
if operation references expose it. Accept explicit current reference/carry-forward
migration evidence with provenance, not a global latest label or assumed absence of
changes. Do not redesign OAuth, identity, discovery or pagination in that contract.
This is a recommendation only, not authorization to start it.

## C3.10 Integrity and stop

Contract-1/2 remain unchanged byte prefixes; only append to the two existing Phase9C
documents. HEAD/local/live remote main remain the closed Phase9B SHA, index EMPTY.
No tracked/source/test/script/config/package/lock/migration/permission/README/CI/env/
registry/OAuth-route change, no new project file. No tests/gate, real app inspection,
credential request/entry, provider/OAuth/token call, real post, enablement, stage,
commit or push. STOP FOR REVIEW.
