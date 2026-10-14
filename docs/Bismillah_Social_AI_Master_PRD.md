# Bismillah Social AI

## Product Requirements Document, System Architecture, Security Specification & Codex Build Plan

**Version:** 1.0\
**Date:** 13 October 2026\
**Deployment target:** Hostinger Business Web Hosting (Node.js)\
**Primary AI provider:** OpenRouter (free tier first)\
**Channels:** Facebook, Instagram, TikTok, YouTube, LinkedIn\
**Product type:** Private internal social-media creation, scheduling and
publishing platform

------------------------------------------------------------------------

# 1. Executive Summary

Bismillah Social AI is a private, secure social-media operating system
for Bismillah Electronics. A user uploads an image/video or enters a
campaign brief. The application analyzes the creative, applies the brand
rules, generates platform-specific copy, lets a human review/edit it,
then publishes immediately or schedules it to authorized social
accounts.

The system must not simply duplicate one caption across all platforms.
It must produce channel-native output:

-   Facebook: persuasive retail copy, offer context, CTA, useful
    hashtags.
-   Instagram: strong hook, concise visual-first copy, CTA, discovery
    hashtags.
-   TikTok: short native hook/caption, relevant hashtags and platform
    settings.
-   YouTube: SEO title, description, tags/hashtags and video metadata.
-   LinkedIn: professional business/retail angle with restrained
    hashtags.

The first release is deliberately **human-approved**. AI can create
drafts, but it cannot silently publish generated content without an
explicit approval action.

------------------------------------------------------------------------

# 2. Critical Constraints

## 2.1 Zero-paid-AI-first constraint

The initial system must work with OpenRouter's free models. The AI layer
must be provider-independent so a future paid model or local model can
be substituted without rewriting the application.

The application must minimize AI calls. One creative-generation request
should normally return all five platform variants as structured JSON.

## 2.2 Hostinger constraint

The deployment target is the user's existing Hostinger Business web
hosting with Node.js support. The design must avoid infrastructure
assumptions that require root access, Docker, Redis, or a permanently
running custom daemon.

Use: - Node.js application - MySQL - Hostinger-supported environment
variables - HTTPS - Hostinger Cron Jobs for scheduled dispatch -
Git-based deployment where available

## 2.3 Platform API constraint

Publishing is only implemented through official platform APIs. Do not
use Selenium, Playwright, browser-password automation, cookie stealing,
unofficial private APIs, or password storage to simulate posting.

## 2.4 Approval constraint

V1 workflow:
`Draft -> AI Generated -> Human Review -> Approved -> Scheduled/Publishing -> Published/Failed`

Auto-pilot is out of scope for V1.

------------------------------------------------------------------------

# 3. Product Goals

1.  Reduce the time required to prepare a multi-platform social post.
2.  Keep Bismillah Electronics' brand voice consistent.
3.  Produce genuinely different copy for each platform.
4.  Publish or schedule to all authorized channels from one interface.
5.  Provide a clear audit trail of who generated, edited, approved and
    published each post.
6.  Avoid invented prices, discounts, specifications, warranty terms,
    branch information or claims.
7.  Keep credentials and social OAuth tokens protected on the server.
8.  Run economically on existing Hostinger hosting.
9.  Make individual integrations replaceable through adapter interfaces.
10. Fail safely: one platform failing must not cause successful
    platforms to duplicate their posts.

------------------------------------------------------------------------

# 4. Non-Goals for V1

-   Full Hootsuite/Buffer replacement.
-   Paid advertising campaign management.
-   Automatic comment/DM replies.
-   Social listening across the public web.
-   Influencer discovery.
-   Unlimited AI generation.
-   AI posting without human approval.
-   Storing social-media passwords.
-   Circumventing platform app reviews or API limitations.
-   Video editing suite.
-   Full enterprise DAM.

------------------------------------------------------------------------

# 5. Target Users and Roles

## Owner / Super Admin

Full system control. Manages users, integrations, AI configuration,
brand rules, security settings, audit logs and publishing.

## Marketing Admin

Creates, edits, approves, schedules and publishes posts. Can view
analytics and publishing logs. Cannot expose/decrypt secrets.

