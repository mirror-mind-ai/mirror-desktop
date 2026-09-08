# Delivery Story Plan — CV-007.DS-001

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Update Channel and Compatibility

## Objective

Establish the read-only discovery and compatibility half of Trusted Self-Update: Mirror Desktop can inspect one configured authoritative update channel, validate update manifest shape and provenance metadata, compare semantic app version, architecture and Mirror Core compatibility, and present update availability and release notes without downloading, installing, mutating app files, touching Mirror state or widening release authority.

## Child Work Packages

- CV-007.DS-001.TS-1
- CV-007.DS-001.TS-2
- CV-007.DS-001.US-1

## Scope

This Delivery Story will:

- define the trusted update manifest shape for Mirror Desktop release discovery;
- validate product identity, semantic version, `vX.Y.Z` tag, full Git revision, release notes, provenance receipt and architecture-specific artifacts;
- compare current app version, macOS version, architecture and Mirror Core compatibility against the manifest;
- return bounded states for available, current, incompatible and invalid updates;
- expose release notes and explicit no-download/no-installation messaging for the available state;
- document the discovery boundary as read-only and preserve installation, quiescence, atomic apply and rollback for the next Delivery Story.

## Non-Goals

This Delivery Story will not:

- download, stage, install or replace application artifacts;
- create a UI button that mutates update state;
- sign, notarize, publish or widen release access;
- create a release channel or upload manifests;
- mutate Mirror homes, databases, runtime binding, Journey files, app data or credentials;
- implement quiescence guards, restart verification, atomic apply or rollback.

## Acceptance Behavior

```text
Given a configured update manifest for Mirror Desktop
When discovery inspects the manifest with current app, macOS, architecture and Mirror Core context
Then malformed manifests are rejected as invalid
And non-newer manifests are reported as current
And incompatible macOS, architecture or Mirror Core requirements are reported without download
And compatible newer releases expose version, release notes and the matching artifact identity
And discovery explicitly states that no download or installation has started
```

## Validation Route

Run focused domain tests for manifest parsing, compatibility decisions and read-only available/current/incompatible/invalid outcomes. Run `npm run build` to prove the TypeScript contract compiles. Review `docs/update/trusted-self-update.md` and this story package for the no-mutation boundary. Desktop E2E is not required in this DS because no UI installation path is introduced.

## Implementation Contract

Use TDD for manifest and compatibility behavior. Keep this DS in pure read-only discovery territory: no network fetch, no file staging, no app replacement, no Mirror access and no remote mutation. Keep all persisted or displayed diagnostics bounded and free of private runtime coordinates or Journey content.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
