[< Refinement Workbench](../index.md)

# CR020 — Tighten Journey sidebar header layout

## Problem

The Journey sidebar header gives too much vertical separation to its product identity and the controls below it. The version originally read as detached from the product title, while the Mirror Desktop icon was vertically centered against the whole text stack instead of aligning with the title. Refinement review also found that both the `DEV LAB` title badge and `Journey Navigation` descriptor duplicated identity already communicated elsewhere.

## Expected Behavior

- The Mirror Desktop title and version label sit close together as one product-identity group.
- The redundant `Journey Navigation` descriptor and its separator are absent.
- Search and ordering controls move upward into a balanced position beneath the shorter product header.
- The Mirror Desktop icon aligns to the top of the title rather than the vertical center of the complete header copy.
- The icon's development badge, accessible development identity, and update/version interaction remain readable and usable.
- Expanded and compact sidebar presentations remain stable.
- The result remains legible in all curated light and dark application themes.

## Impact

This is a focused visual hierarchy and alignment refinement for the Journey sidebar header. It should not alter updater behavior, application identity, Journey navigation behavior, sidebar collapse semantics, or persisted state.

## Plan Or Decision

Make a minimal markup and CSS hierarchy correction:

- align the expanded `.brand-block` children to the top;
- reduce the version wrapper's title gap to one pixel;
- remove the redundant `Journey Navigation` descriptor and its separator;
- reduce the brand block's lower margin from 18 to 12 pixels so the controls below follow the shorter header;
- remove the redundant visible `DEV LAB` title badge while retaining the icon's `DEV` badge and an assistive-text development-channel label;
- preserve the existing compact-sidebar rules, update interaction, remaining badges, and light-theme color overrides.

Driver: `@alissonvale`. Delivery: `refinement/rs009-cr010-shift-enter-line-breaks`.

## Implementation

The sidebar brand block now top-aligns the icon, copy, and collapse control. The version remains attached to the title. `Journey Navigation`, its separator, and the redundant visible `DEV LAB` title badge were removed; the icon retains its `DEV` badge, and screen readers receive `Development channel` through the existing `sr-only` utility. A smaller lower brand margin moves search and ordering upward without changing their own layout. Development labels used elsewhere remain unchanged. No updater, navigation, or persistence behavior changed.

## Evidence

The pre-change regression tests failed against the centered brand block and both redundant labels. The implementation adds a dedicated source-level contract that verifies title/version order, absence of the descriptor, separator, and title badge, exact expanded-header spacing, top alignment, accessible development identity, control ordering, and preservation of compact-sidebar behavior.

Implementation checks:

- the focused sidebar brand layout suite passed with 2 tests;
- all 644 frontend tests passed across 117 files;
- `npm run build` passed, with only the pre-existing Vite chunk-size warning;
- `npm run tauri:build:dev` rebuilt the isolated Dev app and DMG;
- the restarted Dev process loaded the rebuilt executable (`pid=83726`, inode `161466641`);
- `git diff --check` passed before commit.

Navigator visual validation remains pending in the isolated Dev bundle.

## Outcome

Implementation is in progress; terminal outcome requires visual validation and an explicit Navigator decision.

## Authority Boundary

Implementation was explicitly authorized for CR020. Push, publication, release, endpoint mutation, and production promotion remain unauthorized.
