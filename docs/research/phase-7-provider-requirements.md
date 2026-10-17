# Phase 7 provider research — access blocked

Attempt date: 2026-10-16. Status: **UNVERIFIED; not an implementation specification.**

Public official documentation was requested over HTTPS without credentials. All
16 requests failed at the environment's outbound proxy with
`Tunnel connection failed: 403 Forbidden`. No provider documentation body was
retrieved. This is an environment access restriction, not evidence that a provider
has rejected the application or discontinued a capability. No real OAuth, token,
discovery, revocation or publishing API was called.

The URLs below are research targets, not successfully reviewed sources. Even their
current page availability remains unverified. No endpoint, scope, PKCE behavior,
token lifetime or approval rule is approved based on memory or the prompt's leads.

## Official source targets and access results

Every target below returned the same proxy 403 on the attempt date.

### Meta

- https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/
- https://developers.facebook.com/docs/pages-api/getting-started/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started/
- https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
- https://developers.facebook.com/docs/facebook-login/guides/advanced/

Must verify: exact supported Facebook Login flow and API version; authorization
and exchange endpoints; PKCE for that exact flow; registered redirect requirements;
Page discovery and task/role authority; linked Instagram professional-account
eligibility; minimum connection scopes versus future publishing scopes; actually
granted scopes; user/Page token lifetimes and extension; revocation/deauthorization,
signed-request and webhook prerequisites; development/live restrictions, advanced
access, app review and business verification requirements. All remain UNVERIFIED.

### TikTok

- https://developers.tiktok.com/doc/login-kit-web/
- https://developers.tiktok.com/doc/oauth-user-access-token-management/
- https://developers.tiktok.com/doc/tiktok-api-scopes/
- https://developers.tiktok.com/doc/content-posting-api-get-started/

Must verify: current web Login Kit authorization-code flow and endpoints; state,
exact redirect requirements and PKCE support/requirements for web; identity endpoint;
access/refresh lifetimes, rotation and revocation; minimum identity scopes and
partial grants; app review/test restrictions; separate Content Posting product,
future posting scopes and audit/Direct Post restrictions. Login Kit success must
not be represented as Content Posting approval. All external facts remain UNVERIFIED.

### Google / YouTube

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2/resources/best-practices
- https://developers.google.com/youtube/v3/docs/channels/list

Must verify: current confidential web authorization-code flow/endpoints; PKCE for
that architecture; exact redirect matching; offline access, consent and incremental
authorization; refresh issuance, expiry/rotation and revocation; channel discovery;
least-privilege connection scopes versus future upload scope; testing restrictions,
consent-screen verification and YouTube-specific review requirements. All remain
UNVERIFIED. A Google identity alone must not prove channel/upload authority.

### LinkedIn

- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api

Must verify: current authorization-code flow/endpoints; web PKCE support; redirect
matching; token lifetime/revocation; program-dependent refresh eligibility; member
identity versus organization destination discovery and qualifying organization
roles; connection versus future organization-posting scopes/products; current API
version and review/test restrictions. The prompt's `w_organization_social` lead
has not been independently verified. All external facts remain UNVERIFIED.

## Provider approval / readiness matrix

| Provider | OAuth availability and endpoints | Required app/product setup | Connection scopes | Future publishing scopes | Review / development limits | Production readiness | Known blocker |
|---|---|---|---|---|---|---|---|
| Meta: Facebook + Instagram | Unverified | Unverified | Unverified | Unverified | Unverified | UNVERIFIED | Official documentation inaccessible; app/domain/approval not verified |
| TikTok | Unverified | Unverified | Unverified | Unverified | Unverified | UNVERIFIED | Official documentation inaccessible; app/domain/approval not verified |
| Google / YouTube | Unverified | Unverified | Unverified | Unverified | Unverified | UNVERIFIED | Official documentation inaccessible; app/domain/approval not verified |
| LinkedIn organizations | Unverified | Unverified | Unverified | Unverified | Unverified | UNVERIFIED | Official documentation inaccessible; app/domain/approval not verified |

