# Phase 9 — provider publishing requirements discovery

Discovery date: 2026-10-20 (UTC; same calendar date in Asia/Karachi).
Baseline: `4b9853a610811205e4d439082ffe20671dae5759`, branch `main`.
Direct parent: `8326ae185ae48a4fc131dd02bbb9940ecb315334`.
Phase 8 is closed. This document authorizes no implementation or external account action.

## Evidence boundaries and method

**Official publishing requirements verified in this run: NONE.** All five providers
are **UNVERIFIED**, and each is **BLOCKED** for implementation. No provider is
promoted to ready from memory, previous-phase assumptions, or unofficial material.

The initial credential-free HTTPS check of YouTube videos.insert failed with curl
exit 56, HTTP `000`, `CONNECT tunnel failed, response 403`. A subsequent bounded
source inventory attempted the 25 targets below once each (including that same
YouTube target). Each inventory request used normal TLS, HTTPS only, a 20-second
bound, a 2 MiB response ceiling, and no account credentials. All 25 failed at the
proxy CONNECT stage with the same category; **no documentation body was retrieved**.
Thus there were 26 documentation fetch attempts in total, across 25 unique URLs.
This is an **ENVIRONMENT / RESEARCH-ACCESS LIMITATION**, not an official API error,
provider refusal, product incompatibility, or evidence these document paths exist.
No browser/search connector was available in the enabled tool inventory. No proxy
bypass, TLS bypass, API call, OAuth flow or private-account query was attempted.

The titles below are descriptive research-target labels, not observed page titles.
Actual page title, visible last-updated date, version and current-path validity are
UNKNOWN for every row. Access date is the attempted access date, not proof of
freshness. Each source supports **no normative requirement yet**. Prior Phase 7/8
records remain historical; they are not current publishing evidence.

## Official source access ledger

| ID | Provider | Target title (not retrieved) | Official URL | Access date | Result / update-version / requirement supported |
|---|---|---|---|---|---|
| F1 | Facebook | Pages posts | https://developers.facebook.com/docs/pages-api/posts/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| F2 | Facebook | Pages getting started | https://developers.facebook.com/docs/pages-api/getting-started/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| F3 | Facebook | Video publishing | https://developers.facebook.com/docs/video-api/guides/publishing/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| F4 | Facebook | Reels publishing | https://developers.facebook.com/docs/video-api/guides/reels-publishing/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| I1 | Instagram | Content publishing | https://developers.facebook.com/docs/instagram-platform/content-publishing/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| I2 | Instagram | Instagram Login content publishing | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| I3 | Instagram | Facebook Login content publishing | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| T1 | TikTok | Content Posting getting started | https://developers.tiktok.com/doc/content-posting-api-get-started/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| T2 | TikTok | Direct Post reference | https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| T3 | TikTok | Creator info reference | https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| T4 | TikTok | Video status reference | https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| T5 | TikTok | Content sharing guidelines | https://developers.tiktok.com/doc/content-sharing-guidelines/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| T6 | TikTok | Media transfer guide | https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide/ | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| Y1 | YouTube | videos.insert | https://developers.google.com/youtube/v3/docs/videos/insert | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| Y2 | YouTube | Resumable upload protocol | https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| Y3 | YouTube | Video resource | https://developers.google.com/youtube/v3/docs/videos | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| Y4 | YouTube | Quota costs | https://developers.google.com/youtube/v3/determine_quota_cost | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| Y5 | YouTube | Web server OAuth | https://developers.google.com/identity/protocols/oauth2/web-server | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| Y6 | YouTube | API audit and quota extensions | https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| L1 | LinkedIn | Posts API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| L2 | LinkedIn | Images API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| L3 | LinkedIn | Videos API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| L4 | LinkedIn | Organization access control | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| L5 | LinkedIn | Share on LinkedIn | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |
| L6 | LinkedIn | Marketing API versioning | https://learn.microsoft.com/en-us/linkedin/marketing/versioning | 2026-10-20 | Proxy CONNECT 403; no body / UNKNOWN / none |

## Provider requirement registers

All entries in the following registers are **UNKNOWN**. They are explicit research
questions, not claims of availability or mandatory provider behavior. An unavailable
page cannot establish UNSUPPORTED, a scope string, a limit, or a production version.

### Facebook Pages — UNVERIFIED; targets F1–F4

- Destination type and Page eligibility; official support boundaries for personal profiles.
- OAuth/product configuration; exact least scopes; Page/user token type and acquisition;
  lifetime, refresh/re-auth, revocation; app review, business verification, development
  restrictions, test users/Pages and permitted real-world verification.
- Text, link, single image, multi-image, video and Reel support and separate endpoints.
- Binary/multipart/resumable/chunked transfer versus URL pull; source accessibility;
  MIME/codec/size/dimension/duration bounds; caption/message limits.
- Acknowledgement/post identifiers; asynchronous states and status endpoints;
  failure/error vocabulary; native idempotency; quotas/rates/usage windows;
  webhook benefit/verification; safe edit/delete recovery; API version and sunsets.
- Private-media dispatch, later re-fetch, acceptance-of-bytes proof, processing beyond
  24 hours and sufficiency of current hold: UNKNOWN.

### Instagram professional publishing — UNVERIFIED; targets I1–I3

- Business versus Creator eligibility; Page linkage; Instagram Login versus Facebook
  Login architecture; product/scopes/token lifecycle; app/business review and test restrictions.