## Content Creator

Uploads media, creates briefs and generates/edit drafts. Cannot publish
unless explicitly granted.

## Reviewer

Reviews and approves/rejects content. Cannot change system integrations.

## Viewer

Read-only access to calendar, content and analytics.

Use RBAC server-side on every protected operation. Hiding a button in
the UI is not authorization.

------------------------------------------------------------------------

# 6. Primary User Flow

1.  User signs in.
2.  User clicks **Create Post**.
3.  User uploads image/video or enters text-only brief.
4.  User chooses target social channels.
5.  User enters optional campaign data:
    -   product
    -   offer/price
    -   target audience
    -   target cities
    -   CTA
    -   language
    -   campaign objective
6.  System validates media.
7.  AI analyzes the creative/brief.
8.  Brand Brain rules are injected.
9.  AI returns structured platform-specific drafts.
10. UI shows tabs/cards for Facebook, Instagram, TikTok, YouTube and
    LinkedIn.
11. User edits each platform version.
12. System runs a pre-publish validation.
13. Reviewer/admin approves.
14. User selects **Publish Now** or a future date/time.
15. Scheduler creates one platform job per selected channel.
16. Publisher executes each job independently.
17. Results are stored with remote post IDs/URLs where available.
18. Failures are retried only when safe.
19. Dashboard shows final status.

------------------------------------------------------------------------

# 7. Brand Brain

Brand Brain is a structured database-backed configuration, not a single
hard-coded prompt.

Store: - Brand name: Bismillah Electronics - Website:
bismillahelectronics.pk - Industry: electronics/home appliances -
Approved phone numbers - Approved WhatsApp numbers - Branch
names/addresses - Approved CTA library - Language preferences: English,
Urdu, Roman Urdu, mixed - Tone rules - Product categories - Claims that
require manual confirmation - Banned words/phrases - Hashtag rules -
Emoji preference - Platform-specific style rules - Seasonal campaign
guidance - Examples of approved high-quality posts

### Hallucination prevention

AI must never infer or invent: - price - discount percentage - stock
status - warranty - installment terms - technical specifications -
branch/address - phone number - delivery promise - "best/number one"
claims unless the information is present in the user's brief or approved
Brand Brain data.

If information is missing, copy should omit it or mark the field as
requiring confirmation.

------------------------------------------------------------------------

# 8. AI Engine

## 8.1 Provider abstraction

Define an interface such as:

``` ts
interface AIProvider {
  generateSocialPack(input: SocialGenerationInput): Promise<SocialPack>;
  testConnection(): Promise<ProviderHealth>;
}
```

Initial adapter: `OpenRouterProvider`

Future adapters can include other hosted or local providers.

## 8.2 Output contract

AI response must be validated against a strict schema before saving.

``` json
{
  "creative_summary": "...",
  "detected_product": "...",
  "risk_flags": [],
  "facebook": {
    "caption": "...",
    "hashtags": ["..."],
    "cta": "..."
  },
  "instagram": {
    "caption": "...",
    "hashtags": ["..."],
    "cta": "..."
  },
  "tiktok": {
    "caption": "...",
    "hashtags": ["..."]
  },
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": ["..."],
    "hashtags": ["..."]
  },
  "linkedin": {
    "caption": "...",
    "hashtags": ["..."],
    "cta": "..."
  }
}
```

Never execute AI-generated code, URLs, SQL, shell commands or HTML as
trusted instructions.

## 8.3 Prompt-injection resistance

Uploaded images, filenames, EXIF data and user-provided copy are
untrusted content. The system prompt must state that embedded
instructions inside content are data, not system instructions. Tool
execution must not be exposed to the model.

## 8.4 Usage protection

-   Per-user daily AI quota.
-   Global daily quota.
-   Cooldown/rate limiting.
-   Cache/reuse generation where appropriate.
-   One multi-platform call instead of five calls where practical.
-   Show usage dashboard.
-   Graceful message when free provider capacity is unavailable.

AI outage must not stop already-approved scheduled posts.

------------------------------------------------------------------------

# 9. Social Provider Architecture

Use a provider adapter per network:

