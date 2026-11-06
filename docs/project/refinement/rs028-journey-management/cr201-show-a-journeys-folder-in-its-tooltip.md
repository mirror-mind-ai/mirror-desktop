[< RS028](index.md)

# CR201: Show a Journey's Folder in Its Tooltip

**Status:** captured
**Driver:** —
**Delivery:** —
**Group:** A, reading the tree

## Friction

The tree item's tooltip says the name and the agent state (`App.tsx`, the `title` of a
`journey-item`), but not where the Journey's files live. To know the folder, the Navigator opens the
editor.

## Outcome

An option in Settings adds the Journey's project path to its tooltip, abbreviated with `~`, or says
that no folder is set.

## First Investigation

`projectPath` is on the registry item. Decide the option's default with the Navigator, and whether
the tooltip shows the path Mirror stores or the folder the agent would actually run in (they differ
when the folder is missing, CR197); this CR shows the stored one and leaves the effective one to
CR202.

## Acceptance

- With the option on, hovering a Journey shows its path; with it off, the tooltip is unchanged.
- A Journey without a path says so instead of showing nothing.
- The choice survives a restart.

## Boundaries

Read only. No path is checked on disk by this CR.
