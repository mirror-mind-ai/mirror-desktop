[< RS021](index.md)

# CR082: Collapsed Sidebar Polish

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr082-collapsed-sidebar-polish`

## Problem

The collapsed sidebar works functionally but needs aesthetic refinement before beta. The compact surface should feel intentional, readable and useful rather than like a squeezed version of the expanded sidebar.

## Expected Behavior

The collapsed sidebar has a polished compact grammar: recognizable Journey identity, clear active/running/pinned states, good spacing, accessible hit targets and coherent light/dark theme treatment.

## Proposed Scope

- Review the collapsed sidebar visual hierarchy across themes.
- Improve spacing, icon sizing, selected/running/pinned indication and affordance discoverability.
- Preserve keyboard/mouse access to essential Journey actions.
- Validate with representative recent/pinned/tree states.

## Plan (2026-09-27)

The approved direction treats the collapsed sidebar as a **rail**, not as a narrow version of the
expanded sidebar. The screenshot evidence showed that the focused Conversation sidebar was still
rendering inside the 72px rail, causing `CONVERSATIONS` and every entry title to wrap into a
vertical column. That is a structural bug, not polish.

Implementation target:

1. Hide the focused Conversation list and its per-Journey expand/collapse toggle while the rail is compact.
   Compacting the sidebar must not change the selected Conversation; it is presentation-only.
2. Give compact Journey items their own grammar instead of inheriting the expanded card grammar:
   no card shadow, no translate, no left inset bar, no decorative `::before` blob.
3. Make states orthogonal: active Journey = rail tile/outline; running/finalizing = existing icon
   activity/glow; pinned = small non-interactive corner marker.
4. Preserve access through labels and titles, since the visible Journey copy is absent in the rail.
5. Add explicit compact light-theme overrides so daylight/mist/parchment do not reintroduce the expanded
   card treatment after the compact rules.

Exclusions stay intact: no navigation model redesign, no ordering changes, and no new running animation
beyond keeping the existing activity state legible.

## Implementation Evidence (2026-09-27)

Implemented the approved rail model.

- Compact mode now hides the focused Conversation sidebar and the per-Journey Conversation toggle.
  The selected Conversation is not collapsed in state; the sidebar presentation simply stops rendering
  that second level while the rail is 72px wide.
- Compact Journey items now have their own CSS grammar: transparent neutral tile, no expanded-card
  shadow, no translate, no left inset bar, and no decorative `::before` blob.
- A first Dev pass proved that was not enough: default/system Journey marks were still rendered as
  miniature icon cards inside the rail tile. Compact mode now removes the inner background, border
  and shadow for default/system glyphs.
- A second Dev pass found the corresponding custom-image problem: the selected tile left a larger
  rectangle around a smaller image. The chosen solution is to shrink the visible rectangle onto the
  custom image: the outer rail tile remains the click target, but its selected background/border are
  removed for custom appearances and the selected treatment moves to the image itself.
- The compact app icon is sized to the same 42px visual module as compact custom Journey images,
  so the brand mark and Journey marks belong to the same rail grammar.
- The compact Recent/Pinned/Tree control also drops its heavy outer capsule; selection now belongs
  to the individual rail button.
- Active, running/finalizing and pinned states are separate: active is the rail tile/outline,
  runtime remains on the icon, and pinned is a small non-interactive corner marker.
- Journey items now include a `title` and richer `aria-label` carrying runtime and pinned state, since
  visible copy is absent in the rail.
- Light compact overrides are placed after the generic light Journey-card rules so daylight/mist/parchment
  cannot reintroduce the expanded-card treatment.

## Validation

- `npm test`: 180 files, 1126 tests green.
- `npm run build`: green.
- `npm run roadmap:check`: READY.
- `git diff --check`: clean.

New coverage: `collapsedSidebarPolish.test.ts` pins the exact failure class shown in the screenshot —
the focused Conversation list and toggle must not render into the compact rail — plus the compact tile
grammar, orthogonal active/runtime/pinned states, accessible labels/titles and post-light-theme compact
overrides. Existing sidebar presentation tests still prove compaction does not dispatch a Conversation
collapse action.

## Dev Homologation (2026-09-27)

Validated by the Navigator on the Dev channel.

The first pass confirmed the structural fix: focused Conversations no longer render into the 72px
rail, and compacting the sidebar preserves the active Conversation rather than semantically closing
it. Two layout passes followed from visual review. First, default/system Journey marks stopped
rendering as miniature cards inside the compact tile. Second, custom-image Journeys stopped showing
a larger selected rectangle around a smaller image; the selected treatment moved onto the image
itself, and the compact app icon was aligned to the same visual module.

Accepted outcome: the compact sidebar now reads as a rail, not as a squeezed sidebar; the app icon
and Journey marks harmonize; custom images no longer float inside a larger leftover rectangle; and
Conversation expansion state no longer breaks the rail.

## Closure

**Proportionality review: proportional.** The change is CSS/markup only plus tests and docs. It
corrects the compact presentation without changing Journey ordering, Conversation selection,
Conversation persistence, runtime state, Mirror synchronization, or the expanded sidebar's model.

**Debt review: none opened.** The remaining adjacent desire — a new or richer active-agent animation
— already belongs to CR081 and was intentionally not absorbed here.

Commit, merge, publication and release remain separate Navigator decisions.

## Acceptance

- Collapsed sidebar looks intentional in light and dark themes.
- Active Journey, running state and pin state remain understandable.
- No regression to expanded sidebar behavior.

## Exclusions

- No redesign of the full Journey navigation model.
- No change to Journey ordering semantics.
