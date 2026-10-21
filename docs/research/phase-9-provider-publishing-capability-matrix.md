# Phase 9 — provider publishing capability matrix

Date: 2026-10-20. Baseline: `4b9853a610811205e4d439082ffe20671dae5759`.
Evidence/access ledger: [requirements](phase-9-provider-publishing-requirements.md).
All 25 unique official source targets were inaccessible before document retrieval.
UNKNOWN means no current official evidence, not absence of provider support.
No SUPPORTED entry can be justified. All production capabilities remain disabled.

## Content types

| Provider | TEXT | LINK | SINGLE_IMAGE | CAROUSEL | VIDEO | SHORT_FORM_VIDEO / REEL / SHORT | STORY | DOCUMENT |
|---|---|---|---|---|---|---|---|---|
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| YouTube | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| LinkedIn | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

LinkedIn organization and member modes each inherit UNKNOWN across all eight
columns; organization is the current internal destination kind. No NOT_APPLICABLE
or UNSUPPORTED label is inferred from a failed fetch.

## Media transport

Per-capability REQUIRED/OPTIONAL/UNSUPPORTED semantics cannot be assigned without
evidence. These are provider requirements, not assertions our runtime supports them.

| Provider | Server binary | Multipart | Resumable | Chunked | Provider URL pull | Public media URL | Upload session | Asset/container |
|---|---|---|---|---|---|---|---|---|
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| YouTube | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| LinkedIn | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

URL-pull required anywhere: **UNKNOWN**. Internal URL-pull policy: **DISABLED**.
No public-media exception or longer retention is proposed.

## Private temporary-media compatibility

| Provider | Private dispatch possible | Later re-fetch needed | Async after bytes | Safe local deletion proof | Processing >24h possible | 24h provably sufficient |
|---|---|---|---|---|---|---|
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| YouTube | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| LinkedIn | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

For each provider, whether acknowledged bytes are enough to delete local media is
UNKNOWN. Do not equate an HTTP success, container ID or accepted operation with
ownership of a complete durable byte copy. Current private hold stays maximum 24h,
nonrenewable, purpose-bound, temporary; no permanent DAM.

## Lifecycle compatibility

Internal mapping proposal only: CREATED = immutable locally admitted intent;
DISPATCHING = once-claimed attempt; ACCEPTED = documented remote durable acceptance;
PROCESSING = documented nonterminal processing; PUBLISHED = documented final publication;
FAILED = definitive terminal failure; UNKNOWN = unconfirmed outcome. These names
are not claimed provider statuses. No state machine change is made.

| Provider | Dispatch ack / ACCEPTED evidence | PROCESSING evidence | PUBLISHED evidence | Terminal failure | Ambiguous outcome / reconciliation | Compatibility |
|---|---|---|---|---|---|---|
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; never blind redispatch | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; never blind redispatch | UNKNOWN |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; never blind redispatch | UNKNOWN |
| YouTube | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; never blind redispatch | UNKNOWN |
| LinkedIn | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN; never blind redispatch | UNKNOWN |

Internal mismatches requiring design review: test-only adapter mode, 30-second
dispatch deadline versus unverified transfer needs, lack of secret upload-session
checkpoint, latest UNKNOWN event losing preceding references, version-bound status
after credential refresh, and empty provider options. See requirements gap analysis.
These are not evidence that any real provider violates Phase 8 invariants.

## Idempotency, polling, webhook and version evidence

| Provider | Native key | Resume identity | Request/post ID | Safe reconcile before redispatch | Duplicate risk | Webhook requirement | Poll endpoint / cadence / terminal states | Version / sunset |
|---|---|---|---|---|---|---|---|---|
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| YouTube | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| LinkedIn | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

No provider is assigned LOW/MEDIUM/HIGH duplicate risk without official semantics.
An ambiguous attempt remains UNKNOWN. The local once-only operation key is not a
provider idempotency key. Provider polling frequency, rate windows and webhook
signature/replay/event timestamp/duplicate-delivery rules remain UNKNOWN. Do not
invent polling cadence or add a worker/scheduler. API versions cannot be selected
from memory; registry and operation capability binding must identify a verified
version before enablement.

