[< CV-013](../index.md)

# CV-013.DS-002 - The Nautilus Line

**Status:** 🔵 In progress — started by the Navigator on 2026-11-04 ("comece a DS-002")

## Outcome

`main` builds **Nautilus for Mirror**, release line 0.4, under its own identity: bundle identifier
`ai.mirrormind.nautilus`, its own app-data folder, its own update channel and its own release gate.
The 0.3 line (Mirror Desktop TS) is closed at v0.3.0-alpha.16 and stays in the release-line table
so the gate can refuse any crossing.

## Coordinates

| | 0.3 (closed) | 0.4 Nautilus |
| --- | --- | --- |
| Product name (Dock, Finder, window, DMG) | `Mirror Desktop TS` | `Nautilus for Mirror` |
| Menu name (`CFBundleName`) | `Mirror Desktop TS` | `Nautilus` |
| Bundle identifier and app-data folder | `ai.mirrormind.desktop.ts` | `ai.mirrormind.nautilus` |
| Development build | `Mirror Desktop TS Dev`, `ai.mirrormind.desktop.ts.dev` | `Nautilus for Mirror Dev` (menu `Nautilus Dev`), `ai.mirrormind.nautilus.dev` |
| Evaluation build | `Mirror Desktop TS Eval` | `Nautilus for Mirror Eval` (menu `Nautilus Eval`) |
| Update channel | `updates.mirrormind.sh/mirror-desktop/ts` | `updates.mirrormind.sh/nautilus` |
| Server folder | `/var/www/mirror-desktop-updates/mirror-desktop/ts` | `/var/www/mirror-desktop-updates/nautilus` |
| Updater artifact | `Mirror Desktop_<v>.app.tar.gz` | `Nautilus for Mirror_<v>.app.tar.gz` |
| Stable DMG link | `.../downloads/macos/mirror-desktop-latest.dmg` | `.../downloads/macos/nautilus-latest.dmg` |

The updater signing key is kept: the trust it carries is the publisher's, not the product name's.
The update host already serves any folder under its root, so the new channel needs no server change.

## Slices

1. **Identity and channel.** The Tauri configurations, the runtime channel's names and identifiers,
   the diagnostic's expected identifiers, the channel launcher, the release-line table (line 0.4
   current), the build plan, the publication paths and names, the promotion check and the
   development guide. The header's build name follows.
2. **The words the person reads.** "Mirror Desktop" in the interface, in native messages, in the
   microphone permission text and in the scripts' output.
3. **Labels written into data.** New conversations are written as `nautilus` instead of
   `nautilus_harness` (CR171, absorbed here). The prompt envelope's
   `[Mirror Desktop Journey authority]` marker and the Pi session names (`· Mirror Desktop ·`) are
   also read back from stored data, so writers move and readers accept both forms.
4. **The first Nautilus release, 0.4.0-alpha.1.** Published only once DS-003 can carry the state,
   so that installing it is never a fresh start by accident.

## Slice 1 Built (2026-11-04)

Code `1bee606c`. `main` is at `0.4.0-alpha.0`, as phase 0 of the 0.3 line set `0.3.0-alpha.0`: the version
agrees with main's line, and nothing is publishable until `0.4.0-alpha.1`.

- Spec `src/tests/cv013Ds002NautilusLine.test.mjs` (17 tests), failing first; a census forbids the
  0.3 identities in main's channel code. Eleven older tests were re-aimed to the new line, among them
  `cv010LineSeparation`, whose 0.2 and 0.3 guards stay.
- Six mutations, all caught: the current line, both path guards of the publication folder, the
  diagnostic's identifier, the promotion's product-name check, and the evaluation build's
  recognition of the stable app by its menu name.
- Suites: TypeScript 2,598 tests, Rust 473 passed and 10 ignored.
- A development bundle built with `npm run tauri:build:dev` reads `CFBundleName` `Nautilus Dev`,
  `CFBundleDisplayName` `Nautilus for Mirror Dev`, `CFBundleIdentifier` `ai.mirrormind.nautilus.dev`.
  It was not launched.

