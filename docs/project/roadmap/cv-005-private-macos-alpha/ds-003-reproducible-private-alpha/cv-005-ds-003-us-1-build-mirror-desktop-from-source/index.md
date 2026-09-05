[< Parent](../index.md)

# CV-005.DS-003.US-1 - Build Mirror Desktop From Source

**Status:** 🟠 In Progress
**Type:** User Story

## User Story

As an authorized private-repository collaborator,
I want one documented locked source-build route,
So that I can generate a host-native Mirror Desktop bundle without unpublished maintainer knowledge.

## Outcome

A collaborator can clone the authorized revision, pass preflight, install locked dependencies, run repository gates and produce an unsigned local `.app` and `.dmg` with verified Mirror Desktop identity and host architecture.

## Acceptance Behavior

```text
Given my Mac passes the alpha preflight
When I follow the canonical guide from a fresh private clone
Then npm ci and locked repository gates complete
And the stable Tauri build produces Mirror Desktop.app and its local dmg
And bundle identifier, product name and executable architecture match the documented contract
And no generated artifact is committed, published or installed automatically
```

## Scope

- Canonical private clone and checkout instructions.
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

Perform an internal clean-revision rehearsal and an external collaborator build using only committed instructions. Compare returned bundle identity and architecture evidence.