- Image/carousel/video/Reel/Story availability and account-specific restrictions.
- Container creation/status/publish, readiness/expiration, identifiers, processing and
  terminal failure evidence; native idempotency and ambiguous publish recovery.
- Public source URL versus binary upload; URL-pull requirements; formats, ratios,
  bytes/duration/count limits; caption/hashtag handling; account caps and API rate limits.
- Status polling guidance, webhook relevance, API version and deprecation: UNKNOWN.
- **URL-pull conflict unresolved:** if an approved capability requires provider URL
  retrieval, it remains disabled under current policy. Do not make private files public.
- Private dispatch, re-fetch, upload-complete proof and 24-hour sufficiency: UNKNOWN.

### TikTok Content Posting — UNVERIFIED; targets T1–T6

- Product, Direct Post versus upload-only/inbox semantics; scopes and authorization;
  creator eligibility; audit/review, unaudited/private-only restrictions and production access.
- Creator-info endpoint, allowed privacy choices, comments/duet/stitch, title/caption/
  hashtags, commercial/branded disclosure and human consent requirements.
- Video/photo support; FILE_UPLOAD versus PULL_FROM_URL; verified domains/URLs;
  init/upload URLs/chunks, bytes/duration/format limits and upload sessions.
- Publish IDs, status fetch/states, async processing, polling, failure and rate/posting
  caps, idempotency/retry guidance, API version/deprecation.
- **Private FILE_UPLOAD compatibility is UNKNOWN**, not established by Login Kit evidence.
  No privacy/disclosure/interaction defaults may be invented. Required choices, if
  confirmed, must be captured and bound before approval/publish under reviewed policy.
- Later re-fetch, acceptance-of-bytes proof, processing beyond 24h and hold sufficiency: UNKNOWN.

### YouTube — UNVERIFIED; targets Y1–Y6

- Current videos.insert/API enablement/version, OAuth scopes, channel/Brand Account
  authority, refresh/offline flow, OAuth verification and sensitive/restricted classification.
- API project audit, unverified-project upload restrictions, quota increase process.
- Video/multipart/simple/resumable upload availability; session lifetime, offset query,
  lost-response recovery, upload/processing status and publication proof.
- Title/description/tags/privacy/category/made-for-kids metadata, thumbnail upload,
  Shorts behavior, formats/bytes/duration limits; all exact requiredness/limits UNKNOWN.
- Upload quota cost/default daily quota, rate limits, retry guidance, idempotency,
  processingDetails/status endpoints, webhooks and deprecation: UNKNOWN.
- Accepted upload outliving local hold safely: UNKNOWN. No assumption that upload
  acknowledgement proves the provider never needs the local bytes again.

### LinkedIn — UNVERIFIED; targets L1–L6

- Organization/company versus member publishing product/access program and scopes;
  OAuth/token lifecycle; app review, organization role/admin authorization and member rights.
- Current Posts API family; text/link/image/multi-image/video/document availability;
  initialization/upload/completion/processing/post creation and result identifiers.
- Upload transport, media/copy bounds, failure/status/idempotency, quotas/rates,
  version/protocol headers, sunsets and webhook/polling requirements.
- Organization publishing independently of member posting: UNKNOWN externally.
  Internally only LINKEDIN_ORGANIZATION destinations exist; prioritize Bismillah
  Electronics organization analysis. Member posting is not assumed V1 scope.
- Private transport, later re-fetch, acceptance proof and 24-hour sufficiency: UNKNOWN.

## Token and connection compatibility — repository facts

Inspected `src/server/social/{provider,schema,service,crypto}.ts`, connection model,
`docs/architecture/phase-7.md`, and migration 0010 read-only.

| Existing representation | Finding / boundary |
|---|---|
| Access / optional refresh | Separate encrypted credential purposes per authorization/version; AES-GCM/AAD, fail-closed reader; no browser plaintext |
| Expiry | Non-null authorization access expiry and optional refresh expiry; grant parser requires finite expiresIn 1..31536000, refresh 1..63072000 seconds |
| Scopes | Requested adapter scopes and separately granted JSON list, bounded/unique; absent consent gives LIMITED; unknown/unrequested values rejected |
| Identity | Provider/subject, canonical brand, separate active destinations; PAGE, INSTAGRAM_PROFESSIONAL, TIKTOK_ACCOUNT, YOUTUBE_CHANNEL, LINKEDIN_ORGANIZATION |
| Lifecycle | CONNECTED/LIMITED/reconnect/disconnect, version binding, refresh lease; reconnect cannot substitute subject |
| Additional metadata | Closed grant schema has no arbitrary provider metadata bag; one access and optional refresh credential per authorization, not per destination |
| Current production scopes | Both production registries are empty. No active official connection scope set is configured; historical supplied OAuth material is not current publishing verification |

For **each of the five providers**: current verified publishing-capable connection
scopes = NONE ESTABLISHED; required publish scopes = UNKNOWN; missing scope delta =
UNKNOWN; reauth = UNKNOWN; app review = UNKNOWN; business/org verification = UNKNOWN.
An empty registry does not mean no scopes are required. Future Page-specific tokens,
non-expiring credentials or other metadata may not fit current validation; none is
asserted required without official evidence. Do not widen scopes or grant parsing now.

## Publishing contract and schema gap analysis — design only

Inspected `src/server/publishing/{provider,policy,schema,service,media-hold,web}.ts`,
`src/features/{publishing,ai}/model.ts`, migration 0011 and runtime grants.

Repository facts that limit real adapters:

1. PublishingProvider is test-mode only; service rejects any non-test registration
   and all non-test environments when providers are supplied. Production map is empty.
