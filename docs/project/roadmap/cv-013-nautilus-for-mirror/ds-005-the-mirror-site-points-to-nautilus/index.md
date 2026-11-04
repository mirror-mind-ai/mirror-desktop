[< CV-013](../index.md)

# CV-013.DS-005 - The Mirror Site Points to Nautilus

**Status:** 🔵 In progress — requested and shaped by the Navigator on 2026-11-04; started the same day ("pode começar os ajustes no site oficial do mirror")

## Outcome

The Mirror site (mirrormind.sh and mirrormind.com.br) presents Mirror as the Core with front ends,
and names Nautilus for Mirror as the desktop one.

## Why (Navigator, 2026-11-04)

The rename makes Nautilus one front end among others. The Mirror site should say that, and the app
deserves its own place instead of living inside the Core's install guides.

## Where It Starts (read 2026-11-04)

- The site repository is `mirrormind-site`, another Journey's repository; its push and deploy each
  need the Navigator's own word, as before.
- 8 pages name "Mirror Desktop", in English and Portuguese: the home pages, "What is Mirror", and
  the install guides.
- The macOS install guides link `/downloads/macos/mirror-desktop-latest.dmg`, a path the release
  script publishes.

## Scope

- Rename "Mirror Desktop" to "Nautilus for Mirror" on every page, in both languages.
- The macOS guides download from the Nautilus channel
  (`https://updates.mirrormind.sh/nautilus/downloads/macos/nautilus-latest.dmg`) and say, to a 0.3
  user, that it is the same app renamed and installs beside the old one.
- The old DMG path (`/mirror-desktop/ts/`) keeps answering with alpha.16, so links already shared
  still work. The Linux guide (terminal only) is unchanged.
- The GitHub links keep pointing to the repository, which keeps its name. They move to Nautilus's
  own site with [DS-006](../ds-006-nautilus-gets-its-own-site/index.md).

## Decided (Navigator, 2026-11-04)

- **When:** the Mirror site changes after the first Nautilus release, so it never points to a
  download that does not exist yet. v0.4.0-alpha.1 is published.
- **Split:** this DS is the Mirror site only; Nautilus's own site is DS-006, later.

## Built (2026-11-04)

`mirrormind-site` commit `e1a49df`, local: 8 pages and the README. Checked in a browser on a local
server: both macOS guides title the block "Nautilus for Mirror" and their button links the Nautilus
DMG. Not pushed and not deployed; each needs the Navigator's word.

Then, asked by the Navigator ("faça o bloco dos agentes"), commit `19082e3`: under "choose how
you talk to it", the macOS and Linux guides in both languages give Claude Code, Codex, Antigravity
and Grok Build their own block, where they were a footnote under Pi. Mirror enters them as a
plugin; the Claude Code and Codex steps are Mirror Core 0.39.4's Getting Started, section 6, and the
others link to it. The install guides' menu says `nautilus`, which the rename had missed there.
