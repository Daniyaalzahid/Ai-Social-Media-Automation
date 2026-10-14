# Phase 1: UI shell and design system

Phase 0 is approved and closed. Only Phase 1 is authorized. Stop for review without committing/pushing; Phase 2 requires explicit approval.

## Architecture and scope

Next App Router pages and layouts render on the server by default. Server-rendered page content is passed as children to the interactive AppShell, preserving the boundary instead of importing server features into the client.
Small client boundaries cover the shell, native dialog, tabs, non-submitting login form, component gallery, and framework error recovery. Interactive state is presentation-only; no business services, persistence, auth, credentials, sessions, provider calls, jobs, or uploads are implemented.
Overview data is explicitly labeled illustrative and kept in src/features/overview/mock-data.ts. All channels say Not connected.
The server environment schema and its Phase 0 guardrails are unchanged. No new application environment variable or migration is required.

## Pages

- /: original editorial landing preview.
- /login: expressive disabled email/password form; no real credential entry, request, or authentication. Demo exploration is an ordinary navigation link.
- /overview: static dashboard metrics, sample upcoming posts/activity, AI quota illustration, unconnected channels.
- /create-post, /calendar, /content, /media, /approvals, /analytics, /connections, /brand-brain, /team, /activity, /settings: prerendered empty placeholders using one allowlisted route implementation.
- /ui-kit: interactive component reference, with local-only form controls, tabs and dialog.
- /403, /500, /offline: visual state previews returning ordinary page responses; no authorization/API functionality is claimed.
- Unknown routes: actual framework 404 response and custom page.
- Framework loading, error and global-error boundaries show sanitized UI without rendering raw error objects.

## Design tokens

src/styles/tokens.css owns colors, font sizes/leading/tracking, 8px spacing scale (4px half-step), radii, borders, focus ring, control sizing, shell widths, and named breakpoints.
Warm background #f6f5f0; near-black #23241f; Bismillah red #bf3028; blue #2459b5; muted text #66685e. Success/warning/danger have distinct text labels and colored soft surfaces.
Cards use 16px corners, controls 12px, pill buttons 999px, and thin borders. No conventional drop shadows.
Focus is a visible 3px blue ring. Primary interactive controls target at least 44px height.
Breakpoint values are 640, 960, 1280px. CSS variables cannot currently drive media queries; media rules use the matching canonical numeric boundaries, and shell matchMedia uses 960px. Browser tests verify actual behavior.

## Font and licensing

DM Sans Variable 5.3.0 from @fontsource-variable/dm-sans is self-hosted through the npm lockfile, not fetched at runtime or build from Google Fonts.
Its modern grotesk forms, broad variable weights, and clear small text suit both editorial display type and a restrained dashboard; it is an alternative in spirit to Gabriel Sans, not a commercial font copy.
License: SIL Open Font License 1.1. Copyright 2014 The DM Sans Project Authors. Complete notice/license is served at /fonts/DM-Sans-OFL.txt.
Sources verified: https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt and the installed package's LICENSE/metadata.
Fallbacks: Arial, sans-serif. Phase 1 copy is English; Urdu typography/shaping needs its own verified font decision before that feature.
Decorative marks and icons are original inline SVG/CSS constructions, avoiding platform-specific emoji rendering and copied artwork.

## Components and accessibility

Button, IconButton, Card, Badge, Input, Textarea, Select, Checkbox, Tabs, Dialog, EmptyState, LoadingState, ErrorState, PageHeader, Icon, Brand and StatusPage.
Semantic native form controls have labels and linked hint/error descriptions. Buttons default to type=button; icon buttons require accessible labels. Login controls are disabled and explain their preview status.
Tabs have roving tabIndex, associated panels, ArrowLeft/Right wrapping, Home/End, and selected state.
Dialog uses showModal for background inertness, explicit Tab/Shift+Tab wrapping, Escape close, scroll lock/cleanup, and native focus return. Native behavior is validated in Chromium; jsdom's dialog stub tests only rendering/lifecycle.
The shell has a skip link, named navigation, current-page indication, main landmark, route-change focus, persistent accessible link names when collapsed, and a modal drawer below 960px. Resizing to desktop closes the drawer.
The desktop header includes an accessible disabled search placeholder; it performs no queries and hides when space is constrained.
Below 640px, metrics use two columns and page/content sections stack; login and landing panels stack. Reduced motion disables animations/transitions without removing status text. Core text/background token pairs are tested against WCAG AA normal-text contrast.

## Tooling compatibility