## Decision table

| Provider | Official docs status | Publish scope verified | Media upload verified | Status/reconciliation verified | App review known | Private temp media compatible | 24h hold proven | Schema gap | Ready to implement |
|---|---|---|---|---|---|---|---|---|---|
| Facebook | UNVERIFIED | NO | NO | NO | NO | UNKNOWN | NO | UNKNOWN provider delta; internal gaps recorded | NO — BLOCKED |
| Instagram | UNVERIFIED | NO | NO | NO | NO | UNKNOWN | NO | UNKNOWN provider delta; internal gaps recorded | NO — BLOCKED |
| TikTok | UNVERIFIED | NO | NO | NO | NO | UNKNOWN | NO | UNKNOWN provider delta; internal gaps recorded | NO — BLOCKED |
| YouTube | UNVERIFIED | NO | NO | NO | NO | UNKNOWN | NO | UNKNOWN provider delta; internal gaps recorded | NO — BLOCKED |
| LinkedIn | UNVERIFIED | NO | NO | NO | NO | UNKNOWN | NO | UNKNOWN provider delta; internal gaps recorded | NO — BLOCKED |

“NO” under verified/known/proven is an evidence statement, not a negative claim
about provider functionality. Overall readiness: **BLOCKED**.

---

# EXTERNAL EVIDENCE RECOVERY MATRIX — 2026-10-20

All preceding matrices are the preserved ORIGINAL_CODEX_DISCOVERY (all UNKNOWN,
BLOCKED). This is a subsequent EXTERNAL_OFFICIAL_EVIDENCE_RECOVERY layer. Source
IDs EY/EL/ET reference the exact supplied URL ledger in
[requirements](phase-9-provider-publishing-requirements.md). All 12 new retrievals
were CODEX_RETRIEVAL_BLOCKED; none is VERIFIED_OFFICIAL. Capability evidence and
repository implementation readiness are deliberately separate.

## Content capability evidence

| Provider / scope | TEXT | LINK | SINGLE_IMAGE | MULTI_IMAGE / CAROUSEL | VIDEO | SHORT / REEL | STORY | DOCUMENT | Custom thumbnail |
|---|---|---|---|---|---|---|---|---|---|
| YouTube | NOT_APPLICABLE | UNKNOWN | NOT_APPLICABLE | UNKNOWN | SUPPORTED_BY_EVIDENCE EY1 | UNKNOWN | UNKNOWN | UNKNOWN | SUPPORTED_BY_EVIDENCE EY3 |
| LinkedIn organization | SUPPORTED_BY_EVIDENCE EL1 | UNKNOWN | SUPPORTED_BY_EVIDENCE EL1/EL2 | SUPPORTED_BY_EVIDENCE EL1 (multi-image) | SUPPORTED_BY_EVIDENCE EL1/EL4 | UNKNOWN | UNKNOWN | SUPPORTED_BY_EVIDENCE EL1/EL3 | UNKNOWN |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | SUPPORTED_BY_EVIDENCE ET1/ET2 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

YouTube NOT_APPLICABLE refers to the proposed video-upload API slice, not a claim
about every YouTube product. Distinct Shorts endpoint remains UNKNOWN. LinkedIn
multi-image evidence does not establish a separate carousel-specific endpoint,
ordering contract or document-carousel equivalence. LinkedIn member publishing is
OUT OF INITIAL SCOPE. TikTok photo publishing with private binary upload is UNKNOWN
and remains disabled. Public TikTok production eligibility before audit is NOT
ESTABLISHED. Evidence of a provider capability never enables it in this repository.

## Media transport evidence

“Evidenced” below means EXTERNAL_OFFICIAL_EVIDENCE, not complete wire-contract
verification. Numeric limits, exact hosts, expiry, redirect rules and upload content
types remain UNKNOWN unless separately stated. No public-URL fallback is proposed.

