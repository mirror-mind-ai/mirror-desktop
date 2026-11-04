[< Roadmap](../index.md)

# CV-011 - Embedded Pi

**Status:** 🟡 Candidate — captured from the Navigator on 2026-11-03, when CV-010 was closed; not planned

## Outcome

Mirror Desktop hosts Pi inside the app, as it already hosts the TypeScript Mirror, instead of
installing a Pi CLI and running it as a separate process.

## Why

Named by the Navigator as relevant when CV-010 was closed. Today the first-run assistant installs a
pinned Pi into a folder the app owns (`mirror-host/pi-install.mjs`), and every turn starts it as a
CLI with `--no-extensions`. The earlier exploration
[Embedded TS Runtime, Full Control](../../explorations/embedded-ts-runtime-full-control/index.md)
asked for exactly this (one bundled Node runtime hosting both Mirror and Pi, so the Desktop controls
the invocation contract), and the 0.3 decision adopted it for Mirror only: "Pi stays external".

## Open Before Planning

- Whether Pi exposes a library API the host can call, at the pinned version.
- What happens to the invocation contract the Desktop relies on today: the JSON event stream,
  sessions on disk, steering, cancel, compaction, and provider extensions (CR173's Anthropic
  provider).
- How an embedded Pi is updated, and whether a person can still use their own Pi in the terminal.

## Delivery Stories

None yet. An Explorer Mode pass comes first.
