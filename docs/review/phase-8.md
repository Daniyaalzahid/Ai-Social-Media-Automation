# Phase 8 discovery / first policy gate — STOP FOR APPROVAL

Date: 2026-10-17. **Planning only; implementation is not authorized.**

- Phase 7 baseline: `8326ae185ae48a4fc131dd02bbb9940ecb315334`, branch main, verified local/remote equality and initially clean tree/index.
- Scope: exact approved-revision, explicit human immediate publishing foundation; no scheduling, autonomous publishing or Phase 9.
- Research: 18 official-document requests blocked by proxy tunnel 403; zero bodies retrieved. Exact real publishing protocols remain UNKNOWN.
- Provider readiness: all real adapters DISABLED / UNVERIFIED. No fake adapter implemented.
- Permissions proposed: reuse existing `content.publish`, no additions/grant changes; count remains 32.
- Recent-auth proposed: existing five-minute purpose/session/user/auth-version-bound single-use mechanism, with a separately approved closed publish action extension only.
- Schema proposed: four justified tables below, two additive parent identity indexes; no migration created.
- Runtime grants proposed: append-only snapshot/assets/events and narrowly mutable operation progress; no broad DB rights, triggers or SUPER.
- Tests proposed: deterministic fake-provider unit/MySQL/browser contracts, exact constraints, NULL/collation/FK/race/runtime-grant/migration tests. None implemented or run in discovery.
- Blockers: policy/schema/step-up/media/state-machine approval, official protocol evidence, exact payload mapping and provider-specific settings, app configuration, Hostinger deployment validation.

## A–I. Baseline and immutable migrations

| Item | Evidence |
|---|---|
| A branch | main |
| B HEAD | 8326ae185ae48a4fc131dd02bbb9940ecb315334 |
| C local main | 8326ae185ae48a4fc131dd02bbb9940ecb315334 |
| D remote main | 8326ae185ae48a4fc131dd02bbb9940ecb315334, verified with credential-redacted native git ls-remote |
| E initial tree/index | clean / empty; final discovery leaves only the two new planning documents, unstaged |
| F parent/message | 8e8ac677ca0125239d45fe3110f25961aa2dfcc3 / feat: establish phase 7 secure social connections |
| G migrations | exactly 11 SQL files and 11 manifest entries, 0000–0010 |
| H 0010 SHA-256 | b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce |
| I integrity | every migration matches its manifest checksum and finalized HEAD bytes; no 0011 |

| Migration | SHA-256 |
|---|---|
| 0000 | f1bd8bb9ec302a9e67c8a25d70dde8f7707fdbdfbe3e0d4e263ef88f4b33f799 |
| 0001 | 6e3725de5e3eb5af2141e0e6d41e9269f607d8610c6c7e59153e38d4fec35e02 |
| 0002 | 429a62df6842fd1bb0261baaf51b6121305cc1b3576682f51b9b5dce87f5a811 |
| 0003 | 978abcf2a7456c1259c5208442eebdeb9e78233b1d692c40f2ef2e2cded7a401 |
| 0004 | 48130cb75ecc20db6e1aec08fdb475f73b07e5a73eef6515cad3af2b7ca55925 |
| 0005 | 9d973926b53e35a7721eacff046bbc347ff43b2a9a5558c6112ca28a2bbc716a |
| 0006 | ac785551c2ca5070c2e62de90877788005c8f4a2ff02e5c74bb0cad50c895c37 |
| 0007 | 01495fcf7d3945d951935f807c9f952eb149ef59b8449c9083884c85642a9d4a |
| 0008 | d081f12d4575f5b9b1092fada7d761445f6dcaff90c364b0cd0d3f4566e0c7f1 |
| 0009 | f4c21f84c2127f6cced5d881151709fd4df55424f3a43b72d04f6efaa0fc0782 |
| 0010 | b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce |

Additional baseline fingerprints (all unchanged):

| File | SHA-256 |
|---|---|
| package.json | 9a1601a108d72bfa63e47faad201288284d018c7de975cc490901be96fea8591 |
| package-lock.json | ea3b129e3bae04a93b47780c4cb9292d3f2dd699986671c3c4c0f9ca64edbc57 |
| .env.example | b441023d4a408cfad87a9e25db3cfc556d44d3f93b9a0bcdc2e21a602e5d9846 |
| src/server/config/schema.ts | adf1bca106868374ba66fd52b74bc8a330c156e81db1babb401c5a9be5b5bbb1 |
| src/server/db/catalog.ts | db3c74ec2c34940e31b073e9e489657e1efd462aee240a19f3754d94e1c44d12 |
| docs/review/phase-7.md | 262af7120f9d851a73ebce24e39d438f7ae1c8495a7f4ef589e0fbefa45fe184 |

Historical Phase 7 evidence remains unchanged: first finalization browser run was 108 passed / 1 failed / 1 interrupted / 2 not run / 0 retries. Root cause UNRESOLVED; flakiness was NOT established. The redacting wrapper was a reporter, not proof of a credential leak. Later targeted executions passed; the final successful Phase 7 gate had 112 browser passes / 0 retries. Retained safe media diagnostics are untouched. No new execution reclassifies that history.

## J–N. Permission gate — reuse, not implication

Authoritative inspected files: `src/server/db/catalog.ts`, `src/server/db/seeds.ts`, Phase 2A architecture and PRD role definitions. The original foundation reserved future capabilities without implementing those features. The catalog currently contains exactly **32 unique permissions**.

`content.publish` already denotes publishing content. Owner receives it explicitly through the full canonical set; Marketing Admin lists it explicitly. PRD role definitions separately say Owner manages publishing and Marketing Admin publishes. Creator, Reviewer and Viewer lack it. This is the exact semantic capability needed, unlike content.read, content.approve, integrations.manage or media.upload.

Other existing relevant capabilities: content.read (object-scoped content visibility), content.approve / content.approve_self (review decisions), content.schedule (future scheduling only), publishing_logs.read (safe operation history proposal), integrations.read (safe metadata) and integrations.manage (connection administration). None implies publish. Publishing must not exercise content.schedule.

**Proposal requiring approval:** reuse content.publish, add NONE, change NO grants, resulting count **32**. Require the existing explicit content.read / integrations.read / publishing_logs.read capabilities at their respective UI/read endpoints without deriving them from publish. All proposed publishers already possess these grants.

| Role | content.publish | Publish object scope | integrations.read | integrations.manage |
|---|---|---|---|---|
| OWNER | YES | approved workspace revision + eligible workspace destination | YES | YES |
| MARKETING_ADMIN | YES | same | YES | YES |
| CONTENT_CREATOR | NO | none | YES, existing safe DTO only | NO |
| REVIEWER | NO | none, approval never implies publish | NO | NO |
| VIEWER | NO | none, approved-text visibility never implies publish | NO | NO |

No permission implication mechanism. Publishing to a previously administered authorized destination is not permission to change the persistent selection. That remains an integrations.manage + purpose-bound management step-up operation. Proposed publish selection is operation-local, may choose only an active authorized discovered destination, and does not write social_authorizations.selected_id. This distinction needs approval, as Phase 7 deferred destination-use semantics.

## O. Recent-auth proposal

Threats: stolen still-live admin session, unintended double submission, mistaken destination/revision, and externally consequential irreversible disclosure. CSRF and permission checks alone do not prove deliberate current human intent. Step-up reduces stolen-session risk; it does not fix XSS, compromised MFA or mistaken content.

Recommend step-up for **each new explicit publishing operation**, after an exact confirmation preview and before any external upload/create call. Reuse existing five-minute, single-use, session/user/auth-version/purpose-bound password/MFA proof. Propose one closed extension `PUBLISH_DISPATCH:<43-character base64url SHA-256 commitment>` through the same extension pattern as INTEGRATION actions. Commitment covers canonical brand, actor's request ID, approved revision/decision, authorization ID/version, destination identity, platform, capability reference, exact intent hash and provider options. It contains no credential.

Current access.ts rejects this action; it is **not implemented**. Do not reuse an integration proof or generic timestamp. Approval is needed for this extension; no password/MFA/Argon2/session cryptography change is proposed. Consume the proof atomically with validated snapshot/operation admission. Existing-operation replay reads the same result and does not consume a second proof or dispatch again. Fresh proof is needed after a changed confirmation or expired admission. Reading status / an explicit bounded status reconciliation is not a new publish and needs current publish authority, not repeated MFA merely to read.

UX cost: one current step-up per operation, no batch or indefinite blanket grant. UI identifies destination, exact revision, platform and eventual visibility; cancel leaves no external operation. No arbitrary sleep, retry or timeout inflation.

## P–V, AU. Official publishing research / readiness

See `../research/phase-8-provider-publishing-requirements.md` for every URL, access result and per-provider requirement matrix. **18/18 blocked before body retrieval** on 2026-10-17 at 10:19 UTC with `Tunnel connection failed: 403 Forbidden`.

| Provider | Exact protocol/scopes/limits/IDs/idempotency | Dashboard/app configuration | Production |
|---|---|---|---|
| Facebook Pages | UNKNOWN | UNVERIFIED | DISABLED / UNVERIFIED |
| Instagram professional | UNKNOWN, login branch not chosen | UNVERIFIED | DISABLED / UNVERIFIED |
| TikTok Direct Post / upload-only | UNKNOWN, consent/disclosure/audit requirements unresolved | UNVERIFIED | DISABLED / UNVERIFIED |
| YouTube | UNKNOWN, resumable/processing/privacy/quota contract unresolved | UNVERIFIED | DISABLED / UNVERIFIED |
| LinkedIn organizations | UNKNOWN, product/version/admin authority unresolved | UNVERIFIED | DISABLED / UNVERIFIED |
| LinkedIn members | UNKNOWN; no existing member destination kind | UNVERIFIED | NOT APPROVED / DISABLED |

No exact endpoint, scope, current version, numeric provider limit or native idempotency guarantee is invented. Published documentation, approved app configuration and production verification are distinct evidence gates. Prior supplied Google/TikTok OAuth summaries do not verify publishing requirements. Native fetch is a proposed transport, not an implemented provider adapter. Real providers stay disabled even if a future fake passes all tests.

## W. Exact lineage and dispatch authority

Inspected: `migrations/0009_content_workflow.sql`, `src/server/content/service.ts` and `policy.ts`, Phase 6 architecture. Current approved revision is derived by joining immutable content_decisions with content_revisions, filtering APPROVED and ordering revision sequence descending. There is no mutable approved flag, no stored approved pointer and no approval-revocation service. A newer working draft can coexist with an older approved revision. A newer approved revision supersedes the earlier one for a new publish confirmation.

Proposed lineage: canonical BRAND_ID -> content item -> exact immutable revision/platform variant -> exact submission -> exact APPROVED decision -> immutable snapshot -> operation -> append-only normalized observations. The application is presently single canonical workspace; content_items/media_assets do not carry brand_id. Do not claim the new schema magically makes old content multi-tenant. Resolve only canonical BRAND_ID server-side; any multi-workspace expansion requires separate review.

Before admission and again at dispatch claim, under the existing item aggregate locking discipline, recompute the current approved revision with **current locking reads**, check its exact decision/submission relationship and the requested variant/attachments. No stale RR snapshot inference. An approved older revision may publish while a newer draft is unapproved, with clear confirmation; it may not silently replace a newly approved revision. A changed approval identity invalidates a stale confirmation before claim. No new approval-revocation feature is proposed.

Reuse Phase 6 revalidateSnapshots against current authoritative Brand policy at admission/claim; preserve the exact stored resolved values/stable identities and fail if policy changed. All 13 protected categories remain fail closed: PRICE, DISCOUNT, STOCK, WARRANTY, INSTALLMENT, SPECIFICATION, ADDRESS, CONTACT, DELIVERY, INSTALLATION, SUPERLATIVE, EXCLUSIVITY, PARTNERSHIP. Workflow approval creates no new claim source and does not unlock EXPLICIT_APPROVAL_REQUIRED. Revalidation rejects; it never rewrites approved text or metadata. Manual Composer remains independent of OpenRouter; no AI runs at publish time.

**Linearization proposal:** successful commit of DISPATCHING, after current actor/session, approval, destination, connection version, capability, media and claim checks, authorizes this exact single external attempt. No database transaction/lock spans network work. A new approval/disconnect committed before claim wins and prevents dispatch. A change after claim cannot reliably recall a transmitted request; record the race/outcome, reject any next provider side-effect stage if local authority was lost, and use UNKNOWN when publication cannot be ruled out. Never pretend disconnect undoes a remote post. This residual boundary requires explicit policy approval.

Lock order proposal: reuse sorted actor/item-creator/media-creator parent user locks, session/catalog, Brand, item aggregate, social guard/authorization/destination, media guard/sorted rows/holds, operation, append-only rows and audit. All new publishing paths follow the same order. Existing content/media/social transactions take compatible subsets; fixture-controlled concurrency must prove this before acceptance. Parent FK locks must not be acquired after child guards. No isolation change or generic deadlock retry.

## X. Immutable intent / exact copy

One immutable snapshot per operation contains workspace/item/revision/approval-decision identity, platform, authorization/destination and version, byte-exact remote destination ID, actor/request ID/time, registry capability version, current validation Brand revision, exact approved platform value, explicit bounded non-content provider options and canonical hashes. Ordered immutable publish_assets bind the same revision attachments, size/type/hash and bounded protection. No storage key/path, credential, prompt, raw response, review note or arbitrary Brand Brain copy. options_json is a closed capability-specific allowlist, not arbitrary browser/provider JSON; core fake accepts an empty object, and all real option schemas remain blocked pending official review.

Canonical intent hash is SHA-256 over a versioned, deterministic server serialization of all those fields and ordered attachment descriptors; a separate copy hash covers exact approved platform content. Preserve text code points/line breaks and array order, including legitimate Urdu joiners; JSON key ordering is canonical serialization, not text normalization. Browser sends identity/confirmation, never trusted text, media hashes or provenance. Server resolves all values. Hash is integrity/idempotency evidence, not permission.

**Mapping gate discovered:** existing variants hold caption/description and hashtags as separate fields; YouTube also has tags/title. A real provider's single-text payload may require an explicit rendering convention. No automatic hashtag append, omission, truncation, translation, new CTA or default factual text is authorized. Until an exact approved outbound representation is reviewed, reject any capability/variant whose approved fields cannot be represented unchanged. A confirmation dialog alone is not a replacement for immutable editorial approval. No Phase 6 change is proposed under this discovery. Fake tests can use an exact representable zero-hashtag variant. Mandatory privacy/category/disclosure settings likewise require reviewed explicit options; no guessed defaults.

## Y–Z. State machine and UNKNOWN

Proposed separate `PublishingProvider` contract, not an extension that treats login as publish readiness:

- `validateCapability`: server-owned versioned manifest + exact destination/granted authority + approved variant/media/options -> valid or a closed rejection. Manifest declares supported types/counts/limits, mandatory human choices, upload mode and documented success evidence. Unknown capability denies.
- `prepare`: explicitly classified side-effecting bounded upload/container/resumable preparation, usable only after dispatch claim. Returns a validated bounded provider handle transiently; never pretends preparation is publication.
- `publish`: documented create/finalize stage for that immutable intent. Returns a strict discriminated result: definitive published, accepted, processing, rejected, or unknown. No generic HTTP-success mapping.
- `getStatus` and `reconcile`: bounded **read-only remote operations** with existing permitted references; no create, finalize, resend or hidden upload in either method. If safe remote lookup is undocumented, return unsupported/unresolved.

Sync publication, container creation, resumable transfer, privacy/disclosure choices and processing are manifest-specific, not forced into a universal endpoint. A provider may require prepare + publish stages within the one explicitly authorized bounded pipeline; exact stages and intermediate credential-like handles need official review. Multi-request create continuation or stored resumable secrets remain a separate gate. The empty Phase 7 registry remains empty. The future tests-only fake is proposed for all listed outcomes, with no implementation/network in discovery.

Recommended small current-state vocabulary (provider-specific evidence mapping is separately gated):

| State | Meaning / permitted next step |
|---|---|
| CREATED | fully validated immutable intent admitted; no provider side effect yet; dispatch once or local failure |
| DISPATCHING | committed claim before any upload/container/create side effect; transient exact claim identity and deadline; no second claimant |
| ACCEPTED | documented provider acknowledgement plus usable safe reference, not publication; read-only status/reconciliation |
| PROCESSING | documented processing state, not publication; read-only status/reconciliation |
| PUBLISHED | documented definitive success matching destination/intent; terminal, never inferred from generic 2xx |
| FAILED | definitive local pre-dispatch failure, remote rejection or remote terminal processing failure; stage recorded distinctly |
| UNKNOWN | transmission/result may have occurred, orphaned dispatch claim, malformed/oversized success response, unconfirmed processing or ambiguous persistence; no re-dispatch |

No separate VALIDATED row state is necessary: CREATED admission requires validation in one transaction; rejected validation produces safe audit and no admitted intent. A failed admission transaction creates no dispatch authority. DISPATCHING may reach accepted/processing/published/failed/unknown; accepted/processing may advance based on documented read-only observations; UNKNOWN may resolve only through authoritative safe provider lookup. No UNKNOWN -> DISPATCHING transition. A lower-evidence later observation never rolls back PUBLISHED. Contradictory observations require attention and preserve evidence, not overwriting success with a guess.

A committed DISPATCHING marker remains ambiguous if the process dies before actual send; conservative UNKNOWN is intentional. A request abort after possible transmission is not definitive rejection. DB failure after remote response means retain/recover the precommitted claim as UNKNOWN; no duplicate POST. Restart never reclaims the claim to send again. Explicit human status check may classify an expired claim UNKNOWN without a worker.

Proposed internal bounds, **not provider facts**: one 30-second external-work request deadline, bounded 64 KiB response bodies, five-second body reads inside that total, no network-spanning DB lock. Only independently documented resumable/status protocols could refine these later; unsupported long/multi-stage flows remain disabled rather than increasing timeouts. One explicit status action makes at most one bounded provider read, with a persisted 30-second cooldown and max 100 observations per operation. No automatic polling loop, sleep, retry wrapper, daemon or autonomous publication stage. Browser cancellation after dispatch means uncertain status, not cancellation of the remote post.

## AA–AB. Idempotency, duplicate suppression and races

