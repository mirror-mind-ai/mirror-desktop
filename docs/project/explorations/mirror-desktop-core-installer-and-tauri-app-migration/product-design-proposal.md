# Product Design Proposal: Mirror Desktop: Core, Installer and Tauri App Migration

## Product Intent

Transfer the proven Nautilus Harness Tauri application into the Mirror product as Mirror Desktop, preserve Nautilus as a separate method, and deliver the transition through Core-first compatibility gates for existing users, installer integration and eventual Frame onboarding retirement.

## User-Facing Behavior

Mirror Desktop emerges from the Tauri Harness

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