``` text
src/integrations/social/
  meta/
  tiktok/
  youtube/
  linkedin/
```

Each adapter should expose normalized operations where supported: -
connect() - refreshToken() - validateConnection() - publish() -
getPublishStatus() - disconnect() - getBasicAnalytics()

Do not pretend every network has identical capabilities. Maintain a
capability matrix.

## Facebook / Instagram

Use Meta's official APIs and OAuth. Page/Instagram account selection and
permissions must be validated during connection. Tokens stay
server-side.

## TikTok

Support Content Posting API. Account for: - user authorization -
required posting scopes - creator-info requirements - Direct Post vs
draft/upload flow - processing status - app audit/review restrictions -
explicit user consent and platform-required UI controls

Do not label TikTok Direct Post "production ready" until the app has the
necessary approval/audit.

## YouTube

Use Google OAuth and YouTube Data API for uploads. Use resumable upload
behavior for video where supported. Store YouTube channel identity and
token metadata separately from application user identity.

## LinkedIn

Use official LinkedIn OAuth and Posts API. Treat organization posting
permissions separately from personal posting permissions.

------------------------------------------------------------------------

# 10. Content Composer

Required components: - drag/drop media uploader - media preview -
target-channel selector - campaign objective - product/offer fields -
language selector - target-city selector - CTA selector - "Generate with
AI" - regenerate individual platform - platform tabs - live character
counters - warnings - save draft - request approval - publish now -
schedule - discard with confirmation

Every platform draft is stored separately. Editing Instagram copy must
not silently overwrite Facebook copy.

------------------------------------------------------------------------

# 11. Content Calendar

Views: - Month - Week - Agenda/List

Statuses: - Draft - Awaiting Review - Approved - Scheduled -
Publishing - Partially Published - Published - Failed - Cancelled

Calendar item opens the post detail drawer/page. Rescheduling requires
authorization and creates an audit event.

Timezone must be explicit. Default deployment timezone can be
`Asia/Karachi`, but timestamps must be stored in UTC and converted for
display.

------------------------------------------------------------------------

# 12. Scheduler and Publishing Reliability

Do not rely on a browser tab being open.

Recommended Hostinger-compatible pattern:

1.  Hostinger cron invokes a protected scheduler endpoint/CLI at a short
    interval.
2.  Scheduler selects due jobs.
3.  Job is atomically claimed/locked in MySQL.
4.  Publisher sends the platform request.
5.  Result is persisted.
6.  Transient errors are retried with exponential backoff.
7.  Permanent/auth errors are marked failed and surfaced to the user.

### Idempotency

Every platform job needs an idempotency strategy. A timeout after
sending does not automatically mean "retry immediately"; first reconcile
remote status where possible.

Use fields such as: - job_id - post_id - platform - attempt_count -
locked_at - lock_owner - next_attempt_at - remote_publish_id -
last_error_code - last_error_safe_message

Never expose raw OAuth tokens or sensitive upstream error payloads in
the UI.

------------------------------------------------------------------------

# 13. Suggested Database Schema

Core tables:

### users

`id, name, email, password_hash, status, last_login_at, created_at, updated_at`

### roles

`id, name`

### user_roles

`user_id, role_id`

### sessions

`id, user_id, token_hash/session_ref, expires_at, revoked_at, ip_hash, user_agent_hash`

### brands

`id, name, website, default_timezone, settings_json`

### brand_locations

`id, brand_id, name, address, phone, whatsapp, active`

### brand_rules

`id, brand_id, rule_type, content, active`

### social_connections

`id, brand_id, platform, external_account_id, display_name, scopes_json, token_ciphertext, refresh_token_ciphertext, token_expires_at, status, created_by`

### media_assets

`id, brand_id, owner_id, storage_key, original_name, mime_type, byte_size, width, height, duration_seconds, sha256, status`

### posts

`id, brand_id, creator_id, title_internal, brief, status, scheduled_at_utc, approved_by, approved_at, created_at, updated_at`

### post_media

`post_id, media_asset_id, sort_order`

### post_variants

`id, post_id, platform, caption, title, description, hashtags_json, tags_json, platform_settings_json, ai_generated, version`