2. ProviderIntent supplies exact approved copy, destination and immutable asset
   descriptors, not plaintext credentials or a private byte reader. A real adapter
   needs a reviewed server-only credential/stream boundary; no broad storage access.
3. Snapshot options_json is persisted as `{}`; preview/command has no provider-option
   input. YouTube model has title/description/tags/hashtags, but no privacy/category/
   made-for-kids fields. TikTok privacy/interaction/disclosure choices are absent.
   Exact provider requiredness is UNKNOWN; never invent significant defaults.
4. Snapshot freezes approved revision, decision, destination, authorization version,
   capability ref, content, intent hash and ordered asset descriptors. Runtime inserts
   snapshots/assets/events and cannot update them. Operations have narrow mutable columns.
5. Remote event IDs are bounded 256-byte safe strings; capability ref is 64 bytes.
   They are not a secret upload-session URL store. Session/asset substep checkpoint
   needs and remote-ID syntax compatibility are UNKNOWN pending official evidence.
6. A dispatch has 30 seconds; status has 30-second local cooldown; event sequence max
   100. These are internal bounds, **not provider-endorsed polling or upload limits**.
7. UNKNOWN result has no reference fields. append() writes null IDs for UNKNOWN;
   reconcile() reads the latest event and does nothing without a reference. Therefore
   a known earlier reference can become unavailable to current reconciliation after
   ambiguity. This is a read-only real-adapter design gap, not a newly demonstrated
   production publishing failure. Future reference lookup/preservation needs review;
   never use this gap to redispatch.
8. Reconciliation requires current authorization version matching snapshot. Refresh
   increments version: safe continuation with rotated credentials is an unresolved
   policy boundary, not permission to ignore binding.

**No migration proposed for execution; prefer existing storage.** Conditional field
candidates below are not approved requirements and must first beat reuse of existing
fields. Provider evidence may eliminate all of them.

| Candidate table/field | Concept / null | Sensitivity | Purpose / retention / mutability | Why existing is insufficient, if needed |
|---|---|---|---|---|
| publish_snapshots.options_json (existing) | Strict versioned object, non-null | Approved product settings, safe projection only | Immutable decisions retained with snapshot history; retention duration requires product decision | Storage exists; admission/model currently always writes {}; bind approved choices in hash rather than invent new column |
| publish_snapshots.capability_ref (existing) | Versioned safe ref, non-null | Internal metadata | Immutable API/capability binding for history | Existing 64-byte ref may suffice; no separate API version column justified yet |
| publish_events.remote_* (existing) | Safe bounded IDs, nullable until known | Provider-linked identifiers | Append-only lifecycle evidence; minimal history | Existing fields may suffice via earlier-event lookup; no arbitrary URL/response JSON |
| Provider upload checkpoint (table/name undecided) | Encrypted bounded session capability + safe offset/expiry; null until session | Secret signed URL/token | Only if official resume requirements demand persistence; expire/delete secret at session completion/expiry; controlled mutable checkpoint | Current event IDs are public-safe and latest-reference model is insufficient for secret session capabilities; no field/type/table selected yet |
| social credential/destination metadata (undecided) | Strict encrypted credential relation or safe typed metadata; null when absent | Token secret vs safe identity kept separate | Only if verified token granularity requires it; revoke/expiry cleanup | Current authorization-level credential model has no per-destination token relation; requirement UNKNOWN |

No actual provider-driven schema delta or new DB privilege is proven. Existing
runtime reads/inserts and operation-column updates are the default. If checkpoint
storage becomes necessary, specify exact table/column operations in a separate
review. Never give runtime snapshot/event UPDATE/DELETE or DDL/GRANT for convenience.

## Permission, step-up and approval policy

`src/server/db/catalog.ts`: 32 codes; content.publish is reused by Owner and
Marketing Admin only. Creator/Reviewer/Viewer have no publish grant. No provider
permission gap is demonstrated. Connection management remains integrations.manage;
status/history has publishing_logs.read; publish also requires content.read and
integrations.read plus live object checks. No implication engine.

New external publish operations should reuse existing session/user/auth-version,
single-use, purpose-bound PUBLISH_DISPATCH hash proof and live destination/revision
revalidation. Read-only status needs no step-up. A new consent/metadata choice
changes the immutable intent and requires fresh approval/confirmation, never stale
proof reuse. Provider-mandated extra consent would be an additional reviewed gate,
not grounds to change password/MFA fundamentals.

Adapter inputs must come from immutable snapshot content and ordered asset hashes,
not editable current revision or regenerated AI output. Current initial dispatch
revalidates and hashes the resolved approved content; status reconstructs snapshot
intent. Future byte access must bind media ID/hash/length to that frozen intent.

| Platform | Current content / required mapping decision |
|---|---|
| Facebook | caption + separate hashtags; message/link/media mapping UNKNOWN; no automatic merge |
| Instagram | caption + separate hashtags; feed/Reel/Story and carousel-order mapping unapproved |
| TikTok | caption + separate hashtags; privacy/interactions/disclosures unapproved, no defaults |
| YouTube | title/description/tags + separate hashtags; privacy/category/made-for-kids absent; requiredness UNKNOWN |
| LinkedIn | caption + separate hashtags; organization destination prioritized; member posting outside current kind |

All five hashtag-field mappings remain UNKNOWN/unapproved. Reject capability until
an exact deterministic rule preserves approved values. Lossless technical transfer
(e.g. byte chunking without content change) is distinct from semantic changes
(cropping, re-encoding with altered content, rewriting copy, tag merge/removal).
Neither transformation is automatically authorized here; semantic changes require
explicit product policy and approval. No silent caption/title/default generation.

