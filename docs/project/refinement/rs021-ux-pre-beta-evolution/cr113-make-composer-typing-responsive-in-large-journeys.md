[< RS021](index.md)

# CR113: Make Composer Typing Responsive in Large Journeys

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr113-rs016-cr115-typing-responsiveness`

Pulled on 2026-10-02 by explicit Navigator intent, which also authorized measurement and, if the
measurement leaves the diagnosis standing, implementation of the remediation.

## Problem

The Composer becomes noticeably slow while the Navigator is typing in a large Journey such as
`mirror-desktop`. The delay interrupts ordinary composition and makes the Desktop less usable as a
daily workspace.

The symptom is reported by the Navigator for this Journey. No latency measurement, reproduction
fixture or causal diagnosis has yet been recorded. In particular, the existing exploration of calm
composer draft persistence is relevant context, not proof that draft persistence is the cause.

## Diagnosis

Static diagnosis on 2026-10-02 against `main` at `c00b551` and the production `mirror-desktop`
projection, read without modification. No profiler sample was taken; timing remains open.

**Draft persistence is not the cause.** CR038 already coalesces draft writes behind a 750 ms idle
timer in `composerDraftPersistence.ts`, so a keystroke performs no IPC and no file write.

**The transcript boundary from CR029 still holds.** `ConversationTranscript` and each row are
memoized, and every prop it receives from `App` is referentially stable while the Journey is idle:
`messages` is `conversation.messages` by reference, chapters, activity and proximity are memoized,
and the path handler is a `useCallback`. A keystroke should not re-project historical rows.

**What a keystroke still does.** `setJourneyComposerDraft` calls `setDraft` and `setComposerDrafts`
on `App`, a 6,303-line root component holding 162 state hooks. Every keystroke therefore re-runs
the whole root body and reconciles its entire JSX tree, including non-memoized children such as the
sidebar Journey map, `ComposerRuntimeFooter`, `OperationalWorkspaceSwitcher`,
`JourneyCanvasSurface` and `ChapterIndexPanel`. The composer is a controlled `textarea`, so the
browser also processes the change inside a document that currently mounts 1,828 messages. Which
of these two costs dominates must be measured in the Dev build before a remedy is chosen.

**Nothing in the GUI needs the draft on every keystroke.** `App` reads `draft` only at semantic
boundaries: Send, Steering on Enter, the Send-button enabled state and the retry path. The text
itself is needed by the textarea alone.

**Why the Journey keeps growing despite chapters.** Chapters are dividers inside one growing
message array, not a window over it. The production generation projection holds 1,828 messages
(1,527 assistant, 301 user), 23 chapter dividers and only 6 reconciliation turns, in 6.36 MB.
Of that, 4.82 MB is `reconstructedAgentActions`: 1,120 historical messages carrying 2,685
operations, with 2.6 MB of tool arguments and 1.5 MB of reasoning summaries retained for the
whole generation. Message text is 1.27 MB. The projection is rebuilt on every Journey load from
the complete Pi session JSONL, currently 52.8 MB for this generation, because Pi compaction
changes what the model sees and leaves the transcript file intact.

**The on-demand Segment window exists but is unreachable.** CV-008.DS-004 specifies loading the
current Segment first and historical Segments on demand, and the `Load N earlier Segments`
control is still in the tree. CR080 recorded that all three `setHistoricalSegmentCount` call
sites pass `0`, so the full history is always the working set. Segment files are also mis-sized:
`partitionConversationBySegments` spreads the whole conversation into each Segment, so each of
the 24 Segment files carries a near-complete copy of `reconstructedAgentActions`; the current
Segment holds 6 messages in 5.07 MB, and the 24 files total 74 MB.

**Two remedies follow, with different scope.** First, let the Composer own its text locally and
inform `App` only at semantic boundaries, so a keystroke renders one leaf instead of the root.
Second, make the current Segment the default working set with history on demand, which DS-004
already specifies, and stop duplicating evidence maps across Segment files. The first is bounded
to CR113. The second is captured separately as CR114, because it changes the Segment contract.

## Measurement

Measured on 2026-10-02 in a real browser, because the repository's test environment is Node-only
and `renderToStaticMarkup` cannot measure an interaction. A probe mounted the real
`ConversationTranscript` with the sanctioned production-scale fixture (1,000 messages, 14,610 DOM
nodes, projection over 10 MB) next to one Composer-shaped textarea, and varied two factors: who
owns the draft text, and how large the non-memoized sibling subtree is. Each cell dispatched 60
keystrokes after a discarded warm-up, timing React's synchronous commit and the forced style and
layout that follows. The probe lived outside `src/` and was deleted after measurement.

First round, with a 37-node sibling subtree:

```text
owner  transcript  DOM nodes  root renders/key  commit p50  layout p50  total p50  total p95
root   mounted        14,610                 1        1.5         1.4        2.9        3.5
leaf   mounted        14,610                 0        0.5         1.2        1.7        2.8
root   absent             37                 1        1.5         0.4        2.0        2.7
leaf   absent             37                 0        0.5         0.2        0.7        0.9
```

That round confirmed two things and refuted a third. The CR029 memo boundary holds: the transcript
did not re-render, and conversation size changed nothing about commit cost. Document size costs
about 1 ms of forced layout per keystroke. But no cell approached a 16.7 ms frame, so neither
mechanism at that scale explains the symptom.

The round was underpowered: a 37-node sibling subtree is nothing like the real root, which
reconciles the Journey sidebar, the header, the composer footer and the operational surfaces.
Varying that subtree is decisive:

```text
sibling nodes  owner  commit p50  total p50  total p95
          600  root        20.5       25.2       28.3
          600  leaf         0.7        2.9        4.7
        1,500  root        36.5       43.9       68.8
        1,500  leaf         0.7        2.7        4.1
