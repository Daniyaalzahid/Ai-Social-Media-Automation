# Phase 3 — structured Brand Brain

One internal operational brand, Bismillah Electronics. No multi-tenant billing, AI calls/prompts, scraping, uploads, OAuth, publishing, scheduling or analytics expansion. The Phase 3 request and approved permission decision supersede older Phase 2D scope instructions.

## Schema and migration

0006 adds brands plus fourteen relational child tables: brand_contacts, brand_locations, brand_language, brand_voice, brand_platforms, brand_ctas, brand_claims, brand_facts, brand_wording, brand_hashtags, brand_emoji, brand_categories, brand_seasons, brand_examples. Important fields are columns/enums; JSON is confined to bounded homogeneous lists (language/tone/hashtags/emoji/selling points/prohibited claim categories). A unique slot constrained to 1 prevents multiple operational brands. Same-brand composite restrictive foreign keys bind contact, CTA and category references. Hard deletion is unavailable through the application; reusable entries deactivate and remain editable. Total row limits include inactive entries: reuse existing entries after reaching a cap.

Profile remains active/approved; it cannot be deleted/deactivated or silently switch identity. Missing information is an empty string or absent configuration. Initial approved facts are only name, HTTPS website, Pakistan and Asia/Karachi from the explicit request. No branches, addresses, phone numbers, products, offers or specifications are seeded. Language/voice and other optional configuration start empty. The profile readiness notice honestly identifies missing configuration without an invented percentage.

Migration 0006 adds exactly brand.read, with explicit OWNER, MARKETING_ADMIN, CONTENT_CREATOR and REVIEWER grants; VIEWER receives none. brand.manage remains OWNER-only. Existing 28 permission IDs/grants and all five roles remain unchanged. Clean installation creates the new permission before the explicit deterministic catalog-seed command; upgrade adds only the four read grants to existing canonical roles. Runtime never manages the catalog. Run migrate then seed explicitly with migration credentials; normal startup only reads current schema. Migrations 0000–0005 remain byte-identical. MySQL DDL implicitly commits; back up before maintenance and recover by restoration/reviewed forward migration.

## Permissions and trust

All reads, including the server-only future context service, require brand.read through current central session/catalog authorization. All mutations directly require brand.manage, repeated inside their transaction; there is no permission implication engine. Only Owner edits/approves; other permitted readers receive active approved rows only. Viewer receives neither read nor manage. Route, RSC/prefetch and API checks agree. No public projection endpoint. Phase 5 must establish a separately reviewed generation-service trust boundary; Creator read permission alone does not grant public access or arbitrary service execution.

Normal edits require session CSRF, exact configured APP_URL Origin and existing Fetch Metadata validation. They do not change security credentials, remote integrations or roles, so no recent-auth ceremony is added. No stored field is executed or fetched. Free text renders through React as text, never HTML.

## Approval and claims

Each record has explicit active and approved state; new editor records default unapproved, and Owner must approve them intentionally. Deactivated/unapproved records and references to them never enter future context. Editing an existing approved record is an explicit Owner approval through the labeled save form. The UI warns that persistent facts must not contain temporary campaign terms.

All thirteen claim categories use a single closed policy enum:

- EXPLICIT_POST_INPUT: PRICE, DISCOUNT, STOCK, WARRANTY, INSTALLMENT, SPECIFICATION defaults.
- APPROVED_FACT_OR_INPUT: ADDRESS, CONTACT, DELIVERY, INSTALLATION defaults.
- EXPLICIT_APPROVAL_REQUIRED: SUPERLATIVE, EXCLUSIVITY, PARTNERSHIP defaults.

These defaults are restrictions, not evidence that a service, warranty or partnership exists. Missing/inactive/unapproved policy defaults to EXPLICIT_APPROVAL_REQUIRED, never allow. Unknown enums fail validation. APPROVED_FACT_OR_INPUT requires actual relevant approved evidence; a policy is not that evidence. EXPLICIT_APPROVAL_REQUIRED means explicit attributable approval of a specific supported claim in the future workflow, not a global permission to invent it.

Persistent facts are stable approved brand information, such as a contact channel. Time-limited discounts/prices/stock and campaign offers belong to future post/campaign inputs. The Phase 5 validator must apply the claim's policy/source and human approval even if descriptive text mentions a claim. Free-text guidance/examples are contextual data, not executable system instructions. Future AI output remains untrusted and needs strict schema validation and human review.

## Validation and multilingual behavior

Strict schemas reject extras, malformed UUIDs/enums, ill-formed Unicode and control characters except newline/tab. Text lengths count Unicode code points, not UTF-16 units; Urdu, Roman Urdu, English, whitespace and meaningful combining sequences are stored exactly. There is no general copy normalization, trimming or truncation. URLs are HTTPS only, no credentials/fragment, canonicalized with URL. Email follows account identity trim/NFC/lowercase validation. Phone/WhatsApp machine values require explicit international +country digits (7–15 digits); display values are separate, with no assumed Pakistan local-format conversion. No claimed phone ownership verification.

