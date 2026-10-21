# Phase 9 — provider security and deployment review

Date: 2026-10-20. Baseline: `4b9853a610811205e4d439082ffe20671dae5759`.
Design only. No provider HTTP client, webhook, upload or adapter was implemented.
Official requirements are UNKNOWN because all documentation fetches failed before
retrieval; [requirements and source ledger](phase-9-provider-publishing-requirements.md).
Current controls below are repository facts, not evidence of a working real integration.

## Threat review

| Threat | Current control | Gap | Phase 9 requirement proposal |
|---|---|---|---|
| Access-token leakage | Server-only encrypted social credentials, SensitiveValue, safe DTOs | Real adapter HTTP serialization not implemented | Credential broker exposes transient token only to approved host request; never DTO/log/error |
| Refresh-token leakage | Separate encrypted purpose/AAD; bounded refresh lease and version | Real refresh protocol not verified | Keep broker server-only, rotate atomically, fail closed on ambiguity; no generic retry |
| Upload URL leakage | No real upload URL exists; safe event IDs disallow arbitrary query URLs | Dynamic URL handling absent | Treat signed URL as credential; transient use, no logs or ordinary event persistence |
| Presigned URL leakage | Private storage, URL pull disabled | Provider-designated capability URLs unknown | Do not create public/presigned local-media URLs; provider session capability requires secret handling |
| SSRF | Empty production registries, no arbitrary provider HTTP path enabled | Real HTTP transport absent | Fixed verified hosts, HTTPS, validate DNS/address and destination at connect, reject private/link-local/metadata ranges |
| Malicious redirect/Location | No real redirect-following upload implemented | Provider redirect semantics unknown | Reject redirects by default; independently verify each required hop/host; never forward Authorization cross-origin |
| Provider response injection | Closed normalized result schema, UI uses safe projections | Raw external parser absent | Bound bytes/depth/count/types, validate before normalize; no raw HTML/provider message reflection |
| Oversized provider response | Adapter result is schema constrained | A schema does not cap bytes before parsing | Stream/read byte ceiling before parsing, timeout and abort; no unbounded body buffering |
| Provider metadata poisoning | Strict grant/destination/result schemas, identity binding | Real metadata mapping/version rules unverified | Closed fields/enums, no prototype keys or arbitrary metadata bags; display text never authority |
| Webhook spoofing | No webhook endpoint | Need, signatures and algorithms UNKNOWN | Do not add endpoint until official signature verification and constant-time rules verified |
| Replay | OAuth state claim, single-use recent-auth, local publish identity | Remote event/webhook identities unknown | Verify provider event ID/time window and operation binding; durable dedupe only if required and reviewed |
| Duplicate publish | Unique revision/destination operation, claimed dispatch, UNKNOWN no resend | Native idempotency and lost-response lookup unknown | Never retry create/finalize blindly; retain safe acknowledgement identity and reconcile read-only |
| Confused deputy | Live content.publish + object/workspace checks, bound destination/version | Real token/destination relationship not implemented | Broker authorizes exact snapshot destination/provider/authorization; cannot accept caller-selected endpoint/token |
| Cross-workspace destination use | Canonical brand, composite FKs, active destination authorization checks | No real external ownership verification | Confirm remote ownership through documented product roles; never trust possession of remote ID |
| Revoked token use | Disconnect deletes credentials, disables destinations; live status/version checks | Remote revocation/refresh timing unverified | Revalidate before side effect and reject stale authorization; no restoration on failed revocation |
| Stale scope use | Granted scopes separately stored; exact requiredScopes gate | Real scope registry unknown | Least verified scopes, current consent check, reauth when needed; no implied permission |
| Destination substitution | Snapshot freezes remote destination and authorization; input kind checked | External identity syntax/lookup unknown | Bind returned IDs to expected remote destination; reject mismatch, do not auto-select another |
| Media substitution | Immutable descriptors, SHA-256/size checked before claim | Adapter has descriptors, no scoped byte reader | Stream only matching private bytes; bind each upload to ordered immutable asset/hash, no user URL fallback |
| Publish after approval mutation | Latest approved revision/decision and intent hash rechecked; immutable snapshot | Provider settings/transformation mapping absent | Capture all significant choices before approval/intent confirmation; never regenerate copy |
| Wrong-operation reconciliation | Workspace ID, snapshot, version/CAS, safe references | UNKNOWN loses latest refs; provider ID lookup contract unknown | Query only evidenced original operation/destination; recover earlier safe reference under reviewed design, never redispatch |
| Credential-bearing logs | Generic safe errors, normalized audit fields | HTTP and deployment access logs not yet reviewed | Closed log allowlist, suppress query/header/body/redirect/session URL values at all layers |