## The Icon Returns to Nautilus (Navigator, 2026-11-04)

The Navigator asked to bring back the icon the app had as Nautilus Harness. Git holds two:

- `0311674f` (2026-08-24): a golden nautilus shell on a dark blue square, the first.
- `0c4684cb` (2026-09-02): a luminous violet spiral on a dark plum square, with a `DEV` badge for the
  development build; the last Nautilus Harness icon, replaced by the mirror (`da611ab8`).

The Navigator chose `0c4684cb`, the violet spiral, with its `DEV` variant for development. Built in
`86b37424`: the stable and development PNGs are that commit's files, pinned by hash in
`runtimeChannelConfiguration.test.ts`; the evaluation icon is the same spiral with the green `EVAL`
badge, rendered from its SVG. The design note is [`docs/product/nautilus-icon.md`](../../../../product/nautilus-icon.md).

## Slices 2 and 3 Built (2026-11-04)

**Slice 2, the words** (`023f7cb2`). The interface, the native messages, the microphone permission and
the release route's output say Nautilus; the first-run eyebrows say Nautilus for Mirror. The
release candidate's DMG name comes from the current line. A census in the spec refuses any visible
"Mirror Desktop" in `src/app`, `src/domain`, `src/agent`, the Rust sources outside their tests,
`Info.plist` and the release scripts. Two inherited guards that forbade Nautilus wording
(`runtimeChannelConfiguration`) now require it.

**Slice 3, the labels** (`8c8ecbb6`).

| Label | Written now | Still read |
| --- | --- | --- |
| Prompt envelope marker | `[Nautilus Journey authority]`, class `nautilus` | `[Mirror Desktop Journey authority]`, `[Nautilus Harness Journey authority]` |
| Pi session name | `<Journey> · Nautilus · Generation N` | nothing parses it |
| Mirror Conversation interface (CR171) | `nautilus` | learning asks for `nautilus` and `nautilus_harness` |

The core rewrites a Conversation's interface only when the Conversation is ensured again, so the
Conversations already open keep `nautilus_harness`. Each learning run therefore asks for both
labels, newest first, within the same ten pieces, and sums their counts or stops at the first answer
that does not learn.

**Kept on purpose:**

- The messages' `sourceInterface`, `nautilus-harness`. The core stores it in each message's
  metadata and compares that metadata when a message is replayed; changing it would turn the replay
  of a message written before the change (a settlement recovery, an outbox retry) into an
  `idempotency_conflict`.
- The `product` schema name, `Mirror Desktop`, in the update, release-reading and voice manifests:
  a contract between publisher and reader that nobody sees.
- The repository, the npm and Cargo package names and the `mirror-desktop:*` event and storage
  names, renamed later with the repository (DS-001).

**Evidence.** Spec `cv013Ds002NautilusLine.test.mjs`, now 26 tests, failing first for each slice;
three new Rust tests (the Nautilus marker with both old ones, the labels learned, one run's pieces
shared and its counts summed). Thirteen mutations across the two slices and the icon, all caught.
Suites: TypeScript 2,608 tests, Rust 476 passed and 10 ignored.

## What Moving the Identifier Costs (carried by DS-003)

- The app-data folder changes, for production and for the development build alike. Until DS-003's
  script runs, a Nautilus build opens as a first run.
- The OpenRouter key kept in the Keychain is filed under the bundle identifier. It is not read or
  copied by any script; the person enters it again, or DS-003 offers a way that does not read it.
- Window-only preferences in the webview's storage (the sidebar width, the name typed during
  onboarding) start fresh.

## Acceptance

- The configuration, release gate and channel tests describe line 0.4 and refuse every 0.3 and 0.2
  crossing, and the full suites pass.
- A development build of Nautilus opens under `ai.mirrormind.nautilus.dev`, named Nautilus in the
  menu, without touching `ai.mirrormind.desktop.ts.dev`.