- Unique actor/request UUID plus canonical digest: same request/same intent returns the same operation; same UUID/different intent conflicts. A request replay cannot consume proof or send twice.
- Unique natural identity `(revision_id,destination_id,platform,operation_type)` on the snapshot suppresses two admins/tabs/request IDs for the same approved revision and destination. It remains reserved after FAILED or UNKNOWN. V1 deliberately has **no resend/retry**, even for definitive remote rejection; changed content requires a new revision/approval. Removing the reservation or offering manual resend is a future explicit gate. A new revision must never be suggested as a way to bypass an unresolved remote duplicate risk.
- Transactional compare-and-swap/version + locked operation lets one CREATED -> DISPATCHING winner commit; competitors return existing status/conflict. Crash does not release duplicate protection. No assumption of provider-native idempotency.
- Newer approval before claim invalidates old intent; after claim it cannot mutate the snapshot. Revocation/disconnect before claim denies; after claim prohibit further stages, retain possibly transmitted outcome. Expired/token refresh-in-progress/LIMITED/reconnect-required connections deny. Publishing does not silently refresh or reauthorize; existing internal refresh primitive cannot be treated as a guessed live-adapter contract.
- Media cleanup/manual removal versus preparation uses the same media guard/row lock. If deletion_pending won, preparation fails. If the valid bounded publish hold won, cleanup cannot delete until that protection ends. No committed successful admitted snapshot references a legitimately deleted binary at admission.
- Validate each actual provider effect, including preparation/upload, against the captured identity and live authority. Provider API flows that need autonomous later create calls are not enabled by the basic status mechanism.
- Do not claim global duplicate elimination across different revisions/destination aliases or provider-side human actions. That requires documented provider semantics and product policy. An unresolved operation must be visibly surfaced before another operation for the same content/destination is considered.

## AC–AD. Temporary media and provider URL pull

Existing limits are application bounds, not provider compatibility proof: 8 MiB images, 32 MiB MP4; image max 8192 per dimension / 16,777,216 pixels; parser restricts video to 3840x2160, 600 seconds, nonfragmented H.264/AAC. JPEG/PNG/WebP and restricted MP4 only. Max four revision attachments. Unattached expiry 24 hours, interrupted receiving 30 minutes; draft/submission protection seven days, approval protection 30 days. Binaries remain temporary, lightweight immutable text/history/tombstones remain.

Propose **nonrenewable publish hold capped at 24 hours from admitted intent**, only after the asset is currently live, eligible, readable and within the exact approved attachment set. It is an additional finite lease, not permission to revive expired/deleted/deletion_pending assets or retain all revisions forever. Existing longer content protection remains intact. New holds end logically at terminal PUBLISHED/FAILED or their hard expiry, whichever applies; UNKNOWN protection expires at the same cap. Processing exceeding the cap remains unresolved and cannot renew retention indefinitely. Exact provider needs must fit this bound or remain blocked pending a new gate. No final post-publish retention policy is invented.

Storage open uses existing no-follow/root/symlink/private-path protections; verify metadata, bounded SHA-256 and exact bytes for selected immutable attachments. Stream with backpressure, no unbounded Buffer, no new transcoding/variants. Cleanup and manual removal must consult publish holds under existing lock order; this would be a separately authorized narrow integration change, not done now. Holds release no quota; only existing final binary tombstoning releases quota exactly once. No binary/base64 in MySQL.

**URL-pull proposal: deferred, disabled by default.** Prefer reviewed direct bounded upload when officially supported. If a provider requires pulling, propose a distinct short-lived one-operation/one-asset read capability derived from a 256-bit random secret, only its domain-separated hash stored, token transported only as that capability, never an application session. Fixed trusted APP_URL, opaque handle, exact MIME/length, private origin storage, no filename/path addressing or arbitrary fetch/redirect target. No Authorization/header/cookie secret forwarded. No logs/query capture/referrers containing capability; endpoint must override ordinary session media policy only for that reviewed purpose.

A true single GET restriction can break provider HEAD/range/multiple fetches. Exact bounded read/range/HEAD/replay budget, lifetime and revocation behavior therefore require official protocol evidence first. Do not assume provider identity from User-Agent/IP. This bearer URL is credential-like, not safe DTO/audit data. Apply per-asset read/byte/concurrency budgets, expiry <= operation media hold, fixed asset binding, tombstone denial, rate bounds, no CORS/CSP broadening and path/symlink checks. Provider-originated fetch should not become server arbitrary URL fetch (SSRF); provider resumable URLs also require exact official host/scheme/path/redirect allowlists before use.

No pull route, token persistence column or resumable-session secret storage is included in the proposed core schema below. Enabling either requires an additional explicit schema/security gate inside Phase 8 before a real adapter; do not improvise secret URLs in normalized remote IDs.

## AE–AH. Exact core schema proposal — NOT executable migration

This is a concrete review proposal, not an assertion that DDL or MySQL semantics have been tested. No 0011 exists. Four tables are justified: immutable outbound intent, mutable dispatch coordination, append-only evidence, immutable attachment descriptor/finite hold. Do **not** add separate attempts or provider_publications tables: V1 has one dispatch per intent and normalized references in events. No scheduling dates, retry counters, remote social post editing or speculative analytics.

### Common definitions

All new tables InnoDB. UUID reference columns are `varchar(36)` with utf8mb4_bin to match finalized parent columns; canonical lowercase UUID shape is additionally checked on each new UUID column. Define the exact expanded shape predicate `U(x)` as `OCTET_LENGTH(x)=36 AND REGEXP_LIKE(x,'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$','c')`. No nullable UUIDs are proposed. The regex covers shape, not permission.

Provider `P` = ENUM(META,TIKTOK,YOUTUBE,LINKEDIN); platform `L` = ENUM(FACEBOOK,INSTAGRAM,TIKTOK,YOUTUBE,LINKEDIN); operation `T` = ENUM(PUBLISH); decision `D` = the finalized ENUM(APPROVED,CHANGES_REQUESTED,REJECTED), with its allowed value restricted to APPROVED by CHECK. State `S` = ENUM(CREATED,DISPATCHING,ACCEPTED,PROCESSING,PUBLISHED,FAILED,UNKNOWN). All enums NOT NULL with no implicit default; strict SQL mode and explicit nonempty-enum checks reject the ENUM zero/error value. No free-form routing string is an enum.

`A(x,n)` for a NOT NULL VARBINARY field is exactly `OCTET_LENGTH(x) BETWEEN 1 AND n AND NOT REGEXP_LIKE(CONVERT(x USING ascii),'[^A-Za-z0-9._:/-]','c')`. This permits only bounded opaque safe ASCII identifiers, not URLs with queries; byte identity is provided by VARBINARY, never trimming/collation. Conversion replacement characters fail the allowed set. Apply actual MySQL byte-level tests before freezing DDL. For nullable fields use explicit `(x IS NULL OR (x IS NOT NULL AND A(x,n)))`; no nullable positive comparison alone.

### 1. publish_snapshots — immutable exact outbound intent

All columns NOT NULL:

- id, brand_id, post_id, revision_id, approval_decision_id, actor_id, request_id, authorization_id, destination_id: UUID columns as above.
- provider P, platform L, operation_type T, approval_decision D.
- authorization_version INT UNSIGNED; validation_brand_revision INT UNSIGNED.
- destination_remote_id VARBINARY(200); capability_ref VARBINARY(64).
- content_json JSON: exact one-platform value, not a pack supplied by browser; options_json JSON: reviewed explicit non-content choices only.
- copy_hash BINARY(32), intent_hash BINARY(32), request_digest BINARY(32).
- created_at DATETIME(3), confirmation_expires_at DATETIME(3).

Immutable: **every column**. Content/options shape, exact equality to approved source and canonical hash reconstruction are authoritative service validators, not claims that JSON size alone validates content. Approval note and generation internals are not copied. Lightweight snapshots retained with content history; no heavy binary/secret.

PK(id). Uniques: `publish_request_once(actor_id,request_id)`, `publish_revision_destination_once(revision_id,destination_id,platform,operation_type)`, `publish_snapshot_revision(id,revision_id)`. Index: `publish_snapshot_workspace(brand_id,created_at,id)`.

### 2. publish_operations — one mutable dispatch coordinator per snapshot

All NOT NULL: id UUID (same as snapshot id); state S; version INT UNSIGNED; last_event_sequence INT UNSIGNED; updated_at DATETIME(3).

Nullable: dispatch_started_at DATETIME(3), dispatch_deadline DATETIME(3), dispatch_claim_hash BINARY(32), last_status_check_at DATETIME(3).

No credentials in the claim hash: it identifies one internal dispatch claim and never grants browser authority. Snapshot ID immutable. Dispatch triple may be set once by service, not reassigned after ambiguity. State is coordination, not sufficient proof of publication; authoritative terminal evidence is append-only event plus reviewed provider mapping. Monotonic progression/CAS/event consistency require transaction service tests; a CHECK cannot compare OLD/NEW or other rows.

PK(id). Index `publish_operations_state(state,updated_at,id)`. Lightweight retention with snapshot. No delete, requeue, scheduled execution timestamp or automatic lease reclaim. Last-status-check supports bounded human-requested observations, not scheduling.

### 3. publish_events — immutable normalized outcomes

NOT NULL: operation_id UUID; sequence INT UNSIGNED; state S; boundary ENUM(LOCAL,REMOTE,UNCONFIRMED); observed_at DATETIME(3).

Nullable: error_category ENUM(VALIDATION,LOCAL_DATABASE,AUTHORIZATION,CAPABILITY,MEDIA,REMOTE_REJECTED,REMOTE_PROCESSING,PROVIDER_RATE_LIMIT,TRANSPORT,UNCONFIRMED); safe_error_code ENUM(INVALID,UNAVAILABLE,ACCESS_LOST,UNSUPPORTED,RATE_LIMITED,REJECTED,PROCESSING_FAILED,OUTCOME_UNKNOWN); remote_publication_id VARBINARY(256); remote_processing_id VARBINARY(256); published_at DATETIME(3).

PK(operation_id,sequence). No additional unique global remote ID: its scope/format is not verified and may differ by provider/destination. No arbitrary provider message, response JSON, response URL or session URL. Immutable: every column. Bounded to 100 events including admission/dispatch; stop status work before the budget is exhausted, surface attention, preserve last safe evidence. Store normalized IDs internally, expose only reviewed safe result DTO fields to authorized publishers/log readers. Retain lightweight event history; provider ID retention/privacy must be documented at implementation review.

### 4. publish_assets — immutable approved attachment snapshot and finite hold

All NOT NULL except duration_ms: snapshot_id UUID, revision_id UUID, media_id UUID; position TINYINT UNSIGNED; mime ENUM(image/jpeg,image/png,image/webp,video/mp4); byte_size INT UNSIGNED; sha256 BINARY(32); width INT UNSIGNED; height INT UNSIGNED; created_at DATETIME(3); protected_until DATETIME(3). duration_ms INT UNSIGNED NULL.

PK(snapshot_id,media_id). Unique `publish_asset_order(snapshot_id,position)`. Index `publish_asset_hold(media_id,protected_until,snapshot_id)`. All immutable, including hold expiry; **no indefinite renewal**. No physical key/path/display filename or binary. Absence of asset rows is valid for a text-only capability. The service compares the complete attachment set/order to the approved revision; silently dropping unsupported attachments is forbidden. Descriptor remains after binary deletion for history; cleanup checks both operation state and the finite timestamp, not the bare presence of historical rows.

### Exact proposed CHECK inventory (12 named constraints)

These are exact predicate definitions using U/A macros expanded per column before any approved DDL. Each macro is defined above; no implicit unspecified checks.

| Name / table | Predicate |
|---|---|
| publish_snapshot_ids / snapshots | U for each of the nine UUID columns listed above, joined with AND |
| publish_snapshot_binding / snapshots | provider IN P AND platform IN L AND operation_type='PUBLISH' AND approval_decision='APPROVED' AND authorization_version>0 AND validation_brand_revision>0 AND ((provider='META' AND platform IN('FACEBOOK','INSTAGRAM')) OR (provider='TIKTOK' AND platform='TIKTOK') OR (provider='YOUTUBE' AND platform='YOUTUBE') OR (provider='LINKEDIN' AND platform='LINKEDIN')) |
| publish_snapshot_value / snapshots | A(destination_remote_id,200) AND A(capability_ref,64) AND JSON_TYPE(content_json)='OBJECT' AND JSON_STORAGE_SIZE(content_json)<=32768 AND JSON_TYPE(options_json)='OBJECT' AND JSON_STORAGE_SIZE(options_json)<=4096 |
| publish_snapshot_confirmation / snapshots | confirmation_expires_at>created_at AND confirmation_expires_at<=DATE_ADD(created_at,INTERVAL 10 MINUTE) |
| publish_operation_bounds / operations | U(id) AND state IN S AND version>0 AND last_event_sequence BETWEEN 1 AND 100 |
| publish_operation_dispatch / operations | (dispatch_started_at IS NULL AND dispatch_deadline IS NULL AND dispatch_claim_hash IS NULL AND state IN('CREATED','FAILED')) OR (dispatch_started_at IS NOT NULL AND dispatch_deadline IS NOT NULL AND dispatch_claim_hash IS NOT NULL AND dispatch_deadline>dispatch_started_at AND dispatch_deadline<=DATE_ADD(dispatch_started_at,INTERVAL 30 SECOND) AND state<>'CREATED') |
| publish_event_bounds / events | U(operation_id) AND sequence BETWEEN 1 AND 100 AND state IN S AND boundary IN('LOCAL','REMOTE','UNCONFIRMED') AND explicit NULL-or-closed-set check for error_category and safe_error_code as listed above |
| publish_event_references / events | explicit NULL-or-A(remote_publication_id,256) AND NULL-or-A(remote_processing_id,256) AND (published_at IS NULL OR (published_at IS NOT NULL AND published_at<=observed_at)) |
| publish_event_outcome / events | (state='PUBLISHED' AND boundary='REMOTE' AND remote_publication_id IS NOT NULL AND published_at IS NOT NULL AND error_category IS NULL AND safe_error_code IS NULL) OR (state IN('ACCEPTED','PROCESSING') AND boundary='REMOTE' AND (remote_publication_id IS NOT NULL OR remote_processing_id IS NOT NULL) AND published_at IS NULL AND error_category IS NULL AND safe_error_code IS NULL) OR (state='FAILED' AND boundary IN('LOCAL','REMOTE') AND error_category IS NOT NULL AND safe_error_code IS NOT NULL AND published_at IS NULL) OR (state='UNKNOWN' AND boundary='UNCONFIRMED' AND error_category IS NOT NULL AND error_category IN('TRANSPORT','UNCONFIRMED') AND safe_error_code IS NOT NULL AND safe_error_code='OUTCOME_UNKNOWN' AND published_at IS NULL) OR (state IN('CREATED','DISPATCHING') AND boundary='LOCAL' AND error_category IS NULL AND safe_error_code IS NULL AND remote_publication_id IS NULL AND remote_processing_id IS NULL AND published_at IS NULL) |
| publish_asset_ids / assets | U(snapshot_id) AND U(revision_id) AND U(media_id) AND position BETWEEN 0 AND 3 |
| publish_asset_value / assets | mime IN the four listed values AND byte_size BETWEEN 1 AND 33554432 AND width BETWEEN 1 AND 8192 AND height BETWEEN 1 AND 8192 AND width*height<=16777216 AND ((mime='video/mp4' AND duration_ms IS NOT NULL AND duration_ms BETWEEN 1 AND 600000 AND width<=3840 AND height<=2160) OR (mime IN('image/jpeg','image/png','image/webp') AND duration_ms IS NULL AND byte_size<=8388608)) |
| publish_asset_hold / assets | protected_until>created_at AND protected_until<=DATE_ADD(created_at,INTERVAL 24 HOUR) |

These do not purport to encode provider limits, policy truth, monotonically increasing updates or cross-row consistency. Those remain explicit server-domain checks. MySQL tests must cover every relevant NULL combination, invalid enum-zero value, controls/whitespace/case/NUL/Unicode, HEX/OCTET_LENGTH and integer/JSON bounds. Snapshot content JSON must also pass the existing authoritative platform schema; generic OBJECT size CHECK is only a storage bound.

### Exact proposed FK inventory (11, every action RESTRICT / RESTRICT)

Names below are child constraint names. None is nullable; NULL writes must fail NOT NULL, not evade integrity.

| Name | Child columns | Parent table(columns) |
|---|---|---|
| publish_snapshot_brand_fk | snapshots(brand_id) | brands(id) |
| publish_snapshot_revision_fk | snapshots(post_id,revision_id) | content_revisions(post_id,id) |
| publish_snapshot_variant_fk | snapshots(revision_id,platform) | content_variants(revision_id,platform) |
| publish_snapshot_decision_fk | snapshots(approval_decision_id,post_id,revision_id,approval_decision) | content_decisions(id,post_id,revision_id,decision) |
| publish_snapshot_actor_fk | snapshots(actor_id) | users(id) |
| publish_snapshot_authorization_fk | snapshots(authorization_id,brand_id,provider) | social_authorizations(id,brand_id,provider) |
| publish_snapshot_destination_fk | snapshots(destination_id,authorization_id,brand_id,provider) | social_destinations(id,authorization_id,brand_id,provider) |
| publish_operation_snapshot_fk | operations(id) | publish_snapshots(id) |
| publish_event_operation_fk | events(operation_id) | publish_operations(id) |
| publish_asset_snapshot_fk | assets(snapshot_id,revision_id) | publish_snapshots(id,revision_id) |
| publish_asset_revision_fk | assets(revision_id,media_id) | content_revision_media(revision_id,media_id) |

The proposal contains **11 exact named foreign keys**: seven snapshot, one operation, one event and two asset constraints. No DDL/test has been written during discovery.

Two required additive parent UNIQUE indexes in a future approved 0011:

1. `publish_decision_identity` on content_decisions(id,post_id,revision_id,decision).
2. `publish_destination_identity` on social_destinations(id,authorization_id,brand_id,provider).

The decision FK child's approval_decision column uses the exact parent ENUM('APPROVED','CHANGES_REQUESTED','REJECTED') type/collation for FK compatibility, with CHECK restricting it to APPROVED. Likewise platform/provider reference columns use the identical finalized parent enum definitions/collations. This avoids a falsely implementable FK proposal. Parent id is already unique; added composite uniqueness supplies explicit standard referenced keys without editing finalized migrations. No parent content/history rows become mutable and no grant broadening results. These additive indexes are part of the **schema approval request**, not permission to modify an old migration.

All PK/UNIQUE/index definitions are exactly those listed under the four tables and these two parents, plus the following named nonunique child FK-support indexes (so migration inventory does not rely on implicit MySQL names):

| Index name | Table / ordered columns |
|---|---|
| publish_snapshot_post | snapshots(post_id,revision_id) |
| publish_snapshot_decision | snapshots(approval_decision_id,post_id,revision_id,approval_decision) |
| publish_snapshot_auth | snapshots(authorization_id,brand_id,provider) |
| publish_snapshot_destination | snapshots(destination_id,authorization_id,brand_id,provider) |
| publish_snapshot_variant | snapshots(revision_id,platform) |
| publish_asset_revision | assets(revision_id,media_id) |
| publish_asset_snapshot | assets(snapshot_id,revision_id) |

Brand FK is covered by the workspace index; actor FK by publish_request_once. Operation/event PKs cover their FKs. Other new UNIQUE definitions are the six explicitly named secondary UNIQUE indexes in total (three snapshot, one asset order and the two parent uniques); operations and events need only their declared PK. No unbounded OFFSET list index or speculative search index.