### publish_jobs

`id, post_id, post_variant_id, platform, status, attempt_count, next_attempt_at, locked_at, remote_publish_id, remote_url, published_at, error_code, safe_error_message`

### ai_generations

`id, post_id, user_id, provider, model, input_hash, status, usage_json, created_at`

### approvals

`id, post_id, reviewer_id, decision, note, created_at`

### audit_logs

`id, actor_user_id, action, entity_type, entity_id, metadata_safe_json, ip_hash, created_at`

### security_events

`id, user_id, type, severity, metadata_safe_json, created_at`

Use migrations. No manual production schema edits.

------------------------------------------------------------------------

# 14. Authentication and Authorization

Recommended for a private internal tool: - email + password -
optional/strongly recommended TOTP MFA for admins - Argon2id password
hashing (or bcrypt with strong cost if Argon2 is unavailable) - secure
server-side session or carefully implemented signed/encrypted session -
HttpOnly cookie - Secure cookie in production - SameSite=Lax/Strict as
workflow permits - session rotation after login/privilege changes -
logout invalidates server-side session - inactivity timeout - absolute
session lifetime - account lock/throttle after repeated failed attempts

All authorization is server-side.

Sensitive operations should require re-authentication/MFA where
practical: - adding/removing admin - changing AI/social credentials -
disconnecting social accounts - exporting sensitive data - changing
security settings

------------------------------------------------------------------------

# 15. OAuth Security

For every social connection: - OAuth only; never ask for social
password. - Generate cryptographically secure `state`. - Bind `state` to
initiating user/session. - Use PKCE where supported. - Strict allow-list
for redirect URIs. - Validate returned account identity. - Request
minimum required scopes. - Encrypt access/refresh tokens at rest. -
Never send tokens to browser JavaScript. - Never log Authorization
headers. - Revoke/delete local token material on disconnect. - Handle
refresh-token rotation correctly. - Mark connection as `reauth_required`
after invalid_grant/auth failure.

------------------------------------------------------------------------

# 16. Secrets and Encryption

Secrets must never be committed to Git.

Production environment variables may include:

``` text
APP_URL=
APP_ENV=production
DATABASE_URL=
SESSION_SECRET=
TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
OPENROUTER_API_KEY=
META_APP_ID=
META_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

`TOKEN_ENCRYPTION_KEY` must be a high-entropy key separate from the
database. Encrypt sensitive OAuth token values using an authenticated
encryption construction such as AES-256-GCM. Store nonce/IV and
authentication tag with ciphertext.

Do not put secrets in: - source code - client bundles - HTML -
screenshots - database seed files - logs - error messages

------------------------------------------------------------------------

# 17. Web Application Security Baseline

Implement: - strict input validation with a schema library -
parameterized ORM/query builder - output encoding - Content Security
Policy - `X-Content-Type-Options: nosniff` - `Referrer-Policy` - HSTS
after HTTPS is confirmed - frame-ancestor protection - secure CORS
policy; preferably same-origin UI/API - CSRF protection for
cookie-authenticated state changes - login and API rate limiting -
request body size limits - authorization checks on object IDs - no open
redirects - safe error pages - dependency lockfile - dependency
vulnerability checks - production source maps not publicly exposed -
debug endpoints disabled in production - health endpoint returns no
secrets - backups - audit trail

Security target should align with OWASP ASVS/Top 10 principles, but no
document can guarantee "100% secure."

------------------------------------------------------------------------

# 18. Upload Security

Uploads are a high-risk boundary.

Rules: - allow-list MIME types and extensions - verify actual file
signature/magic bytes - reject double extensions where dangerous -
enforce per-file size limit - enforce dimensions/duration limits -
generate random server storage names - never use user filename as
executable path - store outside executable application directories where
possible - strip/ignore dangerous metadata where practical - never
execute uploaded files - serve with safe Content-Type - prevent
SVG/HTML/script upload unless explicitly sanitized - calculate SHA-256
for integrity/deduplication - authorization check before media access -
delete orphaned uploads on a cleanup schedule

For V1, prefer common safe media: JPEG, PNG, WebP, MP4, MOV where
required and validated.

------------------------------------------------------------------------

# 19. Webhooks

If a platform uses webhooks: - use dedicated endpoint - verify platform
signature/authenticity exactly as documented - reject invalid/old
signatures - keep handler fast - persist event ID - deduplicate repeated
events - do not trust payload ownership without matching known
connection/account - return appropriate status quickly - process heavier
work asynchronously via database-backed job records

------------------------------------------------------------------------

# 20. Audit Logging

Audit: - login success/failure - logout - password change - MFA
changes - user/role changes - social connect/disconnect -
credential/config changes - AI generation - post create/edit/delete -
approval/rejection - schedule/reschedule/cancel - publish
attempts/results

Do **not** log: - passwords - session secrets - access tokens - refresh
tokens - API keys - Authorization headers - raw secret-bearing webhook
payloads

Audit logs should be append-oriented and not editable by ordinary users.

------------------------------------------------------------------------

# 21. UI/UX Design Specification

## Visual direction

Reference direction supplied by the user: - Gen-Z editorial/experimental
SaaS - Gabriel Sans-like clean sans-serif feel - expressive oversized
display typography - airy off-white surfaces - vivid accent moments -
thin dark borders - rounded pill controls - minimal conventional
shadows - subtle grain/texture on marketing/landing surfaces

Do not copy the reference artwork or branding.

## Functional split

**Public/login/empty-state surfaces:** expressive and editorial.\
**Dashboard/composer/calendar/settings:** restrained, fast and readable.

## Suggested palette

Use design tokens rather than hard-coded scattered colors: - `--bg`:
warm/off-white - `--surface`: white/off-white - `--text`: near-black -
`--muted`: neutral gray - `--brand-primary`: Bismillah red -
`--accent-blue`: energetic sky/azure - `--success`, `--warning`,
`--danger`

Exact production values should be set in one theme file.

## Typography

Use a legally distributable web font with a Gabriel Sans-like modern
grotesk character unless the team has a proper license for a specific
commercial font. Define fallbacks. Do not bundle unlicensed font files.

## Layout

Desktop-first admin dashboard, fully responsive down to mobile. -
collapsible left sidebar - top command/search bar - content canvas -
consistent 8px spacing scale - cards with subtle border - 12-16px
typical corner radius - strong focus states - keyboard accessibility

## Main navigation

-   Overview
-   Create Post
-   Calendar
-   Content
-   Media
-   Approvals
-   Analytics
-   Connections
-   Brand Brain
-   Team
-   Activity
-   Settings

------------------------------------------------------------------------

# 22. Required Screens

1.  Sign in
2.  Forgot/reset password
3.  Dashboard overview
4.  Create Post / Composer
5.  AI generation loading/result state
6.  Post detail
7.  Content list
8.  Calendar
9.  Approval queue
10. Media library
11. Social Connections
12. Connect-account OAuth result
13. Brand Brain
14. AI settings
15. Team/users/roles
16. Analytics overview
17. Publishing logs
18. Audit activity
19. Security settings
20. General settings
21. 403/404/500 states
22. Offline/API failure state

------------------------------------------------------------------------

# 23. Dashboard KPIs

Useful, non-vanity widgets: - scheduled today - awaiting approval -
successfully published - failed/needs attention - disconnected/expired
accounts - AI requests today / configured limit - upcoming posts -
recent publishing activity

Do not fabricate analytics that the connected APIs do not provide.

------------------------------------------------------------------------

# 24. Analytics V1

V1 analytics can be intentionally modest: - publication success rate -
posts by platform - posts by status - publishing failures - AI usage -
workflow throughput - basic platform metrics only where API permissions
expose them reliably

Deep cross-platform attribution is a later phase.

------------------------------------------------------------------------

# 25. API Design

Prefer server-side route handlers/API endpoints with explicit schemas.

Example internal endpoints:

``` text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/me

GET    /api/posts
POST   /api/posts
GET    /api/posts/:id
PATCH  /api/posts/:id
POST   /api/posts/:id/generate
POST   /api/posts/:id/submit-review
POST   /api/posts/:id/approve
POST   /api/posts/:id/reject
POST   /api/posts/:id/schedule
POST   /api/posts/:id/publish
POST   /api/posts/:id/cancel

