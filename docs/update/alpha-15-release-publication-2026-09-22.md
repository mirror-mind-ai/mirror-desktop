# Alpha.15 Release Publication — 2026-09-22

## Source Publication

- `main` pushed to `origin/main`: `c2589ec Record Alpha.15 release preparation evidence`
- Release identity commit: `185d19cf1a634bd937ee75d96ef0bf9e6aaaf5b8`
- Tag: `v0.2.0-alpha.15`
- Tag object: `aa442941d979f9b65ece76854fdc7bdbd66d1503`
- Tag target: `185d19cf1a634bd937ee75d96ef0bf9e6aaaf5b8`

## GitHub Release

- GitHub prerelease: <https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.15>
- Attached artifacts:
  - `Mirror Desktop_0.2.0-alpha.15_x64.dmg`
  - `Mirror Desktop.app.tar.gz`
  - `Mirror Desktop.app.tar.gz.sig`

## Private Update Endpoint

Publication command:

```bash
npm run release:private-update -- \
  --version 0.2.0-alpha.15 \
  --artifact 'src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz' \
  --signature 'src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig' \
  --dmg 'src-tauri/target/release/bundle/dmg/Mirror Desktop_0.2.0-alpha.15_x64.dmg' \
  --release-note 'docs/releases/v0.2.0-alpha.15.md' \
  --release-index 'docs/releases/index.md' \
  --current-version 0.2.0-alpha.14 \
  --current-version 0.2.0-alpha.15 \
  --publish
```

Result: `PUBLISHED`

- Artifact URL: <https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.15.app.tar.gz>
- Release notes URL: <https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.15.md>
- Latest macOS DMG URL: <https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg>
- Web root: `/var/www/mirror-desktop-updates/mirror-desktop/alpha`

## Remote Manifest Verification

All six updater manifest paths served `0.2.0-alpha.15` with a 416-byte signature and the Alpha.15 tarball URL:

- `darwin/0.2.0-alpha.14/latest.json`
- `darwin/0.2.0-alpha.15/latest.json`
- `darwin-x86_64/0.2.0-alpha.14/latest.json`
- `darwin-x86_64/0.2.0-alpha.15/latest.json`
- `darwin-aarch64/0.2.0-alpha.14/latest.json`
- `darwin-aarch64/0.2.0-alpha.15/latest.json`

Additional checks:

- <https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.15.md> returned HTTP 200.
- <https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json> returned HTTP 200 with version `0.2.0-alpha.15`.
- <https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg> returned HTTP 200.

## Correction

The first publication command in this session omitted the `/alpha` base URL and staged artifacts under `/mirror-desktop`. Installed Alpha.14 applications poll `/mirror-desktop/alpha`, so no update appeared. The publication was immediately repeated with `--base-url https://updates.mirrormind.sh/mirror-desktop/alpha`, and the six `/alpha` manifest paths listed above were verified serving `0.2.0-alpha.15`.

## Artifact Hashes

- DMG SHA-256: `9bd9beb0c4e5c58c92a4a09dba2102c495185c3bea3387c56356aa014ecdc160`
- Updater tarball SHA-256: `9b4cedb47f79120d965dcc8e304f658b3de162e0bde67655a4e3b8d4b161c1c0`

## Boundary

Publication completed for the private alpha endpoint (`/mirror-desktop/alpha`) and GitHub prerelease. No production Mirror memory/database mutation, notarization, app-store distribution, Windows/Linux packaging or stable-channel widening was performed by this publication.
