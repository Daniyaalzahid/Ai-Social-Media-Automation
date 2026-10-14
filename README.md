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

## Development foundation — Phase 0 only

The full source-of-truth specification is [the master PRD](docs/Bismillah_Social_AI_Master_PRD.md).
Only repository guardrails are implemented. Phase 1 requires explicit approval.
There is no application UI, database schema, authentication, provider integration, or running server yet.

Use Node **24.21.0** with bundled npm **11.19.0** (`.nvmrc` / `.node-version`).
Use an existing version manager where available; no global/root services are required.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run secret-scan
npm run audit
```

All checks work without database or provider credentials. Do not supply production secrets.
On the cloud machine, set `NPM_CONFIG_CACHE=/workspace/.npm-cache` if the default home cache is unwritable.
The prepared cloud toolchain is `/workspace/.tools/node-v24.21.0-linux-x64/bin`; prepend it to PATH for this instance.
No dev/build/start scripts are offered until the application shell is approved.

See [toolchain decisions](docs/architecture/phase-0.md), [configuration security](docs/security/configuration.md),
and [Hostinger assumptions](docs/deployment/hostinger.md).
