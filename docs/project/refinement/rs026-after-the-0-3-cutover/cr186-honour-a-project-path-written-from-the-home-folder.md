[< RS026](index.md)

# CR186: Honour a Project Path Written From the Home Folder

**Status:** done
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-03: a turn in a Journey with a `project_path` wrote its files
into a new folder under `~/Mirror Journeys/`. That folder is meant only for a Journey without one.

## What Is Known

- The Journey was `venda-de-livros`. Its `project_path` in the Mirror is `~/Code/szen_play`, and
  the local Journey registry carries it as written: `"projectPath": "~/Code/szen_play"`. The folder
  exists.
- CR176's `resolve_journey_workspace` (`src-tauri/src/journey_workspace.rs`) refuses a registered
  path that is not absolute, and nothing expands the `~` before it. The turn therefore fell back to
  `~/Mirror Journeys/venda-de-livros`, created at 09:41, with the note "is not an absolute path".
- It is the only one of the 76 registered project paths in production written with `~`.
- `registered_journey_root` feeds eight other native readers (the Journey's documents and
  projections among them). They take the same string, so they may fail on it too; to be checked.

## Direction

Expand a leading `~/` against the person's home folder where the registered path is read, in one
place, so every reader gets the folder the person named. A bare `~user` stays refused. Test first:
a registered `~/project` runs the turn in `<home>/project`; the refusals CR176 keeps (missing,
not a folder, inside the Mirror home) still hold after expansion.

## Falsifier

A turn in `venda-de-livros` writes in `~/Code/szen_play`, and no `~/Mirror Journeys/venda-de-livros`
is created. The folder already created there is the Navigator's to keep or delete.

## Built (2026-11-03, `cfe6212`)

- `registered_project_path(raw, user_home)` in `main.rs`: a leading `~/` and a bare `~` name the
  home folder; `~user` is left as written, so CR176 still refuses it as not absolute.
- `registered_journey_root` reads the path through it, with the home folder the turn already uses
  (`app.path().home_dir()`). All nine readers go through that function: the turn's folder, the
  Journey's documents, canvas, projections, local references and the open/reveal actions.
- Tests first, both failing on a stub: `cr186_a_project_path_written_from_the_home_folder_names_a_folder_in_it`,
  and `cr186_the_turn_runs_in_a_project_written_from_the_home_folder`, which composes it with CR176's
  `resolve_journey_workspace` (no `~/Mirror Journeys` is created; a `~/` path inside the Mirror home
  is still refused). `src/tests/cr186RegisteredProjectPath.test.ts` guards that the reader expands.
  Four mutations, all caught.
- Suites: TS 2,518, Rust 468 plus 10 ignored.

Shipped in v0.3.0-alpha.11. Checked in production by the Navigator on 2026-11-03: "is not an absolute
path" did not appear, and a new Journey answered with its own path. "Pode fechar." Before that: development has no Journey
written with `~`.