| Provider / candidate | Binary direct | Multipart | Resumable | Chunked | URL-pull required? | Public local-media URL required? | Provider session/upload URL | Asset/container identity |
|---|---|---|---|---|---|---|---|---|
| YouTube video | Evidenced EY1/EY2 | UNKNOWN | Evidenced EY2 | UNKNOWN exact chunk contract | NO for evidenced direct path | NO for evidenced direct path | Session URI evidenced EY2 | Video resource exists EY3; exact ID contract UNKNOWN |
| LinkedIn organization text first slice | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NO for text-only | NO for text-only | NOT_APPLICABLE | Exact post ID/response UNKNOWN |
| LinkedIn image | Evidenced EL2 | UNKNOWN | UNKNOWN | UNKNOWN | NO for evidenced binary path | NO for evidenced binary path | Initialized upload URL EL2 | Image identity/URN EL2 |
| LinkedIn document | Evidenced initialization EL3; exact transfer contract UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN exact document flow | UNKNOWN exact document flow | Temporary capability URL EL3 | Document identity EL3 |
| LinkedIn video | Upload evidenced EL4; exact transfer contract UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN exact video flow | UNKNOWN exact video flow | Exact video URL contract UNKNOWN | Exact video identity contract UNKNOWN |
| TikTok video | FILE_UPLOAD ET1/ET3 | UNKNOWN | UNKNOWN safe restart continuation | Evidenced ET3; values UNKNOWN | NO for FILE_UPLOAD | NO for FILE_UPLOAD | Provider upload URL/session ET3 | publish_id ET4 |
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

Existing URL-pull-disabled policy is compatible at the evidenced transport level
with YouTube direct upload, LinkedIn text/image binary and TikTok video FILE_UPLOAD.
That does not establish current code implements any of those paths.

| Provider | Local media can remain private during evidenced transfer? | Later local re-fetch | Complete durable byte acceptance proof | Local release before publication | 24h hold formally sufficient |
|---|---|---|---|---|---|
| YouTube video | YES in principle, direct upload | UNKNOWN | UNKNOWN exact protocol evidence | UNKNOWN | UNKNOWN |
| LinkedIn text | NOT_APPLICABLE, no media | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE for text; UNKNOWN for media |
| LinkedIn image/media | Image binary: YES in principle; other details partial | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| TikTok video | YES in principle, FILE_UPLOAD | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

No hold was extended. Provider processing may be asynchronous without the local
bytes being required throughout, but the supplied evidence does not prove the exact
safe deletion point or that 24 hours suffices. Text-only needs no media hold.

## State-machine and recovery evidence

CREATED and DISPATCHING remain local admission/claim states. Exact remote evidence
must distinguish upload initiation from accepted publication, processing and final
publication; no new state or implicit resume-in-status behavior is proposed.

| Provider | ACCEPTED proof | PROCESSING proof | PUBLISHED proof | FAILED proof | UNKNOWN reconciliation |
|---|---|---|---|---|---|
| YouTube | Session URI identifies upload session, NOT proven acceptance of complete publish; exact condition UNKNOWN | Exact status fields/values UNKNOWN | Existing video resource alone insufficient; exact condition UNKNOWN | UNKNOWN exact terminal errors | EY2 permits interrupted transfer reconciliation/resume; exact read-only session query/offset and video-status mapping UNKNOWN |
| LinkedIn | Upload asset identity EL2/EL3 is not proof of post acceptance; post ack UNKNOWN | Media/post status semantics UNKNOWN | UNKNOWN | UNKNOWN | Known asset/post identity may help; no complete post lookup or lost-create response contract supplied |
| TikTok | publish_id ET4 identifies process; exact accepted transition UNKNOWN | ET4 processing class evidenced; exact literal/mapping UNKNOWN | ET4 success class evidenced, but exact final publication proof UNKNOWN | ET4 failure class evidenced; exact terminal enum UNKNOWN | Status via publish_id evidenced ET4, exact request/response and lost-init handling UNKNOWN |
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

The seven existing states are conceptually useful, but exact provider compatibility
is PARTIALLY_VERIFIED only at the supplied-evidence level. No provider is proven
fully mappable. Session offset observation, byte continuation and post redispatch
are distinct operations. Existing status() must stay read-only.

