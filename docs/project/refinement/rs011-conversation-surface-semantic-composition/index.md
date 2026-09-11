[< Refinement Workbench](../index.md)

# RS011 — Conversation surface semantic composition

## Framing

Refine the Mirror Desktop conversation surface so an agent turn reads as a coherent
conversation rather than a process-output log. The proposed product grammar composes
three semantic groups: `Agent Actions`, `System Surfaces`, and `Agent Comments`.

This Refinement Story adopts the promoted Explorer handoff as discovery input without
treating it as an implementation plan:

- [Exploration handoff](../../explorations/conversation-surface-semantic-turn-model/index.md)
- [Exploratory story](../../explorations/conversation-surface-semantic-turn-model/exploratory-story.md)
- [Handoff information](../../explorations/conversation-surface-semantic-turn-model/handoff-info.md)
- [Product design proposal](../../explorations/conversation-surface-semantic-turn-model/product-design-proposal.md)

## Problem Space

The current conversation surface mixes the agent's live activity, tool execution,
canonical Mirror and Ariad surfaces, and consolidated response in a presentation that
can read as process output rather than dialogue. Existing behaviors remain valuable,
including visible long-running tools, expandable canonical surfaces, persisted
conversation history, and copy controls on some highlighted blocks, but they do not yet
form one predictable semantic model.

Copy behavior is also inconsistent. Dark highlighted block content emitted by the agent
sometimes offers a copy control and sometimes does not, even when the content is a
command, plain text, configuration, or wireframe intended for reuse.

## Desired Outcome

A refined agent turn has three semantic content types:

- `Agent Actions` collects human-readable descriptions of what the agent is doing.
  An action may own one or many sequential or concurrent tools.
- `System Surfaces` collects canonical Mirror and Ariad interventions while preserving
  their specific provenance, content, transport invariants, and expandable presentation.
- `Agent Comments` contains the consolidated response addressed to the user.

The content types are grouped by semantic role rather than interleaved as a chronological
execution log. The complete anatomy remains visible for the active turn and the latest
completed turn. Older turns compact around their conversational answer while retaining a
discoverable path back to actions and system surfaces.

An action opens automatically while any child tool is `running`, and the running tool's
box remains automatically visible. When no child tool remains `running`, the action
collapses automatically and can subsequently be expanded for inspection.

Every rendered block with code-block semantics offers a consistent copy control,
including fenced Markdown without a language declaration, plain text, commands,
configuration, and wireframes. Detection follows the rendered semantic structure rather
than textual guesses or background color. Inline code remains unchanged.

## Refinement Areas

- Map live Pi activity and persisted conversation records onto the three semantic content
  types without inventing unsupported chronology or authorship.
- Define stable action-to-tool grouping for sequential, concurrent, successful, failed,
  and interrupted tool executions.
- Preserve the current automatic visibility of long-running tools while deriving action
  expansion from child runtime state.
- Define the active, latest-completed, and compacted historical turn states, including
  manual recovery of hidden detail.
- Preserve Mirror and Ariad surface content, provenance, ordering contracts, expansion,
  and transport fidelity.
- Unify highlighted block rendering and copy feedback across every applicable live and
  persisted agent-content path.
- Validate keyboard access, focus behavior, screen-reader names, reduced motion, light
  and dark themes, narrow layouts, and recovery after restart.

## Open Decisions

- Whether `Agent Comments` is the final user-facing label or whether agent authorship
  makes a section label unnecessary.
- What compact affordance older turns use to disclose action and system-surface counts.
- Whether manual expansion during tool execution survives automatic collapse after the
  final child tool settles.
- Whether equivalent copyable blocks inside System Surfaces and tool outputs share the
  same control or retain subsystem-specific copy behavior.
- How legacy persisted turns without explicit semantic grouping are projected honestly.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Refinement authority is this file-first Workbench; legacy SQLite state must not be
  inspected, reconciled, or dual-written.
- This RS does not yet select focus, assign a Driver, choose Delivery, create a Change
  Request, approve implementation, or authorize a commit, push, release, publication,
  installation, or endpoint mutation.
- The work must not expose hidden model chain-of-thought or relabel operational events as
  private reasoning.
- Mirror and Ariad surfaces remain canonical product output and must not be rewritten as
  agent-authored comments.
- Existing conversation data, Mirror homes, identity, credentials, app data, and Nautilus
  Harness state remain outside any destructive migration boundary.

## Change Requests

- [CR021 — Compose agent turns into semantic groups](cr021-compose-agent-turns-into-semantic-groups.md)
- [CR022 — Govern action, tool, and turn disclosure](cr022-govern-action-tool-and-turn-disclosure.md)
- [CR023 — Make highlighted blocks consistently copyable](cr023-make-highlighted-blocks-consistently-copyable.md)
- [CR024 — Prevent agent output flicker when a turn settles](cr024-prevent-agent-output-flicker-when-turn-settles.md)

CR021 and CR024 are closed as `done`; CR022 is `in_progress` with Driver `@alissonvale`
and Delivery `refinement/rs011-cr022-action-turn-disclosure`; CR023 remains `captured`.
CR022 builds on the semantic foundation delivered by CR021;
CR023 can be assessed independently.
CR024 stabilized the live-to-completed turn boundary before RS011 changes relied on that
transition.
