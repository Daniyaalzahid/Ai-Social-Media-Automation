# Phase 4 — implementation and targeted adversarial review (A–AP)

Base main: 465629e1fcfdf9cd9da00fe751d35671c9abd707. No commit/push or Phase 5 work. The complete Phase 4 request and subsequent explicit media permission/Creator self-removal decision control this phase. See [architecture](../architecture/phase-4.md).

| Item | Implementation / review evidence |
|---|---|
| A — Architecture | Secure temporary media domain; no permanent Media Library, Composer/history/publishing/AI functionality. |
| B — Storage | Private local randomized .bin files, MySQL metadata/reservations only; no public webroot mapping. |
| C — Abstraction | MediaStorage write/open/exists/delete, LocalPrivateMediaStorage only. File handles provide seekable validation/streaming, no raw paths in domain responses. |
| D — Schema | media_assets plus singleton media_storage_guard, justified for cross-process quota/admission/locking. Minimal tombstones; creator RESTRICT FK. |
| E — Migration | 0007_temporary_media.sql only; 0000–0006 unchanged. Clean/exact Phase 3 upgrade/repeat/tamper/preservation and actual CHECK/FK tests. |
| F — Permissions | 31 canonical permissions. Exactly media.read/media.manage added; old 29 and media.upload grants preserved. Explicit matrix below. |
| G — Formats | JPEG/PNG/WebP images; bounded nonfragmented H.264/AAC MP4. No SVG/GIF/HTML/MOV/audio/archives. |
| H — Validation | Declared MIME + plain extension + signature/container framing + real parser. Full bounded image decode; MP4 structural/sample/data-reference validation. Not a guarantee of decoding every compressed video sample. |
| I — Limits | 8 MiB images, 32 MiB videos/requests; images <=8192 each/16 MP; video <=3840x2160/10 min. No truncation. |
| J — Memory | Backpressured receive + incremental hashing; 60-second receive abort. Disposable parser with 96 MiB JS heap/10-second kill and 2 KiB result bound; image pixel cap bounds major native allocations. No unbounded video buffer chain; deployment native memory remains a gate. |
| K — SHA-256 | Hash accepted original binary bytes during receive; 32-byte DB representation. No automatic deduplication or cross-user ownership. |
| L — Metadata | Random ID/key, safe display filename, validated type/bytes/dimensions/duration/hash, creator, expiry/lifecycle/tombstone timestamps/reason. Storage identity/hash are not included in public DTO. |
| M — Lifecycle | receiving -> temporary -> deletion_pending -> deleted; attached/retained protected future states, no public attachment endpoint. |
| N — Orphans | Receiving reservation expires in 30 min; successfully validated unattached file expires 24 hours later. Actual deletion requires configured CLI/cron. |
| O — Cleanup | <=25 indexed lifecycle/expiry candidates, current eligibility rechecked, pending/missing-file reconciliation; bounded extra directory inspection. Per-item failure does not block other eligible records. |
| P — Races | Real separate pools test protection after selection, protection refusal after pending claim, concurrent cleanup exactly once, and aggregate reservations max two. No retries/isolation changes. |
| Q — Removal | Creator own eligible temporary uploads through media.upload; Owner/Marketing Admin workspace removal through explicit media.manage beyond own scope. Tombstone retains minimal metadata, erases display name. |
| R — Auth/IDOR | Current canonical authority; disabled/version/revoked/unknown sessions deny. Own/workspace metadata, binary, list and removal scopes checked independently. Random/substituted IDs/ownership fields grant nothing. |
| S — CSRF | Existing session CSRF + exact configured Origin/Fetch Metadata; POST uploads and DELETE removals protected. No GET mutation. |
| T — Delivery | Authenticated authoritative MIME, fixed safe filename, no-store/private, nosniff and sandbox CSP; narrow tested single-range delivery with 416 rejection. |
| U — Filesystem | Random keys, exclusive 0600 writes, no-follow reads, regular-file/nlink/non-executable checks, 0700 owned root, no user-addressable paths. |
| V — Root/symlinks | Reject traversal/absolute/encoded/separator keys and symlink components/files, checkout/common webroots and mixed environments. Actual hosting aliases/parent control remain deployment checks; no claim against same-UID host compromise. |
| W — Atomicity | Reservation before filesystem write; final metadata/quota/audit transaction. Durable receiving/pending state and explicit compensation. Post-unlink audit failure retains pending reservation until idempotent reconciliation. No distributed transaction/DDL rollback claim. |
| X — Abuse | Existing rate table, separate media_upload namespace: 12 reservations/actor/10 min; unchanged auth limits. Global two receives and parser time/memory bounds. |
| Y — Capacity | 2 GiB transactional reservation ceiling, actual-size adjustment and release only with committed tombstone. No billing system; overall hosting quota/headroom/ENOSPC remain operational gates. |
| Z — Audit | Closed action + validated media UUID; no filename/content/path/hash/credentials/header dumps. Required mutation/audit atomicity; cleanup failure audit where available and CLI failure count. Runtime no audit UPDATE/DELETE. |
| AA — UI | Existing visual language, file picker/status/error, image/video preview/download, metadata/expiry, confirmation/removal, empty states. No DAM/search/folders/tags. |
| AB — Responsive | Keyboard picker, labels/status and widths 320/375/390/768/1440 tested in Chromium. No horizontal overflow. |
| AC — Privacy | No persistent thumbnails/variants/processing files. Child has minimal env without app credentials; temp receive records bound crash recovery. Name erased after deletion; minimal tombstone retained. |
| AD — History | Future posts/variants/schedules/approvals/AI/Brand revision can refer to tombstones; none of those tables/features added. Future successful-publish retention is documented, not implemented. |
| AE — Hostinger | UNVERIFIED. Existing deployment gates plus private root/permissions, persistence, quota/headroom, request/proxy buffering, child execution/native sharp/memory, CLI transform-types and cron/cleanup/backup retention. |
| AF — Dependencies | Exact sharp 0.35.5 Apache-2.0 (bundled libvips binary LGPL-3.0-or-later) and mp4box 2.4.1 BSD-3-Clause; maintenance/engines inspected before install. Local Node24/libvips/real format tests pass. Argon2-only install-script approval unchanged. |
| AG — Findings/repairs | See the explained findings below. No production auth changes, old migration edits, generic retries or isolation changes. |

