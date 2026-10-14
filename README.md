# AI Social Media Automation

AI-powered social media content generation, scheduling and publishing platform.

Target platforms:
- Facebook
- Instagram
- TikTok
- YouTube
- LinkedIn

Deployment:
- Hostinger Business Node.js
- MySQL
- OpenRouter

## UI foundation — Phase 1 only

The full source-of-truth specification is [the master PRD](docs/Bismillah_Social_AI_Master_PRD.md).
Phase 0 is approved and closed. Phase 1 adds the UI shell, design system, static demo dashboard,
and disabled sign-in preview. Phase 2 and later phases are not authorized.
There is no database schema, authentication, provider integration, upload, publishing, or scheduler.

Use Node **24.21.0** with bundled npm **11.19.0** (`.nvmrc` / `.node-version`).
Use an existing version manager where available; no global/root services are required.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run secret-scan
npm run audit
npm run build
```

All checks and the UI build work without database or provider credentials. Do not supply production secrets.
On the cloud machine, set `NPM_CONFIG_CACHE=/workspace/.npm-cache` if the default home cache is unwritable.
The prepared cloud toolchain is `/workspace/.tools/node-v24.21.0-linux-x64/bin`; prepend it to PATH for this instance.
Run `npm run dev` to inspect the UI, or `npm run build` followed by `npm run start` to inspect a production build.
Routes: `/`, `/login`, `/overview`, the 12 main navigation destinations, `/ui-kit`, `/403`, `/500`, `/offline`.
An unknown route exercises the actual 404 page. The 403/500/offline routes are visual previews, not real auth/API status handling.

Browser checks: `npm run test:browser` after a production build. On this cloud machine, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` to use the existing Chromium.
Elsewhere, install the test browser with `npx --no-install playwright install chromium`.
Playwright is used only for local UI testing, never social posting automation.

Font: self-hosted DM Sans Variable, SIL OFL 1.1. Copyright and license are retained in
`public/fonts/DM-Sans-OFL.txt`. No runtime Google Fonts requests are made.

See [toolchain decisions](docs/architecture/phase-0.md), [configuration security](docs/security/configuration.md),
and [Hostinger assumptions](docs/deployment/hostinger.md).

See [Phase 1 architecture, tokens, and review manifest](docs/architecture/phase-1.md).
