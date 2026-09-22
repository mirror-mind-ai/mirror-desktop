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
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
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

The deterministic route for the whole runbook is the deploy script:

```bash
npm run release:deploy -- prepare --mirror-root <root> --mirror-home <home> --mirror-user <user>
npm run release:deploy -- publish --yes
```

`prepare` runs preflight, the full test and build gates, the signed alpha build
and the candidate inspection, then emits the confirmation payload — including
the authored release title and full release-note text — and script-generated
preparation evidence. `publish --yes` runs push, tag, GitHub prerelease,
endpoint publication, blocking post-publication verification against the exact
URLs installed applications poll, and script-generated publication evidence.
The publication base URL is derived from `endpoints[0]` of
`src-tauri/tauri.alpha-update.conf.json`; a divergent explicit base URL fails
closed. Retained current versions and manifest paths are derived from Git tags,
not hand-typed. The route state under `.tmp/release-deploy/` makes re-runs
resume after a mid-sequence failure instead of repeating completed stages.

The manual order below remains the reference for what the route performs:

1. choose the alpha version and update version authority in:
   - `package.json`
   - `package-lock.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
2. create or update `docs/releases/vX.Y.Z-alpha.N.md`;
3. update `docs/releases/index.md`;
4. run release-note and release-candidate validation;
5. build with the centralized signed alpha build command:

```bash
npm run alpha:build
```

The command runs the alpha updater preflight, reads the alpha signing key from `~/.mirror-desktop-updater/alpha/updater.key`, builds with `src-tauri/tauri.alpha-update.conf.json`, and verifies that the `.app`, DMG, updater artifact, and updater signature exist. Do not use a generic `npm run tauri -- build --bundles app,dmg` for alpha validation. That build omits the updater overlay and can produce an app that aborts during startup when the updater plugin is registered without the release config.

6. stage the updater artifact, signature, DMG, release notes, index, manifests, and `downloads/macos/latest.*` download aliases; staging derives each manifest's additive `release_reading` metadata from the exact versioned release-note file and fails on version, structure or bounds mismatch;
7. publish to the alpha prefix only after explicit Navigator authorization;
8. validate endpoint reachability;
9. validate an installed-app update from the previous alpha;
10. record evidence under `docs/update/`.

## Publication Boundary

Alpha publication is not implied by building. **Release publication is one
authorization scope**: a single explicit Navigator instruction such as
"publish the release" authorizes the whole deterministic route — push, tag,
GitHub Release and upload to the alpha endpoint — with exactly one
confirmation after preparation, taken over materialized artifacts and the
authored release note. Between that confirmation and completion, the route
asks no further questions; its internal mechanics are covered by automatic
fail-closed gates (derived destination, blocking post-publication
verification, script-emitted evidence), not by repeated authorization
requests. Any invocation that does not declare publication intent stays a dry
run.

Outside that scope, these still require their own explicit Navigator
authorization each time:

- Apple notarization submission;
- public announcement;
- promotion to stable or production;
- any publication that departs from the deterministic route (manual uploads,
  divergent destinations, out-of-band tags or releases).

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
- unrelated app data;
- Nautilus Harness state.

Mirror Desktop may write only the bounded channel-local `whats-new-state.v1.json` pending and acknowledgement receipt required to recognize the exact installed release. This exception is application-owned explanatory state, not updater authority, and must not alter any other app-data file.

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
