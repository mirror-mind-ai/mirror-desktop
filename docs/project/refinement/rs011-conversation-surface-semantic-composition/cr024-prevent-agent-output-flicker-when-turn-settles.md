[< RS011 — Conversation surface semantic composition](index.md)

# CR024 — Prevent agent output flicker when a turn settles

## Problem

When an agent turn finishes in Mirror Desktop, the visible agent output can flicker. The
content currently being shown disappears, is briefly replaced by different content, and
then reappears. This makes successful turn completion look unstable and raises doubt
about whether the response was lost, rewritten, or restored from another source.

The phenomenon occurs at the boundary where live runtime output settles into the
completed conversation representation. Its exact cause is not yet established and must
not be inferred from the visual symptom alone.

## Expected Behavior

The agent output remains visually continuous while a turn settles. Completion may change
status, available controls, semantic grouping, or persistence authority, but it must not
blank the visible response, substitute unrelated or stale content, duplicate text, jump
between incompatible representations, or make the final content disappear and reappear.

The final completed turn must converge once onto authoritative content. If persistence or
Mirror conversation synchronization finishes after provider completion, the last valid
visible content remains present until the authoritative replacement is ready and proven
to represent the same turn.

Provider failure, cancellation, incomplete authoritative evidence, and durable Mirror
repair states must retain their existing honest settlement behavior without being hidden
by an anti-flicker fallback.

## Impact

This CR belongs to RS011 because semantic turn composition depends on a stable transition
from live Agent Actions and Agent Comments to the latest completed turn. It may affect
live stream projection, completion settlement, persisted conversation reload, message
identity, React reconciliation, stale-response authority, System Surface extraction, and
Mirror synchronization timing.

Source observation: direct alpha usage reported that agent content disappears, is
replaced by other content, and then reappears when the turn completes.

## Investigation Findings

Builder inspection on 2026-09-10 found two independently reproducible presentation
transitions and one additional replacement path that requires runtime evidence before it
can be ranked as causal.

### Incremental System Surface extraction

`App.tsx` derives agent body content and System Surface events from the same incrementally
streamed message on every render. `captureMirrorSurfaces` recognizes a marked surface only
after its closing marker or closing box border arrives. Before closure, the partial
surface remains visible as ordinary agent body content. At closure, the complete block is
removed from the body and rendered as an expandable activity surface. Commentary arriving
after the surface then repopulates the body.

A disposable focused Vitest probe demonstrated this exact sequence:

```text
partial marked surface  -> visible in agent body
closing marker arrives  -> agent body empty; System Surface appears
commentary arrives      -> agent body visible again
```

The probe passed and was removed after execution. This mechanism is especially relevant
to observations involving Mirror or Ariad surfaces and can look like a completion flicker
when the closing marker arrives near the end of the turn.

Relevant source coordinates at investigation time:

- `src/app/App.tsx:3494-3554`
- `src/app/ImportedActivity.tsx:54-77`
- `src/app/ImportedActivity.tsx:92-116`

### Runtime-to-loaded conversation handoff

While a run is active or finalizing, `deriveJourneyNavigationPresentation` prefers the
runtime conversation snapshot. As soon as `finalization_finished` makes that snapshot
ineligible, presentation falls back to `loadedConversation`. The selector itself does not
require both representations to contain the same current assistant bytes before changing
authority.

A second disposable focused Vitest probe demonstrated that the current presentation model
permits this sequence when the loaded state has not converged:

```text
runtime snapshot        -> final agent content
finalization released   -> different loaded content
loaded state converges  -> final agent content
```

The probe passed and was removed after execution. Production code attempts to update both
representations around release, so a Dev capture is still required to establish whether
React update timing allows this path to become visible in the reported case.

Relevant source coordinates at investigation time:

- `src/app/journeyNavigationCoordinator.ts:107-138`
- `src/app/App.tsx:2001-2042`

### Multiple assistant-text replacements

A non-empty `rawLiveOutput` at the process `done` event replaces streamed assistant
content with `normalizePiResponse(rawLiveOutput)`. Finalization later replaces the same
message with durable `terminalEvidence.piExecution.assistantText`. If non-JSON stdout is
present and does not equal the streamed assistant response, this path can also produce an
intermediate substitution. No captured runtime evidence yet proves that non-JSON stdout
was present during the observed flicker.

Relevant source coordinates at investigation time:

- `src/app/App.tsx:1799-1810`
- `src/app/App.tsx:1965-1977`

## Dev Capture Route

Use only `Mirror Desktop Dev`, bundle identifier `ai.mirrormind.desktop.dev`, with its
isolated Mirror Dev runtime and app data. Record the conversation region at high frame
rate and run these scenarios separately:

1. Surface-bearing turn: ask the agent to activate Explorer Mode for `mirror-desktop` and,
   after the required surface, provide five short explanatory paragraphs. Capture the
   transition when the closing surface marker becomes available.
2. Plain turn: ask for five short paragraphs with no tools and no Mirror or Ariad surface.
   If this remains stable while the first scenario flickers, incremental surface
   extraction becomes the leading cause.
3. Tool-bearing turn: ask the agent to read `package.json` for `mirror-desktop` and report
   the current version without changing files. If this flickers without a System Surface,
   inspect runtime-to-loaded authority handoff and raw stdout replacement next.

For each capture, note whether the replacement is a collapsed System Surface, prior
assistant text, empty space, raw process text, or another message. Preserve approximate
timing relative to `Working…`, `Finishing…`, and quiet idle.

## Assessment Questions

- Which state transitions and render branches execute between provider completion,
  `Finishing…`, persisted turn materialization, Mirror synchronization, and quiet idle?
- Does the live turn and completed turn use one stable identity, or does completion
  temporarily unmount one representation before the other is authoritative?
- Is the transient replacement stale content from an earlier turn, a partial persisted
  projection, a System Surface extraction result, or an empty fallback?
- Can delayed persistence, repeated completion events, or out-of-order asynchronous
  responses reproduce the flicker deterministically?
- Does the behavior differ for plain comments, comments with tools, Mirror or Ariad
  surfaces, provider errors, cancellation, restart recovery, and long responses?
- Which currently visible content is authoritative at each settlement phase, and what
  invariant prevents a lower-authority snapshot from replacing it?

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- This capture does not select focus, approve a diagnosis or plan, assign a Driver, choose
  Delivery, authorize implementation, or authorize push, publication, release, or
  installation.
- Do not mask the symptom with arbitrary delays, minimum display timers, opacity
  transitions, duplicate DOM layers, or retained stale content before identifying the
  competing state authorities.
- Preserve the established `Working…` to `Finishing…` to quiet-idle contract and show
  repair UI only for durable pending work.
- Do not weaken exact Pi session, generation, ancestry, provider, model, or Journey
  authority to make the transition appear smoother.
- Conversation records, Mirror homes, identity, credentials, app data, and Nautilus
  Harness state must not be destructively rewritten during investigation.

## Proposed Plan

Not planned. Builder assessment must first reproduce the flicker, trace every settlement
state transition, identify competing content authorities, and present evidence before an
implementation plan is approved.

## Proposed Acceptance

Not yet approved. Acceptance must eventually cover visual continuity across successful,
failed, cancelled, tool-bearing, System Surface-bearing, delayed-persistence, stale-event,
and restart-recovery turn settlement, with deterministic tests that fail if authoritative
agent content disappears or is transiently replaced.