Cross-parent direct writes must fail at the two composite approval/destination bindings and attachment lineage. Service additionally checks current selected capability, exact remote destination bytes, complete attachment set, canonical workspace, current approved sequence and unchanged policy; CHECK/FK cannot enforce live external authority. No assertion that every service invariant is a database CHECK.

## AI. Proposed runtime grants

| Table | Ordinary runtime privileges |
|---|---|
| publish_snapshots | SELECT, INSERT only |
| publish_assets | SELECT, INSERT only |
| publish_events | SELECT, INSERT only |
| publish_operations | SELECT, INSERT, UPDATE(state,version,last_event_sequence,updated_at,dispatch_started_at,dispatch_deadline,dispatch_claim_hash,last_status_check_at) only |

No DELETE/DDL/global privileges, triggers, SUPER or root. Migration/admin identity applies schema/index changes separately. Existing content immutable-history, social credential, audit and permission grants remain unchanged. Runtime is trusted server code, not a per-human DB account; privileges prevent snapshot/history mutation but cannot alone prove genuine remote publication or safe append-only INSERT content. Domain validation/audit and provider evidence remain necessary. Direct restricted-user SQL must prove UPDATE/DELETE denial for all immutable new tables and denial of operation id mutation, plus legitimate admission/status paths. Hostinger support for actual restricted grants remains UNVERIFIED and a deployment gate.

## AJ–AL. Audit, normalized provider results and redaction

Proposed safe audit classifications: publish.initiated, publish.validation_rejected, publish.dispatched, publish.accepted, publish.processing_changed, publish.published, publish.failed, publish.unknown, publish.reconciled. Reuse existing bounded audit mechanism/schema; no audit table change. Metadata allowlist: internal operation/item/revision/decision/destination IDs, platform, safe status/error class and bounded changed-field/count conventions. Step-up satisfied may be a safe classification, never proof/token content. No copy, media bytes, hashes, provider body, raw scope list, credentials, headers, PKCE, state, prompt or filesystem path in audit.

Admission + snapshot/assets/operation/event + required audit atomic. Dispatch claim + event/audit atomic **before** network. Outcome event + progress + required audit atomic after network; failure cannot roll back a remote post and must remain UNKNOWN, with no second creation call. Local validation rejection gets safe audit in its own bounded authorized path; audit failure prevents dispatch.

Normalize only validated bounded provider/publication/processing IDs, mapped state, closed error category/code and authoritative observation/publication time. Provider identity derives from snapshot; never arbitrary response routing. Default: **no raw response persisted**, no raw prompt, caption copy in logs or unsafe rejected payload. Bounded bodies transiently parsed and discarded. Returned URL is never presumed safe or followed; a future official-host safe permalink policy requires review. Resumable URLs/bearer pull URLs never enter normalized ID columns. Unknown error strings map to safe generic code, not reflected body/stack. No tokens in browser/storage/query/log/test snapshot. Synthetic sentinels only in future deterministic tests; retain existing global redaction and assertion-specific safe diagnostic principles.

## AM. Proposed UI flow

Approved Content -> exact approved revision/platform -> eligible operation-local destination -> immutable content/attachment/visibility summary -> deterministic validation -> explicit confirmation -> bound step-up -> one publish dispatch -> truthful safe status. Destinations lacking verified capability show unavailable/setup required, never a fake Publish success. No persistent connection-administration controls through publish permission. No scheduling UI, hidden automatic continuation or AI action.

The UI distinguishes newer unapproved working draft from the chosen approved revision and stale confirmation from current state. Unsupported provider constraints require new revision/approval, not edits in confirmation. Double click disables affordance for usability; DB handles authority/duplicates. UNKNOWN says outcome unconfirmed / do not resend and offers only permitted safe read-only reconciliation. Status updates are explicit bounded actions, no automatic create loop. Preserve accessible labels/dialog focus/keyboard behavior, polite status announcements and 320/375/390/768/1440 layouts. Creator/Reviewer/Viewer receive no new publish controls, destination secret data or publishing history simply through existing read permissions.

## AN–AQ. Test strategy, no tests implemented in discovery

- **Unit:** exact explicit permission/role/object matrix; no implications; action digest binding/expiry/replay with existing auth mocks; immutable canonical copy/hash, multilingual/newline/joiner preservation, approved/latest distinction, exact fact provenance, all 13 claim categories, options/capability rejection, unsupported hashtag mappings, attachment bounds, provider-result/error allowlists, every state transition/forbidden resend, no arbitrary endpoints. Future deterministic fake covers immediate success, local/remote rejection, accepted/processing, revoked grant, insufficient scope, unsupported media, processing failure and ambiguous transport. Fake remains tests-only and performs no network/credential operations.
- **MySQL:** exact 12 proposed CHECK and 11 FK inventories plus all historical inventory ownership; independent violating writes for each semantic family; NULL/UNKNOWN matrices including error/dispatch/reference/terminal groups; byte-level whitespace/case/control/NUL/Unicode/overlength identity tests with HEX/OCTET_LENGTH. FK cross-item/revision/decision/platform/authorization/destination/attachment mutations, missing/NULL refs, RESTRICT delete/update and ENUM compatibility. Duplicate actor request/digest and two-admin natural-key races; one dispatch winner; crash after claim; response DB/audit failure; expired claim never resends. Current locking reads under unchanged isolation; approval supersession/disconnect/token-version/cleanup/attach/manual-remove races; finite lease expiry/exact quota release; restricted runtime immutability/column grants, append-only legitimate writes. Fixtures own unique identities and dependency-safe finally cleanup; isolated clean-install schema, normal and fixed-seed order.
- **Browser:** approved versus newer draft; exact confirmation/visibility/options; permission UI and independent direct API denials; destination substitution; step-up before effects, stale proof and stale approval; double click/two tabs/reload; truthful accepted/processing/unknown/error; escaped XSS/Unicode, accessibility/responsive widths; synthetic secret-redaction, no raw response/header/storage exposure. Fake harness only, no remote content or real provider secrets. Preserve Phase 7 diagnostics and unresolved historical classification.
- **Migration if 0011 approved later:** clean 0000–0011; exact finalized Phase 7 0000–0010 -> 0011 upgrade; repeat/journal/checksum/tamper/recovery/preservation; old migration byte equality; canonical 32 permissions/grants unchanged; new indexes compatible with parent ENUMs/collations and existing data; explicit SQL mode; violating writes/runtime-account tests. DDL implicit commit/recovery handled honestly, not described as transactional rollback. No production database used.

No complete implementation/review/finalization gate is run at this discovery stop. Prior Phase 7 counts are historical evidence, not new Phase 8 results. Later complete gate requires the approved implementation and tests.

## AR–AT. Hostinger, dependencies and environment

Hostinger remains **UNVERIFIED**. The core proposal uses MySQL, existing native fetch/streaming, immediate bounded server requests and human-requested status checks. No Redis/S3/Docker/root/systemd/permanent worker/queue daemon/privileged trigger requirement. Scheduling and cron-driven publishing are outside this phase. If an official provider needs workflow beyond the approved bounded architecture, leave it disabled and return for a gate.

Production gates include supported Node/native Argon2/sharp/libvips/mp4box/AES-GCM; outbound DNS/TLS/provider HTTPS; server-only secret injection; MySQL TLS/connection/pool/clock behavior; separate migration identity and exact runtime grants; HTTPS/proxy/APP_URL attribution; secure SSH; private persistent writable storage outside webroot; filesystem/cleanup permissions; disk quota/headroom; child-process/memory limits; upload/backpressure and provider streaming through reverse proxy; request/deadline interaction. No local discovery evidence verifies any Hostinger gate. OpenRouter production remains UNVERIFIED, unrelated to immediate manual publishing and never called here.

Dependency proposal: **NONE**. No additions/upgrades or SDK/framework/retry package. Existing package/lock fingerprints unchanged. Future need requires exact purpose/version/maintenance/security/native/runtime/hosting review before installation.

Environment proposal for the core: **NONE new**. Reuse validated server-only APP_URL and existing provider client names and TOKEN_ENCRYPTION_KEY only when an approved adapter actually needs them. No values inspected or copied. No browser-selectable endpoints, scopes, model, routing or public secret. URL-pull/session storage and any genuinely new setting require a separate exact-name proposal before implementation; no speculative variable is added.

## AV. Decisions and blockers for approval

1. Reuse content.publish and the existing Owner/Admin-only grants; count 32; keep approval, connection management and publishing separate.
2. Require a new closed PUBLISH_DISPATCH action family through existing purpose-bound step-up semantics; no auth redesign.
3. Authorize operation-local eligible destination selection without persistent destination administration.
4. Approve the exact approved-revision recheck and dispatch-claim linearization boundary, including unavoidable post-claim external races.
5. Approve one immutable intent / one dispatch, permanent natural-key duplicate reservation and UNKNOWN with no resend/retry.
6. Approve the proposed four tables, 12 named CHECKs, 11 named RESTRICT FKs, enumerated unique/index support, additive two parent UNIQUE indexes and column-scoped runtime grants before any 0011.
7. Approve nonrenewable 24-hour publish media holds and cleanup integration; no permanent retention. Actual provider processing must fit or remain disabled.
8. Resolve outbound hashtag rendering and provider-required privacy/category/disclosure options before any affected real capability. Current approved content is not silently modified.
9. Obtain authoritative current provider publishing documentation, then separate app/dashboard and production validation. LinkedIn member destinations are not in the existing model and remain unapproved. URL-pull/resumable secret persistence requires another explicit security/schema gate; neither is smuggled into generic IDs.
10. Decide whether to authorize internal fake-provider implementation after policy/schema review while real-provider research is blocked. This report itself grants none.

## AW–BA. Final discovery boundary

Only two new, unstaged files:

- docs/research/phase-8-provider-publishing-requirements.md
- docs/review/phase-8.md

No production, application, tests, AGENTS, dependencies, env schema/example, catalog/grants or finalized migrations changed. No 0011. No real/fake provider implementation. No live API calls or remote social effects. No staging, commit, push, merge, reset, rebase or history rewrite. Baseline HEAD/local/remote remains Phase 7. No Phase 9. **STOP FOR POLICY / SCHEMA REVIEW; do not implement Phase 8 from these proposals without approval.**

## Authorized provider-independent implementation — interrupted at targeted review

Date: 2026-10-17. The subsequent user authorization approved internal implementation, the exact four-table schema, existing content.publish grants, the closed purpose-bound publishing recent-auth extension, distinct caption/hashtag fields and nonrenewable 24-hour media holds. Real providers and URL-pull remain disabled. Discovery above is preserved as historical planning evidence; its original STOP is superseded only to the extent of that authorization.

**Current status: PARTIALLY IMPLEMENTED — NOT READY FOR REVIEW COMPLETION OR FINALIZATION.** No complete Phase 8 review gate has run. Work stopped on the targeted failures below; no repair of those two failures was performed afterward.

### Baseline and inventory found before implementation

main, HEAD/local/remote = `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index. Only the two expected new discovery documents were present. All eleven finalized SQL files matched committed bytes and manifest hashes before implementation.

### Implemented candidate, not a claim of completed verification

- Added 0011_publishing_foundation.sql and its manifest entry. Four tables: publish_snapshots, publish_operations, publish_events, publish_assets. Twelve named CHECKs, eleven restrictive FKs and the two approved additive parent identity UNIQUE indexes applied successfully in isolated MySQL.
- 0011 SHA-256: `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`. Twelve migration entries total. 0000–0010 still match finalized HEAD and original manifest hashes; no 0012.
- Added typed domain records, canonical exact-copy/hash commitments, server-side current approval/submission/destination resolution, existing deterministic claim revalidation, explicit states, one-shot dispatch claim, normalized outcomes and conservative UNKNOWN behavior.
- Extended only the existing RecentAction closed registry with PUBLISH_DISPATCH plus a 43-character digest. No authentication, Argon2, MFA, session, recent-auth lifetime/rotation or CSRF fundamentals changed.
- Added immutable approved media descriptors/hashes and finite, nonrenewable snapshot-bound holds. Cleanup/removal now consult active publishing holds under the media guard. Additional lifecycle/race coverage is still outstanding.
- Added minimum runtime grant declarations. **Effective restricted-account SQL tests have not yet run for Phase 8; application of the declarations is not claimed verified.**
- Added tests-only deterministic fake scenarios and an empty production publishing registry. Fake registration is rejected outside explicit test context. No token is decrypted or sent to a real provider by this candidate.
- Added bounded mutation API using existing session CSRF/Origin checks and purpose-bound password/MFA step-up, plus a minimal publishing panel on content detail. Distinct approved captions/hashtags are preserved. Real provider controls remain unavailable. **Phase 8 UI/browser/accessibility validation has not run.**
- Updated migration/drop-order/manifest-enumeration fixtures for the additive schema. No dependency, environment name, permission definition or grant changed.

### Targeted validation history — retain all results

1. Initial schema application/inventory smoke: **1 passed**.
2. Expanded constraint run: **47 passed / 1 failed**. The malformed remote processing ID was written into a CREATED event, so the correct lifecycle CHECK masked the intended identifier-format CHECK. Classification: **TEST FIXTURE DEFECT**. Only the fixture's lifecycle state/boundary was corrected; no production schema changed.
3. Corrected affected constraint run: **48 passed**. Included twelve independent CHECK violations, exact FK identities/actions, dispatch NULL group, published-evidence NULL group, byte-level identity cases and hold bound.
4. Development typechecking initially failed because ignored `.next/types` and `.next/dev/types` both declared global route/layout types. The proper repository typecheck also confirmed the duplicate generated declarations. Preexisting development type declarations were preserved outside the checkout, then `npm run typecheck` **passed**. No tracked source/assertion was changed for this generated-state issue. Later added test changes have not received a final candidate-wide typecheck.
5. Initial targeted lint identified two unused imports; removed during implementation. A fresh candidate-wide lint has **not** run; no lint PASS is claimed.
6. Publishing unit tests: **17 passed**.
7. Publishing service/MySQL tests: **22 passed**, including Owner/Admin success, three denied roles, missing proof, fake validation outcomes, PUBLISHED/ACCEPTED/PROCESSING/FAILED/UNKNOWN mapping, exact-copy/hash preservation, replay, newer-draft separation, connection/version denial, two-actor duplicate protection, finite media hold, status observation and admission audit rollback.
8. Expanded schema + migration-recovery target: **115 passed / 2 failed**, 117 total. Migration-recovery file passed all **16** cases. Publishing-schema file: **99 passed / 2 failed** of 101. This is not the complete gate and must not be described as green.

### Exact remaining targeted failures and classification

**Failure 1** — `tests/database/publishing-schema.test.ts`, test `publish_snapshots.revision_id rejects a missing identity by direct SQL`.

Expected: ER_NO_REFERENCED_ROW_2 for a nonexistent revision. Actual: ER_ROW_IS_REFERENCED_2. The fixture already contains publish_assets referencing `(snapshot_id,revision_id)` on publish_snapshots. Updating that referenced parent pair correctly triggers RESTRICT before the intended child-orphan assertion. Classification: **TEST FIXTURE DEFECT**. No invalid write was accepted. Small proposed correction: remove only that fixture's owned asset row in the relevant transaction before testing the snapshot's orphan-revision write, preserving all exact schema assertions and separate parent RESTRICT tests.

**Failure 2** — same file, test `the exact variant and APPROVED decision are required, not another platform or rejection`.

Expected safe extracted constraint: publish_snapshot_variant_fk. Actual safe helper output: publish_snapshots; actual MySQL error code still ER_NO_REFERENCED_ROW_2. The new test result helper uses `/publish_[a-z_]+/`, which selects the table identifier appearing earlier in a foreign-key error rather than the named constraint. Classification: **TEST DIAGNOSTIC DEFECT**. It is not a production/schema acceptance defect and is not classified as a fixture-only correction. Proposed repair: extract only an explicitly allowlisted known constraint identity, preserving withheld SQL/parameters and never emitting raw driver error text.

Section 49 authorizes automatic repair only for an obvious fixture-only issue. Because the second failure is diagnostic-helper logic, implementation stopped for review rather than silently extending that exception. Neither failure was repaired or rerun after this classification. These findings do not establish an application security bypass or schema corruption.

### Outstanding work and gate status

Remaining: resolve the test diagnostic/fixture failures under review, complete exact CHECK column coverage and full FK/NULL/byte matrices, restricted-runtime effective SQL evidence, remaining service adversarial/media race cases, publishing UI/browser/accessibility tests and final candidate lint/typechecking. Production behavior must not be changed merely to satisfy the invalid fixtures.

The ONE complete review gate is **NOT RUN**: npm ci, complete lint/typecheck/unit/MySQL suites, secret scan, audit, build, complete browser, npm ls and final diff/checksum gate remain pending as a coherent candidate run. No synthetic test result verifies a real provider or Hostinger. No publication, upload, scheduling, worker, URL-pull or live API call occurred.

### Exact current inventory — 26 paths, 10 modified / 16 new

```text
 M migrations/manifest.json
 M scripts/local-mysql.py
 M src/app/(workspace)/content/[id]/page.tsx
 M src/server/auth/access.ts
 M src/server/db/schema.ts
 M src/server/media/service.ts
 M tests/database/foundation.test.ts
 M tests/database/migration-recovery.test.ts
 M tests/database/phase2b-helpers.ts
 M tests/unit/database-config.test.ts
?? docs/research/phase-8-provider-publishing-requirements.md
?? docs/review/phase-8.md
?? migrations/0011_publishing_foundation.sql
?? src/app/api/publishing/route.ts
?? src/features/publishing/model.ts
?? src/features/publishing/panel.tsx
?? src/server/publishing/media-hold.ts
?? src/server/publishing/policy.ts
?? src/server/publishing/provider.ts
?? src/server/publishing/schema.ts
?? src/server/publishing/service.ts
?? src/server/publishing/web.ts
?? tests/database/publishing-schema.test.ts
?? tests/database/publishing.test.ts
?? tests/helpers/publishing-fixtures.ts
?? tests/unit/publishing.test.ts
```

Production source paths implement only the authorized internal publishing boundary and narrow media/auth integration; tests own scratch fixtures, docs retain discovery/review evidence, migration/manifest add 0011 and the local MySQL helper declares restricted grants. No unrelated feature is included.

Final read-only verification: HEAD/local/remote unchanged; index empty. package.json, package-lock.json, .env.example, environment schema, canonical catalog, retained media.spec.ts, secure-test.ts and docs/review/phase-7.md match finalized HEAD bytes. Hostinger and all real providers remain UNVERIFIED; real adapters disabled. Nothing staged, committed or pushed. No Phase 9. **STOPPED FOR REVIEW — incomplete Phase 8 candidate.**

## Authorized test-side repair cycle — STOPPED at first affected database run

Date: 2026-10-17. This is the successor to, and does not replace, historical **115 passed / 2 failed**. That historical run remains classified TEST FIXTURE DEFECT plus TEST DIAGNOSTIC DEFECT; MySQL rejected both invalid writes.

Before changing anything, verified branch main; HEAD/local/remote `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index; exact recorded 26-path inventory (10 modified / 16 new). All twelve migration hashes matched; finalized 0000–0010 matched committed bytes. Pre-repair file fingerprints were saved outside the repository. Migration 0011 remained frozen at `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`.