## Outbound network policy proposal

No host allowlist can be marked verified from the failed documentation targets:
a documentation domain is not automatically an API or upload hostname.
Before implementation record official API origins, upload origins, version paths
and credential audience per provider/content type. Fail closed for unknown origins.

- HTTPS only with normal TLS validation; reject userinfo, fragments, nonstandard
  ports, IP-literal/private destinations and noncanonical authority ambiguity.
- Exact official host allowlist; no broad `*.provider-domain` rule without official
  delegated-host evidence and security review. Validate DNS and the connected peer,
  including rebinding risks, without disabling TLS hostname verification.
- Fixed API path construction and bounded encoded identifiers. Never concatenate
  untrusted URL/redirect content into a privileged endpoint.
- Redirects disabled by default. If documented flow requires them, validate each
  hop independently with bounded count and explicit credential audience handling.
- Separate control JSON and upload streaming paths; closed methods, content types,
  max response bytes, parser bounds and abort propagation. Provider-documented
  limits must determine numeric bounds. Keep current local 30-second dispatch
  bound until separately reviewed; do not hide timeout ambiguity.
- Request timeout after possible external acceptance means UNKNOWN, not proof of
  failure. Cancellation cannot prove the remote side effect was canceled.
- Private byte streaming avoids a public media URL; no public fallback when upload
  is unavailable. No generic automatic retry, queue, worker or scheduler design.

## Provider-supplied upload URLs

| Provider | Dynamic URLs / host rules | Expiry / embedded signatures | Redirect rules | Persist URL? | SSRF disposition |
|---|---|---|---|---|---|
| Facebook | UNKNOWN | UNKNOWN | UNKNOWN | No by default | Reject until officially verified |
| Instagram | UNKNOWN | UNKNOWN | UNKNOWN | No by default | Reject until officially verified |
| TikTok | UNKNOWN | UNKNOWN | UNKNOWN | No by default | Reject until officially verified |
| YouTube | UNKNOWN | UNKNOWN | UNKNOWN | No by default | Reject until officially verified |
| LinkedIn | UNKNOWN | UNKNOWN | UNKNOWN | No by default | Reject until officially verified |

If a documented provider returns a URL, validate it as untrusted data even over
authenticated HTTPS. Bind its use to the initiating operation, destination and
media hash, bound its lifetime, prevent arbitrary host/header injection, and redact
query/path capability material. Never persist it as remote_publication_id or
remote_processing_id. If resumable recovery requires persistence, separately review
an encrypted bounded checkpoint and deletion on completion/expiry; no such storage
is introduced now. Unknown host rules block that upload method.

## Retention and logging proposal

| Data | Minimum purpose | Retention rule / current gap |
|---|---|---|
| Provider operation/content ID | Read-only reconciliation and audit | Safe normalized ID bound to snapshot; preserve history while required by approved retention policy; duration not yet set |
| State/timestamps/error code | Operational history | Existing append-only events; closed codes, no body; retention duration requires policy |
| Destination ID and capability/API version | Identity and reproducibility | Immutable snapshot; existing capability_ref can bind reviewed version |
| Access/refresh token | Authorized server call | Existing encrypted store only; transient plaintext; revoke/expiry lifecycle, no duplicate event storage |
| Upload/session URL | Single bounded transfer/recovery if proven necessary | Transient by default; encrypted TTL only under separately approved necessity, delete at completion/expiry |
| Media bytes | Exact approved publish | Existing max 24h nonrenewable purpose-bound hold; never permanent DAM |
| Raw provider body/profile/metadata | No default need | Do not retain; parse bounded input then discard; do not put in audit/errors |

Safe log allowlist proposal: fixed event kind, internal opaque operation ID,
provider enum, verified capability/version ref, normalized state/error category,
coarse duration/byte-count bounds, safe HTTP status and stage. IDs should use
existing safe internal projections; avoid personal profile details. Raw provider
request IDs require an explicit safe-format policy, not arbitrary copying.
Never log token, refresh token, OAuth code/state, Authorization, cookie, password,
MFA, signed upload URL, webhook secret, raw provider response, headers or bodies.
Apply the same rule to proxy/access/trace logs, not just application logger.

