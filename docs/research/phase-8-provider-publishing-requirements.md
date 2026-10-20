# Phase 8 provider publishing discovery — blocked official-source access

Date: 2026-10-17. Baseline: `8326ae185ae48a4fc131dd02bbb9940ecb315334`.
Discovery only. No adapter, API experiment, remote upload or post is authorized.

## Evidence classification

- **VERIFIED FROM OFFICIAL DOCS:** no new publishing requirement. No documentation body was retrieved in this discovery.
- **INFERRED:** internal architecture recommendations in `../review/phase-8.md`; these are proposals, not provider protocol facts.
- **UNKNOWN:** every exact publishing protocol, limit, scope, approval and production capability listed below until current official evidence is reviewed.
- **Verified repository fact:** Phase 7 production provider registry is empty (`src/server/social/provider.ts`). This is independent of official-document verification.

On 2026-10-17 at 10:19 UTC, 18 public official documentation URLs were requested once each using credential-free HTTPS GET, normal TLS verification, a 20-second request bound and a bounded response read. All 18 failed before retrieval with:

```text
<urlopen error Tunnel connection failed: 403 Forbidden>
```

Classification: **ENVIRONMENT / RESEARCH-ACCESS LIMITATION**. This is not a provider API response, provider rejection, OAuth incompatibility or application defect. Even the current availability of these candidate documentation paths was not established. No unofficial substitute, cached memory, guessed endpoint, scope or version is normative evidence. No authentication or publishing API was called. No credentials were used. Temporary access records outside the checkout are not commit candidates.

The prior Phase 7 research record remains untouched. Its independently supplied TikTok Login Kit and Google OAuth summaries concern authorization, not complete publishing contracts. They do not verify Direct Post, upload or publication semantics.

## Official sources attempted

Each row: access attempted 2026-10-17, result **proxy tunnel 403; no body**.

| ID | Provider | Official documentation target |
|---|---|---|
| F1 | Facebook | https://developers.facebook.com/docs/pages-api/posts/ |
| F2 | Facebook | https://developers.facebook.com/docs/pages-api/getting-started/ |
| I1 | Instagram | https://developers.facebook.com/docs/instagram-platform/content-publishing/ |
| I2 | Instagram | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/ |
| T1 | TikTok | https://developers.tiktok.com/doc/content-posting-api-get-started/ |
| T2 | TikTok | https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/ |
| T3 | TikTok | https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info/ |
| T4 | TikTok | https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status/ |
| T5 | TikTok | https://developers.tiktok.com/doc/content-sharing-guidelines/ |
| Y1 | YouTube | https://developers.google.com/youtube/v3/docs/videos/insert |
| Y2 | YouTube | https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol |
| Y3 | YouTube | https://developers.google.com/youtube/v3/docs/videos |
| Y4 | YouTube | https://developers.google.com/youtube/v3/determine_quota_cost |
| L1 | LinkedIn | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api |
| L2 | LinkedIn | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api |
| L3 | LinkedIn | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api |
| L4 | LinkedIn | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role |
| L5 | LinkedIn | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin |

## Facebook Pages — UNKNOWN, DISABLED / UNVERIFIED

F1/F2 are research targets, not reviewed specifications. The following must be resolved from their current content and official linked references:

| Requirement | Current finding |
|---|---|
| Product, API version, endpoints | UNKNOWN: exact currently supported Pages publishing product/version and create/read/status endpoints |
| Scopes, account and token | UNKNOWN: least required granted permissions, Page role/task authority, Page versus user token, discovery identity and token lifetime/revocation consequences |
| Content types | UNKNOWN: text-only, image, video, multi-image/carousel availability and restrictions |
| Upload and media | UNKNOWN: direct binary versus remote URL, staged media flow, byte/MIME/dimension/duration/count bounds |
| Publication semantics | UNKNOWN: drafts versus published state, returned IDs, processing, successful publication proof |
| Limits | UNKNOWN: text bounds, quotas, per-app/Page/user rates and safe rate-limit mapping |
| Review and test eligibility | UNKNOWN: app review, advanced access, business verification, live/development modes, test users/Pages |
| Duplicates and recovery | UNKNOWN: native idempotency, accepted-but-lost-response reconciliation, error codes and lookup support |

No Graph API version, access-token product or scope string is selected by this report.

## Instagram professional accounts — UNKNOWN, DISABLED / UNVERIFIED

I1/I2 identify candidate official documentation branches. Neither login branch is selected without review.

| Requirement | Current finding |
|---|---|
| Eligibility and authorization | UNKNOWN: business/creator/professional eligibility, chosen login product, Page relationship, exact granted scopes and token model |
| Product/version/endpoints | UNKNOWN: current container creation, status and publish endpoints and required version |
| Content types | UNKNOWN: image, Reels/video, carousel types/counts, caption and hashtag constraints |
| Upload/media | UNKNOWN: URL accessibility/ownership, direct upload availability, codecs, bytes, dimensions, aspect ratios, duration |
| Processing/publication | UNKNOWN: container readiness, status queries, expiration, publication proof and remote identifiers |
| Limits/review | UNKNOWN: publishing windows/quotas/rates, app/business review, account verification and development restrictions |
| Duplicate/error recovery | UNKNOWN: idempotency, container reuse, lost publish responses, safe lookup/reconciliation |

