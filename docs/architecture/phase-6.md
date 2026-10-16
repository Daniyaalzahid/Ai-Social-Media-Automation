# Phase 6 — immutable Composer and human review

Finalized base: d143a300c8213178a49aa1b02cb6e21866572760. Phase 6 only; no staging,
commit/push or Phase 7. No dependency/environment/catalog/grant changes. The 31
canonical capabilities remain exact. Hostinger and production OpenRouter remain
UNVERIFIED. This document describes application behavior, not deployment proof.

## Domain and database

0009_content_workflow.sql adds nine tables: content_items, content_revisions,
content_variants, content_revision_authors, content_revision_facts,
content_revision_media, content_submissions, content_decisions and
content_media_protection. Relational identity/ownership/revision/submission/media
facts are relational, not an arbitrary workflow JSON blob. A platform variant's
bounded schema-validated JSON is a value object matching the Phase 5 contract.
0000–0008 remain byte-identical. The source/provenance CHECK explicitly requires
generation_brand_revision IS NOT NULL for AI_GENERATED/AI_EDITED before its
positive comparison; UNKNOWN must not admit partial provenance. MANUAL and
HUMAN_EDITED require all four generation fields NULL. Ten checksummed manifest entries; no startup
migration. MySQL DDL implicitly commits; production recovery requires reviewed
forward migration or backup restoration. Discarding a disposable uncommitted test
schema during development is not a production transactional rollback guarantee.

content_items is the stable owner/initial assignment and serialized revision
counter. Each explicit accepted Save inserts an immutable revision and variants,
fact snapshot, contribution lineage and ordered attachments. Increment and required
audit commit together. Initial content is assigned to its creator; reassignment
and transfer UI are not included. Sequence is unique per item and server-generated.
Latest revision is resolved by (post_id, revision_sequence). Approved revision is
resolved from authoritative approval decisions, ordered by revision sequence.
They are deliberately independent; no mutable approved boolean exists.

Revision source is server-derived MANUAL, HUMAN_EDITED, AI_GENERATED or AI_EDITED.
AI import requires content.create and separately ai.generate, a completed own
Phase 5 generation, valid selected-platform output and current authorization.
Import copies source output from the database, never browser-supplied replacement
copy labelled AI. The revision snapshots generation identity/provider/model/source
Brand revision as well as the current validation Brand revision. Later edits retain
that source descriptor and are labelled edited. No live provider call occurs in
ordinary create/save/submit/review operations; manual Composer does not require AI.

## Permission and object policy

| Role | Content scope | Create/edit/submit | Review decisions | Self-approval |
|---|---|---|---|---|
| OWNER | workspace/history | yes, new revisions | review + approve | approve_self required |
| MARKETING_ADMIN | workspace/history | yes, new revisions | review + approve | approve_self required |
| CONTENT_CREATOR | own/initial assigned content/history | create; edit_assigned + own/assignment; submit own | no | no |
| REVIEWER | submitted revisions and review-relevant history | no | review + approve | never authored lineage |
| VIEWER | approved text and minimal approved metadata | no | no | no |

content.read never means unrestricted workspace visibility. UI does not authorize.
Every service boundary validates current session/status/auth-version/MFA/canonical
catalog through existing authorization. Mutation authorization repeats after locks.
No permission implication engine. No schedule/publish capability is exercised.
Owner/Admin cannot override claims, immutability, lifecycle or history protections.

Viewer has a separate closed DTO: item ID and approved revision ID/sequence/title/
platform text. No current revision pointer, draft title/content, facts, AI detail,
notes, history, attachments or media. Lists use approved snapshot title/sequence
and platforms; a newer private draft cannot change these fields. Reviewer never
receives an unsubmitted working revision/current working pointer. History returns
at most 20 permitted revisions, with a descending sequence cursor. Active review
snapshot remains separately available even if many newer drafts were saved.

## Immutable authorship and runtime grants

Each contribution records an immutable originating revision. Inherited lineage is
bound by restrictive composite FKs to the same item's real revision and that
revision's creator. It is not an unchecked user UUID. No extra user FK is taken for
every inherited entry. All contributing actors remain represented (maximum 200;
excess rejects without dropping authors). Approval checks this full lineage,
regardless of the actor's role at the time of contribution. Authored approval
requires content.review + content.approve + content.approve_self, and is recorded
explicitly on the decision and audit count. Reviewer may request changes/reject but
cannot approve authored lineage. Creator has no decision capabilities.

Trigger-based immutability was rejected after actual isolated MySQL returned
ER_BINLOG_CREATE_ROUTINE_NEED_SUPER with binary logging. No SUPER, server-variable
change or root requirement was adopted. Immutability is enforced for the ordinary
application account by append-only services and required restricted grants:

| Table | Runtime privileges |
|---|---|
| content_items | SELECT, INSERT, UPDATE(revision_sequence) |
| content_revisions/variants/revision_authors/revision_facts/revision_media | SELECT, INSERT only |
| content_submissions | SELECT, INSERT, UPDATE(state) only |
| content_decisions | SELECT, INSERT only |
| content_media_protection | SELECT, INSERT, UPDATE(protected_until) only |

No runtime DELETE/DDL/catalog mutation. Submitted snapshot identifiers/actor/time/
policy cannot be updated by runtime. Normal transitions update only submission
state and append one unique decision. Existing audit SELECT/INSERT-only protection
remains. Migration/DB administrators are privileged outside runtime guarantees;
these grants do not protect against a compromised database administrator. Actual
restricted-account UPDATE/DELETE/DDL attempts are tested. Deployment MUST apply and
verify the same grant model; Hostinger support remains a blocking verification gate.

## Workflow and optimistic concurrency

States: DRAFT, IN_REVIEW, CHANGES_REQUESTED, REJECTED, APPROVED. Derived from the
visible working revision, exact submission and decision; no browser state patch.
Save creates a new working revision. Submit requires latest expected immutable
revision and no active submission. One generated active-post unique key enforces
one pending review; one submission per revision requires new text revision for
resubmission after changes/rejection. Review decisions are closed and one per
submission. A competing terminal decision returns conflict, not last-write-wins.

Editing while review is active creates a separate working revision. The existing
submission remains immutable and reviewable. Approval of that submission approves
only its revision. A newer working revision remains DRAFT; previous approvals stay
historical. A request cannot pair another item's revision/submission/decision.
Approval confirmation identifies title, exact revision and selected platforms.

Explicit Save, not keystrokes, creates history. An accepted identical Save with a
fresh request ID creates one revision deliberately. Replayed actor/request ID and
same command returns the existing item; a different payload under that ID conflicts.
A canonical parsed-command SHA-256 digest is integrity/idempotency metadata, never
authority or a public field. Save requires expectedRevisionId; current post counter
and a current locking read of its exact revision determine stale conflict. No merge.

## Claim validation and fact provenance

Arbitrary bounded human prose may be SAVED as an unvalidated draft. It is never
called semantically validated merely because JSON/length/keywords passed.
Submission requires exact representability within the reviewed Phase 5 assembly
contract: server-owned creative phrases and authorized typed fact slots, exact
contact/address references, approved language, bounded tags, banned wording and
emoji policy. No silent deletion, truncation, translation or rewrite. Supported
starter controls are explicit user actions. Unsupported text yields an actionable
submission error. All five platform structures remain distinct; YouTube retains
separate title/description/tags/hashtags.

One authoritative path reuses prepareGeneration, canonicalClaim and validateDraft.
Human content is inverted into a strict plan, reassembled and compared exactly.
No weaker keyword/NLP validator. All 13 categories remain fail closed; workflow
approval does not unlock EXPLICIT_APPROVAL_REQUIRED or grant new factual authority.
Unknown/missing/corrupt source policy cannot become allowed. In particular the
existing superlative/exclusivity/partnership restriction remains unchanged.

Each revision stores selected category/source/stable source-record identity and
resolved literal, not a mutable projection array index. Current approved Brand
records resolve by typed entity kind + identity; only then are ephemeral indexes
passed to the existing validator. Snapshot values distinguish subsequent changes.
Submission and approval reconstruct under current authoritative Brand policy and
require unchanged resolved provenance plus exact representability. Changed,
deactivated/replaced references or tightened policy reject without rewriting the
old revision. Submission/decision records capture the current validation revision;
old revision metadata remains unchanged. Phase 5 lacks complete old fact-value
snapshots: importing its output does not invent missing historical proof. Newly
confirmed/resolved facts are checked under current policy for the Phase 6 revision.
No complete Brand tables, prompt, raw response or rejected AI output are copied.

## Bounds, web safety and UI

64 KiB Composer body with 5-second read bound; 32 KiB platform pack; 160-code-point
internal title; 1000-code-point review note; at most 5 platforms, 13 category-unique
facts and 4 distinct ordered media IDs. Existing per-platform caption/title/tag/
hashtag limits apply. No silent truncation; malformed Unicode/control characters
reject, legitimate Urdu joiners remain. Display strings are preserved; rendered
banned-word comparison remains joiner-safe. Text is React-escaped, never raw HTML.
Review notes are internal, never provider/social payloads or audit body copies.

POST /api/content accepts strict discriminated commands. Unknown fields, duplicate/
escaped JSON key ambiguity, malformed UTF-8/Unicode, extra request parameters and
oversized input reject. Existing session CSRF + exact configured Origin/Fetch
Metadata protect every mutation; GET never mutates workflow. GET detail/list
parameters are closed and reject duplicate keys. UUID possession grants no scope.
Direct nested content document and Flight/prefetch paths are denied before streaming
through domain authorization; page/API checks remain independent. Existing trusted
configured-origin anonymous Flight redirect and Phase 2D denial behavior remain.