## Hostinger analysis — no deployment performed

These are common potential adapter requirements to investigate, not verified
requirements of every provider. Official provider workflows and hosting limits
remain unavailable/unverified. All five providers inherit this matrix; no adapter
can be declared hosting-compatible yet.

| Requirement | Classification | Evidence / next gate |
|---|---|---|
| Long request / upload duration | POTENTIAL_BLOCKER | Internal dispatch capped at 30 seconds; provider/hosting allowed duration UNKNOWN |
| Large buffering / memory | POTENTIAL_BLOCKER | Current asset caps exist; hosting memory and adapter upload buffering UNKNOWN; require bounded streaming design |
| Streaming outbound bytes | UNKNOWN | Not verified on target hosting; native HTTPS availability alone is insufficient |
| Temporary private disk | UNKNOWN | LocalPrivateMediaStorage exists; hosting quotas, privacy, persistence, cleanup and restart behavior not verified |
| Request duration / body limits | UNKNOWN | No authoritative deployment verification; measure only under future authorization |
| Outbound HTTPS / TLS | UNKNOWN | This research environment cannot establish Hostinger outbound connectivity |
| Resumable / chunked transfer | UNKNOWN | Both required provider semantics and hosting behavior need verification |
| Webhook reachability | UNKNOWN | Need and official signatures unknown; public HTTPS/reverse proxy checks outstanding |
| Background processing | POTENTIAL_BLOCKER | No permanent worker allowed; provider async status must fit an explicitly approved request-driven design |
| Scheduled polling | POTENTIAL_BLOCKER | Scheduling is outside discovery scope; do not add cron to compensate |
| Permanent worker requirement | POTENTIAL_BLOCKER | Would conflict with locked target; no provider proven to require it |
| Restricted MySQL grants | UNKNOWN | Repository narrow grants verified historically; hosting grant support unverified |

Overall Hostinger: **UNVERIFIED**. No Redis, root, Docker, systemd, worker or new
hosting requirement was introduced. No scheduling/analytics/AI work was designed.

## Required product decisions before an adapter

- Select one evidence-verified platform/content type and official test mechanism;
  app review and real-world verification are separate gates from documentation.
- Approve deterministic copy/hashtag field mapping; reject anything requiring silent
  semantic transformation. No automatic hashtag concatenation.
- YouTube: requiredness of privacy/category/made-for-kids and all metadata must be
  verified; current title/description/tags alone cannot express those decisions.
- TikTok: verify privacy/interactions/commercial/branded disclosures and when human
  choices must be bound to approved content; no invented defaults.
- Meta: confirm destination/login architecture, content type and order; Instagram
  URL retrieval cannot silently override disabled URL-pull policy.
- LinkedIn: prioritize organization-only V1; do not expand to member posting by
  reusing an organization destination.
- Decide safe checkpoint/reference retention and handling of credential rotation
  for long-running status, within immutable approval and no-redispatch rules.

All proposals require separate implementation authorization. No security control
was relaxed to bypass unavailable official evidence.

---

# EXTERNAL_OFFICIAL_EVIDENCE_RECOVERY — security reconciliation, 2026-10-20

The preceding ORIGINAL_CODEX_DISCOVERY security review is preserved. The new
normative evidence is EXTERNAL_OFFICIAL_EVIDENCE, not VERIFIED_OFFICIAL: all 12
supplied official URLs remain CODEX_RETRIEVAL_BLOCKED. Evidence IDs point to the
requirements ledger. Proposed controls are project security design, not invented
provider protocol rules or implementation authorization.

## Recovered threats and concrete control gaps