This matrix records missing evidence, not provider capability claims. Missing
credentials need not block future fake-provider tests, but they cannot substitute
for verified public protocol documentation when building real adapters.

## Required follow-up before real adapters

Allow read-only HTTPS documentation access to `developers.facebook.com`,
`developers.tiktok.com`, `developers.google.com`, and `learn.microsoft.com`, or
supply authoritative current documentation for review. Preserve existing network
settings; do not replace an unknown allowlist. Revisit official linked scope,
revocation, app-review and verification references once accessible. Record exact
review dates and evidence for every unresolved requirement above. Do not bypass
TLS or use unofficial mirrors as normative sources.

Later manual verification must cover developer-app/product setup, registered
HTTPS callback based on verified APP_URL, scopes, approval/test-user eligibility,
authorization, destination identity/selection, encrypted storage, refresh,
revocation/disconnect and reconnect. Production callback URLs remain templates;
no deployment domain is invented. Do not publish to prove connectivity.

Hostinger and all four production integrations remain **UNVERIFIED**. No live
credentials or calls are needed for deterministic CI. This research-access record
does not satisfy the master prompt's current-provider-documentation verification.

## A. Subsequent Codex environment research attempts

On 2026-10-16, the five newly supplied URLs below were also attempted directly.
All five again returned `Tunnel connection failed: 403 Forbidden`. This is an
ENVIRONMENT / RESEARCH-ACCESS limitation, not a provider API failure, rejection,
OAuth incompatibility or application defect. There are now 21 recorded attempts
(16 original plus five supplied URLs); zero fetched documentation bodies.

## B. Independently supplied official-source findings

The user supplied these independently verified findings on 2026-10-16. Their
provenance is the user's official-source review, **not a successful Codex fetch**.

TikTok references:

- https://developers.tiktok.com/docs/en/login-kit-web
- https://developers.tiktok.com/docs/en/login-kit-manage-user-access-tokens
- https://developers.tiktok.com/docs/en/scopes-overview

Supplied findings: OAuth 2.0 web authorization-code flow; registered, static HTTPS
redirect URI under the current documented web rules; state anti-forgery protection;
server-side exchange and access/refresh token management; partial scope consent;
additional-scope app approval; Content Posting remains a separate future product.

Google / YouTube references:

- https://developers.google.com/youtube/data/guides/auth/server-side-web-apps
- https://developers.google.com/youtube/data/guides/authentication

Supplied findings: private/user-authorized YouTube operations use OAuth 2.0;
web-server authorization-code flow supports offline authorization/refresh under
Google's flow; incremental authorization recommended; youtube.readonly and
youtube.upload are among the scopes; applicable public user-data scope use may
require verification; successful OAuth does not prove a video upload succeeded.

## C. Requirements confirmed from official documentation

No additional official content was directly retrieved in this environment. The
supplied findings above support the high-level design, but do not establish exact
wire endpoints, all response fields, PKCE behavior for the chosen confidential
web flow, expiration/rotation edge cases or complete destination discovery rules.
No production adapter is frozen from those summaries alone.

## D. Still unverified

Meta and LinkedIn protocol details remain UNVERIFIED. TikTok and Google exact
adapter contracts, including PKCE status for this particular server flow, remain
unverified by this environment. No PKCE parameters are invented for real providers.
The deterministic fake provider uses PKCE solely to test the shared machinery;
that is no evidence of a real provider's support.

## E. Provider-dashboard / later manual verification

For every provider, real app/client configuration, redirect registration, product
access, approved scopes, account eligibility, app review, test-user restrictions
and production connection remain UNVERIFIED. TikTok approval and Google consent/
verification must be checked separately from protocol documentation. All real
adapters remain disabled; authorized managers see setup required. Fake providers
exist only in tests and cannot be registered by the production runtime.
