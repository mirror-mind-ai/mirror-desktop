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
