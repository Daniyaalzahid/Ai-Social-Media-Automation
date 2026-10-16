# Phase 4 — private temporary media

Phase 3 base: 465629e1fcfdf9cd9da00fe751d35671c9abd707. This phase is a temporary media foundation, not a permanent Media Library/DAM. No Composer, post/history tables, social/AI calls, scheduling, FFmpeg, S3, CDN, Redis, Docker, root service or permanent worker.

## Storage and runtime boundary

MySQL holds metadata/reservations/tombstones only. MediaStorage provides write/open/exists/delete; LocalPrivateMediaStorage is the only implementation. Files use random 256-bit hex keys with a .bin suffix, never user filenames. A strict, Unicode-safe, one-extension display filename is retained while live and erased on tombstoning. No original path is retained or sent to clients.

MEDIA_STORAGE_ROOT (production), DEV_MEDIA_STORAGE_ROOT (development), TEST_MEDIA_STORAGE_ROOT (test) are optional server-only non-secret configuration names, required only when running media operations. Values are private environment settings, not committed examples. Production/local roots are separated. Relative paths, checkout/public roots, common webroot path segments and symlink components reject. Deployment must independently verify all actual webserver mappings: application code cannot discover arbitrary aliases. The root must belong to the Node account with mode 0700; files are exclusively created 0600, opened O_NOFOLLOW, and rejected if executable, nonregular or multiply linked. No public filesystem endpoint. Same-UID/host-administrator compromise is outside filesystem containment guarantees; root/ancestors must be controlled by the deployment account. No reliance on extension execution handling.

## Formats, validation and bounds

Pinned sharp 0.35.5 (Apache-2.0) supplies JPEG/PNG/WebP metadata and full bounded decode; mp4box 2.4.1 (BSD-3-Clause, pure JS) inspects MP4. Registry maintenance/Node engine/license were inspected before installation. Both support current Node 24.21.0. Sharp's prebuilt libvips loaded and decoded locally; Hostinger native packaging remains unverified. No additional install-script approval is needed; the reviewed argon2-only allowlist remains unchanged.

A raw single-file request avoids framework multipart buffering. Filename/declared MIME/extension must agree; signature, container boundaries and parser must agree. Images require valid end markers/RIFF size, correct format, one frame/page, <=8192 each dimension and <=16,777,216 pixels. Images <=8 MiB; videos/requests <=32 MiB. Empty/oversized/truncated/unsupported files reject, not truncate. SVG/HTML/GIF/archives/audio-only files are unsupported.

MP4 is deliberately limited to nonfragmented ISO MP4 with one H.264/AVC video track and at most one AAC audio track; <=3840x2160, <=10 minutes. Top-level box boundaries/counts, allowed brand/container structure, metadata, self-contained data references and every sample byte range are checked. No external references, arbitrary extra tracks, fragmented MP4/MOV or transcoding. This verifies the container and declared tracks, not full decoding of all compressed video samples. Browser/OS decoder compatibility is not a social-platform capability claim.

Parsing runs in a short-lived Node child with 96 MiB JS heap, 10-second kill bound, 2 KiB result ceiling, closed result schema, ignored stderr, a minimal environment without application credentials, and one inherited already-open no-follow descriptor. No request values are interpolated into executable source. Image pixel bounds precede decoding; libvips cache is disabled and concurrency one. Native allocations are not bounded by V8 heap alone: <=16 MP decode plus libvips/native overhead must be measured at deployment. At most two receiving/parsing uploads across all application processes are admitted by MySQL. A receive has a 60-second abort bound. Main-process streaming uses bounded backpressure and incremental SHA-256; it does not concatenate full video buffers. The parser reads 64 KiB MP4 chunks; image input <=8 MiB is buffered only in the disposable child. EXIF/XMP is ignored, never projected/logged/executed; accepted original bytes can still contain metadata while temporarily retained. No permanent thumbnail or alternate version is created.

## Permissions and object ownership

Exactly media.read and media.manage are added, giving 31 canonical permissions. Old 29 definitions/grants, including media.upload and Brand Brain policy, remain intact. Explicit matrix:

| Role | media.upload | media.read | media.manage |
|---|---|---|---|
| OWNER | yes | yes | yes |
| MARKETING_ADMIN | yes | yes | yes |
| CONTENT_CREATOR | yes | yes | no |
| REVIEWER | no | no | no |
| VIEWER | no | no | no |

Current server session/status/auth-version/MFA/canonical role checks remain authoritative. Owner/Marketing Admin read workspace temporary media and manage eligible media. Creator lists/reads only created_by=self and may remove only their own eligible temporary upload through media.upload ownership semantics; this grants no media.manage. Beyond-own removal explicitly requires media.manage. All ownership comes from DB, never input. Protected attachment/retention cannot be overridden by any browser role. Future contextual Reviewer access is deferred. Route, Flight/prefetch, metadata API and binary API are independently checked. No permission implications or runtime permission editor.

## Lifecycle and transactions

receiving -> temporary -> deletion_pending -> deleted. attached/retained are protected future-use states without Composer/public mutation endpoints. Every normal filesystem write has a committed receiving reservation first. Receiving expires after 30 minutes; successful unattached upload expires 24 hours after validation. Cleanup requires explicit CLI/cron execution; eligibility is automatic, but deletion is not promised if cron is not configured. Future attachment transactions must lock guard then media row and conditionally transition only temporary; a deletion_pending claim is irreversible to protection. Later phases will define release/retention after publication. Intended later policy: retain scheduled/ambiguous/failed work; after confirmed success at every required destination, a separately approved 24–72-hour safety retention may apply. No publishing state/timer is implemented now.