New tools were checked against official npm version/engine/peer metadata: Testing Library React 16.3.3, DOM 10.4.2, user-event 14.6.8, jest-dom 7.0.1, jsdom 30.1.2, and Playwright 1.64.0. Existing Node 24.21, npm 11.19, Next 16.4, React 19.3, TypeScript 6.0.3, ESLint 10 and Vitest 5 remain pinned.
jest-dom's /vitest type augmentation still targets the previous Assertion interface. The supported standalone expect.extend matcher API plus a narrow, fully typed Vitest-5 declaration is used instead. skipLibCheck remains false and strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes remain true.
ES2024 library declarations cover Next's PromiseWithResolvers types, supported by the selected Node runtime; emitted target remains ES2022. JS source is not included in TypeScript compilation. next typegen precedes typecheck to generate required route declarations from a fresh checkout. next-env.d.ts is an ignored, generated helper (as with .next outputs), so switching build/dev mode does not modify protected tracked files.
The Phase 0 ESLint configuration and every existing rule remain unchanged. An optional @next/eslint-plugin-next 16.4.0 addition was evaluated, but the final audit flagged its fast-glob/micromatch/braces chain (GHSA-vfj7-8cjw-p6xm, four high findings including dependents). Registry checks found no compatible fixed stable release, so the addition was removed instead of suppressing the audit or downgrading to the old framework-era plugin suggested by npm audit fix --force. Framework-specific lint rules remain an explicit compatibility dependency; source-boundary, DOM, contrast and browser tests add UI verification without weakening any Phase 0 check.

## Validation and review

Required: npm ci, lint, strict typecheck, tests, secret scan, dependency audit, production build. Browser checks use the production build and existing /usr/bin/chromium on this cloud machine; no root installation or runtime worker is introduced. CI downloads its development-only browser on GitHub's managed runner.
Unit/DOM checks exercise critical rendering, labels, tab navigation, dialog lifecycle, navigation/collapse/mobile state, preview login, mock disclosure, core token contrast, and actual client dependency graphs. Existing Phase 0 security tests remain intact.
Real-browser checks cover all navigation routes, real 404, safe login, route focus, keyboard focus trapping/return, no browser errors, five responsive widths (320/390/768/1024/1440), and reduced motion.
Browser tests always start their own current production build on port 3100 and refuse to reuse another process; this prevents a stale preview server from serving outdated HTML/chunks after a rebuild.
Screenshots are retained outside the repository at /workspace/phase1-artifacts, not committed.

## Limitations and security scope

This is a publicly navigable UI preview, not an authenticated/private production application. Do not deploy it as the live internal tool or enter real credentials/data.
All dashboard metrics, quota, posts, and activity are fixtures, not real analytics. Navigation placeholders implement no actions. Offline/error previews are visual; there is no live API integration or service worker.
No database, Prisma, authentication, sessions, OAuth, AI/social API, scheduler, upload, publishing, analytics API, or Hostinger deployment is present.
Response headers add nosniff, referrer policy, frame denial, and no-index; public production source maps stay disabled. Full CSP/auth/CSRF/rate controls will be implemented with the appropriate approved features and reviewed before launch.
Hostinger account-specific Node/runtime/storage limits remain unverified. No paid infrastructure or new production service is introduced.

## File review manifest

See the final manifest below. All Phase 1 changes remain unstaged for review.

```text
 M .github/workflows/ci.yml
 M .gitignore
 M AGENTS.md
 M README.md
 M package-lock.json
 M package.json
 M tsconfig.json
 M vitest.config.ts
?? docs/architecture/phase-1.md
?? next.config.ts
?? playwright.config.ts
?? public/fonts/DM-Sans-OFL.txt
?? src/app/(workspace)/[section]/page.tsx
?? src/app/(workspace)/layout.tsx
?? src/app/(workspace)/loading.tsx
?? src/app/(workspace)/overview/page.tsx
?? src/app/(workspace)/ui-kit/page.tsx
?? src/app/403/page.tsx
?? src/app/500/page.tsx
?? src/app/error.tsx
?? src/app/global-error.tsx
?? src/app/layout.tsx
?? src/app/login/page.tsx
?? src/app/not-found.tsx
?? src/app/offline/page.tsx
?? src/app/page.tsx
?? src/components/brand.tsx
?? src/components/shell/app-shell.tsx
?? src/components/shell/navigation.ts
?? src/components/status-page.tsx
?? src/components/ui/badge.tsx
?? src/components/ui/button.tsx
?? src/components/ui/card.tsx
?? src/components/ui/dialog.tsx
?? src/components/ui/fields.tsx
?? src/components/ui/icon.tsx
?? src/components/ui/page-header.tsx
?? src/components/ui/states.tsx
?? src/components/ui/tabs.tsx
?? src/features/auth/login-form.tsx
?? src/features/design-system/component-showcase.tsx
?? src/features/overview/mock-data.ts
?? src/features/overview/overview.tsx
?? src/lib/classes.ts
?? src/styles/globals.css
?? src/styles/tokens.css
?? tests/browser/ui.spec.ts
?? tests/dom-matchers.d.ts
?? tests/setup.ts
?? tests/ui/components.test.tsx
?? tests/ui/shell-and-pages.test.tsx
?? tests/unit/design-contrast.test.ts
?? tests/unit/ui-boundaries.test.ts
```