| Threat | Evidence | Current control | Gap | Future requirement |
|---|---|---|---|---|
| Resumable session URI disclosure | EY2 returns session URI | SensitiveValue/redacted DTO pattern; safe event IDs | No secret checkpoint or adapter HTTP boundary | Treat URI as SENSITIVE_CAPABILITY, no logs/browser/raw errors; encrypt if persisted, bind session to intent |
| Provider upload URL leakage | EL2/EL3 and ET3 return upload destinations, EL3/ET3 temporary capability character | Private local media, no URL-pull enabled | No dynamic upload URL policy/client | Ephemeral by default, no public-safe ID storage, TTL and operation-bound use |
| Arbitrary upload-host SSRF | EY2, EL2/EL3, ET3 provide URLs rather than trusted static endpoint input | Production registries empty; AI client uses fixed endpoint | No verified upload host families; static API-only allowlist cannot establish returned URL safety | PARTIALLY_BLOCKED: recover exact official upload authority rules; HTTPS and host/DNS/peer checks, deny unknown URLs |
| Redirect credential exfiltration | Dynamic upload/session URLs from 3 providers; actual redirect requirement UNKNOWN | Existing AI client uses redirect:error | No publishing redirect policy implemented | Default reject; permit only independently evidenced bounded hops, validate every authority, never forward credentials cross-audience |
| Session replay / wrong byte stream | EY2 session and ET3 upload session | Immutable asset hash/size and one dispatch claim | No remote session-to-asset binding | Bind provider/workspace/destination/authorization/operation/intent/asset hash/order to session; prevent local concurrent continuation; provider replay guarantees UNKNOWN |
| Operation/destination confusion | EL1 org role + EL2 assets; ET1 creator + ET4 publish_id | Canonical brand, destination composite FKs, version checks | External role/creator/session ownership verification absent | Authenticate exact authorized destination at publish; verify response identities and later lookups against original binding |
| Cross-workspace capability reuse | All three multi-step flows | Canonical brand and immutable snapshot | Upload URI itself carries no trusted local workspace context | Capability broker requires original workspace/operation and live authority, never arbitrary URL argument |
| Refresh-token leakage / stale continuation | Existing optional refresh, provider refresh requirements UNKNOWN | AES-GCM/AAD, refresh lease, subject/version rotation | Native refresh semantics unverified; rotation changes version used by publishing status | Keep exchange provider-specific, never widen reader; explicitly review continuation after rotation; no generic refresh/retry loop |
| publish_id swapped or lost after ambiguity | ET4 status lookup | Existing safe processing ID/event CAS | Exact format unknown; UNKNOWN writes null IDs and latest-event lookup loses prior refs | Verify safe format/ownership, preserve or recover original reference under approved design; no re-init to recover missing ID |
| Asset URN treated as successful post | EL2/EL3 asset then EL1 post; EL4 distinct steps | Closed normalized result schema | No substep identity contract | Separate uploaded asset from published content; asset receipt must not become PUBLISHED; strict identity role/type |
| Version drift | EL1 API/Rest.li version requirements | Immutable capability_ref, no real adapter | Exact header/version values unavailable | Pin verified rules/version in registry bound to snapshot; check sunsets, no automatic version advancement |
| Raw response or error leakage | Each evidenced flow returns metadata/URLs | Closed result schema, generic safe errors | No external bounded parser/error mapper | Closed safe error/log fields; bound before parsing; no URL/token/header/body/snippet fallback |

## Current HTTP architecture inspected read-only

`src/server/ai/provider.ts` already demonstrates a fixed endpoint, redirect:error,
server-only credential use and a bounded streaming JSON reader. It is OpenRouter-
specific; neither its endpoint, response schema nor numeric bounds define social
uploads. No AI code is moved, modified or generalized in this cycle.
`src/server/social/provider.ts` supplies an abort deadline abstraction but no real
HTTP client. `src/server/publishing/provider.ts` supplies bounded test-provider calls
and normalized results; no canonical-host, dynamic-upload validator, byte-stream
capability or credential broker is implemented. Empty production registries are a
fail-closed boundary, not proof those missing controls exist.

## Future upload URL policy — PARTIALLY_BLOCKED

The supplied evidence proves dynamic destinations exist; it supplies **no exact
upload-host family**, allowed redirect, expiry or credential-audience rules.
Official documentation hostnames must never be used as guessed API/upload allowlists.
No new API or CDN domains are invented here.

Future design must establish:

- HTTPS only with canonical parsing; reject userinfo, ambiguous authority/encoding,
  unexpected ports/fragments and arbitrary user-supplied URLs. A required signed
  query is secret, not stripped before use or copied to logs.
- Provider- and purpose-specific verified API/upload authority rules. Static API
  hosts alone are insufficient for dynamic destinations; broad suffix wildcarding
  is not accepted without official delegation evidence and review.
- DNS/IP and connection strategy that rejects private/link-local/loopback/metadata
  endpoints and rebinding, preserves TLS hostname validation, and handles legitimate
  official upload hosts only after verification. Exact connector design remains open.