POST   /api/media
DELETE /api/media/:id

GET    /api/connections
POST   /api/connections/:platform/start
GET    /api/oauth/:platform/callback
DELETE /api/connections/:id

POST   /api/webhooks/:platform
POST   /api/internal/cron/dispatch
```

The cron endpoint must require a high-entropy secret and should
additionally use other available restrictions. It must not accept
arbitrary user-controlled job commands.

------------------------------------------------------------------------

# 26. Application Structure

Suggested structure:

``` text
src/
  app/
  components/
  features/
    auth/
    posts/
    composer/
    calendar/
    approvals/
    media/
    analytics/
    settings/
  server/
    auth/
    db/
    ai/
      providers/
        openrouter.ts
    social/
      meta/
      tiktok/
      youtube/
      linkedin/
    scheduler/
    security/
    audit/
    validation/
  lib/
  styles/
```

Keep UI, domain logic and external API adapters separate.

------------------------------------------------------------------------

# 27. Recommended Technology Decisions

-   Next.js with TypeScript
-   Node.js runtime compatible with Hostinger
-   MySQL
-   Prisma or another mature TypeScript ORM compatible with deployment
-   Zod (or equivalent) for request/AI schema validation
-   Server-rendered/admin UI where appropriate
-   No Redis dependency in V1
-   Database-backed job queue
-   Cron-triggered dispatcher
-   Git repository with protected main branch
-   ESLint + TypeScript strict mode
-   automated tests

Do not select packages solely because an AI model knows them. Verify
active maintenance and compatibility before locking dependencies.

------------------------------------------------------------------------

# 28. Error Handling

Classify failures: - validation - authentication - authorization -
platform permission - expired token - rate limit - unsupported media -
network/transient - platform processing - permanent platform rejection -
AI quota/provider unavailable

User-facing errors must be actionable and sanitized.

Example: Bad: `OAuthException (#190) token eyJ...` Good:
`Facebook authorization has expired. Reconnect the account to continue publishing.`

------------------------------------------------------------------------

# 29. Retry Policy

Retry only transient failures: - network timeout - selected 429/5xx
responses - known temporary processing states

Do not blindly retry: - invalid permissions - invalid media - policy
rejection - invalid credentials - duplicate-risk publish after ambiguous
timeout

Use exponential backoff with a maximum attempt count and jitter.

------------------------------------------------------------------------

# 30. Backup and Recovery

Minimum: - automated database backup - retention policy -
encrypted/off-host copy if available - media backup strategy -
documented restore test - before-deployment backup for schema migrations

A backup that has never been restored is not proven.

------------------------------------------------------------------------

# 31. Hostinger Deployment Plan

1.  Create subdomain, e.g. `social.bismillahelectronics.pk`.
2.  Create production MySQL database/user with least privilege.
3.  Create private Git repository.
4.  Configure Hostinger Node.js application.
5.  Configure production environment variables in hosting controls, not
    source code.
6.  Set production build/start commands according to Hostinger's
    supported Node deployment.
7.  Enable HTTPS.
8.  Configure OAuth callback URLs to the final HTTPS domain.
9.  Configure Hostinger Cron to invoke the scheduler securely.
10. Run database migrations.
11. Create first Super Admin through a one-time secure bootstrap flow.
12. Disable bootstrap route/secret after initialization.
13. Connect test social accounts.
14. Run end-to-end test with private/test content.
15. Verify logs contain no secrets.
16. Configure backups.
17. Perform security checklist before production.

------------------------------------------------------------------------

# 32. Platform Launch Dependencies

A connector can be coded but still not be production-authorized.

Track each connection with: - `development` - `sandbox/test` -
`review_pending` - `approved` - `restricted` - `reauth_required`

Do not show "Connected and ready" unless the account and app permissions
actually support the requested publishing action.

TikTok deserves explicit UI messaging because unaudited Direct Post
clients can be restricted to private visibility.

------------------------------------------------------------------------

# 33. Testing Strategy

## Unit

-   validators
-   permission checks
-   encryption/decryption
-   prompt/output parser
-   scheduler state transitions
-   retry classifier

## Integration

-   database transactions
-   OAuth callback state validation
-   provider adapters with mocked upstream APIs
-   upload validation
-   webhook signature verification

## E2E

-   login
-   create post
-   upload media
-   generate AI copy
-   edit
-   submit approval
-   approve
-   schedule
-   cron dispatch
-   platform result display
-   disconnect/reconnect

## Security tests

-   IDOR attempts
-   CSRF
-   role escalation
-   malicious upload names/types
-   oversized payload
-   brute-force/rate limiting
-   OAuth state mismatch
-   replayed webhook
-   secret leakage in logs
-   XSS payload in caption/brand rules
-   SQL injection strings
-   open redirect attempts

------------------------------------------------------------------------

# 34. Acceptance Criteria for V1

V1 is complete only when:

-   A user can securely log in.
-   Roles are enforced server-side.
-   Admin can configure Brand Brain.
-   Admin can configure OpenRouter without exposing key to client.
-   User can upload validated image/video.
-   AI can return schema-valid five-platform content.
-   User can edit each platform independently.
-   Reviewer can approve/reject.
-   User can publish now or schedule.
-   Scheduler runs without browser presence.
-   Each platform has independent job state.
-   Failed jobs do not duplicate successful jobs.
-   Tokens are encrypted at rest.
-   Secrets do not appear in browser bundle/logs.
-   Audit trail records critical actions.
-   Account disconnect removes/revokes local credential material.
-   Backup process exists.
-   Production deployment uses HTTPS.
-   TikTok limitations/approval state are represented truthfully.
-   Tests pass.
-   Security checklist passes.

------------------------------------------------------------------------

# 35. Build Phases for Codex

## Phase 0 - Repository and guardrails

Create repository, TypeScript strict config, linting, env validation,
test framework, CI checks, `.gitignore`, `.env.example` with
placeholders only.

**Stop gate:** no secrets in repo.

## Phase 1 - UI shell and design system

Implement tokens, typography, responsive shell, sidebar, header,
components and empty screens.

**Stop gate:** no business logic hidden in UI components.

## Phase 2 - Database and authentication

Implement schema/migrations, users, roles, sessions, login/logout, RBAC
and audit foundation.

**Stop gate:** authorization tests pass.

## Phase 3 - Brand Brain and settings

CRUD with audit logging and validation.

## Phase 4 - Media pipeline

Secure uploads, metadata, preview and cleanup.

**Stop gate:** malicious upload tests pass.

## Phase 5 - AI provider

OpenRouter adapter, structured output, quota/rate controls, prompt
safety and UI.

**Stop gate:** invalid AI JSON cannot corrupt application state.

## Phase 6 - Composer and approval workflow

Posts, variants, versioning, approval queue and status machine.

## Phase 7 - Social OAuth connections

Implement providers one at a time. Do not build all simultaneously.

Suggested order: 1. Meta (Facebook/Instagram) 2. LinkedIn 3. YouTube 4.
TikTok

Each provider gets connection tests and capability reporting.

## Phase 8 - Publishing

Provider publish operations, status persistence, safe errors and remote
IDs.

## Phase 9 - Scheduler

Database-backed jobs, locking, cron dispatcher, retry policy,
idempotency.

## Phase 10 - Calendar/logs/analytics

Operational UI.

## Phase 11 - Hardening

Security headers, CSRF review, rate limits, audit review, dependency
audit, secret scan, backup/restore drill.

## Phase 12 - Production launch

Hostinger deployment, OAuth production callbacks, platform app review
process, smoke tests.

------------------------------------------------------------------------

# 36. Codex Master Instruction

Use the following as the controlling instruction when beginning
implementation:

> Build the application described in this PRD incrementally. Do not
> invent requirements that contradict the PRD. Security and data
> integrity take priority over speed. Never place API keys, OAuth
> secrets, access tokens, refresh tokens or encryption keys in
> client-side code. Never store social-media passwords. Use official
> platform APIs only. All protected actions require server-side
> authorization. Validate every external and user-controlled input.
> Treat AI output as untrusted data and validate it against strict
> schemas. Use database transactions/locking where required to prevent
> duplicate publishing. Do not proceed to the next build phase until the
> current phase's tests and stop gate pass. If an external platform
> capability or API permission is uncertain, stop and mark it as a
> dependency rather than fabricating an implementation. The production
> target is Hostinger Business Node.js hosting, so do not introduce
> infrastructure requiring Docker, root access, Redis, or permanent
> workers unless the deployment environment is explicitly changed.

For every phase, Codex must: 1. explain the files it will add/change; 2.
implement the smallest complete slice; 3. add/update tests; 4. run
typecheck/lint/tests; 5. report migrations/env variables; 6. report
security implications; 7. never print secret values; 8. stop on failed
checks instead of hiding them.

------------------------------------------------------------------------

# 37. Initial Environment Template

Create `.env.example` with names only:

``` dotenv
APP_URL=
APP_ENV=
DATABASE_URL=
SESSION_SECRET=
TOKEN_ENCRYPTION_KEY=
CRON_SECRET=

OPENROUTER_API_KEY=
OPENROUTER_MODEL=

META_APP_ID=
META_APP_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

Generate production secrets independently. Do not copy example secrets
into production.

------------------------------------------------------------------------

# 38. Pre-Launch Security Checklist

-   [ ] HTTPS enforced
-   [ ] production debug disabled
-   [ ] secrets absent from repository
-   [ ] secrets absent from client JS
-   [ ] secrets absent from logs
-   [ ] OAuth tokens encrypted
-   [ ] OAuth state validation tested
-   [ ] PKCE enabled where supported
-   [ ] minimum scopes requested
-   [ ] RBAC tests pass
-   [ ] IDOR tests pass
-   [ ] CSRF review complete
-   [ ] XSS tests pass
-   [ ] upload validation tested
-   [ ] rate limits enabled
-   [ ] security headers enabled
-   [ ] session rotation/revocation tested
-   [ ] cron endpoint protected
-   [ ] webhook signatures verified
-   [ ] audit logging enabled
-   [ ] database least-privilege user
-   [ ] database backup configured
-   [ ] restore procedure tested
-   [ ] dependency audit reviewed
-   [ ] platform app approvals checked
-   [ ] test accounts separated from production
-   [ ] failed publish cannot cause duplicate publish
-   [ ] privacy/data retention rules documented

------------------------------------------------------------------------

# 39. Recommended V1 Scope

Do not build every possible feature before first launch.

Ship: - secure internal authentication - Brand Brain - OpenRouter AI
generation - media upload - platform-specific drafts - approval
workflow - Facebook/Instagram connection + publishing - LinkedIn
connection + publishing - YouTube upload - TikTok integration with
truthful approval/restriction state - scheduling - calendar - publishing
logs - basic analytics - audit/security settings

Then use the tool internally for 2-4 weeks before adding automation such
as recurring campaigns or auto-pilot.

------------------------------------------------------------------------

# 40. Known Risks

## Free AI availability

OpenRouter's free tier is capacity/rate limited and has no enterprise
SLA. AI generation can fail even when the rest of the system is healthy.
Design for graceful degradation.

## Platform reviews

TikTok and other providers can require permissions/review. Code
completion does not guarantee production publishing permission.

## Shared-hosting constraints

Hostinger Business is suitable for an initial internal tool, but
sustained heavy video processing, high concurrency or large queues may
eventually justify moving workers/storage to a VPS/object storage.

## API changes

Social APIs change. Provider adapters and capability checks are
mandatory.

## Human error

The largest content risk is approving incorrect commercial information.
Pre-publish confirmation and audit logs reduce, but do not eliminate,
this risk.

------------------------------------------------------------------------

# 41. Final Decision

Proceed with the build on existing Hostinger Business hosting.

Use **Next.js + TypeScript + MySQL + OpenRouter + official social APIs +
database-backed scheduler + Hostinger cron**.

The design direction should combine an expressive Gen-Z editorial
landing/login experience with a restrained professional operations
dashboard. Security is a first-class requirement, but the product must
not claim to be "fully/100% secure"; it must instead implement the
controls in this specification and undergo testing before production
use.