```

Root-owned keystroke cost scales with the non-memoized subtree and crosses the frame budget at a
few hundred nodes. Leaf-owned cost is flat at roughly 2.7-2.9 ms p50 and 4.1-4.7 ms p95, with zero
root renders per keystroke, independent of both the subtree and the conversation. The second table
measured the shipped `ComposerDraftInput`, including the same per-keystroke bookkeeping `App`
performs, so it validates the delivered code rather than a sketch.

A static check completed the picture: nothing in `App`'s render body iterates messages or turns.
Every conversation-scaled derivation is already memoized, so the root's own cost is independent of
conversation size. This is why the Composer symptom and the Journey-open symptom are different
problems, and why the Segment working set is CR114 rather than part of this Change Request.

Limits of this measurement. It is a mechanism measurement on one machine, not an input-to-paint
percentile for the installed application: the sibling subtree is a stand-in sized by node count,
the fixture holds 1,000 messages where production holds 1,828, and the real root's per-render
derivations are absent. It establishes the mechanism, its scaling and the remedy's effect; it does
not certify a latency figure for the shipped app.

## Expected Behavior

Typing, editing, selection and deletion in the Composer remain immediately responsive in a large
Journey. Any durability work needed for draft recovery must not make ordinary keystrokes visibly
stall the Composer.

## Proposed Scope

- Characterise the symptom in a representative large Journey and establish a bounded reproduction
  route before choosing a remedy.
- Measure the main-thread, renderer and native persistence work attributable to composition, rather
  than assuming that Journey size or a specific draft path is causal.
- If the evidence supports it, define a durable draft strategy that keeps local composition
  responsive while retaining the recovery guarantees that the current Composer provides.
- Validate typing responsiveness together with draft recovery, destination isolation, explicit Send,
  blur, destination change and ordinary application closure.

## Acceptance

- A documented reproduction establishes the affected composition path and the evidence used to
  evaluate it.
- The Navigator can type and edit sustained text in a representative large Journey without
  perceptible Composer stalls caused by the Desktop's own composition path.
- Draft recovery remains correct after relaunch, and one destination's draft never leaks into
  another destination.
- Sending, cancellation, active-run handling and Pi/Mirror transcript authority remain unchanged.

## Exclusions

- No change to the text the Navigator wrote, to send semantics, or to Pi/Mirror conversation
  persistence.
- No weakening of draft recovery merely to hide the symptom.
- No selection, Driver assignment, Delivery branch, implementation, commit, push or release.

## Implementation Evidence

- `src/app/ComposerDraftInput.tsx` is a new memoized input that owns the visible text in its own
  state, reads an initial value once on mount, and exposes a `setText` imperative handle.
- `App` no longer holds the text: `draft` state is replaced by `draftRef` for the current value and
  `draftBlank` for control enablement, which flips only when the trimmed text becomes blank or
  stops being blank. The durable draft map lost its root state too and is read through
  `composerDraftsRef`, which nothing renders.
- Programmatic writes keep working through `setVisibleComposerDraft`: restore on launch, Journey and
  conversation switch, voice transcription, Canvas prefill, clearing after a send and returning a
  message to the composer after a pre-agent failure.
- Send and Steering read `draftRef.current`; Enter carries the text the input already holds, so no
  caller re-reads state.
- Draft durability is unchanged: the same coalesced 750 ms writer from CR038, the same blur,
  destination-change and close flushes.
- `src/tests/composerTypingIsolation.test.ts` pins the contract: no draft text in root state, no
  root draft map, the memoized leaf with its imperative handle, ref reads at the send and steering
  boundaries, and enablement on the blank flag.
- Six existing source-text assertions pinned the previous expressions and were updated to the new
  equivalents, preserving what each protected.
- Gates: 214 test files and 1,482 front-end tests pass, `tsc --noEmit` clean, `npm run build`,
  `cargo check --locked`, `npm run roadmap:check` READY and `git diff --check` all pass.

Not yet validated: interaction in an isolated build. Typing, destination switching, voice insertion,
Canvas prefill, Enter-to-send, Steering during a live run and draft recovery after relaunch should be
exercised in `Mirror Desktop Dev` or Eval before this Change Request is accepted.

## First Homologation (2026-10-02)

The Navigator homologated the Eval build and reported that typing was still slow, and that the Send
and New Journey buttons flickered both while typing and after stopping. Investigation found a
second, independent defect: automatic post-terminal recovery re-triggered itself on an idle
Journey, re-rendering the root continuously and walking native occupancy through `reconciling`,
which disables both reported controls. That is
[CR115](../rs016-ongoing-product-improvements-and-adjustments/cr115-stop-the-idle-post-terminal-recovery-loop.md),
pulled by explicit Navigator intent and fixed on this same Delivery.

This homologation therefore neither accepted nor refuted CR113: with the loop running, the root was
re-rendering regardless of who owned the Composer's text, so the isolation this Change Request
delivers could not be observed. Both corrections must be homologated together on the rebuilt Eval.

## Acceptance (2026-10-02)

The Navigator accepted the rebuilt Eval carrying CR113 and CR115. Sustained composition in
`mirror-desktop` was responsive, and the Send and New Journey controls remained steady while
typing and while idle. The validation closes the intervening recovery-loop confound documented
above: local Composer ownership prevents keystrokes from rendering the root, and CR115 prevents
an idle root recovery loop from masking that result.

No Pi JSONL, Mirror record, journal, outbox, draft persistence or run-authority regression was
reported. CR113 is `done`.

## Dependencies

The `Calm Composer Draft Persistence` exploration is a relevant handoff and may inform later
characterisation. It does not select this CR, establish its cause or authorize its proposed
implementation.
