[< RS026](index.md)

# CR177: Keep the Person's Mirror Skills From Reaching Another Home

**Status:** done
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

## Decision (Navigator, 2026-11-02)

The bound home, not `--no-skills`: the person keeps their skills, and the `mirror` CLI they reach is
the Desktop's own home.

## Delivered on `main` (`09ae441`)

- `RuntimeChannelProfile::apply_to_command`, the one place a turn, compaction or title command is
  built, sets `MIRROR_HOME` to the bound home, `MIRROR_USER` to its folder name (the CLI refuses a
  user that disagrees with the home's basename) and `DB_PATH` to its database, and removes
  `MEMORY_DIR` and `MEMORY_PROD_DIR`. The CLI fills from `~/.config/mirror/env` without overriding,
  and `DB_PATH` wins over every derived path, so that file can no longer redirect the turn.
- Not reopened: Pi still runs with `--no-extensions`, and the Desktop still refuses the
  `mirror-mind` package's extensions and any `mirror-logger`, so naming the home brings back no
  second conversation writer (CR167).
- Spec first; 4 mutation controls, each applied and caught. Full suite: 451 Rust.
- Measured with the real `mirror` CLI (0.39.0), in the turn's environment, on an APFS copy of
  `ensaio-5c-2`, with `~/.config/mirror/env` naming production: `mirror tasks add` wrote to the copy
  (2424 → 2425 tasks); production stayed at 2416. `mirror journal` calls a model first; with an
  invalid key it wrote nothing anywhere. Copies deleted.

### Navigator check in development (done, 2026-11-02)

Group B's script ([RS026](index.md#group-b-check)), step 3. The Navigator had the dev agent create a
task in `vida-tecnica`; the Driver read APFS copies of both databases: task `f4201ac7` (19:23Z) is in
`ensaio-5c-2`, and production has no task created since 18:30Z. Closed; the release check folds into
the next alpha.

## Acceptance

- Spec first, with mutation controls, on whichever direction is chosen.
- Sandbox: a development Desktop turn that runs `mirror journal` on a rehearsal home writes nothing
  to the home `~/.config/mirror/env` names.

**Shipped in [v0.3.0-alpha.7](../../../releases/v0.3.0-alpha.7.md)** (2026-11-02).
