[< RS016](index.md)

# CR077: Reconstruct Reasoning from Pi Session Evidence

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr077-reconstruct-reasoning`

## Problem

Reasoning survives only if it was captured live and pinned into terminal agent
action evidence. When the Desktop reconstructs a conversation from the Pi
session, reasoning never returns:
`src/domain/piBackedConversationSurface.ts` contains no handling of `thinking`
at all.

This is independent of the provider allowlist in CR076. Even for
`openai-codex`, where live capture works today, a conversation rebuilt from Pi
evidence loses its reasoning while keeping messages and operations. The
material is present in the Pi session JSONL — assistant messages carry
`thinking` blocks alongside `toolCall` blocks — so the loss is ours, not Pi's.

The result contradicts the terminal-aligned conversation authority the product
established in RS018: Pi JSONL is transcript authority, yet one class of
durable Pi evidence is not reconstructed from it.

## Expected Behavior

Reasoning is reconstructed from Pi session evidence with the same authority as
messages and operations.

- Assistant `thinking` blocks in the Pi session are projected into the
  reconstructed conversation surface, preserving their order relative to tool
  calls so the think-then-call sequence is not rearranged.
- Reconstructed reasoning is presented exactly like live reasoning, by shape,
  without a second presentation path.
- Reconstruction remains bounded: reasoning volume across a long session cannot
  make hydration cost or storage grow without limit.
- Absent reasoning stays absent. Nothing is inferred for turns that carry no
  thinking evidence.

## Proposed Scope

- Extract `thinking` content blocks in `piBackedConversationSurface`, ordered
  with existing tool-call projection.
- Reuse the presentation classification introduced by CR076 rather than adding
  a parallel rendering path.
- Apply the bounds CR076 decided (8 KB per reasoning block, 64 KB of total
  reasoning per assistant turn, truncation always visible) at the projection
  point, so the reconstructed path yields the same bounded artifact as live
  capture.
- Tests: reconstruction with interleaved thinking and tool calls, ordering
  preservation, absence when no thinking exists, bounds enforcement.

## Acceptance

- A conversation rebuilt from a Pi session shows the reasoning that the session
  recorded, in its original order relative to tool calls.
- Live and reconstructed reasoning are presented identically.
- Reconstruction of a long session remains bounded in cost and storage.

## Exclusions

- No Pi JSONL rewrite. Pi remains transcript and native-entry authority.
- No change to the live capture path beyond consuming the classification CR076
  introduces.
- No backfill of reasoning into conversations already persisted without it.
- No change to Mirror synchronization or append identity.

## Dependencies

Depends on CR076 for the shape classification and inherits its recorded bounds
decision by reference rather than restating it. Landing CR077 first would
either duplicate presentation logic or reconstruct reasoning the surface still
refuses to display for non-codex providers.

## Evidence

- `src/domain/piBackedConversationSurface.ts` has no `thinking` handling.
- Dev Journey `us1-rerun-a-0831` Pi session JSONL carries assistant messages
  whose content is `['thinking', 'toolCall']`.

## Implementation Evidence

- **No Rust change was needed.** The full transcript inspection already
  carries each entry's raw Pi content (`nativeContent`) plus `toolCallId` and
  `isError` for tool results; the loss was entirely in the TypeScript
  projector, which read only `visibleText`.
- **Reconstruction in `projectPiBackedConversationSurface`.** Assistant
  entries accumulate `thinking` and `toolCall` blocks in native order across
  the multi-entry run of a turn; a user entry drops pending blocks; the
  assistant entry with visible text attaches the accumulated projection to its
  message. Tool status is correlated through a pre-pass over `toolResult`
  entries by exact `toolCallId` match (verified exact on the real Dev session:
  14 of 14 recorded results match; calls without a result are honestly
  `interrupted`). Only turns with at least one thinking block are
  reconstructed; tools-only turns stay as today.
- **Provenance is not manufactured.** Reconstruction does not synthesize
  terminal agent action evidence (no fabricated `runId`/`turnId`). It
  populates a separate derived map, `reconstructedAgentActions`, keyed by
  assistant message id. Live-captured evidence always wins: messages with an
  entry in `terminalAgentActionEvidence` are skipped.
- **Deliberately not persisted.** The persistence parser rebuilds
  conversations from a field whitelist, so the derived map is dropped on save
  and re-derived from Pi JSONL at every surface reconstruction. Pi remains the
  authority; storage carries no duplicate. This also honors the exclusion
  against backfilling stored conversations.
- **Same bounds, one definition.** `REASONING_BLOCK_MAX_CHARS` and
  `REASONING_TURN_MAX_CHARS` moved to `src/domain/reasoningBounds.ts` with a
  batch `boundReasoningBlocks(...)`; the live activity model imports and
  re-exports them, so live and reconstructed paths cannot drift.
- **One presentation path.** `ConversationTranscript` falls back from live
  runtime projection to exact terminal evidence to the reconstructed
  projection, all feeding the same `projectAgentTurnPresentation` and CR076
  rendering. No new component or rendering branch.
- **Tests.** Bounds module unit tests; interleaved multi-entry reconstruction
  with order preservation; failed/interrupted tool status correlation;
  tools-only absence; live-evidence authority; pending-drop on interruption;
  CR076 bounds with visible truncation and elision. Full suite 165 files /
  970 tests green; TypeScript/Vite build green.

## Navigator Validation

Validated by the Navigator on 2026-09-22 on the installed Dev build
(`0.2.0-alpha.16`, exec `388a24d34e6fee5f`). Historical turns in Journey
`US1 Rerun A 0831` that previously showed only bare tool rows now show their
reasoning, reconstructed from the Pi session, with tools nested inside the
thinking that motivated them. Reasoning survives closing and reopening the
application, which was the gap CR076 shipped with.

## Proportionality and Debt Review

**Proportionate, and smaller than expected.** The change touched one domain
projector, one derived index, one transcript fallback line and a new bounds
module. No Rust change was required: the transcript inspection already carried
the raw Pi content blocks, so the fix was to stop discarding them rather than
to extract anything new. No Pi invocation, transcript authority, Mirror
synchronization or persistence schema was modified.

**Debt accepted, and named.** Three limits ship knowingly:

- **Reconstruction cost is linear in session size and repeats on every
  hydration**, since the derived projection is deliberately not persisted. For
  the session sizes observed this is negligible, but a very long session pays
  it on each surface rebuild. Recomputation was chosen over duplication so Pi
  JSONL stays the only authority.
- **Tool status is inferred from recorded results only.** A call whose result
  was never written is reported `interrupted`, which is honest but coarser
  than live capture: it cannot distinguish a tool that was killed from one
  whose result was lost. Exact-match correlation was verified against the real
  Dev session (14 of 14).
- **Reconstructed turns report `completed`** as run status, because the Pi
  session records no terminal run outcome. Live evidence, which does know,
  always takes precedence, so this only applies to turns never captured live.

**Debt retired.** Reasoning now survives restart, closing the live-only
limitation named when CR076 closed. Live and reconstructed reasoning share one
bounds definition (`src/domain/reasoningBounds.ts`) and one rendering path, so
the two cannot drift into disagreeing about what a turn's reasoning was.

## Closure

Closed on 2026-09-22 on `refinement/rs016-cr077-reconstruct-reasoning` at
`437d832`, merged to `main`. Reasoning that Pi records is now shown whether it
was captured live or reconstructed from the session, bounded identically in
both paths, with live capture always authoritative.

## Authority Boundary

Closed under explicit Navigator validation on the installed Dev build. Any
release that carries this work remains its own Navigator decision under the
single release-publication scope CR074 defines.
