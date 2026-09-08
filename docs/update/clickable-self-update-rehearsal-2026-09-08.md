# Clickable Self-Update Rehearsal, 2026-09-08

Journey: `mirror-desktop`

## Scope

This rehearsal validated the complete installed-app self-update path through a private HTTPS endpoint on `szen-vps`:

```text
https://updates.mirrormind.com.br
```

The rehearsal did not create a production release, Git tag, remote push, notarization record, public announcement, or production signing key.

## Endpoint preparation

DNS resolved successfully:

```text
updates.mirrormind.com.br -> 51.222.160.3
```

Let's Encrypt HTTPS was configured on `szen-vps` with Nginx. The endpoint served:

```text
/health.json
/mirror-desktop/darwin/0.1.0/latest.json
/mirror-desktop/darwin/0.1.1/latest.json
/mirror-desktop/darwin-x86_64/0.1.0/latest.json
/mirror-desktop/darwin-x86_64/0.1.1/latest.json
/mirror-desktop/darwin-aarch64/0.1.0/latest.json
/mirror-desktop/darwin-aarch64/0.1.1/latest.json
/mirror-desktop/artifacts/Mirror Desktop_0.1.1.app.tar.gz
/mirror-desktop/artifacts/Mirror Desktop_0.1.1.app.tar.gz.sig
```

## Build path

A temporary rehearsal signing key was generated locally under ignored `.tmp/` and removed after use.

Two app bundles were built with the same updater endpoint and public key:

```text
0.1.0 bootstrap app
0.1.1 update app
```

The updater artifact for `0.1.1` was signed and uploaded to the endpoint with its manifest.

## Observed user flow

The user opened the `0.1.0` bootstrap app from:

```text
~/Desktop/mirror-desktop-clickable-self-update-rehearsal/Mirror Desktop.app
```

Inside the app:

```text
Settings -> Updates -> Check for updates
```

The app found version `0.1.1`, showed the **Update** button, downloaded the artifact, closed, applied the update and relaunched.

After relaunch, the user checked again. The endpoint initially returned an error because the app now requested `/mirror-desktop/darwin/0.1.1/latest.json`; that current-version path was added. The user then confirmed the check worked.

Local bundle inspection confirmed:

```text
CFBundleIdentifier = ai.mirrormind.desktop
CFBundleShortVersionString = 0.1.1
```

Nginx access logs confirmed:

```text
GET /mirror-desktop/darwin/0.1.0/latest.json 200
GET /mirror-desktop/artifacts/Mirror%20Desktop_0.1.1.app.tar.gz 200
GET /mirror-desktop/darwin/0.1.1/latest.json 200
```

## Preservation boundary

The rehearsal replaced application bytes only. No Mirror home, `memory.db`, identity, credentials, Journey content, conversations, app data, Nautilus Harness state, Git tag, remote branch, notarization record, or public release record was intentionally changed.

## Follow-up

For production readiness, create a non-rehearsal signing-key custody path, publish versioned manifests for every supported current version, and decide whether the endpoint path should use Tauri's default `{{target}}` value (`darwin`) or an explicit frontend check target such as `darwin-x86_64`.