Create Post retains the AI demonstration and adds a manual Composer, explicit
starter/edit/save, typed facts, own generation import and authorized media selection.
Content listing, review queue, exact-revision review controls, notes and read-only
history use existing components/tokens. Viewer renders only approved text. No rich
HTML editor, browser persistence, threaded chat or assignment UI. Unsaved edits warn
on navigation/unload; save failure preserves dirty content. Success clears dirty
state. Lists use 20-row UUID keyset pages; history uses sequence pages. Sort/filter
SQL is server-owned. No unbounded OFFSET/search/analytics infrastructure.

## Media lifecycle and contextual delivery

Original Phase 4 upload/parser/path/storage checks and quota accounting remain.
No binary in MySQL, no permanent Media Library or copied thumbnail/variant.
Unattached media expires after 24 hours; receiving after 30 minutes. A saved
revision protects its attachments for 7 days, refreshed on valid submission.
Approval extends required attachments to 30 days. Later explicit valid revisions/
workflow actions can renew use; old history alone does not retain binary forever.
No final post-publish retention is invented. After expiry, future publishing would
need available reattached media and a new valid revision; this phase does not publish.

Attachment references/order are immutable. Detach creates a new revision; the old
reference keeps its existing bounded grace, not permanent binary retention.
Abandoned draft/submission protection expires. Known expired Composer holds are
released by bounded internal cleanup; unrelated attached/retained states remain
protected. Release plus audit is atomic. Existing deletion_pending is irreversible
to attachment and cannot be manually revived. Unlink/final path-absence validation,
no-follow/root/symlink protection, bounded reconciliation, tombstone erasure and
exactly-once quota release remain. Protected manual removal rejects for every role.

Reviewer binary delivery is contextual only: current content.review actor, a
legitimate submitted same-item revision, immutable attachment relation, live eligible
asset and safe local binary open/size validation. It never adds global media.read.
Viewer gets no binary. Metadata/general media endpoints retain Phase 4 grants.
Creator can newly attach only own media; Owner/Admin workspace scope is explicit.
Contextual review survives creator disablement; disabled actors themselves deny.
Responses retain private/no-store, authoritative MIME, nosniff, sandbox CSP,
no-referrer, fixed safe filename and bounded single-range behavior. No storage key
or physical path is a public DTO.

## Transactions and lock ordering

Preliminary current authorization supplies bounded authoritative parent-user hints;
unauthorized work is rejected before other users/marketing locks. The mutation then
locks involved actor/item-creator/media-creator user rows in sorted UUID order,
revalidates current actor/session/catalog, then Brand snapshot, item aggregate,
media guard and sorted media rows/holds, immutable records/submission and audit.
Hints never grant authority; ownership/relationships are checked again. No locks
span OpenRouter/network work. Local bounded media descriptor validation occurs under
the lifecycle lock so deletion cannot race a committed successful attachment.

Internal cleanup takes the relevant creator parent shared lock BEFORE media guard,
then media row/hold and anonymous audit. These are FK-integrity locks, not human
impersonation or browser permissions. Browser removal uses sorted actor/creator
parent locks and repeats authorization. Final tombstone also locks creator before
guard. This prevents the demonstrated user/media-guard FK inversion. Preliminary
metadata reads never hold guard while acquiring a later parent lock.

A successful mutation + revision/protection/submission/decision + required audit
commits as one DML transaction. Response DTO reading happens in a separate fresh
transaction, with authority checked again. It never range-locks history indexes
while holding newly inserted history. If response read/auth fails after commit,
client sees a safe failure and can inspect content/replay the same request ID; the
committed authorized mutation is not falsely described as rolled back.

Immutable known-base lineage reads are non-locking; origin composite FKs preserve
integrity. Current mutable aggregate reads use exact locking lookups. This avoids
RR snapshot stale-row mistakes and range/gap-lock cycles. DB unique conflicts map
to a safe conflict, not retry. No generic retry, arbitrary sleep or isolation change.

## Deployment and boundaries

Hostinger remains UNVERIFIED: verify Node/native Argon2/sharp/libvips/mp4box/AES-GCM,
MySQL TLS/pool/clock/HTTPS/proxy/origin/SSH/private-storage/disk/memory/upload/streaming/
cron gates, plus column-scoped runtime grants, migration identity separation and
actual Phase 6 query/transaction/index behavior under the hosting connection budget.
OpenRouter production remains UNVERIFIED; no real key/live request is used in tests.
No social OAuth, publishing, scheduler/calendar execution, analytics expansion,
AI reviewer, vision/OCR/transcription, FFmpeg, S3, Redis, Docker/root or permanent
worker. Phase 7 has not started.