## Minimal adapter contract proposal — not implemented

Keep orchestration outside adapters and provider I/O outside database locks.
`validateCapability` is a pure registry lookup over verified version/content/media
rules; `validateDestination` checks live authorized identity and least scopes.
`prepareMedia` is needed only for verified upload/container flows; it consumes a
bounded private byte capability tied to snapshot hash, not a user URL. `dispatch`
performs the explicit claimed operation once and returns a closed normalized result.
`getStatus` is read-only and bound to destination, operation and verified remote ID.
`normalizeError` is a closed mapping, internal helper rather than necessarily a
public interface method. `reconcileUnknown` orchestrates getStatus only where a
verified lookup is possible; it must never initialize/upload/finalize/publish.
Do not invent seven public methods when a verified flow needs fewer; no retry().

Registry proposal: provider + destination kind + content type + API version + exact
media rules + required scopes + evidence source/date/version + app eligibility.
Only VERIFIED, explicitly approved capabilities can register. UNKNOWN defaults to
disabled; unsupported combinations fail before dispatch. Neither a connected account
nor a successful fake-provider test confers production capability.

## Error taxonomy proposal

These are proposed normalized internal categories, not a change to current enums.
Current storage exposes a smaller closed category/code set; no raw error fallback.
All provider-specific code/status mappings are UNKNOWN until official evidence.

| Proposed category | Safe meaning / rule |
|---|---|
| AUTH_REQUIRED | Confirmed missing/expired authorization; no token text |
| PERMISSION_DENIED | Confirmed insufficient scope/role, not inferred from arbitrary message |
| DESTINATION_INVALID | Confirmed wrong/missing eligible destination |
| DESTINATION_REVOKED | Confirmed lost authorization/ownership |
| MEDIA_INVALID | Confirmed invalid media properties |
| MEDIA_TOO_LARGE | Confirmed byte bound exceeded |
| MEDIA_FORMAT_UNSUPPORTED | Confirmed MIME/codec mismatch |
| CONTENT_INVALID | Confirmed provider content-field validation failure |
| RATE_LIMITED | Documented rate response; never auto-resend |
| QUOTA_EXCEEDED | Documented quota response, separate from transient rate |
| PROVIDER_TEMPORARY | Documented temporary error; ambiguous side effect still UNKNOWN |
| PROVIDER_REJECTED | Definitive non-publication rejection only |
| PROCESSING_FAILED | Definitive terminal processing failure |
| NETWORK_AMBIGUOUS | Side effect may have occurred; UNKNOWN, no blind redispatch |
| UNKNOWN_PROVIDER_ERROR | Closed fallback; no raw body/message; outcome conservatively UNKNOWN |

## Implementation order and slices — conditional, no authorization

All provider scores: documentation completeness 0 retrieved sources; API stability,
approval difficulty, upload complexity, async complexity, duplicate risk, testing
feasibility, private-media compatibility, OAuth compatibility and safe-test feasibility
**UNKNOWN**. There is no evidence-backed ranking among providers. Do not fabricate
numeric scores or a popularity-based order. First provider must be selected after
these gates are resolved; organization-only LinkedIn analysis is a product priority,
not a verified technical-first recommendation.

| Slice | Scope / scopes | Schema / capability | Tests and real-world verification | Stop gate |
|---|---|---|---|---|
| 9A — evidence and decisions | Restore official doc access or review authoritative dated extracts; exact least scopes per candidate | No implementation/migration; resolve options, media, retention, ambiguity | Trace claims to sections/version; separately review app eligibility without secrets in chat | Any normative unknown blocks provider selection |
| 9B — shared HTTP/security contract proposal | Least credential access, bounded streaming, closed errors, immutable input; existing permissions | Prefer no migration; enable no provider | Future synthetic SSRF/redirect/limits/redaction/ambiguity tests; Hostinger staging verification separately authorized | Requires explicit implementation approval; upload-host rules must be verified |
| 9C — first verified provider, one narrow content type | Provider chosen on completed scores; scopes UNKNOWN now | Field/grant delta only if independently proven; capability disabled until eligibility verified | Official fixtures + isolated fake HTTP; later explicit test-account/private publication authorization with cleanup plan | No live experiment without consent, review, target and duplicate-risk plan |
| 9D — next provider | Repeat full evidence/scopes review independently | No inherited capability assumption | Same per-provider gates, no customer-impact verification by default | Earlier success does not waive normative unknowns |

Future real-world strategy for each provider: official sandbox/test-account,
test Page/org, private/unlisted/draft/private-only and controlled-production options
are all UNKNOWN. Verify permitted mechanism first; then obtain separate authorization
for named test destination, exact content/visibility, app status and data removal.
A private post is still an external side effect. No secrets or accounts requested now.

Overall implementation readiness: **BLOCKED**. Shared security requirements can be
reviewed as design, but even shared implementation is not authorized by this cycle.

---

# EXTERNAL_OFFICIAL_EVIDENCE_RECOVERY — repository reconciliation, 2026-10-20

## 1. Original Codex discovery and proxy failure record

Everything preceding this separator is the preserved **ORIGINAL_CODEX_DISCOVERY**.
Its all-UNKNOWN findings and BLOCKED decision describe the evidence available at
that time. All 25 unique targets failed before retrieval with proxy CONNECT 403;
zero page bodies were available and provider behavior was not inferred. The initial
probe made 26 requests across those 25 targets. That historical result is unchanged.