Hashtags require # plus Unicode letters/marks/numbers/underscore, are NFC/lowercase normalized for matching and deduplicated. Banned phrase comparison uses a separate NFC/lowercase/collapsed-whitespace key; original wording is unchanged. Timezones use Intl validation. Languages, mixing, platforms and tones are closed enums; default language must be allowed. Hashtags have 0–20 min/max with min<=max; disabled requires zero counts; same-scope preferred/banned conflicts reject. Emoji preferences are small lists of emoji sequences, not a taxonomy.

## Limits and context

Total record caps per brand: profile/language/voice/emoji 1 each; contacts 20; locations 20; platforms 5; CTAs 40; claims 13; persistent facts 40; banned wording 80; hashtag scopes 6; categories 20; seasonal contexts 16; examples 24. Common names 100 code points, guidance 400, CTAs 200, persistent facts 400, banned phrases 120, example content 1600. Selling points <=6 of <=160 each; arrays are bounded and unique.

Projection is typed marketing data only. It includes revision and active approved profile/configuration, policies, contacts, locations, CTAs, facts, wording, categories, seasons and examples. No actor/audit/session/security fields or database IDs. Same-brand references resolve to approved nested data, or null if inactive/unapproved. Ordering is deterministic by display order then immutable UUID. Missing optional singleton config is null, missing collections empty. Global voice/hashtag defaults and explicitly scoped platform overrides remain structured; guidance is contextual and never formatted as a prompt.

All eligible records are included, with a hard serialized UTF-8 ceiling of 128 KiB. An approval/edit that would exceed it rejects atomically; nothing is silently truncated or randomly selected. No semantic search, embedding, vector store or model tokenizer. This is a storage/projection bound, not a promise to fit every future model's token budget. Phase 5 may introduce an explicitly approved narrower selection contract.

## Revision, transactions and audit

Every successful save, including deactivation/unapproved changes, increments global brands.revision once. ExpectedRevision is mandatory; stale saves return 409 without changing state. Record state, revision and append-only audit insert commit together. Required audit failure rolls back all three. Metadata contains only a closed event kind/action, validated record UUID and numeric revision, not marketing content. Actor/session have dedicated existing columns. No generic audit update/delete API and runtime history grants remain SELECT/INSERT only.

Lock order: preliminary current authorization commits; mutation transaction locks current actor user/factor/session/catalog via existing helpers, then brand row FOR UPDATE, then brand records/references, revision and audit. Reads take actor security state then brand FOR SHARE then current shared record reads. Child marketing records never lock user state afterward. Brand writes serialize through one brand row; the row cap, primary-contact checks and snapshot use current locking reads so REPEATABLE READ snapshots cannot hide a competing commit. No generic retries or isolation changes. Same-version competing edits have exactly one winner; an unrelated approved edit must be explicitly reloaded before saving.

## UI and operational boundaries

Ten keyboard-accessible tab groups, compact structured forms, explicit approval, inline validation, save/conflict state, read-only views and empty states reuse existing DM Sans/colors/cards/controls. Unsaved edits stay in memory and guard tab switches, cancel/reload, clicked navigation and page unload. No local storage. Deactivation asks confirmation. Significant edits survive network or conflict failure. A reload is explicit and can discard only with confirmation. No modal for each field. Small screens wrap tabs/cards and multilingual content.

No dependencies or environment variable names are added. Local/test runtime grants add SELECT/INSERT/UPDATE to child marketing tables and SELECT/UPDATE to brands, no DELETE/DDL/catalog management. No production database is contacted. Hostinger Node/native Argon2/AES-GCM/MySQL TLS/pool/clock/HTTPS/proxy/secure-terminal gates remain unverified. Manual invitations still prove bearer possession, not independently verified email ownership.

## Final targeted adversarial review

See docs/review/phase-3-adversarial.md. The exported projection now validates its input at runtime, selects only the explicit marketing field allowlist, rejects noncanonical identity/count/duplicate scope state and resolves references by entity kind + UUID. This complements (and does not replace) authenticated service authorization and SQL ownership/constraints. URL and hashtag output bounds apply after normalization. UI reference labels use the same typed identity rule.

The existing Flight/prefetch 403 preflight remains intact. Anonymous redirects use an absolute /login URL on the validated configured APP_URL origin, because Next's Flight adapter rejects a relative Location. Forwarded hosts never choose that origin; invalid runtime configuration fails unavailable. Brand GET accepts only one optional brandId; mutation-like/unknown/duplicate query parameters reject rather than returning a misleading successful read. No GET executes a mutation.

Identical accepted saves deliberately count as an administrative save: one revision and one audit event. Validation/authorization/stale requests have neither. No generic retries or isolation changes.

Human content limitation: persistent fact is a typed, explicitly approved semantic designation, not automated proof of truth or permanence. The free-text fact field (and guidance/examples) can be misused to enter a temporary offer; there are no typed current-price/stock/discount/expiry/campaign fields or automatic refresh/activation. Their unexpected structured fields reject. The existing editor warning directs temporary campaign data to post input. PRICE/DISCOUNT/STOCK/INSTALLMENT source policies require explicit post input by default, and Phase 5 must enforce policy + evidence; approved prose alone must not become an automatically current offer feed. No text classifier or campaign system is introduced here.
