# Mirror Desktop

Mirror Desktop is the first-party Tauri desktop application for operating Journey-bound Pi and Mirror conversations across Operational, Tactical and Strategic projections.

The project continues the application body incubated as Nautilus Harness. The transfer record lives in [docs/project/history/nautilus-harness-transfer.md](docs/project/history/nautilus-harness-transfer.md), and the founding exploration lives in [docs/project/explorations/mirror-desktop-core-installer-and-tauri-app-migration](docs/project/explorations/mirror-desktop-core-installer-and-tauri-app-migration).

## Private macOS alpha

Maintainers and authorized testers should follow the canonical [private macOS alpha guide](docs/alpha/private-macos-alpha.md). It separates maintainer preflight, locked build, checksum and private delivery from external runtime binding, disposable Journey validation, bounded evidence and non-destructive rollback.

## Versioned macOS release candidates

Maintainers preparing a versioned candidate should follow the [versioned macOS release candidate guide](docs/release/versioned-macos-release.md). It defines version and tag authority, artifact naming, provenance, promotion and rollback while keeping signing, notarization, publication and self-update as separate authorities.

## Trusted self-update discovery

The read-only self-update discovery contract lives in [docs/update/trusted-self-update.md](docs/update/trusted-self-update.md). It defines the update manifest, compatibility decision and no-mutation boundary before any download or installation work.

## Website

The initial English developer-facing landing page for `mirrormind.sh` lives in [site/](site/). It is a static page; deploying it requires a separate explicit publication/DNS instruction.

## Development

Use the canonical [development environment guide](docs/development/environment-setup.md). It explains how to run the isolated development channel against Mirror Dev without touching the installed daily-use app or production Mirror database.

For a simple collaborator-built Windows executable, use the [Windows manual build guide](docs/windows/manual-build.md). Windows auto-update and signed Windows release publication are not configured yet.

Do not duplicate setup commands in other entry documents; link to the appropriate canonical guide instead.
