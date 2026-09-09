# Alpha Channel Governance

**Journey:** mirror-desktop
**Status:** defined, not promoted

This document defines the first governable alpha updater channel for Mirror Desktop. It follows the private-test rehearsal, but it is not itself a release publication or public production declaration.

## Channel Separation

Mirror Desktop now distinguishes two updater channels:

| Channel | Purpose | Overlay | Endpoint prefix | Key location |
| --- | --- | --- | --- | --- |
| `private-test` | local rehearsal and disposable validation | `src-tauri/tauri.private-test-update.conf.json` | `/mirror-desktop/{{target}}/{{current_version}}/latest.json` | `~/.mirror-desktop-updater/private-test/updater.key` |
| `alpha` | governed pre-production alpha distribution | `src-tauri/tauri.alpha-update.conf.json` | `/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json` | `~/.mirror-desktop-updater/alpha/updater.key` |

The committed overlays contain only public keys. Private keys remain outside the repository.

The canonical updater host for new release work is `updates.mirrormind.sh`. The earlier `updates.mirrormind.com.br` host remains an infrastructure-compatible predecessor from private rehearsal, but new alpha builds and release tooling should use the `.sh` host.

## Public Download Contract

The Mirror Mind website must not point at versioned DMG artifact paths. It points at the stable alpha download contract instead:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

Alpha publication updates this stable download alias together with the updater manifests, release notes, updater artifact, signature, and versioned DMG artifact. The `latest.json` download manifest records the alpha version, stable DMG URL, versioned artifact URL, and release notes URL.

## Key Custody

Alpha key custody begins with a local maintainer-held updater key:

```text
~/.mirror-desktop-updater/alpha/updater.key
~/.mirror-desktop-updater/alpha/updater.key.pub
```

Rules:

- never commit the private key;
- keep permissions restricted to the maintainer account;
- use the alpha key only for alpha-channel artifacts;
- do not reuse the private-test key for alpha;
- rotate the alpha key if the private key is copied to an untrusted location, logged, backed up to an uncontrolled system, or suspected compromised;
- a production/stable channel must receive its own separate key-custody decision before it exists.

The current alpha key was generated for governed alpha rehearsal. It is not a notarization identity, Apple Developer credential, production signing policy, or public stable release promise.

## Alpha Release Runbook

A governed alpha release should follow this order:

1. choose the alpha version and update version authority in:
   - `package.json`
   - `package-lock.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
2. create or update `docs/releases/vX.Y.Z-alpha.N.md`;
3. update `docs/releases/index.md`;
4. run release-note and release-candidate validation;
5. build with the alpha updater overlay:

```bash
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.mirror-desktop-updater/alpha/updater.key)" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
npm run tauri -- build --bundles app,dmg --config src-tauri/tauri.alpha-update.conf.json
```

6. stage the updater artifact, signature, DMG, release notes, index, manifests, and `downloads/macos/latest.*` download aliases;
7. publish to the alpha prefix only after explicit Navigator authorization;
8. validate endpoint reachability;
9. validate an installed-app update from the previous alpha;
10. record evidence under `docs/update/`.

## Publication Boundary

Alpha publication is not implied by building. These require explicit Navigator authorization each time:

- upload to the alpha endpoint;
- Git push;
- Git tag;
- GitHub Release;
- Apple notarization submission;
- public announcement;
- promotion to stable or production.

## Retention and Cleanup

Private-test artifacts may be removed after evidence is recorded and no longer needed for regression rehearsal.

Alpha artifacts should be retained for at least the currently published alpha and one previous alpha so rollback/reinstall remains possible. Keep:

- versioned release notes;
- updater artifact and `.sig`;
- DMG handoff artifact;
- manifest paths for current app versions that may still check the channel.

Remove only after confirming no installed app depends on the removed current-version manifest path.

## Notarization Boundary

The current alpha governance does not claim notarization. Before an official public-facing alpha, decide whether the build must be notarized. If notarization is required, add a separate validation gate and evidence note before publication.

## State Preservation Boundary

Updater artifacts may replace application bytes only. They must not target or mutate:

- Mirror homes;
- `memory.db`;
- identity;
- credentials;
- Journey content;
- conversations;
- app data;
- Nautilus Harness state.

## Validation

The alpha overlay must pass self-update preflight:

```bash
npm run self-update:preflight -- --config src-tauri/tauri.alpha-update.conf.json
```

The alpha governance tests validate that:

- the alpha overlay exists;
- the alpha endpoint is HTTPS and uses the alpha path prefix;
- target and current-version placeholders are present;
- the alpha public key is a minisign public key;
- the alpha public key differs from the private-test public key;
- the governance document preserves publication and state boundaries.