### Exact test-only changes

1. `tests/database/publishing-schema.test.ts`: the snapshot/revision orphan fixture deletes only its own publish_assets row, scoped by snapshot ID, revision ID and media ID, inside the existing rollback transaction. It asserts exactly one deletion and no remaining asset child for that snapshot. No shared cleanup, schema mutation or production relationship was removed. It also replaces its inline weak error parser with the new test helper. The added exact-constraint assertion incorrectly expected publish_snapshot_decision_fk; see observed failure below.
2. `tests/helpers/publishing-database-diagnostic.ts`: new closed test-only diagnostic helper. Explicit frozen allowlist of the twelve approved CHECK names and eleven approved FK names. Only closed error codes and allowlisted named constraint identities may be returned. CHECK messages must have the known structured form; FK messages must have the known error prefix and exactly one CONSTRAINT ... FOREIGN KEY clause. Table identities, first-prefix matching, unknown/ambiguous constraints, arbitrary codes and oversized messages cannot produce arbitrary diagnostic output. Raw SQL, parameters, messages, values and stacks are never returned. Accessor properties are not executed.
3. `tests/unit/publishing-database-diagnostic.test.ts`: 46 deterministic cases, including every allowlisted name, table-versus-constraint identity, exact variant FK, unknown/ambiguous identities, parent RESTRICT messages, successful-write payload suppression, twelve synthetic sensitive-value families and safe handling of getters/non-error/oversized input.
4. This review document: append-only repair history and results. No production application, migration, runtime grant, authentication, UI or provider file changed during repair.

### First affected validation — executed once, no retries

- Diagnostic-helper unit file: **46 passed**, zero retries.
- Directly affected FK/schema selection: **20 passed / 1 failed**, zero retries. The file contains 101 cases; **80 were intentionally outside the test-name filter**, not removed or disabled. Selected coverage included exact FK inventories, orphan identities, variant binding and parent RESTRICT checks.
- The exact-variant test passed: publish_snapshot_variant_fk was safely recognized. The helper no longer reports publish_snapshots as that constraint.

The one failure was `publish_snapshots.revision_id rejects a missing identity by direct SQL` at the repaired exact-name assertion.

```text
accepted: false
code: ER_NO_REFERENCED_ROW_2
expected constraint: publish_snapshot_decision_fk
actual constraint:   publish_snapshot_revision_fk
```

The fixture correction successfully exposed the intended orphan-revision boundary. MySQL rejected the invalid write through the exact publish_snapshot_revision_fk constraint. The implementation agent incorrectly guessed that the overlapping approval-decision composite FK would be the first rejection and wrote the wrong exact expected name. Classification: **TEST EXPECTATION DEFECT introduced in the authorized repair**. This is not a production/schema acceptance defect. No invalid state was accepted. The diagnostic helper correctly reported the actual allowlisted constraint.

Section 14 requires STOP on any first affected-test failure with no automatic repair/rerun. Accordingly, the wrong expectation was **not corrected**, and no successor execution was attempted. Minimal proposed next correction is to require the actually intended publish_snapshot_revision_fk identity, retaining the owned fixture isolation and exact error-code/constraint assertion. That correction requires another review authorization; this failed result is not accepted as a passing validation.

### Required repair report A–BC

| Items | Result |
|---|---|
| A–C HEAD / local / remote | 8326ae185ae48a4fc131dd02bbb9940ecb315334 |
| D index | empty |
| E before inventory | 26 paths: 10 modified / 16 new |
| F after inventory | 28 paths: 10 modified / 18 new |
| G repair paths | database publishing-schema test; new diagnostic helper; new diagnostic unit tests; this review document |
| H production changed by repair | NO; pre-repair fingerprints verified |
| I fixture correction | exact owned asset child removed inside rollback transaction; no shared deletion |
| J intended FK evidence | actual ER_NO_REFERENCED_ROW_2 / publish_snapshot_revision_fk; assertion still FAILED because its new expected name was wrong |
| K–M diagnostics/allowlist/table identity | closed 23-name inventory, structured constraint clause extraction, exact variant test passed; table-name substitution rejected |
| N leakage tests | synthetic sentinel families and output-shape/unknown/getter/oversize cases passed; no raw error emitted |
| O–P directly affected / retries | 46 unit passed; 20 database passed / 1 failed; 80 cases excluded only by targeted filter; 0 retries |
| Q–R expanded target / retries | NOT RUN after affected-test failure; historical 115/2 unchanged; no retries attempted |
| S runtime grants | NOT RUN in this cycle; no grant changes |
| T–U targeted browser / retries | NOT RUN; no retries attempted |
| V–Y complete Unit/MySQL/browser/retries | NOT RUN; complete gate not started |
| Z–AG ci/lint/typecheck/secret scan/audit/build/npm ls/diff check | NOT RUN in this repair cycle after the stop; earlier implementation observations remain historical only |
| AH 0011 SHA-256 | 4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652 |
| AI–AJ old migrations/count | 0000–0010 unchanged; 12 migrations; no 0012 |
| AK–AL permissions | 32; content.publish Owner YES, Marketing Admin YES, Creator/Reviewer/Viewer NO; no grant changes |
| AM–AS auth/isolation/retry/sleep/timeout/dependency/env changes | NONE during repair; approved existing publish action retained unchanged |
| AT real social calls | NONE |
| AU providers | all real providers DISABLED / UNVERIFIED |
| AV media | maximum 24-hour nonrenewable temporary purpose-bound hold unchanged |
| AW URL-pull | DISABLED |
| AX Hostinger | UNVERIFIED |
| AY Phase 7 historical browser failure | ROOT CAUSE UNRESOLVED; flakiness not established |
| AZ–BB staging/commit/push | NONE |
| BC Phase 9 | NOT STARTED |

The two additional candidate paths are exclusively the new test helper and its unit test. No production-file expansion occurred. All pre-repair file fingerprints except the authorized database test and this review document remain identical; no new path other than the two test files was introduced. Phase 8 remains partially implemented, unfinalized, uncommitted and unpushed. **STOP FOR REVIEW.**

## Expectation-only correction — 2026-10-18; stopped at test setup

This cycle preserves all earlier evidence: original expanded **115 passed / 2 failed**, subsequent diagnostic-helper **46 passed** and affected MySQL **20 passed / 1 failed**, all with zero retries. Their expanded/runtime/browser/complete successor stages were NOT RUN. None is rewritten as green.

