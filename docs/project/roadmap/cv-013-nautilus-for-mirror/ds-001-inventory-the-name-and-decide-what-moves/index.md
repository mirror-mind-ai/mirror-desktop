[< CV-013](../index.md)

# CV-013.DS-001 - Inventory the Name and Decide What Moves

**Status:** 🔵 In progress — inventory done 2026-11-04; machine coordinates move too (Navigator), proposal awaiting approval

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

## Revised Direction: Move the Machine Coordinates Too (Navigator, 2026-11-04)

The Navigator asked for a careful strategy to rename the machine coordinates as well, so that new
people arrive with the right identifiers. There are two installations today: the Navigator's, moved
now, and one more, moved later with the same tool. This replaces the recommendation above.

The repository already did this once: 0.2 to 0.3 moved from `ai.mirrormind.desktop` to
`ai.mirrormind.desktop.ts` as a new **release line** (`scripts/release_line.mjs`), with its own
channel, and `scripts/carry_02_state.mjs` carried the app's state across. CV-013 repeats that
pattern instead of inventing one.

| Coordinate | Proposed |
| --- | --- |
| Release line | `0.4`, product name `Nautilus for Mirror`, first version `0.4.0-alpha.1` |
| Bundle identifier | `ai.mirrormind.nautilus` (dev: `ai.mirrormind.nautilus.dev`) |
| App-data folder | `~/Library/Application Support/ai.mirrormind.nautilus`, following the identifier |
| Update channel | `https://updates.mirrormind.sh/nautilus/...` |
| Local storage keys | `nautilus:*` |
| Conversation interface label (CR171) | `nautilus` for new conversations; readers accept `nautilus_harness` |
| Repository and packages | renamed later, separately; invisible to the person |

Stories:

- **DS-002, the Nautilus line.** Name, identifier, channel, release gate and CR171 move together.
  The 0.3 line stays in `RELEASE_LINES` so the guard can refuse cross-publication.
- **DS-003, carry the state.** A script modelled on `carry_02_state.mjs`: copies the 0.3 app-data
  folder (homes, Pi, sessions, model settings, provider state, avatar) into the Nautilus folder,
  rewrites the absolute paths records hold into the old folder, never writes the old one, dry run
  by default, all or nothing. Rehearsed on an APFS clone before the real run.
- **DS-004, the Navigator's cutover.** Install Nautilus from the DMG, carry, verify Journeys,
  conversations and models, keep Mirror Desktop TS installed and untouched as the way back.
- **Later, the second installation.** Same DMG and script, when the Navigator decides.

The 0.3 channel keeps answering. One last 0.3 release, `0.3.0-alpha.16`, also validates CR191
(noticed while open) and is the final version on that line.

What does not move: the Mirror home (`~/.mirror-minds/...`) lives outside the app-data folder and
is only re-bound. Window-only preferences kept in the webview's storage (such as the sidebar width)
start fresh.

## Name Decided (Navigator, 2026-11-04)

**Nautilus for Mirror** is kept as the full name (Dock, Finder, DMG, window). The short name in the
app menu is **Nautilus**, within macOS's 15-character guidance. The "for" reads as an app made for a
platform, which is CV-013's point: one front end among others for the Core.

## Decisions Needed From the Navigator

1. Keep every machine coordinate, including the bundle identifier (recommended), or move it.
2. The exact visible name, `Nautilus for Mirror`, without `TS`.
3. CR171: write `nautilus` for new conversations.
