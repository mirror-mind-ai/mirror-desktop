[< RS021](index.md)

# CR080: Compaction Chapters

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr080-compaction-chapters`

## Problem

A Journey conversation is meant to be continued indefinitely. Compaction keeps that
technically possible: when the context nears the model's window, Pi summarizes the older
part and continues with the summary plus a retained tail. From the model's side the
conversation never has to end.

From the Navigator's side it does end, in practice. A conversation of months reads as one
undifferentiated thread. Nothing is findable, the Desktop has no honest way to render years
of it, and the moment compaction happens is invisible: the conversation restarts on the
summary without saying so. The Navigator's ideal — keep talking and everything just works —
is undercut by the fact that everything works only for the model.

A second, sharper symptom surfaced on 2026-09-26: switching to a model with a smaller
window than the conversation's footprint (≈695k tokens under a 1M-window model, then
`gpt-5.5`) fails the next send outright — `Codex error: Your input exceeds the context window
of this model` — and there is no way to compact first, because the Desktop offers no manual
compaction at all.

## Investigation (2026-09-26 → 27)

**The structure the Navigator feared having to impose already exists.** Each `compaction`
entry in the Pi session carries a `summary` of roughly 18–26k characters in a fixed shape —
`## Goal`, `## Constraints & Preferences`, progress, decisions — plus `firstKeptEntryId`
(where the retained tail begins) and `tokensBefore`. Across the production sessions there
are 52 compactions, every one with `fromHook: false` and a `## Goal` first line: the summary
comes from Pi's own generator, not from an extension. A conversation is therefore already
punctuated into chapters, each with its own document. What is missing is the surface.

**The Desktop already derives Segments from those entries.** `refresh_conversation_segments`
reads each `compaction` entry's `parentId` and `firstKeptEntryId` and emits a manifest of
closed segments plus one current segment. The cut points are Pi's; the Desktop does not
invent them.

**The existing Segment pagination is unreachable.** `setHistoricalSegmentCount` has three
call sites on the current baseline and every one passes `0`, so the `Load N earlier
Segments` surface CR046 retained as compatibility output can never appear. Slice 6 therefore
replaces it rather than extending it, and slice 4 leaves the count alone: a manual
compaction reviving a surface that nothing else populates would make the app read
differently after a manual compaction than after an automatic one.

**CR046 fixed the authority boundary.** Segments are presentation pagination only: they may
select what is rendered but cannot define counts, completion, admission, settlement or
delivery, and deleting their projections must be safe. That constraint stays.

**Pi's RPC has a native `compact` command.** Documented in `docs/rpc.md` of the installed
`pi-coding-agent` 0.87.0: `{"type":"compact"}`, optionally with `customInstructions`. The
response carries `summary`, `firstKeptEntryId`, `tokensBefore`, `estimatedTokensAfter` and
`usage` — the chapter that just closed, returned directly. `set_auto_compaction` also exists.
`set_model` and `set_thinking_level` exist too; they are outside this CR but bear on CR078 and
CR090 and are recorded here.

**Why the Navigator's `/compact` prompt did nothing.** The RPC `prompt` command expands only
skill commands (`/skill:name`), prompt templates and extension commands. `/compact` is a TUI
command, so it was delivered to the model as literal text. Sending it as a prompt is not a
path.

**One Pi process per turn.** A Mirror-mediated turn owns one RPC process; on `agent_settled`
Tauri closes stdin and waits for exit. Between turns there is no process to receive a
command. Manual compaction while idle therefore needs a one-shot RPC invocation on the
session file. `provision_pi_session` is the precedent: spawn Pi in RPC mode, write one
command, drop stdin, `wait_with_output`, parse the last matching `response` line.

**The precedent breaks on one point: stdin must stay open.** Proven on 2026-09-27 against a
copy of a production session (production untouched). Writing `compact` and closing stdin
returned `Turn prefix summarization failed: This operation was aborted`; holding stdin open
until the response arrived produced a `## Goal` summary of 2,416 characters, a
`firstKeptEntryId`, 36,622 → 19,221 tokens, and one new `compaction` entry in the copy. Pi
treats EOF on stdin as shutdown and aborts the in-flight operation. `get_state` never showed
this because it answers instantly. The native command therefore reads stdout until the
compact response, then closes stdin and drains to exit.

**Known limitation.** There is no timeout on the one-shot process. A compaction of a very
large context takes minutes and that is legitimate; a hung Pi would hold the Journey's
compaction claim until the app restarts. Recorded rather than solved, pending evidence.

**The Desktop's RPC vocabulary today is `prompt`, `steer`, `set_steering_mode`.** Nothing
else is encoded. `observe_line` parses `response` lines but discards `data`, so the compact
response needs its own parser on the `parse_pi_session_state` precedent.

## Decisions

- **Chapters are views, never entities.** A closed chapter is a read-only view over Pi
  session entries. Selecting it never creates a Pi session, a Mirror conversation or any
  persistence root. This preserves CR046 and RS018, and it is also the product reason the
  Navigator named: structure that emerged on its own must not become structure the Navigator
  has to manage. Recorded in `terminal-aligned-conversation-authority.md`.
- **Automatic compaction stays on; manual is offered.** The common path remains "keep
  talking". Manual compaction is the escape hatch — before a model switch, or to close a
  chapter deliberately.
