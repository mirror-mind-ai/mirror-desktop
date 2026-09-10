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

Not planned. Likely implementation surfaces are the existing `.brand-block`, `.brand-copy`, `.brand-mark-wrap`, version-chip wrapper, and descriptor rules in `src/styles/app.css`; component markup should change only if CSS cannot express the required semantic grouping and separator cleanly.

## Evidence

The current implementation aligns `.brand-block` items to the center, gives the version wrapper a top margin, and renders the descriptor as the subsequent `<small>` element in `src/app/App.tsx`. This explains the icon alignment and the weak title/version/descriptor grouping described in alpha feedback.

## Outcome

No terminal outcome has been recorded. CR020 is captured and unassigned.

## Authority Boundary

Capture does not authorize selection, planning, implementation, commit, push, publication, release, endpoint mutation, or production promotion.