This second layer accepts only the bounded official-source evidence supplied by
human review in the subsequent authorization. It does not turn the earlier failed
retrievals into successes or imply Codex independently verified the external research.

## 2. External source acceptance and retrieval

The 12 supplied URLs below were parsed read-only. Each is HTTPS, has no userinfo,
query or fragment, and has the exact expected official documentation hostname:
`developers.google.com` (Google), `learn.microsoft.com` with `/en-us/linkedin/`
(Microsoft-hosted official LinkedIn documentation), or `developers.tiktok.com`
(TikTok). This establishes the expected official-domain identity of the supplied
URL, not successful TLS retrieval, page existence or current content verification.

One credential-free bounded HTTPS request was made to each supplied URL on
2026-10-20, with normal TLS, 20-second request bound and 2 MiB maximum response.
All 12 failed before retrieval: curl exit 56, HTTP 000, proxy CONNECT 403, no body.
No redirect was observed; in particular TikTok's canonical redirected destination
remains UNKNOWN. No provider API was called. The request bounds are research-tool
limits, not proposed adapter timeout values.

For every row: **OFFICIAL_URL_SUPPLIED_EXTERNALLY**, **CODEX_RETRIEVAL_BLOCKED**,
claim evidence **EXTERNAL_OFFICIAL_EVIDENCE**. None is VERIFIED_OFFICIAL. External
access date, visible page title, last-updated/version date and exact quotation were
not supplied; they remain UNKNOWN. “Received 2026-10-20” is not a claim about when
the external researcher accessed the page. Titles below are descriptive labels.

| Evidence ID | Provider | Descriptive source label | Exact supplied official URL |
|---|---|---|---|
| EY1 | YouTube | videos.insert | https://developers.google.com/youtube/data/reference/rest/v3/videos/insert |
| EY2 | YouTube | Resumable upload protocol | https://developers.google.com/youtube/data/guides/using_resumable_upload_protocol |
| EY3 | YouTube | thumbnails.set | https://developers.google.com/youtube/data/reference/rest/v3/thumbnails/set |
| EY4 | YouTube | Quota/compliance audits | https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits |
| EL1 | LinkedIn | Posts API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api |
| EL2 | LinkedIn | Images API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api |
| EL3 | LinkedIn | Documents API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api |
| EL4 | LinkedIn | Videos API | https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/videos-api |
| ET1 | TikTok | Content Posting getting started | https://developers.tiktok.com/doc/content-posting-api-get-started/ |
| ET2 | TikTok | Direct Post | https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/ |
| ET3 | TikTok | Media transfer guide | https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide/ |
| ET4 | TikTok | Video status | https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status/ |

## 3. YouTube evidence ledger

All claims in this ledger are **EXTERNAL_OFFICIAL_EVIDENCE**, bounded to the supplied
statements; no page body was independently retrieved.

| Source | Accepted supplied claims | Not established by these claims |
|---|---|---|
| EY1 | videos.insert uploads video; media upload supported; youtube.upload is relevant; writable publishing-related metadata exists; direct upload need not use a public media URL | Exact request/response schema, full OAuth scope URI and minimal complete scope set; requiredness/defaults of individual metadata; limits, publication proof, project restrictions |
| EY2 | Resumable session initialized; provider returns session URI; bytes uploaded to it; interrupted transfer can be reconciled/resumed; session identity helps ambiguity recovery | Exact host/redirect policy, expiry, offset query/status codes, crash-recovery guarantees, final publication lookup and safe repeat-final-chunk rules |
| EY3 | Custom thumbnail upload is a separate operation against existing video; youtube.upload is among relevant scopes | Whether mandatory for any proposed video slice; exact media rules, failure/idempotency and separate confirmation requirements |
| EY4 | Quota/compliance controls govern upload; increased quota may need audit/review | Current numeric quota cost/allocation, approval thresholds, exact audit obligations for the selected project |

### YouTube repository reconciliation

- `social_credentials` represents encrypted access and optional refresh tokens;
  `social_authorizations` has expiry, scopes and reconnect state; YOUTUBE_CHANNEL
  exists. Representational fit is PARTIAL, not protocol verification. Required
  refresh issuance/rotation/expiry rules and channel-discovery authority are UNKNOWN.
- `socialPackSchema.YOUTUBE` already has title, description, tags and separate
  hashtags. Privacy, category, made-for-kids and other significant options are absent.
  No exact requiredness is established by “writable metadata”; all absent choices
  need normative/product review. No defaults may be invented.
- Existing snapshot `options_json` can store an immutable bounded object, but service
  always writes `{}`; command/preview and ProviderIntent do not carry typed options.
  Content approval, immutable binding and adapter interface would need separately
  authorized changes; existing JSON storage alone is not an implemented option model.
- Provider video ID has a candidate home in `publish_events.remote_publication_id`;
  fit is conditional on actual ID syntax/length and publication semantics, not yet
  supplied. `remote_processing_id` is not a safe session-URI store.
- Session URI is SENSITIVE_CAPABILITY; a hash alone cannot address the resume endpoint.
  In-memory URI is enough only while the owning process survives. To promise restart
  continuation, durable encrypted checkpoint state is needed before session initiation
  is enabled. Exact storage and progress semantics are SCHEMA_DECISION_BLOCKED.
- Read-only session/offset observation must be separated from upload continuation.
  Existing reconcile() explicitly forbids upload/finalize/create; do not hide byte
  continuation inside getStatus(). A byte-resume feature needs its own reviewed
  lifecycle/authority boundary and must never create a replacement video blindly.