| Provider | Operation/session identity evidenced | Status/continuation evidence | Native idempotency | Create/post ambiguity risk | Risk classification |
|---|---|---|---|---|---|
| YouTube | Resumable session URI EY2; existing video EY3 | Interrupted transfer reconciled/resumed EY2; final publish details UNKNOWN | UNKNOWN | No duplicate guarantee established; no new session on ambiguous final response | UNKNOWN |
| LinkedIn | Image/document asset identity EL2/EL3 | Upload and post are separate EL4; post reconciliation UNKNOWN | UNKNOWN | Do not confuse successful upload with safe repeated post-create | UNKNOWN |
| TikTok | publish_id ET4, upload session ET3 | Async status ET4; exact continuation UNKNOWN | UNKNOWN | publish_id lookup can reduce risk, not prove safe re-init/redispatch | UNKNOWN |
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

No generic retry. Resumable continuation is considered only under verified offset/
session semantics; provider-documented safe retry must be distinguished from it.
No polling frequency, worker, scheduler, webhook endpoint or numeric timeout chosen.
LinkedIn versioning and Rest.li requirements are evidenced, exact values UNKNOWN;
other version policies remain UNKNOWN. All webhook requirements remain UNKNOWN.

# Repository Compatibility Matrix — 2026-10-20

| Provider | Scope representation | Destination representation | Options / content gap | Connection gap | Persistent state gap | Implementation readiness |
|---|---|---|---|---|---|---|
| YouTube | youtube.upload relevant EY1; exact complete scope set UNKNOWN | YOUTUBE_CHANNEL exists; discovery authority UNKNOWN | Title/description/tags exist; privacy/category/made-for-kids absent; hashtag rule unapproved | Access/refresh/expiry/reauth fields exist; real token contract UNKNOWN | Secret resumable-session URI/progress has no checkpoint store; normalized video ID candidate exists | READY_FOR_DESIGN |
| LinkedIn organization | w_organization_social fits JSON/validation EL1 | LINKEDIN_ORGANIZATION; bounded colon URN fits conditionally | caption/hashtags exist; org/type/version/visibility and mapping need policy; document MIME unsupported | Eligible member role not checked by an official adapter; refresh/lifetime UNKNOWN | Text has no demonstrated new-column need; media URLs ephemeral possible, durable asset/substep state unresolved | READY_FOR_DESIGN |
| TikTok video | video.publish relevant ET1; complete scope set UNKNOWN | TIKTOK_ACCOUNT exists; creator validation UNKNOWN | Privacy/interaction/disclosure options absent; hashtag rule unapproved | Access/refresh/expiry/reauth representation exists; actual token contract UNKNOWN | publish_id candidate fits only after grammar check; secret URL/progress persistence unresolved | READY_FOR_DESIGN |
| Facebook | UNKNOWN | PAGE exists internally | Normative mapping UNKNOWN | Normative contract UNKNOWN | UNKNOWN | BLOCKED_ON_OFFICIAL_EVIDENCE |
| Instagram | UNKNOWN | INSTAGRAM_PROFESSIONAL exists internally | Normative mapping UNKNOWN | Normative contract UNKNOWN | UNKNOWN | BLOCKED_ON_OFFICIAL_EVIDENCE |

Provider IDs in events are safe-format, max 256 bytes; upload URLs must not be put
there. Snapshot options storage exists but code always writes an empty object.
All real publishing registration remains test-only/disabled. UNKNOWN can lose the
latest remote reference; reconciliation after credential rotation has a frozen-
version boundary. See requirements for the exact read-only code findings.

Overall migration classification: SCHEMA_DECISION_BLOCKED; no 0012 authorized.
Stateless shared primitives require no migration; narrow text has no proven storage
gap. These are distinct from proving an entire real provider ready.
Overall readiness: **PARTIALLY_UNBLOCKED_FOR_DESIGN**. None is
READY_FOR_NARROW_IMPLEMENTATION; none has been enabled.
