# Canvas instructions

Standing note about the canvas for this Journey. Mirror Desktop renders `canvas.md` in the Canvas
tab and decides nothing about its shape, so the shape is ours.

## What to draw

What someone returning to this Journey needs in order to know where it stands:

- The current focus, from the `## Current Focus` section of `docs/project/refinement/index.md`.
  That section is the authority on what is current. Never infer it from row order or recency.
- The open Change Requests, in the order the canonical index lists them, which that index
  declares intentional. Terminal statuses are `done`, `parked`, `rejected` and `promoted`.
- Where the current delivery stands: its branch, whether its gates are green, and what it is still
  waiting on. This comes from the Change Request document itself.

Keep it to one screen. If something is uncertain, say it is uncertain rather than drawing a
confident version of it.

## When to redraw

When the Navigator asks for the state of this Journey, and when a turn has just changed something
the drawing shows: a status moving, the focus moving, gates going green, or a delivery closing.
Redraw before reporting completion, not after being asked twice.

## Boundaries

Replace `canvas.md` entirely each time. It is derived and disposable, and state never lives in it.
`docs/project/refinement/index.md` remains the only authority on status; if the drawing and the
index disagree, the index wins and the drawing is wrong.

No links, because the renderer resolves none and link syntax would show as literal text. Headings
no deeper than level three.
