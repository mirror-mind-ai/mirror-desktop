[< Roadmap](../index.md)

# CV-007 - Trusted Self-Update

**Status:** 🟠 In Progress

## Outcome

Mirror Desktop can discover an authorized newer release, verify its provenance and compatibility, obtain explicit user consent, apply it safely and recover or roll back without touching Mirror state.

## Why This Matters

Once CV-006 establishes immutable release identity, the application can stop relying on manual bundle replacement. Self-update must consume that release authority rather than inventing a second version, trust or distribution channel.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-007.DS-001](ds-001-update-channel-and-compatibility/index.md) | Update Channel and Compatibility | Mirror Desktop can inspect one configured authoritative release channel, identify whether a newer release is available, verify that its metadata is well formed and compatible, and present release notes without downloading or installing the update | ✅ Done |
| [CV-007.DS-002](ds-002-verified-update-installation-and-recovery/index.md) | Verified Update Installation and Recovery | After explicit user consent, Mirror Desktop can download, verify, safely apply and recover or roll back an authorized compatible release without touching Mirror state | ✅ Done |
| [CV-007.DS-003](ds-003-end-to-end-in-app-self-update/index.md) | End-to-End In-App Self-Update | A user running Mirror Desktop is notified when a trusted compatible newer version is available, clicks Update, and the installed app updates with relaunch verification and rollback protection | ✅ Done |

## Candidate Scope

- Discover releases only from the configured authoritative channel.
- Compare semantic application versions and runtime compatibility.
- Verify signature, checksum and release provenance before installation.
- Present release notes, scope and explicit update consent.
- Prevent update while unsafe native operations are active.
- Apply atomically and preserve the last known-good application.
- Keep Mirror homes, databases, app-data compatibility and Nautilus rollback outside artifact replacement.
- Emit bounded diagnostics without leaking runtime coordinates or content.

## Dependencies

CV-006 must first establish version, tag, artifact, signing/provenance and rollback authority. A private alpha artifact or checksum alone is insufficient self-update authority.

## Boundary

This capability does not install or migrate Mirror Core, provider credentials, identity, Journeys or databases. It does not silently widen release access or bypass macOS security policy.

## Done Condition

From a supported installed version, Mirror Desktop detects an authorized compatible update, notifies the user, verifies it before mutation, applies it after explicit consent, restarts into the expected version with Journey continuity preserved, and can recover to the previous application when installation or launch verification fails.
