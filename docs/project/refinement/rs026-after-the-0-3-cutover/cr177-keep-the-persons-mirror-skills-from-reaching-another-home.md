[< RS026](index.md)

# CR177: Keep the Person's Mirror Skills From Reaching Another Home

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Found while measuring CR176 (2026-11-02). Desktop turns load the person's agent-level Pi skills:
the turn passes no `--no-skills`, and `~/.pi/agent/settings.json` declares the Mirror package
(`/usr/local/lib/node_modules/mirror-mind`), whose `mm-*` skills tell the model to run the `mirror`
CLI. `mirror` is on the turn's `PATH` (`/usr/local/bin`, from `runtime_search_directories`).

The turn removes `MIRROR_HOME` and `MIRROR_USER` (slice 2e), so a `mirror` command the model runs
falls back to `~/.config/mirror/env`, which on this machine names the production user. The Desktop
is bound to a home; the CLI it can reach is bound to another:

- a development Desktop on a rehearsal home that follows `mm-journal`, `mm-memories` or `mm-tasks`
  writes to the production home;
- a production Desktop on one home writes to whatever `~/.config/mirror/env` names, which need not
  be the same home;
- Mirror's context already reaches the turn through the host, so these skills duplicate it with
  another authority.

## Direction (to decide)

- Turns pass `--no-skills`, as compaction and title suggestion already do; Mirror's capabilities
  reach the turn through the host, not the terminal's skills. The person's other skills (browser,
  Gmail) would go too, so this is the Navigator's call.
- Or the Desktop keeps the skills and sets `MIRROR_HOME`/`MIRROR_USER` to the bound home for the
  turn, so the CLI the model reaches is the Desktop's own home.

## Acceptance

- Spec first, with mutation controls, on whichever direction is chosen.
- Sandbox: a development Desktop turn that runs `mirror journal` on a rehearsal home writes nothing
  to the home `~/.config/mirror/env` names.
