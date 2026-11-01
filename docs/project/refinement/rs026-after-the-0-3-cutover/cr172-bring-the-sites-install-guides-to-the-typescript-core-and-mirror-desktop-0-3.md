[< RS026](index.md)

# CR172: Bring the Site's Install Guides to the TypeScript Core and Mirror Desktop 0.3

**Status:** in_progress
**Delivery:** `mirrormind-site` `main` (`0a68a5d`, local, not pushed)
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

## Revised Direction (2026-11-01, after the Navigator named the rebrand)

The Navigator plans to rebrand Mirror Desktop back to **Nautilus**: not a canonical application for
using Mirror, but one harness in an ecosystem of harnesses built to the style and preference of
different enthusiasts. The pages keep saying *Mirror Desktop* for now, and will soon present
Nautilus as one option in an ecosystem that holds Mirror, Ariad (the method for traceable agent
work, already a section of the site), Nautilus and others.

That reverses the original direction's first point. **The guides put Mirror at the center and the
harnesses around it**, which is the shape the rebrand needs, so this CR is not rewritten in weeks:

1. **Install Mirror** is the guide's spine on macOS and Linux: the Core 0.39 steps (Node.js 24+,
   `npm install -g mirror-mind`, `mirror init`, the OpenRouter key in `~/.config/mirror/env`,
   `mirror seed`), linking to Core's Getting Started for detail.
2. **Choose how you talk to it** follows, as parallel options of equal standing: the terminal
   runtimes (Pi recommended, with its one wiring step; the others by link), and **Mirror Desktop**
   on macOS (alpha, Intel, unsigned, the `/ts/` download). The Desktop option is one self-contained
   block, so the rebrand changes its name, words and link in one place, and new harnesses are added
   as siblings.
3. **The Desktop block says it needs no terminal**: its assistant can create the Mirror itself, or
   adopt one that exists. It is not presented as the way to use Mirror.
4. Linux and Windows as in the original direction (points 4 and 5); both languages together.
5. **The site's README** records the block structure and the `/ts/` download contract.

What this CR still owns is correctness: stop teaching the Python Core, stop offering 0.2, stop
linking the retired Windows installer. The ecosystem page itself (Nautilus by name, the harness
catalogue, how Ariad relates) belongs to the rebrand and to the *Mirror Mind Website* Journey.

### What the rebrand will have to decide, found here

- **A harness's home should be every harness's home.** A Mirror created by Desktop's assistant lives
  in `~/Mirror Homes/<name>` and writes no `~/.config/mirror/env`, so the terminal Core and other
  harnesses do not find it. That fits a canonical app; it contradicts an ecosystem, where the
  person's Mirror is one and the harnesses are interchangeable around it. Until it is decided, the
  Desktop block says that a Mirror it creates is used from the app.
- **The update channel carries the old name** (`updates.mirrormind.sh/mirror-desktop/ts/`). Installed
  apps poll it, so the rebrand must keep it answering, or move it with a redirect the installed
  updater follows. The site's download link moves with whatever the rebrand chooses.

## Original Proposed Direction (superseded in part: points 1–3 and 6 by the revision above)

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

- ~~**Desktop-first on macOS?**~~ *Answered by the rebrand: Mirror at the center, the Desktop one
  harness among the options.*
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

## Built (2026-11-01, Navigator's word "vai no mirrormind-site")

Commit `0a68a5d` in `mirrormind-site`, local only. Not pushed and not deployed; each needs its own word.

- **macOS (en, pt-br):** "Install your mirror. Then choose how you talk to it." Prepare (Node.js 24+,
  OpenRouter, a subscription), `npm install -g mirror-mind`, `mirror init` + the key in
  `~/.config/mirror/env` + `mirror seed`; then, under "choose how you talk to it", Pi
  (`pi install "$(npm root -g)/mirror-mind"`, other runtimes by link to Core's Getting Started) and
  Mirror Desktop as one self-contained block marked with an HTML comment, linking the `/ts/` alias.
- **The Desktop block** says the assistant creates a mirror without a terminal (used from the app),
  that the mirror created above is chosen in Settings › Choose Mirror home… (the app does not find it
  on its own; alpha.3's notes), what adoption does, to use Pi rather than a Claude Code link (CR167),
  Intel only with Apple Silicon untested, and *Open Anyway* in Privacy & Security for the first open.
  That wording follows macOS 15+ behaviour for an app that is not notarized; it was not tried with a
  quarantined download here (this machine runs macOS 26.6.2).
- **Linux:** the same Core steps and Pi; Mirror Desktop not released for Linux.
- **Windows:** "There is no Windows release today", why the installer is gone, and a link to Core.
  The npm package on Windows is not mentioned.
- **Landing pages:** only the line under the install buttons, which said "Install Mirror Mind first …
  after Mirror Core is configured".
- **README:** the harness-block structure and the `/ts/` download contract; `/alpha/` not to be linked.
- **Checks:** no page mentions `uv`, `git clone`, `python -m memory`, `.env.example`, `/alpha/` or
  the `v0.31.8` installer; all eight pages parse; all served 200 in the local preview; the English
  macOS page was screenshotted.

### Still owed

- **The clean-account run** (acceptance): the commands were taken from Core 0.39's Getting Started,
  not yet run on the `mirror` account.
- The Navigator's review of the preview, then the push and the deploy, each with its own word.
