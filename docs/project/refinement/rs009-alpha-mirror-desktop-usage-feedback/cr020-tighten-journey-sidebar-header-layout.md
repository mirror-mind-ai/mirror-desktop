[< Refinement Workbench](../index.md)

# CR020 — Tighten Journey sidebar header layout

## Problem

The Journey sidebar header gives too much vertical separation to the Mirror Desktop title, version label, and `Journey Navigation` descriptor. The version currently reads as detached from the product title, while the descriptor lacks a small structural separation from the version. The Mirror Desktop icon is vertically centered against the whole text stack instead of aligning with the top of the title.

## Expected Behavior

- The Mirror Desktop title and version label sit close together as one product-identity group.
- A small but visible vertical gap and separator distinguish the version label from `Journey Navigation`.
- The Mirror Desktop icon aligns to the top of the title rather than the vertical center of the complete header copy.
- The development badge and update/version interaction remain readable and usable.
- Expanded and compact sidebar presentations remain stable.
- The result remains legible in all curated light and dark application themes.

## Impact

This is a focused visual hierarchy and alignment refinement for the Journey sidebar header. It should not alter updater behavior, application identity, Journey navigation behavior, sidebar collapse semantics, or persisted state.

## Plan Or Decision

Use the existing semantic markup and make a CSS-only hierarchy correction:

- align the expanded `.brand-block` children to the top;
- reduce the version wrapper's title gap to one pixel;
- give the direct descriptor `<small>` a six-pixel upper gap, a subtle accent separator, and five pixels of inset;
- remove the redundant visible `DEV LAB` title badge while retaining the icon's `DEV` badge and an assistive-text development-channel label;
- preserve the existing compact-sidebar rules, update interaction, remaining badges, and light-theme color overrides.

Driver: `@alissonvale`. Delivery: `refinement/rs009-cr010-shift-enter-line-breaks`.

## Implementation

The sidebar brand block now top-aligns the icon, copy, and collapse control. The version remains attached to the title, while `Journey Navigation` is separated by a small accent rule and bounded spacing. The redundant visible `DEV LAB` badge was removed from this title only; the icon retains its `DEV` badge, and screen readers receive `Development channel` through the existing `sr-only` utility. The development labels used elsewhere remain unchanged. No updater, navigation, or persistence behavior changed.

## Evidence

The pre-change regression tests failed against the centered brand block, missing hierarchy contract, and redundant title badge. The implementation adds a dedicated source-level contract that verifies title/version/descriptor order, exact expanded-header spacing and separator, top alignment, accessible development identity, removal of the title badge, and preservation of compact-sidebar behavior.

Implementation checks:

- the focused sidebar brand layout suite passed with 2 tests;
- all 644 frontend tests passed across 117 files;
- `npm run build` passed, with only the pre-existing Vite chunk-size warning;
- `npm run tauri:build:dev` rebuilt the isolated Dev app and DMG;
- the restarted Dev process loaded the rebuilt executable (`pid=81867`, inode `161465312`);
- `git diff --check` passed before commit.

Navigator visual validation remains pending in the isolated Dev bundle.

## Outcome

Implementation is in progress; terminal outcome requires visual validation and an explicit Navigator decision.

## Authority Boundary

Implementation was explicitly authorized for CR020. Push, publication, release, endpoint mutation, and production promotion remain unauthorized.
