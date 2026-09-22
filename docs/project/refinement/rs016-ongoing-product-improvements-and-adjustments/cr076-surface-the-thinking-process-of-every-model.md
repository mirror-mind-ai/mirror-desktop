[< RS016](index.md)

# CR076: Surface the Thinking Process of Every Model

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Desktop shows a model's reasoning only when the provider is
`openai-codex`. With Anthropic models the conversation surface shows what the
agent did and never why, even though the reasoning exists and is durably
recorded by Pi.

The cause is not a format incompatibility. It is an explicit provider
allowlist in `src/agent/piProcessStream.ts:674`:

```ts
export function supportsDisplayableReasoningSummaries(config: AgentProviderConfig): boolean {
  const providerIndex = config.args.indexOf("--provider");
  return !config.safeTestMode
    && providerIndex >= 0
    && config.args[providerIndex + 1] === "openai-codex";
}
```

A second per-message gate repeats the restriction
(`activeReasoningSummaryProvider === "openai-codex"`, line 264). Pi emits
`thinking_start` / `thinking_delta` / `thinking_end` uniformly for every
provider; those events are mapped to `reasoning_summary_*` only behind these
gates, so for any other provider they are dropped at line 492.

Confirmed on 2026-09-22 in Dev. Journey `us1-rerun-a-0831`, running
`claude-bridge/claude-opus-4-7` with thinking `high`, has narrative `thinking`
blocks recorded in its Pi session JSONL, while every persisted terminal agent
action evidence for the same turns carries `reasoningSummaries: 0`. The
reasoning was produced, persisted by Pi, and discarded by the Desktop.

There is a shape difference the solution must respect rather than erase.
`openai-codex` emits **summaries** of reasoning: short, often a sequence of
standalone bold titles, which is why `actionLabels(...)` turns them into action
chips so well. Anthropic models emit **public thinking**: narrative prose,
typically one block before each tool call. These are different artifacts and
the product should not present one as if it were the other.

## Expected Behavior

Reasoning capture is model-agnostic, and presentation is faithful to the shape
the model actually produced.

- Any model whose catalog entry reports the `thinking` capability has its
  reasoning captured. No hardcoded provider allowlist.
- Action-shaped reasoning keeps today's presentation: standalone bold-title
  paragraphs become individual action chips.
- Narrative reasoning becomes a collapsible reasoning block rendered with the
  existing `.runtime-reasoning-summary` style, with the full text available and
  a derived title line.
- Operations that follow a reasoning block nest inside it, so the unit the user
  reads is "this reasoning and what it caused", matching the Anthropic
  think-then-call pattern.
- Titles are derived from the model's own prose by truncation, never
  synthesized. Nothing is fabricated.
- Provenance stays visible: a reasoning block is marked as thinking rather than
  presented as an equivalent of a codex-style summary.

## Disclosure Behavior

No new disclosure state is introduced. A narrative reasoning block is a group
`details`, exactly like today's action chip, so it reuses
`useRuntimeDisclosure(action.active)` and inherits:

- open automatically while streaming;
- collapse automatically once settled, because the activity transition resets
  `manuallyOpen`;
- resist being force-closed while active (`onToggle` reopens);
- honor manual opening after the group has settled.

A group is active when the summary is `streaming` **or** any nested operation
is active (`currentSummaryGroup.active ||= isOperationActive(operation)`). With
the Anthropic pattern this means the block stays open while its tool runs and
collapses when the reasoning-plus-tool pair completes. This is intended.

## Proposed Scope

- Replace `supportsDisplayableReasoningSummaries(...)` with capability-driven
  admission, and remove the per-message `openai-codex` gate.
- Classify reasoning content by shape in `projectAgentActionGroups(...)`:
  action-shaped keeps chips; narrative produces a reasoning block group.
- Render narrative reasoning with the existing `.runtime-reasoning-summary`
  class, which is already defined in `src/styles/app.css` and currently used by
  no component.
- Derive a bounded title from the reasoning prose by truncation.
- Decide and enforce explicit bounds on captured reasoning size, since
  narrative thinking is substantially larger than codex summaries and flows
  into terminal agent action evidence and conversation storage.
- Tests: capture admitted for a non-codex thinking-capable model, narrative
  classification, chip classification preserved, nesting of operations, bounds
  enforcement.

## Acceptance

- A turn run with an Anthropic model shows its thinking in the conversation
  surface, streaming while active and collapsed once settled.
- A turn run with `openai-codex` keeps today's chip presentation unchanged.
- No reasoning title or block is produced from content the model did not emit.
- Reasoning volume cannot grow conversation storage without bound.

## Exclusions

- No historical reconstruction of reasoning from Pi JSONL; that is CR077.
- No change to Pi invocation, provider authentication, or model selection.
- No change to Mirror synchronization, transcript authority or turn
  finalization.
- No synthesized or LLM-generated reasoning labels.

## Evidence

- Provider allowlist: `src/agent/piProcessStream.ts:674`; per-message gate at
  line 264; drop site at line 492.
- Dev Journey `us1-rerun-a-0831` Pi session JSONL contains narrative `thinking`
  blocks while persisted terminal evidence reports `reasoningSummaries: 0`.
- Unused style `.runtime-reasoning-summary` in `src/styles/app.css`, referenced
  only by a guard test.
- Navigator reviewed a rendered prototype of the proposed surface built with
  the application stylesheet on 2026-09-22 and approved the form.

## Authority Boundary

Captured only. Selecting, assigning Driver/Delivery, implementing, committing
beyond capture, pushing, merging, publication and release remain separate
Navigator decisions.
