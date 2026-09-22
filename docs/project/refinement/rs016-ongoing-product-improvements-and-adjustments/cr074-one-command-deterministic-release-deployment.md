[< RS016](index.md)

# CR074: One-Command Deterministic Release Deployment

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr074-one-command-release-deploy`

## Problem

Publishing a release is currently a long sequence of hand-typed commands, each
interrupted by a separate authorization request. The Alpha.15 publication made
both costs concrete.

**The mechanics are not deterministic.** The endpoint the installed application
polls lives in `src-tauri/tauri.alpha-update.conf.json`:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json
```

`scripts/private_update_publish.mjs` carries an independent constant for the
same destination:

```js
const defaultBaseUrl = "https://updates.mirrormind.sh/mirror-desktop";
```

They disagree, and the disagreement fails silently: `scripts/alpha_build.mjs`
reads the channel config, the publisher does not. Alpha.15 was therefore
published to `/mirror-desktop`, reported `PUBLISHED`, and verified clean across
six manifest paths — none of which any installed application polls. The
Navigator discovered the defect by opening Alpha.14 and seeing no update
indicator. Republishing with an explicit `--base-url .../alpha` corrected it.

**The authorization model interrupts the wrong thing.** Preparation and
publication are two separately authorized stages, and several intermediate
steps request their own approval, while the checks that would actually catch a
defect depend on the agent choosing to perform them. The Navigator is
interrupted repeatedly for permission and under-served by verification.

**Hand-written evidence is fragile.** Both Alpha.15 evidence documents were
first written through shell heredocs and corrupted by backtick interpolation,
requiring a correction commit and an amend.

## Expected Behavior

A single Navigator instruction such as "publish the release" runs the whole
route, with exactly one confirmation.

**Preparation runs uninterrupted**: version bump across all coordinates,
authored release note, full gates, runtime preflight, signed channel build and
candidate inspection.

**One confirmation, after preparation.** The agent stops once and presents the
materialized facts, including:

- the authored release title and the full authored release-note text, so the
  Navigator reviews the actual prose that will ship, not a summary of it;
- version, tag to be created and candidate source revision;
- gate results and preflight status;
- artifact filenames with their real checksums;
- the publication base URL **as derived from the application updater config**;
- the exact set of manifest paths that will be written;
- what will be pushed, tagged, released and published.

**Everything after the confirmation runs to completion without further
questions**: push, tag, GitHub release, endpoint publication, post-publication
verification and evidence commit. A declared mode may reduce this to zero
confirmations.

**Gates replace questions.** Verification becomes automatic and fail-closed
rather than a request for approval:

- the publication base URL is derived from `endpoints[0]` of the channel
  updater config by stripping the `{{target}}/{{current_version}}/latest.json`
  suffix; an explicitly passed base URL that diverges fails closed instead of
  publishing where nobody polls;
- retained current versions are derived rather than hand-typed;
- post-publication verification fetches the exact URLs an installed application
  would poll, deriving target and current version from the retained versions,
  and requires the served version to equal the published version with a
  non-empty signature;
- preparation and publication evidence is emitted by the script from the data
  it actually used, never hand-composed.

**The route is resumable and idempotent.** Re-running after a mid-sequence
failure completes the remaining stages without manual surgery, and republishing
the same version is safe.

## Authority Scope Change

The script alone does not fix this. `docs/project/refinement/collaboration-protocol.md`
and `docs/update/alpha-channel-governance.md` currently require push, tag,
publication and release to be authorized as separate decisions, so a future
session would correctly re-ask. This CR includes amending them to define
release publication as one authorization scope whose internal mechanics are
covered by automatic gates rather than by repeated questions.

Automating the mechanics must not automate the decision: the route still starts
only from an explicit Navigator instruction, and dry-run remains the default
for any invocation that does not declare publication intent.

## Proposed Scope

- A deploy script orchestrating the full route with fail-closed ordering.
- Base URL derivation from the application updater configuration, with
  divergence refused.
- Derived retained-version set and manifest path list.
- Post-publication verification against the polled URLs as a blocking gate.
- Script-emitted preparation and publication evidence.
- Resumability across stages and idempotent republication.
- Protocol and governance amendments defining the single authorization scope.
- Focused tests covering base URL derivation, divergence refusal, manifest path
  derivation, post-publication verification failure, and the confirmation
  payload including authored title and release-note text.

## Acceptance

- One Navigator instruction reaches a published, verified release with exactly
  one confirmation.
- The confirmation payload displays the authored release title and full release
  note text alongside the candidate facts and derived destination.
- A publication whose destination diverges from the application updater config
  cannot succeed.
- A publication that does not serve the new version at the polled URLs fails
  the route and reports it.
- Evidence documents are produced by the script and require no manual editing.
- No step between the confirmation and completion requests further
  authorization.

## Exclusions

- No notarization, app-store distribution, or Windows/Linux packaging.
- No stable-channel widening or key-custody change.
- No Mirror Core, production memory, Journey data or app data mutation.
- No automatic release triggering without an explicit Navigator instruction.

## Evidence

