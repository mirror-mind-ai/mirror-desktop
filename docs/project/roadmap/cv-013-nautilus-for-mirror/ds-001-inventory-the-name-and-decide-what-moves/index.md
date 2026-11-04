[< CV-013](../index.md)

# CV-013.DS-001 - Inventory the Name and Decide What Moves

**Status:** 🔵 In progress — inventory done 2026-11-04; awaiting the Navigator's decisions

## Outcome

Every place that carries the name "Mirror Desktop" is classified as either **what the person sees**
(renamed) or **a machine coordinate** (kept for compatibility, or moved with a migration). The
build story (DS-002) starts only from these decisions.

## Inventory (read 2026-11-04, `main` after v0.3.0-alpha.15)

### What the person sees

| Where | Today |
| --- | --- |
| `productName` in `tauri.conf.json` (app menu, Dock, Finder) | `Mirror Desktop TS` |
| Dev and evaluation builds | `Mirror Desktop TS Dev`, `Mirror Desktop TS Eval` |
| Window title | `Mirror Desktop TS` |
| In-app text (chip, Settings, setup, errors) | about 90 lines in 28 TypeScript files |
| Native messages | about 75 lines in `src-tauri/src` (some are comments) |
| DMG and updater artifact names | `Mirror Desktop TS_<v>_x64.dmg`, `Mirror Desktop_<v>.app.tar.gz` |
| Release notes and their reading in the chip | "Mirror Desktop" in titles and text |
| Release gate | `scripts/release_line.mjs` requires product name `Mirror Desktop TS` for 0.3 |

### Machine coordinates

| Coordinate | Today | What changing it costs |
| --- | --- | --- |
| Bundle identifier | `ai.mirrormind.desktop.ts` (`.dev` for dev) | macOS treats it as another app; the app-data folder and the Keychain service move with it |
| App-data folder | `~/Library/Application Support/ai.mirrormind.desktop.ts` | homes, Pi, sessions, preferences; a migration or a copy |
| Keychain service | derived from the identifier | the OpenRouter key would be asked for again |
| Update channel | `updates.mirrormind.sh/mirror-desktop/ts/...` | every installed app polls this path; it must keep answering |
| Site's DMG link | `/downloads/macos/mirror-desktop-latest.dmg` | the site keeps "Mirror Desktop" until told otherwise |
| GitHub repository, npm and Cargo package names | `mirror-mind-ai/mirror-desktop`, `mirror-desktop` | invisible to the person |
| Local storage keys | `mirror-desktop:*` (3 keys) | invisible; renaming loses the stored value |
| Conversation interface label (CR171) | `nautilus_harness` | written into the home's conversations |

## Recommendation

Rename **only what the person sees**, and keep every machine coordinate. The bundle identifier is
never shown to the person; keeping it keeps the data, the Keychain entry and the update path of the
installed app, with no migration. Signing (CV-009) can sign under the kept identifier.

- **Name:** `Nautilus for Mirror`. The `TS` suffix goes: 0.2 is frozen and no longer offered. Dev
  and evaluation builds become `Nautilus for Mirror Dev` and `Nautilus for Mirror Eval`.
- **Release gate:** `release_line.mjs` moves to the new product name in the same change.
- **CR171:** new conversations are written as `nautilus`; readers accept `nautilus_harness` too.
  Old rows are not rewritten.

## Open Risk to Verify Before Building

The updater replaces the installed bundle in place. The folder on disk may stay
`/Applications/Mirror Desktop TS.app` while the app inside calls itself Nautilus for Mirror. This is
checked with the `self-update` test configuration before the release, and if it holds, the release
notes tell the person they can rename the file or reinstall from the DMG.

## Decisions Needed From the Navigator

1. Keep every machine coordinate, including the bundle identifier (recommended), or move it.
2. The exact visible name, `Nautilus for Mirror`, without `TS`.
3. CR171: write `nautilus` for new conversations.
