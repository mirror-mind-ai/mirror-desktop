[< CV-007](../index.md)

# CV-007.DS-001 - Update Channel and Compatibility

**Status:** 🟡 Planned

## Outcome

Mirror Desktop can inspect one configured authoritative release channel, identify whether a newer release is available, verify that its metadata is well formed and compatible with the current app and Mirror Core, and present release notes without downloading or installing the update.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-007.DS-001.TS-1 | Update Manifest Contract | Technical Story | The app defines a signed or otherwise authenticated update manifest that binds version, tag, artifact URL, checksum, compatibility range, release notes and provenance | 🟡 Planned |
| CV-007.DS-001.TS-2 | Version and Compatibility Decision | Technical Story | The app compares semantic app versions, architecture and Mirror Core compatibility before offering an update | 🟡 Planned |
| CV-007.DS-001.US-1 | Inspect Available Update | User Story | A user can check for updates, see the newer version, release notes and compatibility result, and decline without side effects | 🟡 Planned |

## Done Condition

This Delivery Story is done when Mirror Desktop can read only the configured trusted update channel, reject malformed or incompatible metadata, identify a compatible newer release, show release notes and consent context, and stop before artifact download or installation. No application files, Mirror homes, databases, credentials, Journeys or app data are mutated by inspection.

## Boundary

This story discovers and explains update availability only. It does not download, install, replace, restart, roll back, publish releases, manage access, install Mirror Core or bypass macOS security policy.
