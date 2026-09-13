[< Refinement Workbench](../index.md)

# RS015 — Light Theme Interaction Contrast

## Framing

Correct interactive surfaces that still inherit dark-palette foregrounds when Mirror Desktop uses Daylight, Mist or Parchment.

## Desired Outcome

Journey search, sidebar navigation controls and pending attachment actions remain immediately readable across every curated light theme, including active, hover, focus and disabled presentation, without altering dark themes or component behavior.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Refinement remains file-first. Legacy SQLite Workbench state is not inspected, reconciled or dual-written.
- Semantic light-theme tokens and measurable contrast own the correction; one-off theme-specific approximations do not.
- No component behavior, release, push, publication, updater endpoint, Mirror identity, Journey, conversation or app-data mutation is authorized.

## Change Requests

- [CR028 — Restore search and pending-file contrast in light themes](cr028-restore-search-and-pending-file-contrast-in-light-themes.md)

CR028 is `in_progress` under `@alissonvale` on `refinement/rs015-cr028-light-theme-interaction-contrast`. RS015 is active.