Pre-correction verification: main; HEAD/local/remote `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index; exactly **28 candidate paths, 10 modified / 18 new**. All twelve migration files matched manifest hashes; 0000–0010 matched finalized committed bytes. Pre-correction fingerprints were saved outside the repository.

Read-only inspection confirmed both facts required by the new authorization:

- The parameterized operation selects publish_snapshots.revision_id and replaces it with a new nonexistent UUID; its owned masking asset child is removed inside the existing rollback fixture.
- Frozen 0011 declares `publish_snapshot_revision_fk FOREIGN KEY(post_id,revision_id) REFERENCES content_revisions(post_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT`.

The only test change was the single assertion literal:

```text
publish_snapshot_decision_fk -> publish_snapshot_revision_fk
```

The invalid write, fixture, setup/cleanup ordering, required ER_NO_REFERENCED_ROW_2, diagnostic helper and its 23-name allowlist are unchanged. No alternative constraint or generic FK rejection is accepted. The previous nearby descriptive comment was not edited under this expectation-only authorization; the assertion and inspected schema define the exact revision relationship.

### First validation attempt — failed before any test executed

Executed the exact corrected orphan-revision test once using the existing isolated MySQL Vitest configuration, without retries. The test suite failed during setup:

```text
Error: Isolated database test lease unavailable
source: tests/helpers/database-test-lease.ts:30
result: 1 failed test file; 0 tests executed
```

The corrected assertion did not execute, so no post-correction assertion PASS is claimed. No affected-filter, diagnostic-unit, expanded, runtime-grant, browser or complete-gate successor execution occurred.

Safe read-only inspection after the stop found no mysqld process and no local MySQL TCP listener. The lease helper performs its connection/identity checks before obtaining a zero-wait database lease and deliberately hides underlying driver details. It distinguishes an observed occupied lease with a different message; this result is not evidence that another test held the lease. Classification: **ENVIRONMENT / TEST-SETUP BLOCKER: the required isolated MySQL service is not running in the current environment**. Why that service is absent is not established. No production/schema defect or failure of the corrected FK assertion was demonstrated.

Section 13 requires STOP on any first-validation failure, with no repair or rerun. Accordingly, no environment restart, grant/schema change, fixture/helper repair or retry was performed. Restoration of the existing isolated MySQL environment is the next prerequisite before a separately authorized validation execution.

### Required cycle report A–BD

| Items | Result |
|---|---|
| A–C HEAD / local / remote | 8326ae185ae48a4fc131dd02bbb9940ecb315334 |
| D index | empty |
| E before inventory | 28 paths: 10 modified / 18 new |
| F after inventory | same 28 paths: 10 modified / 18 new |
| G expectation file | tests/database/publishing-schema.test.ts; exactly one expected-name literal changed |
| H production changed by correction | NO; pre-correction fingerprints verified |
| I orphan operation | confirmed direct publish_snapshots.revision_id orphan write |
| J approved schema name | confirmed publish_snapshot_revision_fk on (post_id,revision_id) -> content_revisions(post_id,id) |
| K old expected name | publish_snapshot_decision_fk |
| L corrected expected name | publish_snapshot_revision_fk |
| M allowlist count | 23 |
| N helper changes | NONE; helper and unit-test hashes unchanged |
| O exact corrected test | NOT EXECUTED: its sole attempt failed during database lease setup; 1 failed file / 0 executed tests |
| P affected MySQL filter | NOT RUN after setup failure |
| Q diagnostic-helper unit tests | NOT RUN in this cycle; prior 46-pass result retained as historical evidence |
| R retries | 0 |
| S expanded target | NOT RUN |
| T runtime grants | NOT RUN |
| U–V targeted browser/retries | NOT RUN; no retries attempted |
| W–Z complete Unit/MySQL/browser/retries | NOT RUN; complete gate not started |
| AA–AH ci/lint/typecheck/secret scan/audit/build/npm ls/diff check | NOT RUN in this cycle |
| AI 0011 SHA-256 | 4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652 |
| AJ old migrations | 0000–0010 unchanged |
| AK migration count | 12; no 0012 |
| AL permission count | 32, unchanged |
| AM content.publish | Owner YES; Marketing Admin YES; Content Creator NO; Reviewer NO; Viewer NO |
| AN–AT auth/isolation/retry/sleep/timeout/dependency/env-name changes | NONE during this correction; approved existing publish-purpose extension retained unchanged |
| AU real provider calls | NONE |
| AV real provider status | Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED / UNVERIFIED |
| AW media hold | unchanged maximum 24 hours, nonrenewable, temporary and purpose-bound |
| AX URL-pull | DISABLED |
| AY Hostinger | UNVERIFIED |
| AZ Phase 7 historical browser failure | ROOT CAUSE UNRESOLVED; flakiness not established |
| BA staging | NONE |
| BB commit | NONE |
| BC push | NONE |
| BD Phase 9 | NOT STARTED |

Only the exact test expectation and this append-only review record changed during the cycle. Every other candidate/tracked file remains byte-identical to the pre-correction freeze, including production, runtime grants, diagnostic helper, dependencies, environment schema/example, permission catalog, browser diagnostics and all migrations. Phase 8 remains partially implemented, unfinalized, uncommitted and unpushed. **STOP FOR REVIEW.**

## Existing MySQL environment recovery + resumed validation — 2026-10-18

This cycle follows explicit authorization to restore only the existing isolated infrastructure and resume validation. Preserve the preceding attempt exactly: expectation correction APPLIED; correct expected FK publish_snapshot_revision_fk; attempt FAILED DURING SETUP; **1 failed test file / 0 executed tests / 0 retries**; classification ENVIRONMENT / TEST-SETUP BLOCKER. It was neither an assertion failure nor a successful test execution.

### Repository verification and existing recovery mechanism

Before recovery: branch main, HEAD/local/remote `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index; exactly **28 paths / 10 modified / 18 new**. Pre-recovery fingerprints covered every candidate and tracked file. All twelve migration hashes matched their manifest; finalized 0000–0010 matched committed bytes. The corrected assertion and 23-name diagnostic allowlist remained frozen.

The existing mechanism is documented in docs/architecture/phase-2a.md and implemented in scripts/local-mysql.py. Executed **`python3 scripts/local-mysql.py start`** once. It used retained local data/configuration and returned `Existing isolated MySQL verified; credentials were not printed.` No replacement database, installation, version change, new port, changed credential, environment name, assertion or configuration was introduced. The script's existing bounded startup-readiness behavior was unchanged; no new retry/sleep workaround was added.

Independent health check, before executing tests:

- MySQL process running; intended TCP listener on 127.0.0.1:3308.
- Existing server version 8.0.46-0ubuntu0.24.04.4; REPEATABLE-READ unchanged.
- Guarded mode test, expected bsa_test_phase2a database, actual account matching configured isolated migration identity, loopback only.
- Existing assertDestructiveTestDatabase guard passed, including identity and restricted test-grant checks.
- Existing acquireDatabaseTestLease obtained and released its zero-wait lease successfully. This was an independent health check, not execution/retry of the failed assertion.

Fingerprint verification immediately after recovery proved **zero repository file changes**, unchanged candidate inventory and all twelve migration checksums. No production/shared/unrelated database was targeted and no unexpected repository-visible runtime artifact appeared. Normal process/data/log files stayed outside the checkout in the established local infrastructure paths. No passwords, connection strings or secret values were emitted.

### First actual post-recovery validation — all passed, each execution once

1. Exact corrected orphan-revision test: **1 passed**. The other 100 cases in that file were outside the exact-name filter. The assertion now actually executed and required ER_NO_REFERENCED_ROW_2 plus publish_snapshot_revision_fk.
2. Previously used directly affected MySQL filter: **21 passed**; other 80 cases were outside the filter. Exact variant FK, owned-fixture revision orphan, ordered FK inventory and parent RESTRICT checks passed.
3. Frozen diagnostic-helper units: **46 passed**.

Retries: **0** for every execution. These are separate expressly authorized scopes, not repeated attempts to obtain a green result. The preceding zero-test setup failure and 20/1 historical run remain unchanged.

### Expanded targeted validation — PASS

Ran the bounded schema, migration-recovery and existing publishing-service test files once: **139 passed, 3 files, zero failures/skips/retries**, 78.60-second runner duration.

Count explanation: the historical expanded pair contained 117 cases (101 publishing-schema + 16 migration-recovery). Those same cases now all passed. This authorized expanded execution also included the previously implemented 22 publishing-service regressions, giving **117 + 22 = 139**. No regression was removed or suppressed. Historical **115 passed / 2 failed** remains the prior result.

### Runtime validation prerequisite — BLOCKED; stopped without repair

Before effective restricted-account tests, followed the repository's existing documented environment-provisioning sequence for the already approved schema/grant declarations. Its first preparation command was:

```text
node --env-file=/workspace/.tools/phase2a-mysql/development.env scripts/database.mjs migrate
```

Using the pinned existing Node binary, that command exited 1 with the CLI's safe message:

```text
Database command failed. Check isolated configuration and migration recovery documentation.
```

No development seed, test migration/seed, grant reconciliation, runtime-privilege test, browser execution or complete gate followed. There was no retry.

Read-only inspection confirmed the intended existing development identity and loopback bsa_dev_phase2a database. It has eleven journal entries and eleven applied checksum ledger entries. The ledger entry for **0010_social_connections.sql has a checksum that does not match the frozen repository migration**. The repository's finalized 0010 bytes/hash remain correct. The migration CLI appropriately rejects that mismatch before applying 0011. No applying/incomplete ledger row was observed.

Classification: **ENVIRONMENT / STALE LOCAL DEVELOPMENT MIGRATION LEDGER BLOCKER**. This does not demonstrate a production migration/schema defect, and effective Phase 8 runtime-grant behavior has not yet been tested. The exact historical schema state behind the old ledger checksum has not been inferred from the checksum alone. Do not overwrite the ledger checksum, reset/drop/discard the development data, change migration bytes, or regrant privileges to hide the mismatch. A reviewed recovery decision for this existing disposable development schema is needed before the documented provisioning sequence and runtime validation can continue.

The isolated MySQL service remains running and its test schema/lease health was established; this later development-ledger blocker is distinct from the previous absent-service failure. No repository file, grant policy, grant source or credential was changed by recovery/preparation/validation.

### Required recovery report A–BB

| Items | Result |
|---|---|
| A–C HEAD / local / remote | 8326ae185ae48a4fc131dd02bbb9940ecb315334 |
| D index | empty |
| E pre-recovery inventory | 28 paths: 10 modified / 18 new |
| F existing startup | scripts/local-mysql.py start, documented in Phase 2A architecture |
| G recovery action | executed existing startup once, preserving existing instance/data/config |
| H service health | process running; 127.0.0.1:3308; existing MySQL 8.0.46; isolation unchanged |
| I lease health | existing guarded zero-wait isolated lease acquired and released before test execution |
| J database scope | expected local test identity/schema verified; no production/shared DB targeted |
| K repository changes by recovery | NONE |
| L unexpected artifacts | NONE; only normal existing external local runtime artifacts |
| M final inventory | same 28 paths, 10 modified / 18 new; only this existing review document appended |
| N 0011 SHA-256 | 4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652 |
| O migration hashes | all 12 manifest hashes pass; 0000–0010 match finalized committed bytes; no 0012 |
| P exact corrected orphan | 1 passed |
| Q affected MySQL filter | 21 passed |
| R diagnostic helper units | 46 passed |
| S retries | 0 |
| T expanded target | 139 passed: 101 schema + 16 migration + 22 service; zero skipped/retried |
| U runtime grants | NOT RUN; documented preparation blocked by stale development 0010 ledger checksum; no grant defect demonstrated |
| V–W targeted browser / retries | NOT RUN; no retries attempted |
| X–AA complete Unit/MySQL/browser/retries | NOT RUN; complete gate not started |
| AB–AI ci/lint/typecheck/secret scan/audit/build/npm ls/diff check | NOT RUN as complete-gate stages |
| AJ permission count | 32, unchanged |
| AK content.publish | Owner YES, Marketing Admin YES, Creator/Reviewer/Viewer NO |
| AL–AR auth/isolation/generic retry/sleep/timeout/dependency/env-name changes | NONE; no new workaround; existing startup readiness logic unchanged |
| AS real provider calls | NONE |
| AT providers | Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED / UNVERIFIED |
| AU media hold | maximum 24 hours; nonrenewable; temporary; purpose-bound; unchanged |
| AV URL-pull | DISABLED |
| AW Hostinger | UNVERIFIED |
| AX Phase 7 historical browser failure | ROOT CAUSE UNRESOLVED; flakiness not established |
| AY–BA staging/commit/push | NONE |
| BB Phase 9 | NOT STARTED |

After executed validation and the failed preparation, all repository file hashes still matched the pre-recovery freeze. Only this append-only report was subsequently changed. The corrected assertion, fixture, helper, all production paths, grant source, dependencies, environment configuration and twelve migrations remain untouched. **Phase 8 remains partially implemented and unfinalized. STOP FOR REVIEW.**


## Stale development database recovery authorization — disposability gate STOP

Read-only investigation under the subsequent recovery authorization confirms the configured development target is `bsa_dev_phase2a`, on the existing local loopback MySQL service (port 3308), with development mode, the documented migration account and a separate development runtime account. Actual database/account/port/data-directory metadata matched that local harness. It is not configured as production, staging, a shared remote service or the isolated test lease database. No credential values, connection strings or application record values were emitted.

The existing development ledger has **11 applied migrations**. Its `0010_social_connections.sql` checksum differs from the authoritative repository checksum; 0011 has not been applied there. This remains an **ENVIRONMENT / STALE DEVELOPMENT MIGRATION LEDGER BLOCKER**, not evidence of a production schema or runtime-grant defect.

### Mandatory disposability classification: B — DISPOSABILITY NOT PROVEN

The inspected application tables contained zero rows: users, sessions, MFA methods/recovery codes, authentication challenges, invitations, password reset tokens, audit logs, security events, AI generations, content items/revisions, media assets, social authorizations/credentials/transactions/destinations, and Brand contacts/facts/locations. This is bounded empty-table evidence, not proof that every schema object or local configuration is disposable, nor authority to discard it.

The documented Phase 2A workflow provides start, migrate, seed, grants and stop, but no development-database reset/recreation command. It explicitly says stop/start retains local data and credentials and does not destructively reinitialize existing directories. `scripts/local-mysql.py start` verifies/preserves an existing configuration; fresh initialization creates a multi-database instance, and unrecognized existing data is rejected for inspection. Reinitializing that instance would exceed the authorization limited to one development database. The browser setup targets the different `bsa_dev_browser_tests` database. The destructive scratch helper is guarded for `bsa_test_clean` and `bsa_test_recovery` only; it must not be repurposed for development. The database CLI exposes migrate/seed/test, not a development reset.

Accordingly, an established recreation mechanism for **this specific development database**, and permission to discard any preserved local state, are not established. Required pre-destruction conditions 6 and 7 remain unproven. No destructive command, migration, seed, grant reconciliation or ledger modification was executed. No replacement recovery mechanism was invented. **STOP at the mandatory disposability gate.** A separately reviewed recovery procedure and explicit data-preservation/discard determination are needed before continuing.

Previously green results remain unchanged and were not rerun: corrected orphan assertion **1 passed**, affected MySQL **21 passed**, diagnostic helper **46 passed**, expanded validation **139 passed**, all with **0 retries**. All earlier failures and blockers remain historical evidence. Runtime-grant validation, targeted browser validation and the complete review gate were not started in this investigation.

### Required report A–BG

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | `8326ae185ae48a4fc131dd02bbb9940ecb315334`; branch main |
| D index | Empty |
| E pre-recovery inventory | 28 paths: 10 modified / 18 new |
| F stale database identity | `bsa_dev_phase2a`, existing local development harness |
| G stale 0010 condition | Applied ledger checksum differs from frozen repository; mismatch persists |
| H local-development evidence | Development configuration, loopback host, port/account/database/data-directory metadata matched the documented harness |
| I–K production / staging / shared-remote exclusion | Configured and actual target is the local development harness, not those environments |
| L test-database exclusion | Development identity differs from isolated lease/scratch/browser database identities |
| M repository recreation mechanism | No documented per-target development recreation mechanism found; startup preserves existing data |
| N disposability | **B — DISPOSABILITY NOT PROVEN** |
| O data preservation | Inspected application tables empty; permission to discard all local state and absence of a preservation requirement are not established |
| P destructive recovery performed | NO |
| Q recovery mechanism used | NONE; read-only inspection only |
| R manual ledger edit | NO |
| S source changed by DB recovery | NO; only this authorized append-only review documentation update |
| T post-recovery migration count | Not recreated; existing development ledger 11, authoritative repository 12 |
| U post-recovery 0010 verification | Not recreated; existing ledger mismatch remains |
| V post-recovery 0011 verification | Not recreated; not applied in development ledger |
| W repository migration verification | All 12 manifest checksums match; 0000–0010 identical to committed baseline; no 0012 |
| X runtime provisioning | NOT RUN; stopped at disposability gate |
| Y runtime-grant validation | NOT RUN; no runtime-grant defect demonstrated |
| Z–AA targeted browser / retries | NOT RUN; no retries attempted |
| AB–AE complete Unit/UI / MySQL / browser / retries | NOT RUN; complete gate not started |
| AF–AM npm ci / lint / typecheck / secret scan / audit / build / npm ls / diff check | NOT RUN as review-gate stages |
| AN post-cycle inventory | 28 paths: 10 modified / 18 new; no additional path |
| AO canonical permissions | 32, unchanged |
| AP content.publish | Owner YES; Marketing Admin YES; Creator/Reviewer/Viewer NO |
| AQ–AW auth / isolation / generic retry / sleep / timeout / dependency / environment-name changes | NO changes |
| AX real provider calls | NONE |
| AY real providers | Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED / UNVERIFIED |
| AZ media hold | Maximum 24 hours; nonrenewable; temporary; purpose-bound; no permanent DAM |
| BA provider URL-pull | DISABLED |
| BB Hostinger | UNVERIFIED |
| BC historical Phase 7 browser failure | ROOT CAUSE UNRESOLVED; flakiness not established |
| BD–BF staging / commit / push | NONE |
| BG Phase 9 | NOT STARTED |

Repository 0010 SHA-256: `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`.

Repository 0011 SHA-256: `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`.

All repository file fingerprints matched the pre-investigation snapshot before this append. Only this existing review document was subsequently updated; no source, test, fixture, helper, configuration, grant or migration file changed. Phase 8 remains partially implemented, unfinalized, uncommitted and unpushed. **STOP FOR REVIEW.**


## Explicit human development-data discard authorization — reset completed; runtime fixture validation STOP

Human review subsequently authorized discarding **all state in bsa_dev_phase2a only**, and permitted the minimum normal MySQL drop/recreate operations even without a single documented per-target reset command. This later data-retention decision resolves the earlier repository-evidence disposability gate; the historical **B — DISPOSABILITY NOT PROVEN** determination above remains unchanged.

### Identity, reset and authoritative migration evidence

Before destruction, verified branch main; HEAD/local main/remote main `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index; 28 candidate paths (10 modified / 18 new). All twelve manifest checksums matched repository SQL bytes; finalized 0000–0010 matched committed bytes. Saved a complete repository fingerprint outside checkout.

Reconfirmed configuration and live database metadata: development mode, loopback 127.0.0.1 port 3308, exact database bsa_dev_phase2a, expected separate development migration/runtime identities, and the existing local harness data directory. Production, staging, shared remote and isolated test-lease targets were excluded. Read-only pre-reset counts were zero for users, sessions, content items/revisions, social authorizations/credentials, media assets, Brand facts and contacts. Eleven applied ledger entries existed; 0010 had the known stale checksum.

Used the existing local MySQL client and private defaults file without printing credentials. Immediately rechecked server port/data directory and exact schema identity, then executed only:

```sql
DROP DATABASE `bsa_dev_phase2a`;
CREATE DATABASE `bsa_dev_phase2a` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
```

All old state in this database was discarded. No other database was reset. Existing local migration-account access was retained. No checksum or ledger row was manually changed. Used the normal repository migration CLI with the existing private development environment file. Migration completed successfully. Read-only comparison proved **12 applied ledger entries**, exact identities/checksums/state against all authoritative migrations, and exact matching Kysely journal identities. No unexpected migration existed.

0010 ledger/repository SHA-256: `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`.

0011 ledger/repository SHA-256: `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`.

Resumed the documented provisioning sequence: normal development seed, normal isolated-test migrate and seed, then `python3 scripts/local-mysql.py grants`. All commands succeeded. Test preparation did not reset a test database. Grant reconciliation used the existing declarations without source edits or privilege broadening. Read-only declaration comparison with HEAD confirmed every Phase 7 table grant remained unchanged; only the four approved Phase 8 table declarations were additional.

### Runtime validation — FAILED; TEST FIXTURE DEFECT; STOP

Executed one bounded runtime validation harness outside checkout, using the actual restricted development runtime account. No prior green 1/21/46/139 suites were rerun. The harness compared effective global/schema/table/column privileges with the approved declarations, required no grant option or broad schema/global privileges, inserted a uniquely owned synthetic parent/snapshot/operation/event/asset chain through the runtime account, and exercised required reads and narrow operation updates/event appends. UPDATE/DELETE attempts against immutable snapshots/assets/events were denied; operation-identity UPDATE and operation DELETE were denied. Phase 7 authorization-history deletion and Phase 6 revision mutation were denied. ALTER/CREATE/DROP/GRANT attempts were also denied with allowlisted database-access-denial classifications. No prohibited write was observed accepted.

**The harness failed at its final rollback-verification assertion.** It expected zero users and publishing fixture rows after throwing a rollback sentinel. Safe read-only inspection instead found:

| Owned table | Remaining rows |
|---|---:|
| users | 1 |
| publish_snapshots | 1 |
| publish_operations | 1 |
| publish_events | 2 |
| publish_assets | 1 |

The user identity/display classification and snapshot actor relationship matched the unique synthetic fixture. A private ownership manifest was saved outside checkout for later reviewed cleanup; no secret values were printed. The validation harness introduced a rollback-only cleanup assumption around denied administrative statements. That assumption did not hold. MySQL administrative/DDL implicit-commit behavior is relevant, but this execution does **not** establish which exact statement caused transaction persistence. No additional reproduction was run to identify it.

Classification: **TEST FIXTURE DEFECT in the temporary validation harness**, not evidence of a production schema or runtime-grant acceptance defect. The runtime stage is **FAILED overall**, despite the preceding successful privilege checks. Synthetic fixture rows remain in this explicitly disposable development database; no post-failure cleanup/repair was performed. No isolated test schema was contaminated by this fixture. No retry, timeout change, sleep or assertion weakening occurred. The harness and its expected-grant/ownership files reside only under `/tmp/phase8-explicit-dev-reset-20261018/`, outside the candidate.

Stopped at this first validation failure. Targeted browser validation and the complete review gate were **NOT RUN**. No production, test, fixture, helper, migration, package or configuration source file changed. Every repository fingerprint matched the pre-reset snapshot before this authorized documentation append. Historical successful **1 / 21 / 46 / 139**, earlier **115/2**, **20/1**, zero-test setup blocker, stale-ledger blocker and disposability stop remain separate historical evidence.

### Required report A–BE

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | `8326ae185ae48a4fc131dd02bbb9940ecb315334`; main |
| D index | Empty |
| E pre-reset candidate | 28 paths: 10 modified / 18 new |
| F target | bsa_dev_phase2a |
| G–K local identity / production excluded / staging excluded / shared remote excluded / isolated test DB excluded | YES to each |
| L human discard authorization applied | YES, exact development database only |
| M reset performed | YES |
| N reset mechanism | Existing local MySQL client/private defaults; exact database DROP/CREATE; normal repository migration CLI |
| O manual ledger modification | NO; only normal migration-runner ledger writes |
| P source changes caused by reset | NONE |
| Q post-reset migration count | 12 |
| R authoritative 0010 ledger checksum | b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce |
| S authoritative 0011 ledger checksum | 4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652 |
| T complete ledger verification | PASS: all twelve identity/hash/state rows and journal identities |
| U runtime provisioning | PASS: existing migrate/seed/grants sequence |
| V runtime-grant validation | FAILED overall at owned-fixture rollback verification; TEST FIXTURE DEFECT; preceding effective-grant and denial checks passed; no actual grant defect demonstrated |
| W–X targeted browser / retries | NOT RUN; no retries |
| Y–AB complete Unit/UI / MySQL / browser / retries | NOT RUN; complete gate not started |
| AC–AJ npm ci / lint / typecheck / secret scan / audit / build / npm ls / diff check | NOT RUN as complete-gate stages |
| AK final repository migration hashes | All 12 PASS; 0000–0010 unchanged; 0011 required hash unchanged; no 0012 |
| AL post-cycle candidate | 28 paths: 10 modified / 18 new; only existing review document appended |
| AM canonical permissions | 32 |
| AN content.publish | OWNER YES; MARKETING_ADMIN YES; CONTENT_CREATOR / REVIEWER / VIEWER NO |
| AO–AU authentication / isolation / generic retry / sleep / timeout / dependencies / environment names | NO changes |
| AV real provider calls | NONE |
| AW real providers | Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED / UNVERIFIED |
| AX media hold | Maximum 24 hours; nonrenewable; temporary; purpose-bound; no permanent DAM |
| AY provider URL-pull | DISABLED |
| AZ Hostinger | UNVERIFIED |
| BA historical Phase 7 browser failure | ROOT CAUSE UNRESOLVED; flakiness not established |
| BB–BD staging / commit / push | NONE |
| BE Phase 9 | NOT STARTED |

### Explicit YES/NO

| Question | Answer |
|---|---|
| bsa_dev_phase2a reset? | YES |
| Any other database reset? | NO |
| Migration ledger manually edited? | NO |
| Migration 0000–0010 changed? | NO |
| Migration 0011 changed? | NO |
| Production code changed during recovery? | NO |
| Repository test code changed during recovery? | NO; temporary validation harness outside checkout only |
| Permission count still 32? | YES |
| Authentication fundamentals changed? | NO |
| Transaction isolation changed? | NO |
| Generic retry added? | NO |
| Arbitrary sleep added? | NO |
| Timeout increased? | NO |
| Real provider call made? | NO |
| Real provider enabled? | NO |
| URL-pull enabled? | NO |
| Permanent DAM added? | NO |
| Hostinger verified? | NO |
| Anything staged? | NO |
| Anything committed? | NO |
| Anything pushed? | NO |
| Phase 9 started? | NO |

**STOP FOR REVIEW.** Database recovery and provisioning succeeded; runtime validation requires a separately reviewed correction to its temporary fixture ownership/cleanup strategy before later validation stages can proceed. Do not repair/retry automatically.


## Runtime validation fixture cleanup repair — runtime PASS; browser setup STOP

This cycle is limited to the expressly authorized temporary validation/fixture infrastructure and this append-only record. Branch main, HEAD/local main/remote main remained `8326ae185ae48a4fc131dd02bbb9940ecb315334`; index empty; candidate 28 paths (10 modified / 18 new). Twelve repository migration hashes verified; finalized 0000–0010 match committed bytes. No database was reset again and no migration ledger metadata was edited.

### Ownership proof and narrow cleanup of the previous residue

Before deletion, matched the prior saved harness ownership manifest against live rows and verified their exact relationships and synthetic classifications. Ownership did not rely on row counts. Synthetic identifiers (not credentials):

| Object | Owned identifier |
|---|---|
| user | e83ad185-8322-47d7-a0d8-dce83f7ae13f |
| snapshot / operation | cf1b963b-fff9-446e-a626-6e1543d0a5a0 |
| post | 27cdbd9e-8278-4944-933c-45e8989db07c |
| revision | 0898045c-40ca-45a8-8ed9-24062f01956c |
| approval decision | e9d62fca-0c2c-4074-ba53-7280da43db79 |
| submission | 28e84e04-6d44-41f7-8ed5-8909e4a1fd95 |
| authorization | eddb4967-3888-4b15-925c-1c8f32e881ac |
| destination | 04996278-45f7-4ccc-85ef-01cb8e12e91b |
| media | c8877098-a8a6-4afb-9d6d-f9c258cdbf19 |

The prior saved user/snapshot IDs and parent references matched exactly. The user was the invited synthetic constraint-fixture user with null password hash and its UUID-based example.test identity. The snapshot had the known synthetic caption/capability. The revision/post creator, decision actor, submission actor, authorization connected-by, destination authorization, media creator and immutable revision attachment all bound to this same graph. Event sequences/states were exactly 1/CREATED and 2/DISPATCHING. No unrelated identity was inferred to be owned.

Using the existing development migration account, removed the proven graph in FK-safe order inside a transaction, with exact identifier predicates and exact affected-row assertions:

| Table | Rows removed |
|---|---:|
| publish_assets | 1 |
| publish_events | 2 |
| publish_operations | 1 |
| publish_snapshots | 1 |
| content_decisions | 1 |
| content_submissions | 1 |
| content_revision_media | 1 |
| content_variants | 1 |
| content_revisions | 1 |
| content_items | 1 |
| social_destinations | 1 |
| social_authorizations | 1 |
| media_assets | 1 |
| users | 1 |

These **15 rows across 14 tables** include the previously reported six publishing/user records plus their nine owned parent/relation records. Every owned predicate subsequently returned zero rows. For each touched table, unrelated rows were compared before/after and remained identical. Both migration checksum ledger and Kysely journal remained identical. No runtime DELETE grant was added.

### Exact rollback-cleanup root cause — demonstrated

The original harness created the fixture and exercised ordinary writes inside one Kysely transaction on the runtime connection. It then attempted denied ALTER, CREATE, DROP and GRANT statements on that **same transaction connection** before throwing a rollback sentinel. It assumed denied statements could not end that transaction.

A bounded diagnostic used the same restricted runtime identity and no fixture writes: begin a transaction, read a transactional table, inspect MySQL protocol SERVER_STATUS_IN_TRANS via a DO result, attempt each prohibited statement, inspect the status again, then rollback. Each statement was correctly denied. For **ALTER, CREATE, DROP and GRANT independently**, the transaction flag was **true before / false after**. Thus denied administrative/DDL statements still crossed MySQL's implicit-commit boundary in this environment. ALTER was first in the original sequence; the previously inserted/updated fixture rows were committed before its denial, so the later rollback could not undo them. The prior persistent rows corroborate that boundary outcome. This is a **TEST FIXTURE / VALIDATION HARNESS DEFECT**, not successful unauthorized DDL or a production privilege defect. No global isolation/authentication policy was changed.

### Temporary harness repair and one validation — PASS

All harness files remain outside checkout under `/tmp/phase8-runtime-cleanup-20261018/`:

- ownership.mjs: read-only exact-manifest/lineage verification;
- cleanup.mjs: explicit identifier-scoped, FK-safe migration-account teardown, unrelated-row equality and ledger/journal invariance checks;
- runtime-validation.mjs: repaired runtime validator.

The repaired harness performs denied DDL/account statements **before any fixture transaction**, explicitly commits uniquely identified ordinary runtime fixtures, and uses the separate migration account for owned teardown in finally. It does not depend on rollback to undo administrative-statement side effects. Two independent unique graphs are used: an ordinary successful-write control and a graph exercising expected denied writes/narrow coordination updates. Removing the second graph must preserve the entire first graph byte-for-byte; only then is the control graph removed. Teardown uses neither broad runtime DELETE nor a database reset.

Ran the repaired runtime validation **once**, **0 retries**: **PASS, 24 checks**. Exact effective privileges matched **140 table privileges and 11 column privileges**, with no schema-wide grants, no elevated global grants and no grant option. Required inserts/reads/column-limited operation updates and event appends succeeded. Immutable snapshot/asset/event UPDATE and DELETE, operation identity UPDATE/DELETE, Phase 7 history deletion, Phase 6 revision mutation, and ALTER/CREATE/DROP/GRANT attempts were denied. Phase 7 declarations remain identical to the finalized parent. Both graph cleanups passed with zero owned residue; unrelated graph preservation and unchanged ledger/journal passed. All twelve ledger identities/checksums remained authoritative after cleanup.

### Targeted browser attempt — failed in temporary harness setup; STOP

After runtime success, attempted one temporary, standalone loopback publishing browser harness, using the existing Chromium, production PublishingPanel and publishing/content services, deterministic fake provider only, and a purpose-bound proof fixture seam modeled on the existing social browser harness. The proposed temporary validation covered role visibility/denial, disabled production capability, exact copy/hashtags, confirmation/focus/step-up, double-submit, statuses and approved responsive widths. These are **planned scope, not executed assertions**.

The execution exited 1 during `browser-harness-setup`, **before any browser case executed**. Safe output:

```json
{"result":"FAIL","stage":"browser-harness-setup","passed":0,"retries":0,"details":"WITHHELD","classification":"UNCLASSIFIED pending safe inspection"}
{"browserFixtureCleanup":"PASS","ownedUsersRemaining":0}
```

The temporary harness redacted the underlying exception without a more granular setup checkpoint; that diagnostic limitation prevents an exact underlying-cause classification from this run. **Setup failure observed; ROOT CAUSE UNRESOLVED.** No evidence establishes a production defect, provider failure or browser assertion failure. No successful browser coverage is claimed. No retry, repair, repeated execution, timeout increase or raw credential-bearing error output followed. Temporary files publishing-client.tsx and publishing-browser.mjs are outside checkout and were not added to the candidate. The browser fixture teardown completed. Safe final read-only counts were zero for users, publish snapshots/operations/assets/events, content items and social authorizations. All twelve ledger identities/checksums still matched authoritative migrations.

**Stopped at the first browser-stage failure. The complete review gate was NOT RUN.** Historical 1 / 21 / 46 / 139 passing targets were not rerun. Previous failures/blockers and the prior failed runtime cleanup remain unchanged historical evidence. Every repository fingerprint matched the pre-cycle freeze before this documentation append.

### Required report A–AS

| Items | Result |
|---|---|
| A baseline HEAD | 8326ae185ae48a4fc131dd02bbb9940ecb315334; local/remote same, main |
| B pre-repair inventory | 28 paths: 10 modified / 18 new |
| C exact ownership IDs/lineage | Table and lineage proof above; saved prior manifest plus live cross-reference checks |
| D residue ownership proven | YES |
| E rows removed | 15 proven owned rows across 14 tables, exact breakdown above |
| F unrelated rows removed | NO |
| G migration ledger touched | NO |
| H exact cleanup root cause | Denied administrative/DDL statements implicitly ended the same active transaction; first original ALTER crossed the boundary before later rollback |
| I harness files | Temporary ownership.mjs, cleanup.mjs, runtime-validation.mjs outside checkout; subsequent temporary publishing-client.tsx / publishing-browser.mjs setup failed; no repository test file changed |
| J production files changed | NO |
| K runtime grants changed | NO |
| L migrations changed | NO |
| M cleanup test result | PASS: both committed graphs cleaned, unrelated control preserved until its own teardown, zero owned residue; ledger/journal unchanged |
| N runtime validation | PASS: one execution, 24 checks, 0 retries; exact 140 table / 11 column privileges |
| O owned residue after validation | ZERO; also zero after browser fixture teardown |
| P targeted browser | FAILED DURING TEMPORARY HARNESS SETUP; 0 browser cases executed; underlying root cause unresolved |
| Q browser retries | 0 |
| R–U complete Unit/UI / MySQL / browser / retries | NOT RUN; complete gate not started |
| V–AC npm ci / lint / typecheck / secret scan / audit / build / npm ls / diff check | NOT RUN as complete-gate stages |
| AD all 12 migration checksums | PASS: repository hashes and applied development ledger; 0000–0010 match HEAD; no 0012 |
| AE final candidate | 28 paths: 10 modified / 18 new; only existing review document appended |
| AF permissions | 32; content.publish Owner/Admin YES; Creator/Reviewer/Viewer NO |
| AG–AM auth / isolation / dependencies / environment names / generic retry / sleep / timeout changes | NONE |
| AN real provider calls | NONE; all real adapters remain DISABLED / UNVERIFIED |
| AO Hostinger | UNVERIFIED |
| AP–AR staging / commit / push | NONE; index empty |
| AS Phase 9 | NOT STARTED |

0010 SHA-256 remains `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`; 0011 remains `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`. Media hold remains maximum 24 hours, nonrenewable, temporary and purpose-bound; URL-pull remains disabled; permanent DAM remains absent. Historical Phase 7 browser root cause remains unresolved and flakiness remains unestablished.

**STOP FOR REVIEW.** Runtime privilege and cleanup validation passed; browser setup requires a separately authorized diagnostic decision before further execution. Phase 8 remains partially implemented, unfinalized, uncommitted and unpushed.


## Targeted browser harness diagnostic ONLY — 2026-10-19; STOP

Preserve the preceding targeted browser attempt exactly: FAILED DURING HARNESS SETUP, **0 browser cases executed, 0 retries**, fixture cleanup PASSED, underlying cause UNRESOLVED. This diagnostic does not turn that attempt into a browser assertion failure or prove a product/security defect. The green runtime validation remains frozen: **24 checks passed, 0 retries, 0 owned residue**; it was neither modified nor rerun.

### Baseline and method

Verified main, HEAD/local main/remote main `8326ae185ae48a4fc131dd02bbb9940ecb315334`, empty index, 28 candidate paths (10 modified / 18 new). All twelve repository migrations matched their manifest; finalized 0000–0010 matched HEAD bytes. Saved a repository fingerprint outside checkout. No source modification or environment restoration was performed.

Read the original temporary publishing-browser.mjs harness, its client entry, repository browser configuration, secure wrapper and existing standalone social-browser harness. The publishing setup sequence is:

1. Load installed Vite/Playwright and database tooling; resolve existing development configuration.
2. Create a middleware-only Vite server and load the six fixture/service/security modules.
3. Create Owner, Marketing Admin, Creator, Reviewer and Viewer synthetic actors/sessions.
4. Create a content revision, submit it and approve the exact revision through the real content service.
5. Create a synthetic authorization/destination and resolve the exact approval identity.
6. Build the standalone React publishing client bundle using installed Vite and the existing production panel/styles, write:false.
7. Inspect bundle output, create/start the loopback HTTP server, launch Chromium, create its context/page and install the existing network allowlist.
8. Only afterward begin browser cases. Purpose-bound publishing proof setup occurs inside later browser cases, not the initial setup.

Created an instrumented **setup-only copy**, `/tmp/phase8-browser-diagnostic-20261019/publishing-browser-diagnostic.mjs`. The original temporary harness, repository browser fixtures and all production code remained unchanged. The copy labels setup operations, preserves original module-load concurrency and cleanup, and stops without entering browser cases even if setup completes. No failing setup stage is mocked or bypassed. Syntax inspection and a saved external diff confirmed these boundaries. Error output is limited to fixed stages, fixed error/category/code allowlists and boolean flags for fixed known identifiers; it never serializes the raw exception, stack, body, headers, cookies, environment or credential values.

Original temporary harness SHA-256: `0f31bc84aeba20761df5cd23f67aa16fd7652aba804f75bb1b73002aeea7422a`.

Setup-only diagnostic copy SHA-256: `4f76f178c362c660876b30f9422b85c32f1bb8d8770f715bf7226c7af510ff4d`.

### One diagnostic execution — reproduced setup failure

Executed the setup-only copy **once**, using the same existing pinned Node, private development configuration and installed tooling. **0 retries; 0 browser cases; exit 1**. No complete/targeted browser suite or complete review gate ran.

Proven healthy in this execution:

- Installed tooling imports and existing configuration resolution reached setup successfully.
- Vite middleware server creation passed.
- All six module loads passed: content fixture, publishing fixture, content service, publishing service, SensitiveValue and browser-security helpers.
- All five role actor fixtures passed.
- Runtime-backed content create, submit and exact-revision approval passed.
- Synthetic connection/destination creation and approval identity lookup passed.

**First failing stage: `client-bundle-build`.** The next bundle-inspection, loopback application-server creation/readiness, Chromium launch, context/page, route readiness and publishing recent-auth/proof stages were not reached. This is not evidence that any of those later stages is broken or healthy.

Safe diagnostic evidence:

```json
{"setupStage":"approval-identity-resolution","result":"PASS"}
{"result":"SETUP_FAILED","setupStage":"client-bundle-build","errorClass":"Error","code":"OTHER","category":"UNCLASSIFIED","browserCasesExecuted":0,"retries":0}
{"browserFixtureCleanup":"PASS","ownedUsersRemaining":0}
```

All fixed known-identifier flags were false. The structured fields captured by this diagnostic did not identify a missing dependency, source-resolution error, transform error, production invariant failure or another specific cause. The diagnostic catch still lacks an allowlisted classification of the underlying Vite build diagnostic. No raw error was exposed to compensate.

### Classification: G — ROOT CAUSE STILL UNRESOLVED

The first failing setup stage is now demonstrated, but the **underlying bundle-build cause remains unproven**. Do not classify it as a test harness defect, environment/tooling blocker, application defect, authorization defect, UI failure or flakiness without further evidence. In particular, no browser was launched and no browser/product assertion executed. The Phase 7 historical browser incident remains separately ROOT CAUSE UNRESOLVED; no common cause is established.

No repair is proposed as proven. The next diagnostic, if separately authorized, should inspect the build exception's structured underlying diagnostics through a closed safe classification/identifier allowlist (including nested build errors where present) at this now-isolated client-bundle-build boundary. It must not dump raw messages, source bodies, stacks, secrets or environment values. The temporary diagnostic copy is the only file that would need diagnostic extension; no production/migration/auth/dependency change is currently justified. No such extension or second execution was performed in this authorization.

### Cleanup and integrity

Existing actor-owned, FK-safe migration-account fixture teardown completed. Read-only verification afterward found zero rows in all eighteen inspected fixture tables: users, sessions, MFA methods, user roles, auth challenges, content items/revisions/variants/authors/submissions/decisions, social authorizations/credentials/destinations, publish snapshots/operations/assets/events. **Zero diagnostic-owned residue.** No database reset or broad shared cleanup occurred. All twelve applied migration ledger identities/checksums remained authoritative. This verification is cleanup/ledger inspection, not a runtime-grant revalidation.

Every repository fingerprint matched the pre-diagnostic freeze before this append. Only this existing review document was subsequently appended; candidate inventory remains unchanged. Diagnostic copy and diff remain outside checkout for review. No repair, package installation, environment-name addition, server reuse, retry, sleep or timeout change occurred. No live provider call occurred.

### Required report A–AG

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | 8326ae185ae48a4fc131dd02bbb9940ecb315334; main |
| D index | Empty |
| E pre-diagnostic inventory | 28 paths: 10 modified / 18 new |
| F setup stages | Ordered sequence above |
| G proven healthy | Tool/config resolution; Vite server; all six modules; five role actors; content create/submit/approve; destination fixture; approval lookup |
| H first failing stage | client-bundle-build |
| I exact safe evidence | Error class Error; allowlisted code OTHER; category UNCLASSIFIED; fixed known-identifier flags false; 0 browser cases; exit 1 |
| J diagnostic execution count | 1 setup-only execution |
| K retries | 0 |
| L classification | **G — ROOT CAUSE STILL UNRESOLVED** |
| M demonstrated root cause | Not established; failure localized to client bundle build |
| N minimum proposed next action | Separately authorized safe structured/nested build-diagnostic classification at the isolated boundary; no proven repair/restoration yet |
| O proposed diagnostic file | /tmp/phase8-browser-diagnostic-20261019/publishing-browser-diagnostic.mjs only; no production repair justified |
| P–U production / migrations / runtime grants / auth / dependencies / environment-name changes | NO to each |
| V–X timeout / sleep / retry changes | NO to each |
| Y diagnostic cleanup | PASS through existing owned-fixture mechanism |
| Z owned residue | 0 |
| AA migration verification | All twelve repository and applied development ledger checksums PASS; 0000–0010 match HEAD; required 0010/0011 unchanged; no 0012 |
| AB post-diagnostic inventory | 28 paths: 10 modified / 18 new; review append only; temporary instrumentation outside checkout |
| AC real provider calls | NONE |
| AD stage status | Nothing staged; index empty |
| AE commit status | Nothing committed |
| AF push status | Nothing pushed |
| AG Phase 9 | NOT STARTED |

0010 SHA-256 remains `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`; 0011 remains `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`. Permissions remain 32; content.publish Owner/Admin YES and Creator/Reviewer/Viewer NO. All real providers remain DISABLED / UNVERIFIED; URL-pull disabled; media hold maximum 24 hours, nonrenewable, temporary and purpose-bound; Hostinger UNVERIFIED. Historical green 1 / 21 / 46 / 139 / 24 evidence was not rerun or reworked.

**STOP FOR REVIEW.** Diagnostic-only authorization exhausted after one execution; no repair or further validation performed.


## Client bundle nested diagnostic ONLY — 2026-10-19; classified, no repair

Historical evidence remains unchanged: original targeted browser attempt failed during setup with **0 cases / 0 retries**, cleanup passed; the first setup-only diagnostic localized the failure to **client-bundle-build** but was classified **G — ROOT CAUSE STILL UNRESOLVED** at that time. This separately authorized nested diagnostic adds evidence; it does not rewrite those earlier results. Runtime validation remains **24 passed checks / 0 retries / 0 residue**, frozen and not rerun. Previous 1 / 21 / 46 / 139 green areas were not rerun.

### Read-only inspection and extractor validation

Verified branch main, HEAD/local main/remote main `8326ae185ae48a4fc131dd02bbb9940ecb315334`, empty index and exact 28-path candidate (10 modified / 18 new). All twelve repository migration checksums matched the manifest; finalized 0000–0010 matched HEAD bytes. Saved a complete repository fingerprint outside checkout.

Inspected the original temporary browser harness and prior diagnostic catch. The exact build API is the installed Vite JavaScript `build` API with these unchanged arguments (path values represented symbolically to avoid host-path disclosure):

```js
await build({
  root: repositoryRoot,
  configFile: false,
  logLevel: 'silent',
  oxc: { jsx: { runtime: 'automatic' } },
  define: { 'process.env.NODE_ENV': '"development"' },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: externalGeneratedClientEntry,
      name: 'PublishingHarness',
      formats: ['iife']
    }
  }
});
```

`externalGeneratedClientEntry` is the existing temporary publishing-client.tsx outside the repository. The entry imports the production PublishingPanel, React createRoot and existing styles. The old catch inspected the outer exception only and converted it into fixed safe categories/boolean identifier flags, discarding nested diagnostics. The installed Vite implementation invokes Rolldown, enhances the outer error and rethrows it. Installed Rolldown aggregates underlying errors into a plain **Error** with an `errors` getter; its summary may contain locations/source frames, making raw output inappropriate. AggregateError/cause/errors/diagnostics traversal therefore needs explicit bounds and safe projection.

Created only external diagnostic infrastructure: temporary extractor.mjs, extractor-tests.mjs and a nested setup-only diagnostic copy. Their location classification is **external-path**; no repository test/harness path was added or modified. The original temporary publishing harness and prior diagnostic remained unchanged. The new copy preserves the exact build call/configuration and cleanup and cannot enter browser cases. A saved external diff records instrumentation only. Diagnostic copy SHA-256: `36ec28c9368e1a7535a54e5c9ea20fd16eea1ac708e28cadca7ab9ea8a5d8234`.

The extractor traverses only cause/errors/diagnostics, with **maximum depth 3 and maximum 10 diagnostic nodes**, cycle detection, bounded child-array inspection, counts and truncation flags. Explicit allowlists govern classes, stable codes, plugin/hook names and known package identities. Paths can emit only exact known repository-relative filenames; unknown/outside paths become external-path, virtual modules become a fixed category, and query/fragment suffixes are stripped. Numeric locations are bounded. Raw messages/text are examined only internally for fixed classifications/known literal module identities and are **never emitted**. No frame, stack, body, arbitrary identifier or object dump is serialized.

Before the build diagnostic, ran **17 deterministic extractor tests, all PASS**, 0 retries. Twelve synthetic secret families covered password, bearer token, API key, OAuth code, cookie, session ID, authorization header, DB URL/password, connection-string material, URL query secret, environment-style secret and absolute local path. Synthetic values were placed in messages/text, codes, plugins/hooks, paths, nested causes/errors, stack/frame and location fields. None appeared in output; URLs, credential prefixes, source bodies and absolute filesystem prefixes were absent. Additional tests covered safe known fields/query stripping, cycle handling, 30-child truncation to ten nodes, depth limits and throwing getters. No real secret was used.

### Exactly one nested diagnostic execution

Executed the new setup-only copy **once**, using unchanged pinned Node, installed Vite/Chromium infrastructure and existing development configuration. **0 retries, 0 browser cases, exit 1**. The same pre-build setup stages passed: Vite/module loads, five actors, content create/submit/approval, destination and approval lookup. Server startup and Chromium launch were not reached. No full targeted browser suite or complete gate ran.

First actionable nested diagnostic:

| Field | Safe observed value |
|---|---|
| Stage | client-bundle-build |
| Outer class | Error |
| Nested class | Error |
| Structure | outer errors[] exists; one child; no cause; no separate diagnostics[] |
| Safe classification | MODULE_RESOLUTION |
| Known unresolved module identity | react/jsx-dev-runtime |
| Stable diagnostic code | No allowlisted stable code surfaced |
| Plugin / hook | No allowlisted metadata surfaced |
| File / line / column | Not surfaced by safe structured fields; external entry identified through separate read-only harness inspection |
| Traversed nodes | 2: wrapper plus errors[0] |
| Truncated | false |
| Raw/bounded message fragment emitted | NO |

The extractor classified the module-resolution wording and exact quoted known module identifier internally, emitting only fixed safe values. It did not dump the wrapper summary or child message.

### Classification: A — TEST HARNESS BUILD DEFECT

The build cannot resolve **react/jsx-dev-runtime** from the temporary generated client entry's dependency context. Read-only filesystem/package inspection establishes:

- The temporary client entry is outside the repository dependency tree.
- No React package exists in a node_modules directory along that entry's ancestor chain.
- The repository's already installed React package explicitly exports ./jsx-dev-runtime, and that export's file exists. Installing/upgrading React is not justified.
- Installed Vite `tryNodeResolve` uses the absolute existing importer's directory as its base unless the package is explicitly deduped to the configured root. The current temporary harness supplies no such resolution setting. Automatic JSX in the external entry introduces the bare runtime import; absolute imports of createRoot/the panel do not relocate that entry's dependency lookup context.

These combined facts demonstrate a **temporary harness module-resolution defect**, not missing production dependencies or a demonstrated production client/auth/configuration failure. No browser assertion executed. No relationship to the historical Phase 7 browser failure is established; that incident remains ROOT CAUSE UNRESOLVED, with flakiness unestablished.

**Minimum proposed repair, NOT APPLIED OR TESTED:** scope React dependency resolution to the repository root in the temporary harness build call, for example the installed Vite-supported `resolve: { dedupe: ['react'] }` setting. The inspected resolver then selects the configured root for React, including its jsx-dev-runtime subpath. Proposed repair file: the original temporary **publishing-browser.mjs (external-path)** only. No production panel/client source, package, lockfile, tsconfig, Next/Vite repository configuration, auth, schema, grant or isolation change is proposed. This would change only the temporary test harness's build-resolution options and needs separate repair authorization. No build configuration was changed in this diagnostic, and no repair was verified by rerun.

### Cleanup, integrity and stop

Existing actor-owned FK-safe cleanup passed; reported zero owned users. Read-only final inspection confirmed **zero rows across eighteen relevant fixture tables**, including users/sessions/MFA/challenges, content lineage/workflow, social authorization/destination/credentials, and publishing snapshots/operations/assets/events. **Owned diagnostic residue = 0.** All twelve applied development ledger identity/checksum/state rows still matched authoritative repository migrations. No reset, ledger mutation or runtime validation rerun occurred.

Every repository file fingerprint matched the pre-diagnostic freeze before this authorized append. No unexpected source/runtime artifact entered the candidate. Only this existing review document changed. Real providers stayed disabled; no provider call occurred. No repair, installation, retry, sleep, timeout increase, auth/isolation change, staging, commit or push occurred. **STOP FOR REVIEW AFTER CLASSIFICATION.**

### Required report A–AS

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | 8326ae185ae48a4fc131dd02bbb9940ecb315334; main |
| D index | Empty |
| E pre-diagnostic inventory | 28 paths: 10 modified / 18 new |
| F exact build invocation | Unchanged installed Vite build API/options shown above |
| G existing exception handling | Outer-only safe projection omitted nested errors; original catch redacted all details |
| H nested structures discovered | Plain Error wrapper, errors getter/array with one Error child; no cause or diagnostics[] in observed tree |
| I extractor location | Temporary extractor.mjs, external-path; no repository path added |
| J extractor bounds | Depth 3; 10 nodes; closed fields/value allowlists; query/path redaction; cycles/truncation guarded |
| K secret-redaction tests | 17 PASS; twelve synthetic families; no secret/raw message emitted |
| L diagnostic execution count | 1 |
| M retries | 0 |
| N error classes | Error wrapper and Error child |
| O stable error code | No allowlisted stable code surfaced; MODULE_RESOLUTION is the safe category, not a claimed native code |
| P build phase | client-bundle-build |
| Q–R plugin / hook | Not surfaced |
| S safe file/module | Module react/jsx-dev-runtime; generated entry external-path |
| T line/column | Not surfaced |
| U nested count | One child; two nodes including wrapper; no truncation |
| V safe bounded message used | NO message text emitted; fixed classification/module identity only |
| W classification | **A — TEST HARNESS BUILD DEFECT** |
| X root cause | External temporary JSX entry cannot resolve the installed React JSX development runtime from its importer-relative dependency context |
| Y minimum proposed repair | Future temporary-harness-only React deduplication/resolution from repository root; not applied or tested |
| Z proposed repair file | Original temporary publishing-browser.mjs, external-path only |
| AA production files changed | NO |
| AB configuration changed | NO; unchanged build invocation and all repository configuration |
| AC dependencies changed | NO |
| AD auth changed | NO |
| AE schema/migrations changed | NO |
| AF runtime grants changed | NO |
| AG isolation changed | NO |
| AH retries added | NO |
| AI sleeps added | NO |
| AJ timeout increased | NO |
| AK diagnostic cleanup | PASS |
| AL owned residue | 0 |
| AM migration checksums | All 12 repository/applied ledger hashes PASS; 0000–0010 match HEAD; no 0012 |
| AN post-diagnostic inventory | 28 paths: 10 modified / 18 new; review append only |
| AO real provider calls | NONE |
| AP stage status | Nothing staged; index empty |
| AQ commit status | Nothing committed |
| AR push status | Nothing pushed |
| AS Phase 9 | NOT STARTED |

0010 remains `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`; 0011 remains `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`. Permissions remain 32, with content.publish Owner/Admin YES, Creator/Reviewer/Viewer NO. All real providers remain DISABLED / UNVERIFIED; URL-pull disabled; media hold maximum 24 hours, nonrenewable, temporary and purpose-bound; Hostinger UNVERIFIED. No product-policy change occurred. Phase 8 remains partially implemented, unfinalized, uncommitted and unpushed.


## Narrow temporary React resolver repair — focused/browser PASS; complete gate STOP

This cycle follows explicit authorization for the demonstrated **A — TEST HARNESS BUILD DEFECT** only. Preserve the earlier unresolved setup runs and subsequent nested diagnosis above: the external generated JSX entry could not resolve **react/jsx-dev-runtime**, despite the installed repository React export/file being present. No previous failed result is rewritten.

### Verified baseline and exact temporary repair

Verified main; HEAD/local main/remote main `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index; 28 candidate paths (10 modified / 18 new). All twelve migration manifest hashes verified; finalized 0000–0010 matched committed bytes. Saved a repository fingerprint and before-copies of the temporary harness/client outside checkout.

