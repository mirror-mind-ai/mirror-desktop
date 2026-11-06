[< RS028](index.md)

# CR201: Show a Journey's Folder in Its Tooltip

**Status:** done
**Driver:** @alissonvale
**Delivery:** `main` (`21ffb4b8`), RS028 group A
**Group:** A, reading the tree

## Friction

The tree item's tooltip says the name and the agent state (`App.tsx`, the `title` of a
`journey-item`), but not where the Journey's files live. To know the folder, the Navigator opens the
editor.

## Outcome

The Journey's tooltip always shows its project path, abbreviated with `~`, or says that no folder is
set. There is no option to turn it off (Navigator, 2026-11-05).

## First Investigation

`projectPath` is on the registry item. Decide whether the tooltip shows the path Mirror stores or the folder the agent would actually run in (they differ
when the folder is missing, CR197); this CR shows the stored one and leaves the effective one to
CR202.

## Acceptance

- Hovering a Journey shows its path.
- A Journey without a path says so instead of showing nothing.

## Boundaries

Read only. No path is checked on disk by this CR.

## Delivered (2026-11-05)

On `main` in `21ffb4b8`. The Group A Check passed in the development app and the Navigator validated the group on
2026-11-05.

- `journeyItemTitle` keeps the name and agent state on the first line and puts the folder on the
  second, abbreviated with `~` from the home Tauri reports, or "No folder set".
- The tooltip shows the stored path. Whether that folder exists is CR202's and CR197's question.