- Upload session/byte receipt is not publication proof. Safe local media release,
  later re-fetch, processing beyond 24h and 24h sufficiency remain UNKNOWN.
- Initial proposed slice VIDEO_UPLOAD_ONLY should omit custom thumbnails by product
  scope; EY3 demonstrates separation, not proof every desired flow works without
  them. Verify the chosen upload contract allows omission. If added later, thumbnail
  has its own target video, media/hash, authority and side-effect identity; do not
  smuggle it into read-only status or reuse the PUBLISH identity without review.

## 4. LinkedIn evidence ledger

| Source | Accepted EXTERNAL_OFFICIAL_EVIDENCE | Not established |
|---|---|---|
| EL1 | Organization Posts API; w_organization_social; eligible authenticated member role; organization distinct from member; organic text/image/video/document/multi-image; API versioning and Rest.li requirements | Exact role list/check endpoint, access program/app-review details, field schemas, selected numeric/date version/header values, final publication evidence, idempotency |
| EL2 | Initialize image upload, receive upload URL and image identity/URN, send binary bytes before post creation | Host families, expiry, redirects, upload completion/status requirements and crash recovery |
| EL3 | Initialize document upload, temporary capability-like provider URL and document identity later used in posting | MIME/size limits, completion/finalization semantics and destination-specific access |
| EL4 | Video media API supported; organization authorization; media upload and post creation are distinct lifecycle steps | Exact upload/chunk/finish/status contract, timing, limits, identity grammar |

### LinkedIn repository reconciliation

- `LINKEDIN_ORGANIZATION` exists; remoteId admits colon-separated URN-shaped ASCII
  strings up to 200 characters. Snapshot accepts colon too. A specific organization
  URN can therefore be represented if within bounds; exact provider ID grammar and
  ownership discovery remain unverified. No organization ID was queried.
- `w_organization_social` fits existing granted-scope validation and JSON storage.
  It is not configured in a production adapter. Eligible role is required by EL1,
  but there is no implemented official role lookup. Proposed policy: verify eligible
  authority at publish time; any caching/freshness rule needs official/product review.
  Mere possession of a stored scope/URN does not establish organization authority.
- Encrypted access, finite expiry and reconnect states exist. Provider token lifetime,
  refresh availability/requirements and any additional identity/scopes remain UNKNOWN.
- Current registry is empty/test-only and keyed by platform, not five independent
  organization capabilities. Its `validate` hook/capabilityRef could conceptually
  distinguish text, single-image, multi-image, video and document, but no official
  rule registry exists. Documents also fall outside current asset MIME contract.
- Text-only avoids upload/session persistence. Existing content/options/safe-ID
  storage has no demonstrated missing column for ORGANIZATION_TEXT_ONLY; this is
  a conditional storage conclusion, not proof of complete request/response fit.
- Single-image can keep upload URL ephemeral within one bounded attempt and retain
  a normalized asset ID only if safe format/flow is verified. Existing event IDs may
  represent one asset or post, but cannot assume an upload asset is a published post.
  No durable multi-step checkpoint is implemented. Thus single-image no-migration
  compatibility remains UNKNOWN until crash/ambiguity policy is resolved.
- Organization destination and content type must be explicit and approval-bound;
  ordered images must preserve snapshot order. Separate hashtags have no approved
  mapping to provider text: HASHTAG_MAPPING_PRODUCT_DECISION_REQUIRED.
- Exact API version is UNKNOWN. Existing 64-byte capability_ref could identify a
  reviewed registry definition bound to a version; no new column is justified merely
  because versioning exists. Never guess version/protocol header values from memory.
- Organization publishing is the proposed first scope; personal/member posting is
  OUT OF INITIAL SCOPE and cannot reuse an organization destination.

## 5. TikTok evidence ledger

| Source | Accepted EXTERNAL_OFFICIAL_EVIDENCE | Not established |
|---|---|---|
| ET1 | Direct Post exists; video.publish relevant; creator authorization; audit/app and unaudited-client restrictions; video FILE_UPLOAD exists without inherent URL-pull | Exact approval/audit conditions, public/private restrictions, eligible apps/users, complete scope set and OAuth/refresh contract |
| ET2 | Creator-specific privacy choices depend on account; comments/duet/stitch may be publish inputs; application cannot invent these choices | Exact creator-info request, mandatory fields, valid options, disclosure obligations or defaults |
| ET3 | Binary video transfer via provider URL/session; chunks supported; restrictions exist; URL is sensitive temporary capability data | Current chunk/size/duration numbers, host rules, TTL, redirects, resume/retry/finalization contract |
| ET4 | publish_id supports status/reconciliation; async processing with processing/success/failure classes; reconciliation reduces blind redispatch risk | Exact enum names, polling intervals, endpoint field schemas, final-publication proof, native idempotency or duplicate guarantees |

### TikTok repository reconciliation

- TIKTOK_ACCOUNT and encrypted access/optional refresh, scopes/subject, expiry and
  reconnect state exist. `video.publish` fits scope storage. Creator identity binding
  and token/refresh contracts still require verification, so connection fit is PARTIAL.
- Privacy/comments/duet/stitch/disclosure settings have no typed approved fields.
  Current options_json is empty and ProviderIntent lacks options. Required input
  availability, creator-specific choice validation and approval binding block a
  production adapter. Disclosure requiredness is UNKNOWN, not asserted from examples.
