[< RS011 — Conversation surface semantic composition](index.md)

# CR021 — Compose agent turns into semantic groups

## Problem

The current Mirror Desktop agent turn presents live runtime activity and the assistant
answer as process-oriented regions while Mirror and Ariad surfaces are extracted into
separate expandable rows. The pieces are individually useful, but the turn does not yet
express a stable conversation model with explicit semantic authorship.

A chronological rendering of every event would preserve execution order but would keep
the experience close to a process log and fragment the consolidated response.

## Expected Behavior

An agent turn is composed by semantic role rather than chronological event order:

- `Agent Actions` contains human-readable descriptions of what the agent is doing.
- `System Surfaces` contains canonical Mirror and Ariad surfaces with their specific
  provenance, content, transport fidelity, and expandable presentation.
- `Agent Comments` contains the consolidated response addressed to the user.

The model must work for the live turn and for turns reconstructed from persisted
conversation data. It must not invent hidden reasoning, misattribute system surfaces to
the agent, duplicate content, or lose surface ordering contracts during extraction and
rendering.

## Impact

This CR establishes the semantic foundation required by the remaining RS011 interaction
and copy refinements. It affects the conversation domain model, live event projection,
persisted turn reconstruction, agent-message rendering, and System Surface placement.

Source exploration:

- [Conversation Surface Semantic Turn Model](../../explorations/conversation-surface-semantic-turn-model/index.md)

## Assessment Questions

- Which current Pi events and persisted fields authoritatively identify an action,
  canonical surface, and consolidated comment?
- How should legacy turns without explicit semantic grouping be projected honestly?
- Can the renderer group content semantically without changing persisted source records?
- Which Mirror and Ariad transport invariants need explicit regression coverage?
- Is `Agent Comments` a necessary visible heading, or is agent authorship already clear
  enough without it?

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- This capture does not select focus, approve a plan, assign a Driver, choose Delivery,
  authorize implementation, or authorize push, publication, release, or installation.
- Tool-running expansion, historical-turn compaction, and automatic disclosure behavior
  belong to CR022.
- Consistent highlighted-block copy behavior belongs to CR023.
- Hidden model chain-of-thought must not be requested, inferred, stored, or presented as
  `Agent Actions`.
- Mirror homes, identity, credentials, Journey content, conversations, app data, and
  Nautilus Harness state remain outside destructive mutation.

## Proposed Plan

Not planned. Builder assessment and explicit Navigator approval are required before this
CR can move to `planned`.

## Proposed Acceptance

Not yet approved. Acceptance must cover live and persisted semantic composition,
canonical surface fidelity, legacy projection, accessibility, and non-duplication before
implementation begins.