- Alpha.15 publication to the wrong prefix and its correction:
  [publication record](../../../update/alpha-15-release-publication-2026-09-22.md).
- `scripts/private_update_publish.mjs` `defaultBaseUrl` versus
  `src-tauri/tauri.alpha-update.conf.json` `endpoints[0]`.
- `scripts/alpha_build.mjs` reads the channel config; the publisher does not.

## Plan

- `scripts/release_deploy.mjs`: the orchestrated route with pure, tested
  functions (`assertBaseUrlAgreement`, `compareReleaseVersions`,
  `deriveRetainedVersions`, `releaseNoteAuthorship`, `confirmationPayload`,
  `renderConfirmation`, `verifyPublishedEndpoints`, evidence renderers) and a
  CLI with `plan` (dry-run default), `prepare`, `publish --yes` and `reset`,
  backed by resumable per-version state under `.tmp/release-deploy/`.
- `scripts/private_update_publish.mjs`: kill the root defect by deriving
  `defaultBaseUrl` from `endpoints[0]` of `src-tauri/tauri.alpha-update.conf.json`
  through exported `deriveBaseUrlFromUpdaterConfig(...)`.
- `package.json`: `release:deploy` command.
- Governance amendments in `docs/update/alpha-channel-governance.md`
  (Publication Boundary as one authorization scope; runbook points to the
  deterministic route) and `docs/project/refinement/collaboration-protocol.md`
  (Authority Boundary names the single release-publication scope).
- Tests in `src/tests/releaseDeploy.test.mjs`; updated expectations in
  `src/tests/privateUpdatePublish.test.mjs` for the derived default.

## Implementation Evidence

- `deriveBaseUrlFromUpdaterConfig` requires the polled manifest shape
  `/{{target}}/{{current_version}}/latest.json` and HTTPS with a path prefix;
  the publisher default is now the derived `/mirror-desktop/alpha` base.
- `assertBaseUrlAgreement` reproduces the Alpha.15 defect as a refusal:
  requesting `https://updates.mirrormind.sh/mirror-desktop` against the derived
  `/alpha` base fails closed with "no installed application polls it".
- `deriveRetainedVersions` orders prerelease numbers numerically (Git tag
  listing is lexicographic: `alpha.9` sorted after `alpha.15`), returning the
  latest published tag plus the release.
- `confirmationPayload` refuses missing authored title/text, placeholder
  SHA-256 digests, empty manifest paths; `renderConfirmation` prints the
  authored title and the full release-note text verbatim between explicit
  delimiters.
- `verifyPublishedEndpoints` polls every `target x retained-version` URL and
  fails closed on wrong served version, empty signature or unreachable
  manifest.
- Preparation and publication evidence markdown is rendered by the script from
  route data; the publish route commits and pushes it as its final stage.
- Dry-run smoke: `npm run release:deploy` derived base URL
  `https://updates.mirrormind.sh/mirror-desktop/alpha`, retained versions
  `0.2.0-alpha.14, 0.2.0-alpha.15` and the six manifest paths, matching the
  corrected Alpha.15 publication exactly; the divergent `--base-url` was
  refused.

## Checks

- `npx vitest run src/tests/releaseDeploy.test.mjs src/tests/privateUpdatePublish.test.mjs` — 19 passed.
- Full `npm test -- --run` and `node scripts/roadmap_consistency.mjs` recorded at commit time.

## Navigator Validation

Validated by the Navigator on 2026-09-22 over the implementation evidence and
the dry-run behavior: the derived publication base URL matches the endpoint the
installed application polls, a divergent base URL is refused, retained versions
and manifest paths are derived, and the confirmation payload carries the
authored release title and full release-note text.

## Proportionality and Debt Review

**Proportionate.** The change is confined to release tooling, its tests and the
two governance documents that own authorization scope. No product runtime,
conversation authority, Mirror persistence or provider path was touched, so the
blast radius of a defect here is a blocked release, never corrupted user data.

**Debt accepted, and named.** Three limits ship knowingly:

- The route is exercised end to end only by a real release. The pure functions
  are unit-covered, but push, tag, GitHub release and SSH upload are verified
  by use, not by test doubles. The first release after this CR is therefore the
  route's real acceptance.
- Post-publication verification proves the manifest an installed application
  would read; it does not prove that a running application then downloaded and
  applied the update. Installed-app update validation stays a manual step.
- The derived base URL binds to `src-tauri/tauri.alpha-update.conf.json`. A
  future second channel with its own config will need the channel selected
  explicitly rather than assumed.

**Debt retired.** The publisher no longer carries a base URL constant that can
silently disagree with the application, and evidence documents are no longer
hand-composed through shell heredocs.

## Closure

Closed on 2026-09-22 on `refinement/rs016-cr074-one-command-release-deploy` at
`22e5700`, merged to `main`. The Alpha.15 wrong-prefix defect is structurally
unreachable: the destination is derived, divergence fails closed, and
publication cannot report success while the polled URLs still serve the
previous version.

## Authority Boundary

Closed under explicit Navigator validation. Any release that exercises the new
route remains its own Navigator decision, authorized as the single
release-publication scope this CR defines.