Changed only the existing **temporary publishing-browser.mjs and publishing-client.tsx outside checkout**, plus bounded test-only diagnostic handling:

- Determine repository root with `git rev-parse --show-toplevel` from the checkout working directory.
- Add **`resolve: { dedupe: ['react', 'react-dom'] }`** to that temporary harness's Vite build invocation only. No repository Next/Vite configuration is loaded or changed (`configFile:false` remains).
- Use bare `react-dom/client` in the temporary JSX entry instead of its previous host-specific absolute dependency import. No package paths/exports are patched and no node_modules tree is copied, symlinked or installed.
- Retain the unchanged safe nested diagnostic extractor. The temporary browser harness now reports fixed safe setup-stage/assertion classifications and includes the retained extractor at a build failure. No raw error/body/header/cookie/token output was enabled. Existing assertions, approved viewport values, cleanup, timeouts and retry behavior remain unchanged.

No NODE_PATH/global resolution mutation, dependency upgrade, externalization or prebuilt bundle was used. The production resolver remains unchanged. The safe extractor and its historical 17-test/12-secret-family evidence remain intact.

### Focused client build — one execution, PASS

The focused validator reads the repaired harness's **actual build options**. A test-only non-resolving observer uses the build's own resolver to resolve react, react-dom, react/jsx-runtime and react/jsx-dev-runtime from the external entry, comparing each result with the repository package resolver's canonical real file. It then inspects parsed module package roots. All four resolve from the repository tree; **one React package root and one React DOM package root** appear in the bundle. Canonical safe locations: `node_modules/react` and `node_modules/react-dom`. React was not externalized; production configuration was not loaded; dependencies were not copied. The temporary JSX bundle built successfully.

