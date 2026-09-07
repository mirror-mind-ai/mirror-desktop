[< Roadmap](../index.md)

# CV-007 - Trusted Self-Update

**Status:** 🟡 Planned

## Outcome

Mirror Desktop can discover an authorized newer release, verify its provenance and compatibility, obtain explicit user consent, apply it safely and recover or roll back without touching Mirror state.

## Why This Matters

Once CV-006 establishes immutable release identity, the application can stop relying on manual bundle replacement. Self-update must consume that release authority rather than inventing a second version, trust or distribution channel.

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

From a supported installed version, Mirror Desktop detects an authorized compatible update, verifies it before mutation, applies it with explicit consent, restarts into the expected version with Journey continuity preserved, and can recover to the previous application when installation or launch verification fails.