- publish_id has a candidate normalized home in remote_processing_id, conditional
  on exact syntax/length. Existing UNKNOWN-reference behavior prevents assuming
  reliable reconciliation after ambiguity without a reviewed reference strategy.
- FILE_UPLOAD demonstrates private local video need not become a public URL.
  URL-pull-disabled policy is compatible at transport level with the evidenced video
  path. Photo/private binary support remains UNKNOWN and should remain disabled.
- Upload URL may remain ephemeral for an intentionally non-resumable bounded attempt;
  restart continuation cannot be promised without checkpoint/offset protocol evidence.
  Never reinitialize on lost response. Safe status lookup by publish_id is distinct
  from uploading chunks or finalizing a publication.
- Processing/accepted/publication transitions remain only partly understood; 24h
  sufficiency and provider-no-longer-needs-bytes proof are UNKNOWN.
- Audit/app restrictions are established in principle; the exact gate to public
  production publishing is NOT ESTABLISHED. No unaudited/public default is approved.

## 6. Facebook unresolved evidence

UNVERIFIED; DISABLED; **BLOCKED_ON_OFFICIAL_EVIDENCE**. No new Meta evidence was
supplied or fetched in this cycle. Recover official current publishing endpoint,
Page eligibility, exact least scopes, token type/acquisition, app review/business
verification where relevant, text/image/video and Reel support, upload/transport,
lifecycle/status/idempotency, limits and version/sunset rules. Do not infer Graph
version, Page authority or token model from memory or other providers.

## 7. Instagram unresolved evidence

UNVERIFIED; DISABLED; **BLOCKED_ON_OFFICIAL_EVIDENCE**. Recover official account
eligibility and login architecture/Page-linkage, exact scopes, app review, image/
video/Reel/Story/carousel rules, container lifecycle, transport/public-URL requirements,
limits/status/idempotency and version/sunsets. URL-pull policy stays disabled. No
unofficial replacement or Facebook-to-Instagram capability implication is accepted.

## 8. Remaining unknowns and evidence gates

External recovery establishes useful existence/security/transport facts, not complete
implementation contracts. No numeric quota, chunk, size, duration, API version,
polling frequency, token lifetime or timeout was added from memory.

| Provider | Remaining implementation evidence gates |
|---|---|
| YouTube | Exact OAuth/channel/refresh/project eligibility; upload field/response contract and significant metadata; session host/TTL/offset/finalization; processing/publication proof; quota/audit specifics; duplicate handling; safe omission of thumbnail |
| LinkedIn organization | Product/app access and exact eligible role check; post field/response/status contract; version/protocol values; visibility/hashtag mapping; upload-host/lifecycle for media; ID grammar and ambiguity lookup |
| TikTok video | Complete creator-choice/consent/metadata contract; token/creator discovery; exact audit/public-eligibility gate; upload-host/chunk/TTL and safe resume; status terminal evidence/rates; ID grammar and ambiguity lookup |
| Facebook / Instagram | Complete current normative publishing and eligibility evidence as above |

### Connection and refresh boundary

All three evidenced scopes can be represented as strings; none is automatically
registered/requested. “Relevant scope” is not proof of a complete least-scope set.
Current production connection scope set is empty. Scope delta/reauth needed for a
real existing grant is UNKNOWN because no real grant was inspected.

Current refresh hook/lease supports encrypted rotation, preserves an omitted new
refresh token, verifies subject and increments authorization version. No real
provider refresh protocol is implemented. The supplied evidence establishes neither
which providers require refresh-token persistence nor token lifetime/rotation rules;
all three remain UNKNOWN. Shared credential-safety/lease ideas exist already;
refresh exchange semantics are PROVIDER_SPECIFIC, not a new generic Phase 9A client.
Fresh valid authorization might allow a bounded first dispatch without refresh,
but this cannot waive token-expiry review. Reconciliation after rotation conflicts
with frozen authorization_version and needs explicit policy before long-lived flows.

### Provider options and immutable approval

The following requiredness is proposed **product policy** where indicated; supplied
provider evidence does not establish every mandatory API field. Immutable approved
options must enter the same preview/hash/snapshot as content, never silently change
between step-up and dispatch.

| Provider option | Current model | Classification / basis |
|---|---|---|
| YouTube title, description, tags | Present approved content fields | REQUIRED_BEFORE_APPROVAL under existing content model; exact provider requiredness UNKNOWN |
| YouTube privacy, category, made-for-kids | Absent | UNKNOWN provider requiredness; if sent, proposed REQUIRED_BEFORE_APPROVAL as product-significant; no defaults |
| YouTube custom thumbnail | No dedicated publish action | OPTIONAL proposed initial scope exclusion, not a verified API requiredness claim; recheck upload contract |
| TikTok privacy | Absent | REQUIRED_BEFORE_PUBLISH per creator-choice evidence; proposed also REQUIRED_BEFORE_APPROVAL binding; valid choices unknown |
| TikTok comments/duet/stitch | Absent | UNKNOWN individual mandatory status; when applicable, bind explicit choice before approval and revalidate before publish |
| TikTok disclosures | Absent | UNKNOWN requirements; no assumed legal/commercial default |
| LinkedIn organization destination | Exists in selection/snapshot | REQUIRED_BEFORE_PUBLISH; explicit confirmation already destination-bound; no inferred organization |
| LinkedIn content type | Inferred internally from assets today | REQUIRED_BEFORE_PUBLISH; proposed explicit approved capability/type before approval |
| LinkedIn image order | Ordered descriptors (0..3) | REQUIRED_BEFORE_APPROVAL if multiple assets selected; provider max/rules still UNKNOWN |

