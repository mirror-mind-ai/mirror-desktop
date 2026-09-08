# Trusted Self-Update

This document defines the trusted discovery, consent, native installation and preservation boundary for Mirror Desktop self-update.

## Update manifest

Mirror Desktop accepts only a manifest for its own product identity:

```json
{
  "schemaVersion": "1.0.0",
  "product": "Mirror Desktop",
  "version": "0.2.0",
  "tag": "v0.2.0",
  "revision": "0123456789abcdef0123456789abcdef01234567",
  "minimumMacOS": "12.0.0",
  "mirrorCore": ">=0.31.14,<0.32.0",
  "releaseNotes": "https://example.invalid/mirror-desktop/v0.2.0.md",
  "provenance": {
    "receiptUrl": "https://example.invalid/mirror-desktop/v0.2.0.provenance.json",
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "artifacts": [
    {
      "architecture": "x64",
      "url": "https://example.invalid/Mirror Desktop_0.2.0_x64.dmg",
      "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  ]
}
```

The tag must be exactly `vX.Y.Z` for the manifest version. Artifact, release-note and provenance coordinates must use `https://`. SHA-256 fields must be lowercase 64-character hex digests. The release revision must be a full Git SHA.

## Compatibility decision

Discovery compares the manifest against the current application context:

```text
current app version
current architecture: x64 | aarch64
current macOS version
current Mirror Core version
```

The result is one of:

```text
available      a newer compatible version and matching artifact exist
current        the manifest version is not newer than the current app
incompatible   version is newer, but macOS, architecture or Mirror Core do not match
invalid        manifest shape or provenance metadata is malformed
```

## Boundary

Discovery is read-only. It may explain update availability and release notes, but it must not download an artifact, stage files, replace the application, restart the app, mutate Mirror homes, read databases, change credentials, alter Journey data, publish releases or widen access.

## Verified installation and recovery

After discovery reports `available`, installation remains blocked until the user consents to the exact version and artifact checksum. Consent for one version or checksum cannot be reused for another candidate.

Before application replacement, the updater must observe a quiescent native state:

```text
no active Pi runs
no pending conversation commits
no pending projection writes
no active file snapshots
```

The downloaded artifact is staged before mutation and its bytes must match the manifest SHA-256. A verified apply plan preserves the current application as last-known-good, moves only application bytes, verifies the expected version after restart and prepares rollback if launch verification fails.

Rollback targets the previous application bytes only. It must preserve:

```text
Mirror homes
memory.db
runtime-binding.v1.json
Journey registry and conversations
Mirror Desktop app data
Nautilus Harness state
```

## In-app update loop

Mirror Desktop registers Tauri's signed updater and process plugins. On startup, the app performs a bounded update check; if the trusted channel reports a newer signed update, the user sees an in-app notification with **Review update** and **Later** actions. The notification does not download or mutate anything.

The Settings → Updates panel lets the user manually check the channel, review the update boundary, see release notes when supplied by the channel, and click **Update**. The update action is blocked while runtime work is active. Once consent is given, the native updater downloads and installs the signed artifact, reports progress, and relaunches the app on macOS/Linux so the replacement application is used.

## Installation boundary

Verified installation may replace the Mirror Desktop application artifact only after explicit consent, quiescence and updater verification. It must not install or migrate Mirror Core, edit provider credentials, read or mutate Mirror databases, alter Journey content, delete app data, publish releases, widen access or bypass macOS security policy. Production update endpoints, updater public key configuration, private signing key custody and artifact publication remain release operations requiring explicit Navigator authorization.

## Signed-channel validation preflight

The repository includes a validation-only overlay at `src-tauri/tauri.self-update.test.conf.json`. It binds the Tauri updater to a non-production HTTPS endpoint under `updates.example.invalid` and a test public key. This overlay is not a production channel and must not be treated as release authority.

Run the guard before any installed-app self-update rehearsal:

```bash
npm run self-update:preflight
```

The guard fails unless the merged Tauri config contains:

```text
plugins.updater.endpoints[] using https://
plugins.updater.pubkey containing a minisign public key
bundle.createUpdaterArtifacts = true
no dangerous transport, invalid certificate or invalid hostname flags
productName = Mirror Desktop
identifier = ai.mirrormind.desktop
```

For a real installed-app rehearsal, use a separately authorized release config overlay with the production or private-test endpoint and public key, then build with that overlay:

```bash
npm run tauri -- build --bundles app --no-sign --config src-tauri/tauri.self-update.test.conf.json
```

The updater manifest served by the endpoint must use Tauri's updater target names for macOS:

```text
darwin-x86_64
darwin-aarch64
```

Each target entry must provide a download URL and signature for the updater artifact. A complete rehearsal installs an older signed build, serves a manifest for a newer compatible version, clicks **Review update**, clicks **Update**, observes download/install progress, confirms relaunch into the newer version, and verifies that Mirror homes, `memory.db`, runtime binding, Journeys, conversations, app data and Nautilus Harness state remain unchanged.
