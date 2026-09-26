[< Refinement Workbench](../index.md)

# RS022 — Mirror Core Debts

**Status:** active

## Framing

Mirror Desktop runs on Mirror core. It executes the released Mirror runtime, reads and writes
the Mirror database through bounded contracts, and inherits Mirror's conversation, Journey and
identity semantics. Continued daily use of the Desktop therefore discovers defects and
constraints that are not Desktop defects at all: they live upstream, in Mirror core.

Those findings have had nowhere to live. They are too specific to leave in a conversation, too
foreign to belong in a Desktop Change Request, and too consequential to forget — the
2026-09-26 cross-Journey contamination incident was caused by one of them. Without a register
they get absorbed into Desktop workarounds, and the Desktop slowly accumulates defensive code
whose real cause becomes invisible.

This Refinement Story is that register. It records what the Desktop has proven about Mirror
core, with evidence and provenance, so the debt stays visible and attributable while the
Desktop protects itself.

## Desired Outcome

Every Mirror core defect discovered through Mirror Desktop is written down once, with the
evidence that proves it, the Desktop mitigation that currently contains it, and the correction
that would retire it. When Mirror core becomes available for modification, this register is
the handoff — not a re-investigation.

## Authority Contract

This is the boundary that makes this RS safe to keep in this Journey.

- Journey authority is exactly `mirror-desktop`.
- This RS records upstream debt. It does not authorize editing, patching, committing to or
  releasing Mirror core, in any checkout.
- The installed production Mirror checkout may be inspected and executed. It must not be
  modified. Mirror development belongs to the Mirror repository, its own branches, its own
  gates and its own release path.
- A CR here is a finding and a handoff, never an implementation plan for this repository. Any
  Desktop-side containment is a separate CR under its own Refinement Story, linked from here.
- Recording a debt does not authorize a Desktop workaround either. Containment is proposed,
  reviewed and accepted on its own merits.

## Intake Rules

- A CR enters only with concrete evidence: the observed behavior, the code path in Mirror core
  that produces it, and the consequence for Mirror Desktop.
- Speculation does not enter. If the cause is not yet located in Mirror core, the finding stays
  a Desktop investigation until it is.
- Each CR names its Desktop containment, if any, and states plainly whether the debt is
  contained, partially contained or open.
- A CR stays `parked` while Mirror core is unavailable for modification, with the revisit
  trigger recorded. Parked does not mean inactive: the debt is live, only the correction is
  blocked.
- When Mirror core becomes available, a CR is promoted to the Mirror repository's own process
  and closed here as `promoted` with that Delivery target.

## Acceptance Horizon

RS022 does not close by completing work. It closes when the register is empty — every recorded
debt either promoted upstream and corrected, or retired because the behavior changed. It is
expected to remain open for as long as the Desktop depends on a Mirror core it does not own.

## Change Requests

- [CR094: Mirror Mode Activation Rebinds a Desktop Conversation's Journey](cr094-mirror-mode-activation-rebinds-desktop-conversation-journey.md) — parked

## Boundaries

- No commit, push, merge, publication or release is authorized by this document, in this
  repository or any other.
- No emergency production repair is authorized here. The 2026-09-26 repair was a separate,
  explicitly authorized Navigator action, recorded as evidence only.