- **Entry point is the context label.** The Composer footer's context usage label becomes a
  control opening a small menu; `Compact now` is its first entry. The Navigator proposed
  this; it puts the action where the number that motivates it already lives.
- **The compaction summary is not delivered to Mirror.** Navigator decision, 2026-09-27: that
  is a conversation for Mirror's own Journey. The Desktop resolves navigation locally.
- **Isolation stops where the model lives.** Proven in homologation: a provider can be
  registered by a global Pi extension, so `--no-extensions` alone makes the Navigator's own
  model unknown to Pi (`Unknown provider "claude-bridge"`). A mediated turn stops
  auto-discovery and then names the global extensions explicitly, and compaction follows the
  same contract. The warning `No models match pattern "claude-bridge/..."` appeared in the
  original spike's stderr and was not followed up; it was this failure announcing itself.
- **Manual compaction runs isolated and without a turn.** No `--offline` (it calls the
  model), no turn correlation, no journal record, `--no-tools --no-extensions --no-skills
  --no-prompt-templates --no-context-files --approve`, always `--mode rpc`. The runtime
  profile is applied under Mirror mediation exactly as a turn does, so the model resolves the
  same way. Because every recorded summary came from Pi's default generator, isolation does
  not change the chapter's shape.
- **Compaction is occupancy.** It rewrites the session file, so it must never overlap a turn
  on the same Journey: refused while an active native lease exists, refused while another
  compaction is in flight, and turn admission refuses while a compaction is in flight. The
  frontend mirrors this as a blocked availability condition so Send is unavailable and the
  reason is named.

## Plan

Ordered slices. 1 and 2 are native and independent of each other; 4 depends on 1; 6 depends
on 2 and 3; 5 stands alone.

1. **Native one-shot compaction.** `compact_pi_session(journeyId, threadId, config,
   customInstructions?)`: validate the provider command, refuse on active lease or in-flight
   compaction for the Journey, resolve the active generation's session through the thread
   authority (channel-validated, session file validated), build args as decided above, spawn
   with the global Pi extensions named explicitly so the configured provider resolves, and
   with the runtime profile applied under Mirror mediation, write `{"type":"compact"}`, wait,
   parse. Returns `{ summary, firstKeptEntryId, tokensBefore?, estimatedTokensAfter? }`. A
   refusal surfaces Pi's own `error` text. Turn admission gains the in-flight refusal.
2. **Native chapter metadata.** The segment manifest carries, per closed segment, the
   summary's first `## Goal` line and the turn count, read from the Pi session at manifest
   time and never persisted separately.
3. **Domain chapter projection.** A pure function from manifest to an ordered list of
   chapters: title, date range, turn count, status.
4. **Composer entry point.** The context label opens a menu with `Compact now`. While
   compacting, availability is `compaction_active`, Send is unavailable and the footer says
   so. On success the surface reprojects from Pi, segments refresh, and the closed chapter is
   named in a notice.
5. **Named divider when a chapter closes.** From the live `compaction_end` stream event and,
   on reload, from the manifest, so the moment stops being invisible.
6. **Chapters navigable in the Journey.** Index first — every chapter listed by name, dates
   and turn count, selecting one moving the reading to where it starts. Whether a dedicated
   read-only view per chapter is needed is a question for daily use; the transcript already
   holds every chapter, because a compaction entry's parent is the pre-compaction tail and
   the active branch therefore spans the whole history. That is also why the `Load N earlier
   Segments` surface never had anything to load.

A manifest published before a Conversation's latest compaction would misname or hide
chapters, so the index compares the manifest's closed count against the Pi session's own and
rewrites the projection when they disagree. Segments are presentation only, so that rewrite
is safe — and it is the only way a Conversation compacted before this CR gets its index.

## Acceptance

- `Compact now` from the context label compacts the idle conversation, names the chapter
  that closed, and leaves the conversation continuing on the summary with the same shape an
  automatic compaction would have produced.
- Compaction never overlaps a turn on the same Journey in either direction, and the refusal
  is named rather than silent.
- The model-switch failure of 2026-09-26 has a path: compact, then switch.
- Every closed chapter is listed by its own `## Goal` title and date; opening one shows its
  transcript read-only and never creates a session, conversation or persistence root.
- A compaction is visible in the transcript where it happened.
- Deleting Segment projections remains safe; no count, admission, settlement or delivery
  decision reads them.

## Exclusions

- No automatic split, no writing into a closed chapter, no rewriting of history.
- No delivery of compaction summaries to Mirror.
- No change to Pi, and no use of `set_auto_compaction`, `set_model` or
  `set_thinking_level`; the latter two are recorded for CR078/CR090 follow-up.
- No `usage`/cost surfacing per chapter; that belongs with CR079.
- No warning at model selection about window size; that is a separate capture (the
  selection-time comparison of footprint against window), which this CR makes actionable
  but does not implement.

## History

Captured as *Manual Compaction / Compaction Checkpoint*: understand the checkpoint and
suggest splits. Rewritten on 2026-09-27 after the Navigator's model-switch failure and a
read-only investigation of the production sessions showed the chapter structure already
present in every compaction entry, and the installed Pi's RPC already offering a native
`compact` command. Renamed because the deliverable is chapters, not a checkpoint.
