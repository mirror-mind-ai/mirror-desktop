[< Parent](../index.md)

# CV-005.DS-003.US-1 - Produce a Private Alpha Bundle

**Status:** 🟠 In Progress
**Type:** User Story

## User Story

As the Mirror Desktop maintainer,
I want one documented locked build and artifact-verification route,
So that I can privately deliver a revision-bound host-native bundle without transferring source-build burden to the tester.

## Outcome

A maintainer can check out the authorized revision, pass preflight, run locked repository gates, produce an unsigned `.app` and `.dmg`, verify identity and architecture, and bind the delivered artifact to the source revision through SHA-256.

## Acceptance Behavior

```text
Given the maintainer build host passes alpha preflight
When the maintainer follows the canonical guide from a clean authorized revision
Then npm ci and locked repository gates complete
And the stable Tauri build produces Mirror Desktop.app and its local dmg
And bundle identifier, product name, resources and executable architecture match the documented contract
And revision and SHA-256 accompany the privately transmitted artifact
And no generated artifact is committed, published or installed automatically
```

## Scope

- Canonical maintainer checkout instructions.
- Locked JavaScript and Cargo dependency route.
- Stable host-architecture bundle command and metadata verification.
- Narrow unsigned Gatekeeper explanation.
- README link to one canonical guide.

## Out Of Scope

- Binary download, release upload or CI distribution.
- Signing, notarization and auto-update.
- Cross-compilation or non-macOS support.
- Automatic installation into `/Applications`.

## Validation

Perform an internal clean-revision build, verify bundle identity, architecture and resources, compute SHA-256, then compare that receipt with the external tester's received checksum and host architecture.
