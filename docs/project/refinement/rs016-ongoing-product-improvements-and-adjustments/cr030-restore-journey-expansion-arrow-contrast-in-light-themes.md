[< RS016](index.md)

# CR030 — Restore Journey Expansion Arrow Contrast in Light Themes

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr030-journey-expansion-arrow-contrast`

## Problem

The arrow control used to expand or collapse a Journey's associated Conversations does not remain visibly distinguishable in light application themes. Its foreground treatment loses sufficient contrast against the Journey surface, so the control can appear absent even though the expansion action is available.

## Expected Behavior

The Journey expansion arrow remains clearly visible in every supported light theme and in its collapsed, expanded, hover, focus-visible and disabled states. The control preserves the established sidebar hierarchy and interaction behavior, communicates expansion state accessibly, and does not depend on color alone to remain discoverable.

## Impact

A low-contrast expansion control hides the entry point to associated Conversations, making delivered multiple-Conversation behavior appear unavailable. The defect particularly affects light-theme users and weakens both navigation clarity and keyboard discoverability.

## Plan Or Decision

### Scope

- Add an explicit light-theme contrast contract for `.journey-conversation-toggle` using existing semantic light-theme tokens.
- Keep the arrow visible in collapsed and expanded states, and preserve distinct hover, focus-visible and disabled feedback.
- Extend theme regression coverage so every supported light palette proves the selected foreground and surface meet the established contrast threshold.

### Affected Files

- `src/styles/app.css`
- `src/tests/applicationTheme.test.ts`

### Acceptance

- The Journey expansion arrow is clearly visible in Daylight, Mist and Parchment before interaction.
- Hover and focus-visible states remain visibly distinct, with focus communicated by more than foreground color alone.
- Expanded, collapsed and disabled semantics remain unchanged, including existing `aria-expanded` and accessible labels.
- Existing dark themes and Journey expansion behavior do not regress.

### Validation

- Run the focused application-theme tests and TypeScript check.
- Run the complete frontend suite and production web build.
- Rebuild `Mirror Desktop Dev` through `npm run tauri:build:dev` for Navigator validation in at least one affected light theme.

### Exclusions

- No redesign of Journey cards, sidebar hierarchy, Conversation catalog behavior or theme palettes.
- No changes to Journey expansion authority, persistence, runtime behavior or accessibility labels unless a failing test proves a bounded correction is required.

### Authority Boundary

The Navigator approved this plan and assigned Driver `@alissonvale` with Delivery branch `refinement/rs016-cr030-journey-expansion-arrow-contrast`. Implementation is authorized. Commit, push, merge, publication and release remain separate decisions.

## Evidence

Navigator observation during continued use of Mirror Desktop: the Journey expansion-arrow icon is not visibly available because of insufficient contrast in light themes.

Follow-up Navigator screenshots showed that the expanded focused Conversation list also lost contrast in light themes: Conversation titles, metadata, icons and the **New** action rendered as white text over a pale blue sidebar surface. A second validation screenshot showed the problem persisted after the first focused-list rule because the concrete `button` and nested `span` elements still needed higher-specificity color rules.

Implementation evidence:

- `src/styles/app.css` adds explicit light-theme contrast for the Journey Conversation expansion toggle.
- `src/styles/app.css` adds explicit light-theme contrast for expanded focused Conversation lists, including heading, entries, selected state, icons, metadata, **New** and more actions.
- `src/styles/app.css` also excludes focused Conversation buttons from the generic light-theme button rule that forces ordinary buttons to white text, then applies higher-specificity `button.*` and nested `span` overrides for the focused Conversation title, icon, **New** and more controls.
- `src/tests/applicationTheme.test.ts` covers the expansion-toggle and focused Conversation-list light-theme contrast contracts across Daylight, Mist and Parchment, including the generic-button exclusion.
- `npm test -- --run src/tests/applicationTheme.test.ts`: passed, 13 tests.
- `npm run build`: passed. Vite emitted the existing chunk-size warning only.

## Outcome

Implemented locally. Navigator validation pending.
