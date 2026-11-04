[< Roadmap](../index.md)

# CV-012 - A Canonical Core and Extensions

**Status:** 🟡 Candidate — captured from the Navigator on 2026-11-03; not planned

## Outcome

The app ships a minimal, canonical set of functions, and everything beyond it is an extension the
person installs and turns on or off.

## The Canonical Set (Navigator, 2026-11-03)

1. **Journey management**, which exists today.
2. **Persona management**, a new structure, together with
   [CV-008.DS-003 Persona Conversation Spaces](../cv-008-conversation-spaces/ds-003-persona-conversation-spaces/index.md).
3. **Conversations** in the scope of a Journey (exists today) and of a persona (CV-008.DS-003).

Everything else is an extension.

## The First Extensions

Two functions that exist today leave the canonical app and become its first extensions:

- the **Context Map** (CR105's context surface), which absorbs
  [CR156 Simplify the Context Map](../../refinement/rs016-ongoing-product-improvements-and-adjustments/cr156-simplify-the-context-map.md);
- the **Agent Canvas** (CR112, the Canvas a Journey's agent draws).

## Open Before Planning

- What an extension of the app is: what it may draw (a tab, a panel, a header action), what it may
  read (the Journey, its folder, the conversation), and whether it runs in the renderer, in the
  embedded host, or both. The Mirror Core already has extensions; whether the app's are the same
  kind or a separate kind is the first question.
- Where extensions come from, how they are installed, updated and turned on or off, and per what
  (the app, a home, a Journey).
- What persona management needs from the Core, which owns personas.
- Order against CV-008.DS-003, which the canonical set depends on, and against CV-013, the rename.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-012.DS-001](ds-001-launch-with-only-the-canonical-set/index.md) | Launch With Only the Canonical Set | The Context Map and the Agent's Canvas are hidden by default and can be turned back on in Settings, before the launch | 🟡 Candidate |

The extension mechanism itself waits for an Explorer Mode pass.
