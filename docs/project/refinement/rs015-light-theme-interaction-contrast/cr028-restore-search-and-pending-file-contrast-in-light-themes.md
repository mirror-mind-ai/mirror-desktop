[< RS015 — Light Theme Interaction Contrast](index.md)

# CR028 — Restore search and pending-file contrast in light themes

**Status:** planned

## Problem

Navigator screenshots show dark-palette foregrounds becoming nearly white or pale teal against light surfaces:

- active Journey search text, result summary and `Clear ×` are difficult to read;
- the sidebar collapse arrow is nearly invisible;
- pending attachment `Clear all`, file path and `Remove file` controls are difficult to read.

The base selectors use fixed colors designed for dark themes. Existing broad light-theme rules do not override more specific active-search and attachment selectors consistently.

## Expected Behavior

Daylight, Mist and Parchment use their semantic primary, muted and accent foreground tokens on the actual search and pending-file surfaces. Enabled text and controls reach at least WCAG AA 4.5:1 contrast, focus remains structural and visible, and dark themes retain their current palette.

## Plan

1. Extend `src/tests/applicationTheme.test.ts` with contrast calculations for active search text, search summary text/action, pending-file title/path/actions and sidebar collapse control across all three light themes.
2. Add one explicit light interaction contrast contract in `src/styles/app.css` after the base light-theme rules so selector specificity and cascade are deterministic.
3. Use `--light-text`, `--light-muted`, `--light-accent`, `--light-surface`, `--light-raised`, `--light-border` and bounded `color-mix` surfaces instead of new hard-coded per-theme colors.
4. Cover normal, hover and focus-visible states. Disabled actions remain visibly disabled but do not replace enabled-state contrast authority.
5. Preserve component markup, accessible labels, Journey search behavior, attachment opening/removal and all dark-theme selectors.
6. Run focused theme, Journey search and attachment tests, the complete frontend suite, `npm run build`, `npm run roadmap:check`, and Navigator validation in Daylight, Mist and Parchment using the supplied scenarios.

## Expected Files

- `src/styles/app.css`
- `src/tests/applicationTheme.test.ts`
- This CR and the file-first Refinement Workbench status

## Acceptance

- Active search input text and caret are legible in every light theme.
- Search result count and `Clear ×` are legible on their tinted summary surface.
- The sidebar collapse arrow remains visible at rest, hover and keyboard focus.
- Pending attachment title, path, size, `Clear all` and `Remove file` are legible on their panel surface.
- Enabled textual controls meet at least 4.5:1 against their declared surfaces.
- Focus-visible treatment remains distinguishable without color alone.
- Dark theme rendering and all interaction behavior remain unchanged.

## Validation Route

Reproduce both supplied screenshots in isolated `Mirror Desktop Dev`. Validate search active and result-summary states plus one attached-file panel in Daylight, Mist and Parchment. Automated tests must prove semantic token contrast, required selectors and preservation of existing theme contracts.

## Boundaries

- No broad visual redesign, new theme, typography change or attachment/search behavior change.
- No release, push, publication or protected data mutation.

## Provenance

Captured from two Navigator screenshots supplied during pre-release visual review on 2026-09-13.
