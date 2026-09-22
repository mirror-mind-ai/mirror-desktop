[< RS016](index.md)

# CR075: Serve the Latest Release to Every Installed Version

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr075-update-to-latest`

## Problem

After Alpha.16 was published through the CR074 route, the Navigator on
Alpha.14 was offered Alpha.15, and only after installing and opening Alpha.15
was offered Alpha.16. Updates arrived one hop at a time.

The cause is the CR074 retention policy. `deriveRetainedVersions(...)`
returned only the latest previously published version plus the release, so
each publication rewrote just two manifest chains. Older chains kept whatever
they served last, producing a chained ladder on the endpoint:

```text
alpha.13 -> alpha.14
alpha.14 -> alpha.15
alpha.15 -> alpha.16
alpha.16 -> alpha.16
```

Remote inspection on 2026-09-22 confirmed the ladder reached back to
`alpha.8 -> alpha.11`.

## Expected Behavior

The updater invariant is: **every manifest path for a version an installed
application might be on serves the latest published release.** A user two or
ten versions behind updates in exactly one hop.

- The retained set is derived from Git tags: every published version strictly
  below the release, plus the release itself. No hand-enumerated version
  lists.
- Versions above the release are excluded, so republishing an older release
  can never downgrade the manifest chain of a newer one.
- The blocking post-publication verification continues to poll every derived
  path, which now proves the one-hop invariant for all installed versions.

## Scope

- `deriveRetainedVersions(...)` in `scripts/release_deploy.mjs` returns the
  full published set below the release plus the release.
- Regression tests in `src/tests/releaseDeploy.test.mjs`: the chained-update
  case (an application two versions behind must have its manifest rewritten)
  and the downgrade guard.
- One-line invariant in `docs/update/alpha-channel-governance.md`.
- Operational repair: republish Alpha.16 through the corrected route so every
  served manifest chain points to `0.2.0-alpha.16`.

## Exclusions

- No change to artifact retention (all manifests point to the latest artifact;
  older artifacts remain governed by existing retention rules).
- No new channel, key or endpoint.
- No Mirror data or app data mutation.

## Authority Boundary

Captured and implemented under explicit Navigator instruction in the same
session, as an operational defect repair on the just-published Alpha.16.
Validation and closure remain Navigator decisions.
