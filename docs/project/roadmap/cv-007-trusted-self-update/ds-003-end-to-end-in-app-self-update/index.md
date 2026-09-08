[< CV-007](../index.md)

# CV-007.DS-003 - End-to-End In-App Self-Update

**Status:** ✅ Done

## Outcome

A user running Mirror Desktop is notified when a trusted compatible newer version is available, reviews the update, clicks **Update**, and the installed Mirror Desktop application is updated to the new version with restart verification and rollback protection while Mirror state remains untouched.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-007.DS-003.US-1 | Update Available Notification | User Story | A user is visibly notified inside Mirror Desktop when the trusted update channel reports a compatible newer version | ✅ Done |
| CV-007.DS-003.US-2 | Review and Confirm Update | User Story | A user can review version, release notes, compatibility and risk boundary, then click Update or dismiss without side effects | ✅ Done |
| CV-007.DS-003.TS-1 | Manifest Fetch and Channel Configuration | Technical Story | The app fetches update manifests only from the configured trusted channel with bounded diagnostics and no private runtime leakage | ✅ Done |
| CV-007.DS-003.TS-2 | Native Download and Staging | Technical Story | The app downloads the selected artifact to a safe staging area, verifies checksum and prepares installation without touching the running app | ✅ Done |
| CV-007.DS-003.TS-3 | Native Apply, Relaunch and Rollback | Technical Story | The app applies the verified update through the native updater boundary, relaunches into the expected version and restores last-known-good on failure | ✅ Done |
| CV-007.DS-003.US-3 | Continue After Successful Update | User Story | After update and relaunch, the user sees the expected new version and their Journeys, runtime binding, conversations and app data remain available | ✅ Done |

## Done Condition

This Delivery Story is done when an installed Mirror Desktop instance can discover a trusted compatible newer version, notify the user, collect explicit update consent, download and verify the artifact, apply the update through a native boundary, relaunch into the expected version, preserve Journey continuity and runtime binding, and recover to last-known-good when installation or launch verification fails. The flow must not mutate Mirror homes, databases, credentials, Journey content, conversation state or Nautilus Harness data.

## Boundary

This story implements the user-visible and native end-to-end update path. It consumes CV-006 release authority plus CV-007.DS-001 discovery and CV-007.DS-002 verification contracts. It does not create public release governance, install Mirror Core, migrate identity, manage provider credentials, bypass macOS security policy, or silently widen artifact access.
