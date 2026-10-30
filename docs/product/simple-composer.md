# Single-screen composer

Create Post is the primary publishing workspace. Overview links directly to it;
Posts keeps the existing `/content` URL. More contains the existing advanced
routes, filtered by the existing server permissions.

The composer calls the existing media, AI, content and publishing APIs. No schema,
provider registration, authentication or storage change is needed. The library
and composer share `MediaUpload`; previews use authenticated `/api/media` reads.
Removing/replacing a selection detaches it from the next saved revision, not from
historical revisions. Unattached uploads remain covered by existing cleanup.

One master caption is inherited by selected channels unless a channel override
is supplied. AI results remain editable; importing and saving uses the existing
AI provenance path. The advanced editor and generation history remain available.
Typed campaign facts still require the existing exact formats and policies.

## Publishing safeguards

Only destinations returned by the server's enabled publishing registry, connected
account, scopes, destination kind and credential-version checks are selectable.
Select All selects only those destinations. The reviewed LinkedIn publisher is
text-only; selecting media makes that destination unavailable.

Post Now saves an immutable revision, submits it using the existing content
service, and records approval only if the current actor has permission to approve
that exact revision (including self-approval). Otherwise it stays awaiting review.
The existing closed supported-phrase / authorized-fact contract still applies:
arbitrary prose can be saved but cannot silently bypass submission validation.
Use channel-specific copy where that policy requires it; sharing one arbitrary
caption across all channels does not imply policy approval.

Every destination has its own existing preview, intent hash, action-bound proof,
operation and result. Password/MFA confirmation remains mandatory per destination;
a fresh TOTP is required for each confirmation because replay protection remains
unchanged. Session rotation and CSRF tokens use the existing endpoints. Unknown
outcomes are not retried automatically. Already-published results stay published
when another destination fails. Failed or uncertain batches remain locked against
accidental resubmission; inspect the post's persisted operation history.

Production registries currently leave all five publishers disabled/unverified.
Credentials alone do not enable them. Connected but unpublishable accounts are
labelled accordingly. Scheduling has no dispatch backend and remains explicitly
unavailable; the composer never creates a fake schedule or publication.

Posts shows authorized copy/media and the latest persisted publication per
channel/destination for the displayed revision. Viewer responses remain limited
to approved text. Overview counts only its bounded, access-scoped recent page;
it does not claim lifetime metrics or show sample activity.

## Regression validation

`npm run test:browser` covers the normal provider-disabled application. Run the
additional connected workflow with:

```
node --env-file=<isolated-browser.env> node_modules/@playwright/test/cli.js test --config=playwright.composer.config.ts --retries=0
```

This requires the existing disposable `bsa_dev_browser_tests` configuration. Its
server creates a temporary copy of the current application, replacing only the
publishing and AI provider factories. No production switch or test registration
is added. Login, MFA, CSRF, uploads/private preview, revisions, approval, publishing
and persisted results are real. Synthetic external publishers return one success
and one failure to verify partial results. Production credentials and external
provider traffic are never used.