**Focused builds: 1; PASS; retries: 0.** No database fixture was needed for this check.

### Targeted browser validation — one execution, PASS

Ran the previously blocked temporary browser harness once. It rebuilt the client naturally, started its own loopback server, launched existing Chromium and executed the browser cases. No stage was bypassed and no existing/unrelated server or prebuilt artifact was reused.

**10 cases passed, 0 failures, 0 retries**, covering:

1. Owner publish visibility/eligible destination access.
2. Marketing Admin publish visibility/eligible destination access.
3. Creator publishing UI absence and direct preview denial.
4. Reviewer publishing UI absence and direct preview denial.
5. Viewer publishing UI absence and direct preview denial.
6. Empty production capability registry: disabled controls and preview rejection.
7. Exact approved caption plus separately rendered approved hashtags; explicit confirmation; purpose-bound proof requirement; password-field focus; widths 320/375/390/768/1440 at height 900 without horizontal overflow; double click produces one admitted publish; PUBLISHED state and exact fake-provider content equality.
8. PROCESSING rendering.
9. FAILED rendering.
10. UNKNOWN rendering, safe error text and do-not-resend notice.

Scope/limits: this is the production PublishingPanel and publishing/content services through a standalone loopback fake-provider harness. Recent-auth uses the existing test fixture proof seam, modeled on the repository's social harness, after the real service authorizes the command-bound action; it does not claim a new end-to-end live password/MFA verification. Existing auth architecture remains unchanged. The approved fixture has an empty hashtag array, verified separately and unchanged. Real provider calls: **NONE**. No screenshot/video/trace capture was made.

Owned actor-based FK-safe cleanup passed and reported zero owned users. Independent read-only inspection then found zero rows in eighteen relevant fixture tables; all twelve applied development ledger identities/checksums remained authoritative. Thus **owned browser residue = 0** before the complete gate.

### First complete Phase 8 review gate — FAILED at Unit/UI; STOP

After focused build/browser/cleanup passed, began one complete gate from the beginning using the pinned supported Node/npm:

| Gate component | Result |
|---|---|
| npm ci | PASS |
| lint | PASS |
| strict typecheck | PASS |
| Unit/UI | **604 passed / 1 failed**, 31 files: 30 passed / 1 failed; 605 tests enumerated |
| complete isolated MySQL | NOT RUN after failure |
| secret scan | NOT RUN after failure |
| npm audit | NOT RUN as a separate gate component |
| production build | NOT RUN after failure |
| complete browser suite | NOT RUN after failure |
| npm ls --all | NOT RUN after failure |
| git diff --check | NOT RUN as gate component after failure |

Unit/UI duration reported 16.86 seconds. The 605-case enumeration is the historical 542 Unit/UI plus 17 publishing-policy units and 46 database-diagnostic-helper units. No test was suppressed or removed. All executions used zero retries. Targeted browser 10/0 evidence is separate from the unrun complete browser suite.

Exact failing test:

- `tests/unit/media.test.ts:38`: **cleanup CLI rejects missing/wrong isolated configuration without leaking values**.
- The test invokes the existing native Node cleanup CLI with its current transform-types option and intentionally invalid isolated configuration. Expected process status 1 and no synthetic canary echo were satisfied before the failing assertion.
- Failed assertion: stderr must contain **`Media cleanup unavailable`**.
- Actual captured stderr contains native Node **`ERR_MODULE_NOT_FOUND`**, identifying the unresolved **`src/server/publishing/media-hold`** import from **`src/server/media/service.ts`**. Node version in captured output: 24.21.0. The experimental transform-types warning is preceding context, not the module-resolution cause.

### Demonstrated classification: PRODUCTION CLI / MODULE-RESOLUTION DEFECT

Read-only source inspection confirms Phase 8 added this first runtime import in the production media service:

```ts
import { activePublishHold } from '../publishing/media-hold';
```

The target exists as media-hold.ts. Existing native-Node CLI runtime imports on this path use explicit .ts extensions. The media cleanup entry imports the media service statically before its try/catch, so native ESM fails while linking the new extensionless import, before the CLI can reject configuration with its safe error message or perform cleanup. Bundled/transformed browser/database paths resolving this import successfully do not prove the native CLI entry remains loadable.

This is a production CLI startup regression demonstrated by the existing unit's subprocess evidence, not the repaired temporary React resolver issue. No evidence indicates a runtime-grant/schema/auth defect or successful unauthorized operation. The new publishing hold rules themselves are not relaxed or changed by this finding. **Minimum candidate repair, NOT APPLIED:** make this runtime import explicit as `../publishing/media-hold.ts` in src/server/media/service.ts, preserving native Node resolution and existing CLI error handling. That production change requires separate authorization and targeted verification; no repair or reproduction/rerun was attempted after the failed gate. No auth, grant, migration, dependency or isolation change appears necessary from current evidence.

Stopped immediately at Unit/UI failure. No later gate stage was run and no source was repaired. Read-only post-failure inspection proved all repository fingerprints still matched the pre-cycle freeze before this documentation append, the same 28-path inventory, empty index, all twelve required migration hashes and finalized bytes. The new complete gate is historically FAILED, not continued or green.

### Required report A–BA

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | 8326ae185ae48a4fc131dd02bbb9940ecb315334; main |
| D index | Empty |
| E pre-repair inventory | 28 paths: 10 modified / 18 new |
| F exact harness files | Temporary publishing-browser.mjs and publishing-client.tsx outside checkout; associated focused-build validator and safe instrumentation also outside candidate |
| G resolution mechanism | Temporary Vite build resolve.dedupe: react/react-dom; bare React DOM client entry import |
| H repository root | git rev-parse --show-toplevel from working checkout |
| I React location | Repository-canonical node_modules/react |
| J React DOM location | Repository-canonical node_modules/react-dom |
| K jsx-runtime | Resolves to repository-canonical export/file |
| L jsx-dev-runtime | Resolves to repository-canonical export/file; bundle succeeds |
| M duplicate React | Exactly one React package root and one React DOM package root; no extra copy/externalization |
| N production files changed in this cycle | NO |
| O production build configuration changed | NO |
| P dependencies changed | NO |
| Q lockfile changed | NO |
| R environment names changed | NO |
| S focused build | PASS, one execution |
| T focused retries | 0 |
| U targeted browser | PASS, one execution |
| V targeted browser count | 10 passed |
| W targeted retries | 0 |
| X browser cleanup | PASS |
| Y owned residue | 0 |
| Z complete Unit/UI | **604 passed / 1 failed**, 605 total; native cleanup CLI import regression |
| AA complete MySQL | NOT RUN |
| AB complete browser | NOT RUN |
| AC complete browser retries | NOT RUN; no retries attempted |
| AD npm ci | PASS |
| AE lint | PASS |
| AF strict typecheck | PASS |
| AG secret scan | NOT RUN |
| AH npm audit | NOT RUN as gate component |
| AI production build | NOT RUN |
| AJ npm ls --all | NOT RUN |
| AK git diff --check | NOT RUN as gate component |
| AL migration integrity | All 12 repository hashes PASS; 0000–0010 match finalized HEAD; 0010/0011 unchanged; no 0012 |
| AM final candidate | 28 paths: 10 modified / 18 new; existing review append only |
| AN permissions | 32; content.publish Owner/Admin YES, Creator/Reviewer/Viewer NO |
| AO–AR auth / isolation / runtime grants / migrations changed | NO to each |
| AS retries added | NO |
| AT sleeps added | NO |
| AU timeout changed | NO |
| AV real provider calls | NONE |
| AW Hostinger | UNVERIFIED |
| AX staging | Nothing staged; index empty |
| AY commit | Nothing committed |
| AZ push | Nothing pushed |
| BA Phase 9 | NOT STARTED |

0010 remains `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`; 0011 remains `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`. All real providers remain DISABLED / UNVERIFIED. URL-pull remains disabled; maximum 24-hour nonrenewable temporary purpose-bound media hold remains; no permanent DAM. The historical Phase 7 browser root cause remains unresolved, with no flakiness established.

**STOP FOR REVIEW AT FIRST COMPLETE-GATE FAILURE.** Phase 8 is not ready for finalization; no staging/commit/push or Phase 9 work is authorized or performed.


## Narrow production cleanup CLI import repair — focused/Unit PASS; fresh gate STOP at MySQL inventory

This cycle is explicitly authorized only for the demonstrated native-Node import defect. All historical stale-development-ledger, runtime cleanup-harness, client-bundle/React resolution, focused build and 10-case browser evidence remains unchanged above. In particular, the preceding complete gate remains **604 Unit/UI passed / 1 failed**, with every later gate stage NOT RUN. Its production cleanup CLI ERR_MODULE_NOT_FOUND finding is not erased by the repair below.

### Read-only compatibility confirmation

Before editing, verified main; HEAD/local main/remote main `8326ae185ae48a4fc131dd02bbb9940ecb315334`; index empty; 28 paths (10 modified / 18 new). All twelve migration hashes matched the manifest; finalized 0000–0010 matched HEAD bytes. Saved a complete repository fingerprint and a before-copy of src/server/media/service.ts outside checkout.

Confirmed:

- src/server/media/service.ts has the exact reported runtime import `../publishing/media-hold`.
- Its intended existing target is src/server/publishing/media-hold.ts.
- scripts/media-cleanup.mjs imports the media service statically and is executed by native Node ESM with the repository's current transform-types option; the existing unit subprocess demonstrates this path independently of a bundler.
- tsconfig.json already has **allowImportingTsExtensions:true** and noEmit:true. The existing CLI/runtime dependency path already uses explicit .ts imports.
- A TypeScript-AST read-only traversal of **20 local runtime dependency modules** found **only this one extensionless relative runtime import**. The extensionless DatabaseSchema reference inside media-hold.ts is type-only and erased, so it is not the same runtime defect. Bundled application imports elsewhere were not rewritten.
- No configuration, loader, dependency, package, lockfile, Node version or build change is needed.

### Exact authorized one-line repair

Only changed the demonstrated import in src/server/media/service.ts:

```diff
-import { activePublishHold } from '../publishing/media-hold';
+import { activePublishHold } from '../publishing/media-hold.ts';
```

No other production file changed during this cycle. No media cleanup/hold/publishing/authorization/error-redaction semantics changed; this corrects native module resolution only. No test assertion, fixture or harness was modified in this cycle.

### Focused native CLI validation — PASS

Ran the existing exact previously failing test once, using pinned Node 24.21.0 and the normal unit runner's name filter:

```text
vitest run tests/unit/media.test.ts -t "cleanup CLI rejects missing/wrong isolated configuration without leaking values"
```

Result: **1 passed, 0 failed, 0 retries**, one file, 821 ms reported duration. The other 51 cases were outside the explicit filter (shown as skipped by the runner); they were all included in the subsequent full Unit/UI gate. The test's native subprocess now resolves the new module and reaches the intended safe invalid-configuration handler: status 1, no synthetic configuration-canary leakage, and stderr contains Media cleanup unavailable. No previous ERR_MODULE_NOT_FOUND prevented the handler. No separate repeat of earlier 1/21/46/139/24/build/10-browser targets occurred.