Upload reserves bytes/receiving capacity transactionally, then streams/hashes/validates outside DB locks, then revalidates authority and commits metadata + quota adjustment + required audit. Write/parser/hash/final-DB/audit failure attempts pending deletion and tombstoning. If DB/audit is unavailable, the receiving/pending row durably accounts for the file and cleanup reconciles later. No distributed filesystem/SQL transaction is claimed.

Deletion locks eligibility, writes deletion_pending + required audit, and commits before unlink. Binary deletion occurs outside the transaction. Final tombstone + quota release + required audit are atomic. If unlink succeeds but final transaction fails, metadata stays pending/unavailable and capacity remains conservatively reserved. Later explicit cleanup tolerates ENOENT and completes exactly once. Display name is erased, minimal MIME/dimensions/size/hash/creator/timestamps/reason remain. The creator FK is RESTRICT, preserving attributable history. Audit never contains filename, image/video content, paths, hashes, headers, cookies or user content: only closed action + media UUID. Cleanup failures produce safe bounded failure audit where the DB permits it, and a nonzero CLI result otherwise.

Lock order for browser mutations: fresh actor/factor/session/catalog -> singleton media guard -> relevant media/rate row -> audit. Internal cleanup: guard -> media -> anonymous audit, never later locks actor identity. Auth-rate cleanup remains the approved nonlocking bounded key discovery/exact-PK delete algorithm; no auth thresholds, isolation changes or generic retries. Quota/state mutations serialize through one guard row; normal receive/parsing holds no SQL transaction open. Separate-pool races exercise retention before discovery/claim, after claim, duplicate cleanup and aggregate reservations.

## Bounds, rate and cleanup

media_storage_guard enforces a 2 GiB reservation ceiling and two active receives across processes, not a billing quota. Actual size replaces worst-case reservation after validation; release occurs only with committed deletion. The existing auth_rate_limits backing table gets a separate media_upload namespace: 12 accepted upload reservations per authenticated actor per 10 minutes, atomic with reservation. Invalid expensive uploads consume admission. Existing authentication scopes/limits remain unchanged. Blocked upload probes do not extend the window/counter. Admission refuses safely when full; OS ENOSPC also fails safely. The guard tracks application-managed files, not all hosting-account usage/backups; deployment must reserve disk headroom and monitor actual quota/free space.

Cleanup selects <=25 rows via separate indexed lifecycle/expiry queries, rechecks current state under locks, reconciles pending deletes, and continues after per-item failures. Expired live reads deny even before cron runs. A bounded directory reconciliation examines at most 100 entries for old untracked random keys under the same guard; normal crash recovery uses durable receiving rows and does not depend on a complete directory scan. Tombstones are not hard-deleted. Metadata list reads fetch at most 50 rows per eligible status and return at most 50, scoped by creator when applicable. No unbounded gallery/search/collections.

## CLI, HTTP and UI

node --experimental-transform-types scripts/media-cleanup.mjs --environment=<development|test|production> requires matching validated runtime configuration, actual DATABASE()/CURRENT_USER() identity and private root. Node 24's built-in transform-types option is required because imported server authorization uses TypeScript parameter properties (default strip-only cannot load them); npm run media:cleanup supplies it. The server source/auth behavior is unchanged. OS/SSH/private cron access supplies authority; no HTTP cleanup endpoint, browser role impersonation or media.cleanup permission. Do not invoke against production during development. Runtime grants are SELECT/INSERT/UPDATE on media_assets and SELECT/UPDATE on guard; no DELETE/DDL, no catalog mutation, existing append-only audit grants retained. Migration credentials alone install schema.

Upload/removal use the existing session CSRF, exact APP_URL Origin and Fetch Metadata verifier. Upload takes a bounded plain filename query plus declared MIME and raw bytes; other query/body privilege fields reject. DELETE takes no fields/body. GET never deletes. Binary delivery uses authoritative MIME, fixed safe download filename, nosniff, sandbox CSP and private/no-store headers. Single byte/suffix/open ranges are bounded and authenticated on every request; malformed/multipart/unsatisfiable ranges return 416. No raw storage key/path is returned.

The Media route becomes Temporary media with an accessible file picker, textual progress/errors, private image/video previews, metadata/expiry, download, confirmation/removal, empty state. Existing DM Sans/tokens/layout remain; no permanent asset management UI or browser persistence. Responsive checks cover 320/375/390/768/1440.

## History and deployment gates

Binary deletion must not delete future post history. Future posts/captions/variants/publish attempts/platform IDs/approval/AI-generation metadata/Brand Brain revision can reference retained media tombstones; those tables do not exist in Phase 4. Owner approval is not a guarantee of media safety or permission to publish. No AI context/prompt or external API integration is added.

Migration 0007 alone adds two media tables plus five explicit grants. 0000–0006 remain byte-identical. MySQL DDL implicitly commits; backups/reviewed recovery apply, never transactional rollback promises. Clean/exact Phase 3 upgrade/repeat/checksum tamper/preservation tests are required.

Hostinger remains UNVERIFIED: retain Node/Argon2/AES-GCM/MySQL TLS/pool/clock/HTTPS/proxy/terminal gates, plus native sharp/libvips availability, child-process execution/heap/native-memory budget, private persistent writable root outside webroot/deployment-replaced paths, mode/umask behavior, account disk quota/headroom, upload/request/proxy limits and buffering, streaming/cancellation behavior, cron/cleanup permissions and deployment backup retention. Build success does not verify production. No new external infrastructure.

Dependency licensing: sharp 0.35.5 is Apache-2.0; its distributed libvips binary package is LGPL-3.0-or-later. Retain the dependency license notices and comply with those distribution terms. mp4box 2.4.1 is BSD-3-Clause. Accepted MP4 major brands are isom, iso2, mp41, mp42 and avc1; other containers/brands fail closed.
