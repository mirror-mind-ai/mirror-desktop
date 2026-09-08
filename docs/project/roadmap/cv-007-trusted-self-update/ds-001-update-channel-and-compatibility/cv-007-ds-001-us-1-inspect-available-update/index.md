[< Parent](../index.md)

# CV-007.DS-001.US-1 - Inspect Available Update

**Status:** ✅ Done
**Type:** User Story

## User Story

As a Mirror Desktop user,
I want update inspection to show whether a trusted compatible update exists before anything is downloaded,
So that I can understand version, release notes and compatibility without granting installation consent.

## Outcome

The discovery result exposes Navigator-facing states for available, current, incompatible and invalid updates. An available update includes version, release notes and matching artifact identity together with explicit no-download/no-installation messaging.

## Acceptance Behavior

```text
Given update discovery runs against the trusted manifest
When a newer compatible release exists
Then I can see that it is available and read the release notes
And the system states that inspection has not started download or installation
When no compatible update exists
Then I see current, incompatible or invalid status with a bounded reason
```

## Scope

- User-facing availability states.
- Release-note visibility.
- No-download and no-installation boundary language.

## Out Of Scope

- Final UI placement.
- User consent to install.
- Download, staging, replacement or restart.

## Validation

Domain tests assert the user-visible `notes` for available updates and bounded reasons for non-available states. The durable discovery contract is documented in `docs/update/trusted-self-update.md`.
