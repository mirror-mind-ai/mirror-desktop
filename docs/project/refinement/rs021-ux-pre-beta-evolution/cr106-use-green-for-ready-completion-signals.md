[< RS021](index.md)

# CR106: Use Green for Ready Completion Signals

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr106-ready-green`

## Pull — 2026-09-30

The Navigator explicitly pulled CR106 after confirming the user-perceptible RS021 priority:
CR106, CR103, CR101, CR102 and CR105. This branch is limited to CR106 diagnosis and, only after
further explicit instruction, its implementation.

## Friction

After an agent finishes work, icons and labels in the `Ready` completion state do not use the green
success register. Completion is therefore less immediately legible than it should be.

## Outcome

The visible `Ready` completion signals use the established green success colour consistently, while
remaining distinguishable for selection, focus, light theme and non-colour readers.

## First Investigation

Inventory every `Ready` icon and label across sidebar, header and relevant Conversation surfaces.
Confirm the state source and existing theme tokens before changing colour, so a local styling change
does not make stale or non-completion states look successful.

## Acceptance

- Ready icons and labels use the same green completion register wherever `Ready` is shown.
- The signal remains readable in light and dark themes, selected and unselected Journey rows, and
  reduced-motion mode.
- Text, accessible name or another non-colour cue continues to distinguish Ready from Working,
  Finishing, Idle, failure and interruption.
- The change does not alter the duration or durability semantics of Ready.

## Diagnosis — 2026-10-01

### The defect was not a missing green, it was a borrowed colour

`.journey-agent-status.finished` was painted with `var(--accent)` — the same token as `.working` and
`.finishing`. In the dark themes only the glyph and the animation separated completion from work in
progress, never the colour register. No success token existed anywhere in the stylesheet.

In the light themes it was worse by construction: one rule grouped
`:is(.working, .finishing, .finished)` into a single accent-derived colour, so Ready could not be
read as completion at all.

### A collision the design had to absorb

The accent is Navigator-configurable and includes green palettes — `.accent-green` (`#8bdc93`) and
the Forest theme (`#8fd694`). A merely "green" Ready would collapse back into Working for those
choices, so completion needed a register independent of the accent **and** a distinguishing shape.

### State source confirmed before touching colour

`deriveJourneyAgentStatus` produces `finished` only while `finishedAttention` exists, cleared
`JOURNEY_FINISHED_VISIBLE_MS` (5s) after acknowledgement. Ready is already transient. Nothing in
this CR changes that derivation or its duration.

### Inventory

| Surface | Source |
| --- | --- |
| Sidebar icon (28px) | `App.tsx` sidebar `JourneyAgentStatusIndicator` |
| Tree-node variant (22px) | `app.css .journey-item.tree-node` |
| Compact variant (17px, absolute badge) | `app.css .sidebar-compact` |
| Header icon + `READY` text | `App.tsx` header `JourneyAgentStatusIndicator` |
| Sidebar `READY` text | `JourneyItemCopy` via `agentStatusLabel` |
| Accessible name and `title` | `JourneyAgentStatusIndicator` |

## Repair — 2026-10-01

### The circle lives in the glyph

`finished` now draws a filled disc with the check knocked out of it, inside the SVG rather than by
filling the container. The header container is a `width: auto` pill holding the word `READY`, so
filling it would have produced a solid green block; keeping the circle in the glyph gives one drawing
that serves all four sizes and both theme families.

Shape now carries part of the distinction: Working is a 6px core dot and Finishing is that dot
dimmed, so Ready stays separable even under a green accent.

### Completion owns its register, and the knockout inverts by family

New `--ui-success`, `--ui-success-rgb` and `--ui-success-on`, independent of the accent. Measuring
the candidates produced a conclusion that was not obvious up front: the knockout polarity has to
invert between families, because a white check on a bright disc reaches only 1.8:1.

Measured contrast ratios (WCAG AA needs 4.5:1):

| Pair | Ratio |
| --- | --- |
| Check `#07130c` on dark disc `#3ddc84` | 10.63 |
| Check `#ffffff` on light disc `#0b7a3e` | 5.43 |
| Disc on the five dark sidebars (tide … slate) | 10.30 – 10.67 |
| Disc and `READY` label on the three light sidebars | 4.82 – 4.91 |

Every pair clears AA in all eight themes.

### The light themes get a Ready rule of their own

The grouped light rule was narrowed to `:is(.working, .finishing)` and `.finished` received its own
success-derived treatment.

### Halo, and one arrival instead of a loop

The Navigator chose the halo: the container keeps a soft success-tinted ring. Completion announces
itself with a single `journey-agent-finished-arrival` (the halo swells and settles), not a repeating
animation — Ready lasts 5s and a loop would nag rather than inform. `prefers-reduced-motion` now
disables it alongside the existing Working and Finishing animations. The compact badge overlaps the
Journey icon, so its halo is tightened rather than crowding the tile.

### The label follows its icon

The header `READY` inherits `currentColor` and needed nothing. The sidebar `READY` did:
`JourneyItemCopy` received no status at all, so `JourneyAgentStatus` is now passed as
`agentStatusKind` and the label carries a status modifier class.

### Non-colour cues preserved

`role="status"`, `aria-label="<name> agent finished"`, `title="Agent finished"`, the `READY` text and
the check shape all remain, so Ready is never distinguished by colour alone.

### Validation

- `npx vitest run`: 203 files, 1328 tests. `cargo test --locked`: 215 passed. `tsc`, production
  build, `roadmap:check` and `git diff --check` clean.
- Dev installed at `0.2.0-alpha.27`, binary `04517e999459a8e6`.

### Declared limits

- Contrast was verified by computing ratios against the themes' declared surface tokens, not by
  sampling rendered pixels. Translucent overlays on a selected row shift the effective background
  slightly; the disc is an opaque fill, so the measured figures are the floor rather than an
  approximation.
- The success register is deliberately one pair per theme family rather than per theme. The five dark
  surfaces span 10.30 – 10.67 and the three light surfaces span 4.82 – 4.91, so per-theme tuning
  would add tokens without changing legibility.

## Boundaries

No new completion state, notification ledger, runtime transition or process behaviour. This CR is
visual semantics only.