## Explicit permission and object matrix

| Canonical role | media.upload | media.read | media.manage | Object scope |
|---|---|---|---|---|
| OWNER | yes | yes | yes | workspace; lifecycle rules mandatory |
| MARKETING_ADMIN | yes | yes | yes | workspace; lifecycle rules mandatory |
| CONTENT_CREATOR | yes | yes | no | own list/read/preview; own eligible removal through upload ownership |
| REVIEWER | no | no | no | no Phase 4 media surface |
| VIEWER | no | no | no | no Phase 4 media surface |

Cleanup is an internal OS/SSH/private CLI/cron operation, not role impersonation or a new permission. It requires explicit matching environment, configured actual DB identity and private root. The function is never exposed by a browser endpoint.

## AG — Targeted findings and explained validation failures

- A strict DELETE check initially rejected stream presence, but Next supplies an empty stream for valid removal. Browser evidence safely captured status 400 + the fixed extra-body error. The repair checks actual bytes with a bounded read and keeps rejection of body/query ownership fields. Valid removal/Creator own removal/UI regression passes. No auth policy changed.
- MP4 review requires self-contained data references and correct video/audio track codec classification, not only ftyp/track counts. Sample byte ranges must lie inside mdat. External-reference and invalid dimension/duration fixtures reject. No network fetch/FFmpeg/full video decode is claimed.
- Parser process receives a minimal environment rather than inherited application credentials. Root validation also rejects common public webroot names and Unicode display-path separators. These are narrow boundary hardening, not new infrastructure.
- Cleanup/list discovery uses separate bounded indexed status queries; no range-delete cleanup or global isolation change. Real EXPLAIN checks expiry index selection.
- The initial protected-state MySQL failures expected a word in an error; the service already rejected correctly. Tests now assert 409 and preserved binary, not wording.
- New UI tests initially lacked the existing jsdom directive; two historical unit assertions needed to exclude the approved media extensions/add 0007 explicitly. The frozen Phase 3 fixture independently preserves the previous 29 definitions/grants.
- Native Node strip-only cannot load parameter properties used by imported server authorization. The cleanup CLI explicitly uses Node24's built-in --experimental-transform-types through npm run media:cleanup. Local negative and valid isolated CLI invocations pass; authentication source unchanged. This remains an explicit Hostinger command/runtime gate.
- An isolated-only refresh of the unreleased 0007 initially retained its new permission rows while intentionally replaying its SQL, yielding ER_DUP_ENTRY/23000. The temporary development refresh was corrected to remove only unreleased catalog additions/tables/journal entries. Real normal repeat migration and exact Phase 3 upgrade tests pass; no production DB or old migration changed. This is not a generic migration retry/recovery guarantee.
- The first focused browser diagnostic pattern selected zero tests; the filter was corrected and the intended one-case diagnostic captured the DELETE cause. No passing zero-test result is claimed. Expected pre-repair failures remain distinct from final verification. No unexplained flaky reruns.