- Redirect rejection by default; exact verified exception policy before enabling any
  flow that requires redirect. Bound every hop; do not send bearer credentials to
  signed capability hosts unless the documented credential audience requires it.
- Strict operation/brand/destination/authorization/intent/asset binding, ordered media,
  single local owner and CAS progress; no reusable generic SSRF fetch service.
- Request body sizes tied to approved media descriptors; response bytes/depth/count
  bounded before parse; allowed content types and encoding established per protocol.
  Do not reuse small JSON body limits for a video upload or unbounded streaming.
- URL lifetime from provider expiry where known; otherwise expiry policy is unresolved
  and blocks durable continuation. Prefer in-memory use. Any required persisted URL
  is encrypted as a capability with minimal lifetime and deletion after use/expiry.
- Abort/timeout after possible acceptance preserves UNKNOWN. Do not claim abort
  rolled back remote side effects; no automatic fresh session/post as fallback.

## Phase 9A primitive decision table

“JUSTIFIED_BY_2_PLUS_PROVIDERS” means a shared **design need** demonstrated by at
least two externally evidenced flows. It does not mean two sources were independently
retrieved, complete protocols verified, or production implementation is ready.
Concrete endpoint, schema, timeout and host-policy gaps remain gates. Do not generalize
provider upload protocols merely because their security envelope is shared.

| Primitive | Evidence source providers | Shared vs provider-specific classification | Persistence needed | Sensitive data | Schema impact | Hostinger risk | Justified now |
|---|---|---|---|---|---|---|---|
| Provider HTTP client/security envelope | YouTube EY1/EY2, LinkedIn EL1/EL2, TikTok ET1/ET3 | JUSTIFIED_BY_2_PLUS_PROVIDERS; transport envelope only | NO | Access token, response/capability | None for stateless primitive | Duration/TLS/outbound UNKNOWN | YES for design; exact host/method policies blocked |
| API host validation | Same three API flows | JUSTIFIED_BY_2_PLUS_PROVIDERS; policy data provider-specific | NO | Authorization audience | None | DNS/TLS control UNKNOWN | YES need; exact allowed API origins not supplied |
| Provider-issued upload URL validation | YouTube EY2, LinkedIn EL2/EL3, TikTok ET3 | JUSTIFIED_BY_2_PLUS_PROVIDERS; rules provider-specific | NO for validator | SENSITIVE_CAPABILITY | None | Dynamic host connectivity/DNS UNKNOWN | YES design; PARTIALLY_BLOCKED host evidence |
| Upload streaming | YouTube EY2, LinkedIn EL2, TikTok ET3 | JUSTIFIED_BY_2_PLUS_PROVIDERS; byte-source boundary, not wire protocol | NO inherent | Private approved bytes | None inherent | Buffer/duration/disk POTENTIAL_BLOCKER | YES bounded byte access; chunk protocol remains specific |
| Resumable upload/session handling | YouTube EY2 explicitly resumable; TikTok ET3 chunks do NOT prove resumability | PROVIDER_SPECIFIC for resumable algorithm | YES if restart continuation promised | Session URI + offsets | Checkpoint design unresolved | Duration/restart POTENTIAL_BLOCKER | YouTube-specific design only; universal resume NOT justified |
| Normalized errors | 3 flows plus ET4 processing/failure classes | JUSTIFIED_BY_2_PLUS_PROVIDERS for closed safe envelope; exact error maps NOT_YET_JUSTIFIED | Safe events existing | Raw response may be sensitive | Prefer existing enums; expansion unapproved | UNKNOWN | Safe envelope YES; no guessed status/code mappings |
| Provider operation identity | YouTube EY2, LinkedIn EL2/EL3, TikTok ET4 | JUSTIFIED_BY_2_PLUS_PROVIDERS for typed binding; identities not interchangeable | Safe IDs when needed | URI secret vs normalized IDs | Existing IDs partial; secret store gap | UNKNOWN | YES identity distinction and binding |
| UNKNOWN reconciliation | YouTube EY2, TikTok ET4; LinkedIn post lookup incomplete | JUSTIFIED_BY_2_PLUS_PROVIDERS for non-redispatch orchestration; lookup specific | Original references required for later use | Secret URI or normalized ID | Reference/checkpoint strategy unresolved | Async/request duration POTENTIAL_BLOCKER | YES interface design; exact algorithms incomplete |
| Sensitive URL redaction | YouTube EY2, LinkedIn EL3, TikTok ET3 | JUSTIFIED_BY_2_PLUS_PROVIDERS | NO | Capability URL/path/query | None | Proxy/log configuration UNKNOWN | YES closed safe classification, no raw URL |
| Token refresh | Supplied publishing evidence does not establish any refresh protocol | NOT_YET_JUSTIFIED as new shared mechanism; exchanges PROVIDER_SPECIFIC | Existing encrypted optional refresh | SECRET | No proven new field | UNKNOWN | NO new generic refresh; reuse existing safety lifecycle after protocol review |
| API version pinning | LinkedIn EL1 explicit; others' version-policy evidence incomplete | PROVIDER_SPECIFIC presently | Immutable capability_ref candidate | SAFE_METADATA | No new field demonstrated | UNKNOWN | LinkedIn need YES; cross-provider abstraction NOT_YET_JUSTIFIED |
| Bounded response reader | 3 metadata-returning init/status flows, existing AI pattern | JUSTIFIED_BY_2_PLUS_PROVIDERS for security requirement | NO | May contain URL/token/PII | None | Response buffering POTENTIAL_BLOCKER | YES safe reader, numeric limits require policy |
| Credential-safe request construction | 3 authorized flows | JUSTIFIED_BY_2_PLUS_PROVIDERS; credentials scoped by provider/purpose | Existing credential store | SECRET | No field delta proven | Secret injection UNVERIFIED | YES server-only broker design |
| Cancellation/timeouts | 3 outbound flows with possible ambiguity | JUSTIFIED_BY_2_PLUS_PROVIDERS for bounded policy; not provider numeric recommendation | No inherent | Safe stage/outcome | None inherent | Current 30s dispatch cap POTENTIAL_BLOCKER | YES need; numbers IMPLEMENTATION_POLICY_DECISION_REQUIRED |

