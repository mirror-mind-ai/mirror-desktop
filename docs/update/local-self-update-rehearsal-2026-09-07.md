# Local Self-Update Rehearsal, 2026-09-07

Journey: `mirror-desktop`

## Scope

This rehearsal validated the signed updater artifact path without publishing, pushing, tagging, notarizing, or exposing a production endpoint.

## Evidence

- Local validation keypair generated under ignored `.tmp/self-update-rehearsal/`.
- `src-tauri/tauri.self-update.test.conf.json` updated with the matching test public key.
- `npm run self-update:preflight` passed with the non-production updater overlay.
- `npm run tauri -- build --bundles app --config src-tauri/tauri.self-update.test.conf.json --config .tmp/self-update-rehearsal/next-version.conf.json` produced:
  - `src-tauri/target/release/bundle/macos/Mirror Desktop.app`
  - `src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz`
  - `src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig`
- The generated app bundle reported `CFBundleIdentifier = ai.mirrormind.desktop` and `CFBundleShortVersionString = 0.1.1`.
- A static Tauri updater manifest was staged locally at `.tmp/self-update-rehearsal/channel/latest.json` with `darwin-x86_64` and `darwin-aarch64` targets, artifact URLs, signatures and SHA-256 receipt metadata.

## Boundary

The rehearsal did not perform an installed click-through update because no authorized HTTPS updater endpoint was published. This is intentional: production or private-test endpoint publication remains a separate Navigator-authorized release operation.

No Mirror home, `memory.db`, credentials, Journey content, conversations, app data, Nautilus Harness state, Git tags, remote branches, notarization records, or public release artifacts were changed.