- The first full gate stopped at 541/542 MySQL tests: concurrent cleanup reported an item failure. Controlled external tracing reproduced an unlink/fstat race: the second deleter sees an already-open regular inode with nlink=0 after the first unlink, causing strict read validation to reject. Deletion now accepts only independently confirmed path absence; existing unsafe files still reject and read validation is unchanged. The controlled interleaving failed before repair and passed afterward; a deterministic unit regression covers the state. No retry/sleep/isolation change. The original uninstrumented failure did not retain its underlying error.

## AH–AN — Final verification

Complete post-repair gate passed (2026-10-15, local Node24.21.0/npm11.19.0):

| Item | Final result |
|---|---|
| AH — Unit/UI | 357 passed across 23 files, including 52 media unit and 2 media UI tests. |
| AI — Isolated MySQL | 542 passed across 13 files in 270.64 seconds, including 46 media cases. Two legitimate native Argon2 requests both PASSWORD_VERIFIED; maximum active one; no DB errors. |
| AJ — Browser | 87 passed in 1.9 minutes, retries 0; includes 10 media scenarios. |
| AK — Installation/lint/types/build | npm ci, lint, strict typecheck and production build all passed. Build required no live production database or media-root configuration. |
| AL — Secrets/audit/dependencies | Secret scan passed (214 repository files and 304 historical blobs); npm audit 0 vulnerabilities; npm ls --all exit 0, no invalid/extraneous dependency state. |
| AM — Migrations | All 8 SHA-256 manifest entries verified, deterministic 0000–0007 order; old 0000–0006 byte-identical to HEAD; 0007 SHA-256 01495fcf7d3945d951935f807c9f952eb149ef59b8449c9083884c85642a9d4a. |
| AN — Whitespace | git diff --check passed. |

The first full gate failure is preserved above, not erased by the later passing gate. The controlled interleaving failed before the targeted deletion repair and passed after it. No generic retry, arbitrary sleep, security assertion weakening, transaction-isolation change or production authentication change was introduced. Diagnostics remain outside the checkout. Only a documentation result update followed the passing gate; secret scan and whitespace checks were repeated for that update.

New environment names are MEDIA_STORAGE_ROOT (production private path), DEV_MEDIA_STORAGE_ROOT and TEST_MEDIA_STORAGE_ROOT (isolated development/test paths). They are server-only configuration, not secret keys; relevant media operations require the matching path, while install/lint/types/tests/build need no production path/credentials. .env.example contains names with empty values. Artifact review found no private environment, binary fixtures, dumps, traces, credentials or generated outputs in the candidate.

## AO — Complete file inventory
- `.env.example`
- `AGENTS.md`
- `docs/architecture/phase-4.md`
- `docs/review/phase-4.md`
- `migrations/0007_temporary_media.sql`
- `migrations/manifest.json`
- `package-lock.json`
- `package.json`
- `scripts/local-mysql.py`
- `scripts/media-cleanup.mjs`
- `src/app/(workspace)/[section]/page.tsx`
- `src/app/(workspace)/media/page.tsx`
- `src/app/api/media/[id]/binary/route.ts`
- `src/app/api/media/[id]/route.ts`
- `src/app/api/media/route.ts`
- `src/features/media/model.ts`
- `src/features/media/temporary-media.tsx`
- `src/server/authorization/routes.ts`
- `src/server/config/schema.ts`
- `src/server/db/catalog.ts`
- `src/server/db/schema.ts`
- `src/server/media/delivery.ts`
- `src/server/media/http.ts`
- `src/server/media/parser.ts`
- `src/server/media/service.ts`
- `src/server/media/storage.ts`
- `src/server/media/web.ts`
- `src/styles/globals.css`
- `tests/browser/media.spec.ts`
- `tests/browser/ui.spec.ts`
- `tests/database/check-constraints.test.ts`
- `tests/database/foundation.test.ts`
- `tests/database/media.test.ts`
- `tests/database/migration-recovery.test.ts`
- `tests/database/phase2b-helpers.ts`
- `tests/fixtures/phase-3-catalog.json`
- `tests/helpers/media-fixtures.ts`
- `tests/ui/media.test.tsx`
- `tests/unit/authorization.test.ts`
- `tests/unit/brand-adversarial.test.ts`
- `tests/unit/brand.test.ts`
- `tests/unit/database-config.test.ts`
- `tests/unit/media.test.ts`
- `tests/unit/repository-guardrails.test.ts`

## AP — Repository state

main HEAD remains 465629e1fcfdf9cd9da00fe751d35671c9abd707; 22 modified tracked files and 22 new files (44 paths), all unstaged for review. No production media used, no permanent application binary retention, no S3/FFmpeg/Redis/Docker/root/permanent-worker requirement; old migrations unchanged; no Phase 5, commit or push. Orphan expiry is 24 hours after accepted validation (30 minutes for interrupted receiving); metadata tombstones remain.