A Facebook authorization must not imply an Instagram publishing capability. URL-pull support is not assumed proven.

## TikTok — UNKNOWN, DISABLED / UNVERIFIED

T1–T5 are candidate official sources. Phase 7's supplied Login Kit evidence does not establish Content Posting eligibility.

| Requirement | Current finding |
|---|---|
| Product and authority | UNKNOWN: exact Direct Post versus upload-to-inbox product, scopes, token/account eligibility and current endpoints |
| App approval | UNKNOWN: audit/review, unaudited-client privacy/account restrictions and production eligibility |
| Human interaction | UNKNOWN: creator-info requirements, allowed privacy choices, consent, commercial disclosures, music and content restrictions, prohibited automation |
| Media | UNKNOWN: image/video support, file upload versus verified-domain URL pull, byte/count/dimension/duration/codec limits |
| Status and results | UNKNOWN: publish/processing IDs, status vocabulary, polling bounds, definitive publication proof and error model |
| Limits and duplicates | UNKNOWN: app/creator rate limits, caps, native idempotency and ambiguous-outcome reconciliation |

No defaults for privacy, commercial disclosure or creator consent are invented. If the present revision contract cannot represent required human choices, that capability remains blocked pending a separately reviewed schema/UI contract.

## Google / YouTube — UNKNOWN, DISABLED / UNVERIFIED

Y1–Y4 are candidate official sources. The previously supplied official OAuth summary includes `youtube.upload` among Google's scopes, but this discovery did not retrieve or verify the exact least-privilege upload contract.

| Requirement | Current finding |
|---|---|
| Authorization | UNKNOWN: exact upload scope set, channel authority, token flow, offline access and verification requirements for this implementation |
| Product/version/endpoints | UNKNOWN: current videos.insert contract, resumable initialization/upload/status endpoints and version details |
| Media and metadata | UNKNOWN: media bounds, title/description/tag/category/privacy rules, mandatory user choices, Shorts classification |
| Processing | UNKNOWN: upload accepted versus processed versus publicly available, response video ID, status checks and failure states |
| Quotas | UNKNOWN: current upload quota cost, daily allocations, per-user/rate limits and additional audit requirements |
| Project restrictions | UNKNOWN: unverified-project/private-only rules, consent-screen and YouTube API compliance review |
| Resume and ambiguity | UNKNOWN: documented resumable offset/status behavior, session URL handling, expiration, safe recovery and idempotency |

No quota number, upload size, privacy default or permissive retry policy is asserted from memory. A resumable session URL may be a credential-bearing capability: it must not be treated as a safe public remote ID.

## LinkedIn — UNKNOWN, DISABLED / UNVERIFIED

L1–L5 are candidate official sources; neither member nor organization production posting is approved.

| Requirement | Current finding |
|---|---|
| Product/version | UNKNOWN: current Posts API/product, supported version/date headers and required protocol headers |
| Member authority | UNKNOWN: product access, scopes, identity and content eligibility for member posting |
| Organization authority | UNKNOWN: product approval, scopes, organization-admin role/task verification and discovery |
| Content/media | UNKNOWN: text, image, video support, asset initialization/upload, processing, size/count/dimension/duration limits |
| Create/result | UNKNOWN: post creation contract, visibility/audience rules, publication IDs and definitive success semantics |
| Limits/review | UNKNOWN: per-app/member/organization limits, development access, review and verification |
| Errors/duplicates | UNKNOWN: idempotency, accepted-but-lost-response lookup, processing reconciliation and safe error mapping |

The existing Phase 7 destination model supports LINKEDIN_ORGANIZATION only. Member posting is a separate unresolved product/object-scope gate; it cannot be enabled through an organization destination or guessed legacy endpoint.

## Readiness matrix and evidence needed

| Capability | Protocol documented in this discovery | App/dashboard verified | Production verified | Adapter |
|---|---|---|---|---|
| Facebook Page publishing | NO | NO | NO | DISABLED / UNVERIFIED |
| Instagram professional publishing | NO | NO | NO | DISABLED / UNVERIFIED |
| TikTok Direct Post / upload-only | NO | NO | NO | DISABLED / UNVERIFIED |
| YouTube upload/publication | NO | NO | NO | DISABLED / UNVERIFIED |
| LinkedIn organization publishing | NO | NO | NO | DISABLED / UNVERIFIED |
| LinkedIn member publishing | NO; also outside current destination kind | NO | NO | NOT APPROVED / DISABLED |

Follow-up: obtain read-only access to the four official documentation hosts or current authoritative extracts with source/date/version for review. Record exact quotations/sections supporting every protocol decision, then review developer dashboard eligibility separately. Do not replace an unknown network allowlist, disable TLS, acquire credentials in chat or create remote content to investigate. Documentation verification alone does not prove real app configuration or production operation. Hostinger remains UNVERIFIED.

Internal fake-provider work is a separate later implementation authorization, not an automatic consequence of this access limitation. No provider publishing contract has been frozen here.
