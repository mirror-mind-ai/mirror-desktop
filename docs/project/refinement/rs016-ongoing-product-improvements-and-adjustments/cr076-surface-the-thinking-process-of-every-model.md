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
- Enforce the reasoning bounds decided below at capture and projection time.
- Tests: capture admitted for a non-codex thinking-capable model, narrative
  classification, chip classification preserved, nesting of operations, bounds
  enforcement.

## Bounds Decision

Decided on 2026-09-22 after measuring the real material rather than estimating
it.

**Measured context.** 134 thinking blocks across the Dev Pi sessions give p90 =
45 characters and a maximum of 279, but almost all of that ran at `pi-default`
thinking, so the sample understates the target case; at `high` or `max` on a
complex task, blocks of 1-4 KB are ordinary. Persisted conversations already
reach 1.1 MB (`mirror-desktop-rescue-journey/generation-1.json`, 4.6 MB across
all conversations), and `operation.output` in the same
`parseTerminalAgentActionProjection` structure is validated as a string with no
length bound at all. Reasoning therefore joins an existing growth vector rather
than creating a new one, and its bounds should be proportionate to that fact.

**Two bounds, both applied at capture and projection, never at render.**
Truncating only at render bounds nothing, because the material has already
become durable evidence by then.

- **8 KB per reasoning block.** Generous enough that ordinary thinking is never
  touched, tight enough that a pathological block cannot escape. One order of
  magnitude above the existing `PROVIDER_FAILURE_MAX_BYTES` (2,048).
- **64 KB of total reasoning per assistant turn.** Once reached, further blocks
  are not captured. This is half of the existing
  `JOURNAL_MAX_TERMINAL_STREAM_BYTES` (131,072) and comfortably covers a long
  agentic turn (20 blocks of 2 KB is 40 KB).

**Truncation must be visible.** A truncated block says it was truncated, and a
turn that reached the ceiling says reasoning was elided. Silent truncation
would misrepresent what the model produced, which is the failure mode CR054 and
CR069 were written to eliminate. This requirement is not negotiable in
implementation.

**CR077 inherits these bounds** and applies them at its projection point, so
the live and reconstructed paths yield the same bounded artifact and there is
never more than one answer to what a turn's reasoning was.

## Adjacent Debt, Deliberately Not Addressed

- **`operation.output` is unbounded** in the same persisted structure and is
  the larger contributor to conversation growth today. Bounding it here would
  be scope creep and risks truncating output that existing surfaces read in
  full. Named as known debt, to be addressed on its own terms.
- **No conversation-level reasoning cap.** It would be the strongest protection
  against accumulation, but no such cap exists for operations either, and
  adding one only for reasoning would let a conversation discard the *why*
  while keeping the *what*. If accumulation becomes a real problem it belongs
  to the whole conversation and should be solved for both fields together.
- **Reasoning stays in terminal evidence** rather than being stored only as a
  preview with full text fetched from the Pi session on demand. That would
  remove duplication, since Pi JSONL is transcript authority and already holds
  the thinking, but it would make display depend on Pi session availability for
  material the user has already seen. Bounded duplication is cheaper than
  fragile display.

## Acceptance

- A turn run with an Anthropic model shows its thinking in the conversation
  surface, streaming while active and collapsed once settled.
- A turn run with `openai-codex` keeps today's chip presentation unchanged.
- No reasoning title or block is produced from content the model did not emit.
- Reasoning volume cannot grow conversation storage without bound: no single
  block exceeds 8 KB and no turn exceeds 64 KB of captured reasoning.
- Every truncated block and every turn that reached the ceiling says so on the
  surface; no truncation is silent.

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
