# Product Design Proposal: Conversation Surface Semantic Turn Model

## Product Intent

Redesign the Mirror Desktop conversation surface around three semantic groups within an agent turn: Agent Actions, System Surfaces, and Agent Comments. Preserve a conversation-first reading experience while keeping live execution, canonical Mirror and Ariad surfaces, tools, and copyable highlighted content inspectable without presenting the transcript as a process log.

## User-Facing Behavior

Um novo modelo para a surface de conversas

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