Shared primitives may use a narrow server-only transport interface with explicit
provider policy, never arbitrary fetch(URL, headers). Provider-specific initialization,
chunks, offset reconciliation, finalization, role/creator checks, errors and versions
remain in adapter-specific designs. This table does not authorize changes to the
current service, state machine or grant architecture.

## Timeouts, recovery and hosting

Connection, response/header, upload-inactivity and overall bounds need design.
No supplied evidence prescribes numeric values: **IMPLEMENTATION_POLICY_DECISION_REQUIRED**.
Existing Phase 8 bounds remain unchanged; no extension has been approved.
Resumable byte continuation (EY2), documented safe retry (details UNKNOWN), read-only
status (ET4) and blind redispatch are distinct. Blind redispatch remains prohibited;
no generic retry primitive, scheduler or permanent worker is proposed.

| Provider / evidenced need | Hosting classification | Open verification |
|---|---|---|
| YouTube direct/resumable streaming, possible long outbound request | POTENTIAL_BLOCKER | Memory, outbound streaming/duration, session survival and crash-safe encrypted storage; size/time policy unresolved |
| LinkedIn organization text request | UNKNOWN | Official endpoint/version/access plus outbound HTTPS and request limits; no media needed |
| LinkedIn binary image and temporary URL | POTENTIAL_BLOCKER | Upload host connectivity/TLS, streaming buffer limits, URL-safe logs and request duration |
| TikTok chunked FILE_UPLOAD and provider URL | POTENTIAL_BLOCKER | Bounded chunk transfer, upload-host rules, request duration and session failure handling |
| TikTok async status/reconciliation | UNKNOWN | Provider cadence/terminal proof; authorized request-driven status vs future scheduling is separate |
| All credential storage/runtime grants/private disk | UNKNOWN | Hostinger secrets/TLS/grant/private-storage behavior unverified |

Overall Hostinger remains **UNVERIFIED**. No deployment, worker, Redis, Docker,
root/systemd requirement, URL-pull or permanent media storage was introduced.

## Minimal retention additions

Keep existing approved history: safe remote ID, normalized state/time/error and
immutable destination/capability ref. Never retain raw response just to recover
upload state. The purpose, expiry, encryption and mutability of each candidate
checkpoint are detailed in the requirements document. Actual expiry/retention
numbers remain policy gates. Hashes cannot replace a URI needed for resumption.
External normalized IDs are not automatically safe log fields; prefer internal
operation ID + provider + fixed stage/result. Never log full URI, credentials,
Authorization, cookies, callback code/state, raw response/body or arbitrary exception.