### One fresh complete Phase 8 review gate — FAILED; STOP at MySQL

Started from npm ci after the source repair; no reliance on a patched node_modules tree. Commands ran once, in the authorized order, with zero retries:

| Component | Fresh result |
|---|---|
| npm ci | PASS |
| lint | PASS |
| strict typecheck | PASS |
| Unit/UI | **605 passed**, 31 files; no failures/skips; 17.19 s reported duration |
| complete isolated MySQL | **FAILED** at foundation table inventory; runner interrupted after first reported failure; no completed aggregate suite result |
| secret scan | NOT RUN after failure |
| npm audit | NOT RUN as separate gate component |
| production build | NOT RUN after failure |
| complete browser suite | NOT RUN after failure |
| npm ls --all | NOT RUN after failure |
| git diff --check | NOT RUN as a gate stage after failure |

The 605 Unit/UI count is unchanged enumeration from the prior 604/1 gate: historical 542 plus 17 Phase 8 publishing units and 46 diagnostic-helper units. The repaired CLI case now passed; no assertion was weakened or suppressed. Earlier targeted browser **10 passed / 0 retries** remains separate valid historical evidence, not a complete-browser result for this gate.

The isolated MySQL command used the existing private test environment, guarded normal database CLI and unchanged runner configuration. Its first reported failed file was:

```text
foundation.test.ts: 25 tests, 1 failed
real MySQL security foundation
creates 49 application tables on real MySQL with enforced checks and explicit InnoDB
```

The file reported 25 executed tests with 1 failure (**24 passed / 1 failed for that file**, not an aggregate full-suite count), duration 2651 ms. Upon observing that failure, sent one interrupt to the existing Vitest runner to comply with the immediate-stop instruction. The database command exited **130** from interruption. Work in progress after that file was not treated as a separate failure; the runner did not produce a completed aggregate summary. No test was rerun, no remaining gate stage was run and no failure was repaired.

### Demonstrated MySQL failure: TEST INVENTORY / EXPECTATION DEFECT

Read-only inspection locates the failing assertion in tests/database/foundation.test.ts:54:

```ts
expect(security).toHaveLength(49);
```

The query excludes the normal migration bookkeeping tables. Safe read-only inspection of the same guarded isolated test database confirmed:

| Inventory evidence | Result |
|---|---:|
| Test expected application tables | 49 |
| Observed application tables | 53 |
| Tables declared by finalized migrations 0000–0010 | 49 |
| Tables declared by candidate migrations 0000–0011 | 53 |
| Missing candidate tables | 0 |
| Unexpected candidate tables | 0 |
| Correct InnoDB/utf8mb4_bin properties | YES |

The exact four additions are the approved **publish_assets, publish_events, publish_operations, publish_snapshots** tables. The database table identities exactly match authoritative migration declarations. The foundation test retained the pre-Phase-8 count/title despite the approved four-table migration. This demonstrates a **TEST INVENTORY / EXPECTATION DEFECT**, not a missing/extra production table or a new schema acceptance defect. No production/schema change is justified by this count mismatch.

Minimum proposed next repair, **NOT APPLIED**: update the foundation test's application-table inventory to account explicitly for the 49 finalized tables plus the four approved Phase 8 tables, preserving strict drift detection and engine/collation checks; update its obsolete title as appropriate. The precise test-only repair requires separate authorization. No foundation test, migration, schema or grant was changed after the failure.

### Integrity and required report A–AW

Post-stop fingerprint inspection proved only the authorized one-line production import differed from the pre-cycle freeze before this append. No package, lockfile, configuration, environment name, test or migration bytes changed. Inventory remains 28 paths (10 modified / 18 new), since both the media service and this review document already belong to the candidate. The index remains empty. Remote main was rechecked and still equals the baseline.

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | 8326ae185ae48a4fc131dd02bbb9940ecb315334; main |
| D index | Empty |
| E pre-repair inventory | 28 paths: 10 modified / 18 new |
| F existing import | ../publishing/media-hold |
| G resolved target | src/server/publishing/media-hold.ts |
| H native Node execution confirmed | YES |
| I explicit .ts compatible | YES; existing tsconfig option and CLI patterns; focused/full Unit/UI passed |
| J relevant-path inspection | 20 local runtime modules; only demonstrated runtime import extensionless; type-only imports excluded |
| K exact repair | ../publishing/media-hold -> ../publishing/media-hold.ts |
| L production files changed in this cycle | src/server/media/service.ts only, one import line |
| M unrelated production files changed | NO |
| N focused CLI validation | PASS, 1 exact test; 51 outside name filter |
| O focused retries | 0 |
| P fresh npm ci | PASS |
| Q fresh lint | PASS |
| R fresh strict typecheck | PASS |
| S fresh Unit/UI | 605 passed / 0 failed; 31 files |
| T fresh MySQL | FAILED: foundation file 24 passed / 1 failed; expected 49, observed 53; interrupted runner, no aggregate suite result |
| U fresh secret scan | NOT RUN |
| V fresh npm audit | NOT RUN as gate component |
| W fresh production build | NOT RUN |
| X fresh complete browser | NOT RUN |
| Y fresh complete browser retries | NOT RUN; no retries attempted |
| Z fresh npm ls --all | NOT RUN |
| AA fresh git diff --check | NOT RUN as gate component |
| AB all 12 migration checksums | PASS read-only integrity verification; 0000–0010 match HEAD; 0011 unchanged; no 0012 |
| AC final candidate | 28 paths: 10 modified / 18 new; only authorized import and existing review append changed during this cycle |
| AD permissions | 32; content.publish Owner/Admin YES, Creator/Reviewer/Viewer NO |
| AE auth changed | NO |
| AF runtime grants changed | NO |
| AG isolation changed | NO |
| AH migrations changed | NO |
| AI dependencies changed | NO |
| AJ lockfile changed | NO |
| AK environment names changed | NO |
| AL retries added | NO |
| AM sleeps added | NO |
| AN timeout changes | NO |
| AO real provider calls | NONE |
| AP real providers | Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED / UNVERIFIED |
| AQ URL-pull | DISABLED |
| AR media hold | Maximum 24 hours, nonrenewable, temporary, purpose-bound; no permanent DAM |
| AS Hostinger | UNVERIFIED |
| AT staging | Nothing staged; index empty |
| AU commit | Nothing committed |
| AV push | Nothing pushed |
| AW Phase 9 | NOT STARTED |

### Explicit final YES/NO

| Question | Answer |
|---|---|
| Only demonstrated import repaired? | YES |
| Production semantics changed beyond module resolution? | NO |
| Dependencies changed? | NO |
| Lockfile changed? | NO |
| Build configuration changed? | NO |
| tsconfig changed? | NO |
| Migration changed? | NO |
| Permission count still 32? | YES |
| Auth fundamentals changed? | NO |
| Runtime grants changed? | NO |
| Transaction isolation changed? | NO |
| Retry added? | NO |
| Sleep added? | NO |
| Timeout increased? | NO |
| Real provider call made? | NO |
| Anything staged? | NO |
| Anything committed? | NO |
| Anything pushed? | NO |
| Phase 9 started? | NO |

0010 SHA-256 remains `b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce`; 0011 remains `4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652`. Historical Phase 7 browser root cause remains unresolved; flakiness was not established. **STOP FOR REVIEW AT THE FIRST FRESH-GATE FAILURE.** Phase 8 is not finalized or ready for finalization; no repair/retry of the inventory failure was performed.


## Narrow foundation exact inventory repair — targeted PASS; fresh complete review gate PASS

This cycle follows explicit TEST INVENTORY / EXPECTATION DEFECT repair authorization only. Preserve the preceding failed gate exactly: npm ci/lint/typecheck PASS, **605 Unit/UI passed**, then the foundation MySQL file **24 passed / 1 failed**, expected 49 versus authoritative 53; runner interrupted after the failure, later gate stages NOT RUN. The production native-Node import repair and all earlier failures/blockers/diagnostics remain recorded above; none is rewritten as an initial pass.

### Read-only inventory confirmation before editing

Verified main; HEAD/local main/remote main `8326ae185ae48a4fc131dd02bbb9940ecb315334`; empty index; candidate 28 paths (10 modified / 18 new). All twelve migration hashes matched the repository manifest; finalized 0000–0010 matched HEAD bytes; 0011 retained its required hash. Saved a repository fingerprint outside checkout. The already validated production media-service .ts import remained unchanged throughout this cycle.

The old foundation test did **not** contain an explicit 49-name list: it checked only length 49 and common engine/collation, while ignoring every name beginning kysely_. Reconstructed the historical 49-name contract from immutable migrations 0000–0010 and verified it against the actual guarded isolated test database before editing. These are the exact historical application identities:

```text
ai_generation_guard, ai_generations, audit_logs, auth_challenges, auth_rate_limits
brand_categories, brand_claims, brand_contacts, brand_ctas, brand_emoji
brand_examples, brand_facts, brand_hashtags, brand_language, brand_locations
brand_platforms, brand_seasons, brand_voice, brand_wording, brands
content_decisions, content_items, content_media_protection, content_revision_authors, content_revision_facts
content_revision_media, content_revisions, content_submissions, content_variants, installation_state
invitations, media_assets, media_storage_guard, mfa_methods, mfa_recovery_codes
password_reset_tokens, permissions, role_permissions, roles, security_events
sessions, social_authorizations, social_credentials, social_destinations, social_guard
social_transactions, team_administration_guard, user_roles, users
```

Read migration 0011 and confirmed its exact four CREATE TABLE declarations:

- publish_assets
- publish_events
- publish_operations
- publish_snapshots

Read-only database confirmation: **all historical 49 present**, all four Phase 8 additions present, **53 actual application tables**, **missing expected set []**, **unexpected/unapproved set []**, every application table InnoDB / utf8mb4_bin. Actual identities exactly matched reviewed migrations 0000–0011; no schema modification was required or justified.

### Exact authorized test-only repair

Changed only the inventory-owning assertion in tests/database/foundation.test.ts and its stale test title. The test now freezes the explicit literal **53-name expected inventory** and compares sorted actual names with sorted expected names using exact equality. The test expectation is not dynamically derived from current database/migration output and does not accept subsets, prefixes, ignored extras or a count alone.

Only the three exact migration bookkeeping names are excluded: kysely_migration, kysely_migration_lock, schema_migration_checksums. Any other table, including a kysely_ lookalike, is included and fails equality unless explicitly expected. Existing MySQL-version and every-table InnoDB/collation assertions remain intact. Missing names, extra names and renamed tables all fail the frozen exact comparison. No other foundation assertion, fixture, production file, schema, migration or grant was changed.

### Targeted foundation validation — PASS

Ran the same existing isolated foundation file once using its normal guarded database setup/lease:

```text
vitest run --config vitest.database.config.ts tests/database/foundation.test.ts
```

Result: **25 passed / 0 failed / 0 skipped / 0 retries**, one file, reported duration **3.18 s**. The exact 53-name equality passed, proving both **missing []** and **unexpected []** while preserving all prior foundation checks. No test was weakened/suppressed. No separate reassurance rerun of the previously green CLI, runtime, database/service, focused bundle or targeted 10-browser suites occurred.

### One fresh complete Phase 8 review gate — PASS

Started from npm ci after the targeted repair validation, not from MySQL. Every component ran once in the authorized order with **0 retries**:

| Component | Result |
|---|---|
| npm ci | PASS; clean locked installation |
| lint | PASS |
| strict typecheck | PASS |
| Unit/UI | **605 passed**, 31 files; no failures/skips; 17.06 s reported duration |
| complete isolated MySQL | **967 passed**, 19 files; no failures/skips; 364.80 s reported duration |
| secret scan | PASS |
| npm audit | PASS; **0 vulnerabilities** |
| production build | PASS; compiled successfully; one non-failing dynamic-filesystem/tracing warning |
| complete browser suite | **112 passed**, one worker, **0 retries**, 2.4 minutes |
| npm ls --all | PASS |
| git diff --check | PASS; empty diagnostic output |
| all 12 repository migration hashes | PASS |

Count explanations: 605 Unit/UI is the existing 542 plus 17 publishing-policy units and 46 diagnostic-helper units. The 967 MySQL cases are the finalized 843 plus 101 publishing-schema cases, 22 publishing-service cases and one exact Phase 7-to-8 migration upgrade/preservation/tamper case. The full browser count remains 112; the previously authorized standalone Phase 8 **10 passed / 0 retries** remains separate targeted evidence, not a new committed browser-file count. No unexplained disappearance, skipped regression or retry occurred.

The complete browser stage used the existing isolated browser provisioning mechanism (normal migrate/seed/restricted grants), existing Chromium and repository Playwright configuration. No database reset, unrelated server reuse, manual ledger edit, live social call or real provider enabling occurred. The fake-provider tests remain test-only. The existing non-failing build tracing warning was recorded without repair or an invented cause. No stream-write failure diagnostic was observed by the bounded current-run log check; historical Phase 7 diagnostics/failure classifications remain unchanged.

### Post-gate integrity and exact candidate inventory

Before this report append, post-gate fingerprints proved **only the authorized foundation test differed** from the pre-cycle snapshot. Production code (including the approved media-service .ts import), all other tests/helpers, packages/lockfile, environment schema/example, grant source and all migrations remained byte-identical. Afterward, only this existing review document was appended. No new repository-visible path appeared. Build/test logs and temporary validation tooling remain outside the candidate or in existing ignored runtime-output locations.

Final inventory remains **28 paths: 10 modified / 18 new**. The complete current Phase 8 candidate (not just this cycle's repair) is:

```text
 M migrations/manifest.json
 M scripts/local-mysql.py
 M src/app/(workspace)/content/[id]/page.tsx
 M src/server/auth/access.ts
 M src/server/db/schema.ts
 M src/server/media/service.ts
 M tests/database/foundation.test.ts
 M tests/database/migration-recovery.test.ts
 M tests/database/phase2b-helpers.ts
 M tests/unit/database-config.test.ts
?? docs/research/phase-8-provider-publishing-requirements.md
?? docs/review/phase-8.md
?? migrations/0011_publishing_foundation.sql
?? src/app/api/publishing/route.ts
?? src/features/publishing/model.ts
?? src/features/publishing/panel.tsx
?? src/server/publishing/media-hold.ts
?? src/server/publishing/policy.ts
?? src/server/publishing/provider.ts
?? src/server/publishing/schema.ts
?? src/server/publishing/service.ts
?? src/server/publishing/web.ts
?? tests/database/publishing-schema.test.ts
?? tests/database/publishing.test.ts
?? tests/helpers/publishing-database-diagnostic.ts
?? tests/helpers/publishing-fixtures.ts
?? tests/unit/publishing-database-diagnostic.test.ts
?? tests/unit/publishing.test.ts
```

The only paths changed in this repair cycle are **tests/database/foundation.test.ts** and this append-only **docs/review/phase-8.md**. Other listed production/test paths are pre-existing frozen Phase 8 candidate work. The index is empty and nothing was staged, committed or pushed. HEAD/local main/remote main were rechecked and remain the authorized baseline.

### Required report A–BC

| Items | Result |
|---|---|
| A–C HEAD / local main / remote main | 8326ae185ae48a4fc131dd02bbb9940ecb315334; branch main |
| D index | Empty |
| E pre-repair inventory | 28 paths: 10 modified / 18 new |
| F old count | 49 |
| G old exact inventory | Old test was count-only; immutable migration-defined historical 49-name set reproduced above |
| H four Phase 8 names | publish_assets, publish_events, publish_operations, publish_snapshots |
| I migration ownership | Exactly those four CREATE TABLE statements in frozen 0011 |
| J actual pre-repair count | 53 |
| K missing before repair | [] against reviewed 0000–0011 contract; all prior 49 present |
| L unexpected before repair | [] against reviewed 0000–0011 contract; only four approved additions beyond the old 49 |
| M exact test owner changed | tests/database/foundation.test.ts |
| N repair | Explicit frozen 53-name sorted equality, exact bookkeeping exclusions, updated title; engine/collation/version checks preserved |
| O assertion remains exact | YES; stronger than prior count-only contract |
| P targeted foundation | 25 passed / 0 failed / 0 skipped |
| Q targeted retries | 0 |
| R targeted missing | [] |
| S targeted unexpected | [] |
| T fresh npm ci | PASS |
| U fresh lint | PASS |
| V fresh typecheck | PASS |
| W fresh Unit/UI | 605 passed |
| X fresh complete MySQL | 967 passed |
| Y fresh secret scan | PASS |
| Z fresh npm audit | PASS; 0 vulnerabilities |
| AA fresh production build | PASS; one non-failing tracing warning preserved |
| AB fresh browser | 112 passed |
| AC fresh browser retries | 0 |
| AD fresh npm ls --all | PASS |
| AE fresh git diff --check | PASS |
| AF all 12 migration checksums | PASS; 0000–0010 byte-identical to finalized HEAD; 0011 unchanged; no 0012 |
| AG 0010 SHA-256 | b846788569ed44c9d8d4e84654fd2d3b9cbacbbf84fb51924a5302470b2b2cce |
| AH 0011 SHA-256 | 4006daef63e05448446446bc5eb91ec83ccb5ad1aaa91754219b3bf344783652 |
| AI final candidate | 28 paths: 10 modified / 18 new; full inventory above |
| AJ permissions | 32; content.publish Owner/Admin YES, Creator/Reviewer/Viewer NO |
| AK production changes beyond authorized import | NO; no production file changed in this cycle |
| AL auth changes | NO |
| AM runtime-grant design changes | NO; existing approved provisioning only |
| AN isolation changes | NO |
| AO migration changes | NO |
| AP dependency changes | NO |
| AQ lockfile changes | NO |
| AR environment-name changes | NO |
| AS retries added | NO |
| AT sleeps added | NO |
| AU timeout changes | NO |
| AV real provider calls | NONE |
| AW real providers | Facebook/Instagram/TikTok/YouTube/LinkedIn DISABLED / UNVERIFIED |
| AX URL-pull | DISABLED |
| AY Hostinger | UNVERIFIED |
| AZ staging | Nothing staged; empty index |
| BA commit | Nothing committed |
| BB push | Nothing pushed |
| BC Phase 9 | NOT STARTED |

The maximum 24-hour nonrenewable temporary purpose-bound publish hold remains unchanged; permanent DAM remains absent. Runtime validation's 24 checks and zero-residue evidence, focused native CLI pass, focused canonical React build pass and targeted Phase 8 browser 10-pass evidence remain valid and were not separately rerun. The historical Phase 7 browser incident remains ROOT CAUSE UNRESOLVED; flakiness was never established.

**READY FOR FINALIZATION REVIEW — NOT FINALIZED.** The fresh complete review gate is green. No additional Phase 8 implementation, staging, commit, push or Phase 9 work followed. Finalization requires separate authorization. **STOP FOR FINALIZATION REVIEW.**