For YouTube, LinkedIn and TikTok, separate hashtags remain
**HASHTAG_MAPPING_PRODUCT_DECISION_REQUIRED**. No approved deterministic external
field rule was supplied. This blocks even a text-first slice until mapping/eligibility
is defined. No merge, omission or rewrite merely to fit an API.

Binary framing/chunking that preserves exact bytes is a
LOSSLESS_TECHNICAL_TRANSFORMATION. Caption rewrite, tag insertion/removal, automatic
privacy change and meaningful media alteration are SEMANTIC_TRANSFORMATION and
require explicit product policy/approval. Only approved immutable copy, options,
ordered asset hashes and destination may reach a future adapter.

## 9. Persistence and migration 0012 decision

Data classification: tokens = SECRET; upload/session URI = SENSITIVE_CAPABILITY;
post/video/publish/asset identity = NORMALIZED_PROVIDER_ID; verified offsets/version/
state/timestamps = SAFE_METADATA (still operation-bound, not arbitrary log text).
No signed URL belongs in a public-safe provider-ID column.

| Provider / value | At-rest, hash and lifetime rule | Mutability / logging | Existing fit |
|---|---|---|---|
| YouTube session URI | Encrypt if persisted; hash only as optional lookup supplement; expire on provider expiry/terminal use; exact TTL UNKNOWN | Secret capability immutable per session; state may advance; never full-URL logs | No suitable encrypted checkpoint field |
| YouTube upload progress | Plain safe typed offset + verified session binding; durable only if restart continuation promised | Mutable with CAS and provider verification, bounded counts only in logs | No structured checkpoint; cannot overload generic operation version |
| LinkedIn image/document/video upload URL | Prefer ephemeral; encrypt only if durable recovery is proven necessary; expiry required but TTL UNKNOWN | Immutable within returned session, delete on expiry/use; never logs | No suitable secret field, but ephemeral first attempt needs no URL column |
| LinkedIn asset URN / later post ID | Plain normalized ID may be acceptable after strict format/ownership checks; hash cannot replace lookup ID; retain minimally with history | Append-only references; not secret but default omit external IDs from logs | Existing safe event IDs candidate for narrow one-asset flow; multi-asset checkpoint unresolved |
| TikTok upload URL | Ephemeral default; encrypt if required for reviewed continuation; exact TTL UNKNOWN | Never full URL/logs; bind to publish_id, media hash and operation | No encrypted checkpoint field |
| TikTok publish_id | Plain bounded normalized ID after exact grammar verification; minimal lifecycle/history retention | Immutable identity, append-only events; internal log projection preferred | remote_processing_id candidate, UNKNOWN-reference handling needs design |
| All access/refresh tokens | Existing encrypted credential store; no hash-only substitute; existing revocation/expiry lifecycle | Versioned rotation, never log | Representation exists; exact provider requirements unknown |

New-column candidates are **conditional**, not authorization or a schema proposal
ready for migration. A capability URL cannot be stored before its initiating call
returns; durable checkpoint infrastructure must nonetheless exist before initiating
an operation if restart recovery is promised.

| Table / conceptual field | Purpose / classification | Why existing field insufficient | Provider / content | Required before first network call? | Retention / encryption |
|---|---|---|---|---|---|
| Undecided upload-checkpoint table: encrypted session capability | Restart continuation; SENSITIVE_CAPABILITY | Safe event IDs reject URL query and are not encrypted; credentials purposes access/refresh cannot be overloaded | YouTube video; LinkedIn/TikTok media only if durable continuation selected | Value NO; durable facility YES before init if promised | Expire at verified session expiry or terminal use, exact TTL policy unresolved; encrypt |
| Same undecided checkpoint: offset, stage, asset/session identity | CAS progress and original operation binding; SAFE_METADATA + NORMALIZED_PROVIDER_ID | Current operations coordinate dispatch, not byte offsets/per-asset multi-step lifecycle | YouTube video; other media need depends on protocol | Initial binding YES if facility chosen; remote values NO | Until terminal/session expiry, minimal safe reference history separately retained; no secret plaintext |

Existing fields to reuse rather than add: snapshot options_json for approved typed
choices (immutable), capability_ref for pinned API/rule version, event provider IDs
for safe normalized identities. Provider/option code gaps do not inherently imply a
migration. Broad runtime grants are neither necessary nor authorized.

**Overall migration decision: SCHEMA_DECISION_BLOCKED.** Pure shared stateless
security primitives can begin without a migration under future authorization
(NO_MIGRATION_REQUIRED for that bounded slice). LinkedIn organization text has no
demonstrated new persistent-field need. YouTube durable-resume support reveals a
real representation gap conditional on restart-continuation policy; it does not yet
justify a concrete 0012 design. No decision to create 0012 is made.

## 10. Readiness and future implementation gates

Three providers are **READY_FOR_DESIGN**, not ready for narrow implementation.
Facebook/Instagram: **BLOCKED_ON_OFFICIAL_EVIDENCE**.
Overall: **PARTIALLY_UNBLOCKED_FOR_DESIGN**.
Shared primitive needs are justified by multiple externally evidenced flows, but
exact upload-host rules and adapter contracts remain partly blocked. Do not call
external evidence VERIFIED_OFFICIAL or claim a completed Phase 9A implementation
contract. See security review for the shared-primitive table and hosting risks.

No implementation, provider enablement, permission/grant change, migration, UI,
network client, upload, refresh, webhook, polling worker or scheduling is authorized.
