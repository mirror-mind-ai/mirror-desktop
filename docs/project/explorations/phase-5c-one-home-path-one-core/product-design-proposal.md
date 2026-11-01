# Product Design Proposal: Phase 5c: one home path, one core

## Product Intent

Cutover to the 0.3 line by renaming the production home aside, copying it back to the same path, adopting it in a new 0.3 bundle, carrying the 0.2 state, and moving the terminal (Pi, Claude Code, Codex) to Mirror TypeScript on that home. No return to 0.2; fixes go forward inside 0.3.

## User-Facing Behavior

The cutover to the 0.3 line, as the Navigator imagines it: a new 0.3 bundle and a new production Mirror home, the 0.2 app moved to a backup folder, the new app opened on the new home, never going back to 0.2, the agent reachable inside 0.3 to fix forward. Decided (Navigator, 2026-11-01): the terminal moves with it, with Mirror TypeScript writing to the new home. That makes the two-Mirrors rule a single-Mirror rule: after the cutover only the TypeScript core writes, and anything still on Python must fail loudly rather than write somewhere quietly. Proposed shape: the new home takes the old path (~/.mirror-minds/alisson-vale) and the old one is renamed aside, so every path that names the home (AGENTS.md local-routing, MIRROR_USER, extension folders) follows without edits, and a forgotten Python writer meets the migrated database and stops (KeyError hook_injected) instead of splitting memory. The way back is a rename and reopening the saved 0.2.

## What The Product Should Feel Like

The product should preserve the exploratory shape discovered by Explorer Mode. It should show the user what is happening at the product level, not expose implementation mechanics first.

## Interaction Flow

- User works in Explorer Mode while uncertainty is still alive.
- Explorer surfaces story changes visibly.
- Explorer names attractors and proposes small experiments.
- Explorer proposes Builder handoff only when the user asks or confirms readiness.
- Builder begins only after explicit confirmation.

## Product-Level States

- Exploratory Story active.
- Attractor proposed or accepted.
- Experiment proposal proposed or accepted.
- Builder handoff proposed.

## Acceptance Behavior

- The user can understand what is being proposed without reading implementation details.
- The proposal preserves uncertainty and open questions.
- The proposal gives Builder enough product shape to create roadmap or story plans.

## Explicit Non-Goals

- This document does not define implementation architecture.
- This document does not create delivery tasks by itself.
- This document does not replace Builder planning.

## Open Product Questions

- Which behavior is necessary for the first delivery slice?
- What should remain exploratory after Builder starts?
- What user validation will prove the product behavior works?
