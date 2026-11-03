[< RS026](index.md)

# CR186: Honour a Project Path Written From the Home Folder

**Status:** captured
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
