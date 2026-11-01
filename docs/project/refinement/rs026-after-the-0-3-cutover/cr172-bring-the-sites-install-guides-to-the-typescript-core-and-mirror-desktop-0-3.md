[< RS026](index.md)

# CR172: Bring the Site's Install Guides to the TypeScript Core and Mirror Desktop 0.3

**Status:** captured
**Line:** 0.3 · the public site (`mirrormind-site`, Journey *Mirror Mind Website*)
**Raised by:** the Navigator, 2026-11-01, to be done before the rest of this queue

## Authority

The files this CR changes belong to another Journey's repository,
`~/.mirror-journeys/vida-tecnica/ia-agentica/mirror-mind-ai/mirrormind-site`. It is recorded here
because the debt comes from this Journey: DS-005 phase 0 recorded that new users reach 0.3 only once
the site points at a `/ts/` alias, and that this was due before the first 0.3 release was offered.
Editing that repository needs the Navigator's word naming it, and deploying the site (DNS or VPS)
needs its own release word, as the site's README says.

## Friction

All six guides (`site/en/install/{macos,linux,windows}`, `site/pt-br/instalar/{macos,linux,windows}`)
describe a Mirror that no longer exists. The live pages at `mirrormind.sh` and `mirrormind.com.br`
match the repository (`main` `acbe246`, 2026-09-18). Read on 2026-11-01:

- **macOS and Linux teach the Python Core:** install `uv`, `git clone …/mirror.git`, `uv sync`,
  `cp .env.example .env`, `uv run python -m memory init|seed`, then open a runtime inside the clone.
  Core has been a TypeScript package since v0.32.0 and is at `mirror-mind` 0.39.0: Node.js 24+,
  `npm install -g mirror-mind`, `mirror init <name>` (writes `~/.config/mirror/env`), the OpenRouter
  key added to that file, one wiring step per runtime (`pi install "$(npm root -g)/mirror-mind"` for
  Pi), `mirror seed`. There is no clone, no `uv`, no `.env` in a checkout. This is the same failure the
  Navigator met on 2026-10-28 (`uv sync`: *No pyproject.toml found*, CV-010 field finding).
- **macOS downloads Mirror Desktop 0.2** (`/mirror-desktop/alpha/downloads/macos/…`, still
  0.2.0-alpha.58), which supports only the Python Core `<0.32`. A person following the page today gets
  a Core the Desktop it offers cannot use.
- **macOS puts the Core first and calls the Desktop an add-on** ("Install Mirror Mind first. Then add
  Mirror Desktop"). 0.3 no longer needs that: its first-run assistant, accepted on the clean `mirror`
  account (DS-005 phase 3), creates the home under `~/Mirror Homes`, installs Pi, connects a
  provider and keeps the OpenRouter key, without a terminal and without writing `~/.config/mirror` or
  `~/.mirror-minds`. A person who already has a Mirror is offered to adopt it (alpha.3, 5a).
- **Windows links a Python-era installer** (`v0.31.8`, `MirrorMind-Setup-0.31.0.exe`). Core retired
  the PowerShell installer and the Windows Frame (CV22.DS10.US3); its REFERENCE says *"There is no
  Windows product"*, though a package install on Windows can now update itself (PR #46, CR189).
- **The site's README** states the same 0.2 download contract and the Core-first order.

## Proposed Direction

1. **macOS leads with Mirror Desktop 0.3.** Download from
   `https://updates.mirrormind.sh/mirror-desktop/ts/downloads/macos/mirror-desktop-latest.dmg`
   (alpha.4 today, checked 200), open it, follow the assistant. Say plainly: alpha, Intel build,
   not signed or notarized yet, and what the person must do the first time macOS refuses to open it.
2. **A second path on macOS for the terminal:** the Core 0.39 steps above, for people who want to
   use Mirror from Pi, Claude Code, Codex, Antigravity or Grok Build, linking to Core's Getting
   Started instead of copying its whole table.
3. **"Already have Mirror?"** A short note: Mirror Desktop 0.3 finds an existing home and offers to
   adopt it; what adoption does to the home (it migrates the database and keeps a verified backup),
   and that a Python Mirror cannot open it afterwards.
4. **Linux:** Core 0.39 only; Mirror Desktop is not distributed for Linux.
5. **Windows:** remove the installer link; say there is no supported Windows release today and point
   to the Core repository. (The Navigator decides whether to mention the npm package on Windows as
   unsupported but possible.)
6. **The README** follows: the `/ts/` download contract, the Desktop-first order on macOS.
7. Both languages change together, and the pages keep the same structure.

## Open Questions for the Navigator

- **Desktop-first on macOS?** The recommendation is yes: it is what CV-010 was built for, and it is
  the only path without a terminal. The cost is that an unsigned app is the first thing a newcomer
  meets.
- **Apple Silicon.** 0.3 ships an Intel build only. Whether it runs under Rosetta on Apple Silicon,
  including the bundled Node host and the app's own Pi, has not been measured. Until it is, the page
  says Intel only.
- **The first-open wording.** The current page says *right click, Open*. On recent macOS that may no
  longer be enough for an app that is not notarized (System Settings › Privacy & Security › Open
  Anyway). To be checked on this machine's macOS before the wording is written.
- **Desktop home and the terminal.** A home created by the assistant lives in `~/Mirror Homes/<name>`
  and writes no `~/.config/mirror/env`, so the terminal Core does not find it on its own. Whether the
  site explains how to use that home from a terminal, or stays silent until a Core or Desktop story
  covers it, is open. Related: CR167 (a linked Claude Code plugin logs the Desktop's turns twice),
  which argues for not telling Desktop users to link Claude Code yet.

## Acceptance

- No page in either language mentions `uv`, `git clone`, `python -m memory`, `.env.example`, the
  `/alpha/` download path or the `v0.31.8` installer.
- Every command on the pages was run on a clean account (the `mirror` macOS account) against
  `mirror-mind` 0.39.0, and the download link serves the current 0.3 DMG.
- A person on the clean account follows the macOS page from the top and reaches a first answered
  turn, as phase 3's acceptance did.
- Local preview (`python3 -m http.server 8080 --directory site`) shows both languages; the deploy is
  a separate act, with its own word.

## Exclusions

- Signing and notarization (CV-009), an Apple Silicon build, a Windows or Linux Desktop.
- Rewriting the landing pages or *What is Mirror* beyond the links that point to the guides.
- Any change to Core's own Getting Started.
