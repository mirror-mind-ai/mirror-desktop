[< CV-013](../index.md)

# CV-013.DS-005 - The Mirror Site Points to Nautilus, and Nautilus Gets Its Own Site

**Status:** 🟡 Planned — requested and shaped by the Navigator on 2026-11-04

## Outcome

The Mirror site (mirrormind.sh and mirrormind.com.br) presents Mirror as the Core with front ends,
and names Nautilus for Mirror as the desktop one. Nautilus has a site of its own, where a new
person learns what it is and downloads it.

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

- **Mirror site:** rename "Mirror Desktop" to "Nautilus for Mirror"; the macOS guide installs the
  Core and points to Nautilus as the desktop option; the Linux guide (terminal only) is unchanged.
- **Nautilus site:** a new site, in English and Portuguese, with what Nautilus is, what it needs
  (a Mac, the Mirror Core), the download and its release notes.
- **The download link** follows the Nautilus channel (DS-002); the old DMG path keeps answering, or
  redirects, so links already shared still work.

## Decided (Navigator, 2026-11-04)

- **Address:** the subdomain `nautilus.mirrormind.sh`.
- **Where it lives:** a folder in `mirrormind-site`, served by the same host and deployed the same
  way.
- **When:** the Mirror site changes with the first Nautilus release, so it never points to a
  download that does not exist yet.
