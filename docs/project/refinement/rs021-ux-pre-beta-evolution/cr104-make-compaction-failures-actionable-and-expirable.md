[< RS021](index.md)

# CR104: Make Compaction Failures Actionable and Expirable

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr104-actionable-compaction-failures`

## Focus

The Navigator explicitly pulled CR104 as the current RS021 focus on 2026-09-30.

## Friction

After a manual compaction failure, the message `Context compaction FAILED MANUAL TRIGGER Pi refused
to compact: Already compacted` remained visible forever, including after a subsequent turn. It had no
close action and no clear rule for when it stopped being current.

## Outcome

A compaction failure stays visible long enough to be understood and acted on, then settles or can be
dismissed according to an explicit durable rule. A subsequent successful or superseding activity
does not leave stale failure language permanently occupying the surface.

## First Investigation

Reproduce the `Already compacted` case and inspect the exact native result, durable compaction state,
notice ownership and replacement rules. Establish whether this is a true failure, an idempotent
already-satisfied result, or an incorrectly classified provider response before changing presentation.

## Acceptance

- The message accurately distinguishes a failure from an already-satisfied compaction outcome.
- A durable failure has an explicit dismiss, retry or recovery path appropriate to its state.
- A stale notice does not survive unrelated successful turns without a reason to remain visible.
- The surface remains truthful after reload and does not erase evidence needed for diagnosis.

## Boundaries

No automatic retry loop, no silent compaction and no change to the Navigator's manual-compaction
intent. This CR does not weaken Pi's refusal or error authority.

## Characterisation — 2026-09-30

Read from the code path the reported message proves was taken. `Pi refused to compact: ` is
constructed in exactly one place, `parse_pi_compaction_response` in `src-tauri/src/main.rs`, and it
interpolates Pi's `error` field. So Pi answered the `compact` RPC with `success: false` and
`error: "Already compacted"`.

Four layers turned that into a permanent notice:

1. Pi returns the refusal as an unsuccessful response.
2. The native parser converts **every** unsuccessful response into an error, so a refusal and a
   genuine failure become indistinguishable to the caller.
3. `compactSelectedConversationNow` records the error as an operation with status `failed`.
4. Only `completed` was scheduled for removal. `failed` had no timer, no dismissal and no rule for
   being superseded, so it stayed for the rest of the session.

A suspicion worth recording as refuted: a failed compaction does **not** leave the Journey status
stuck. `compactingJourneyId` is released in `finally`, and `run_started` only clears a stale Ready
marker. Withholding `run_finished` on failure is deliberate — a failure must not read as Ready.

## Phase 1 — The Notice Contract

The reported friction is that the notice could not be cleared, and that is fully addressable without
resolving the classification question. A compaction outcome has two lifetimes, not one:

- A success is a confirmation. It has done its job once read, so it may still fade.
- A failure is a statement that remains true afterwards. The context was **not** compacted, and the
  pressure that motivated the request is now worse rather than better. A timer must not clear it,
  and neither may an unrelated turn succeeding — that is precisely what made the old notice look
  stale while its statement still held.

`compactionNoticeLifecycle` names that rule, and `compactionNoticeIsDismissible` adds that work still
in flight is never dismissable, because hiding it would hide the running agent. `CompactionNotice`
owns the dismissal, deliberately not `RuntimeCompaction`, which also renders inside agent activity
and reconstructed turns where there is no notice to close. A failure is announced through
`role="alert"` instead of `role="status"`.

Declared limit: the notice is session-local React state, as before. Making an interrupted or failed
compaction durable across restart is a separate decision and is not taken here.

## Investigation — Can the benign outcome be recognised without matching prose?

The first recommended direction was to treat `Already compacted` as an already-satisfied result. As
stated, that would have pattern-matched Pi's English, which contradicts the rule CR089 established:
derive a semantic class from authority, never from the wording of a message.

Reading Pi's installed runtime settles it. In `core/agent-session.js` the manual `compact` path is:

```js
const preparation = prepareCompaction(pathEntries, settings);
if (!preparation) throw pathEntries[pathEntries.length - 1]?.type === "compaction"
  ? new Error("Already compacted")
  : new Error("Nothing to compact (session too small)");
```

Three consequences:

- There is **no machine-readable refusal code**. The discriminator is a thrown message.
- Pi's own condition is purely structural: *is the last entry of the active branch a compaction
  entry?* That is computable from the same session file the Desktop already reads.
- Both refusals are benign. Neither means the compaction failed; both mean there was nothing to do.
  The genuinely failing cases come from the compaction call itself.

`inspect_dedicated_pi_transcript` already walks the branch with each entry's type — it derives
`compaction_count` and `chapter_closures` that way, and already holds `leaf_entry_id`. Exposing
whether the leaf is a compaction entry is therefore a small, contract-level addition that mirrors
Pi's predicate exactly, with no prose matching.

## Phase 2 — Delivered

### A correction to the justification

Phase 2 was pitched as avoiding "a model call and minutes of waiting." That was wrong. Reading
`agent-session.js` line by line shows `prepareCompaction` is evaluated and thrown **before** any
model call — the only preceding `await` resolves local summarization auth. A refusal therefore
costs one Pi process spawn, seconds rather than minutes. Prevention is still worth having, but for
a smaller reason: it avoids a pointless spawn and avoids alarming the Navigator about a non-problem.

That correction matters because it changes which half of the work carries the weight. Recognising
the benign outcome is the part that had to be right; preventing the click is the convenience.

### What shipped

`leaf_is_compaction` is now reported by `inspect_dedicated_pi_transcript`, derived exactly as Pi
derives it — `branch.last().entry_type == "compaction"` — from the same session file. No wording is
matched anywhere.

**Recognising the benign outcome.** `classifyCompactionRefusal` calls a refusal benign only when two
independent things agree: our own native parser reports that Pi answered an unsuccessful response,
and a **fresh** inspection taken at the moment of the refusal confirms the branch already ends in a
compaction. A dead process stays a failure even on an already compacted branch, because something
really did break, and an unreadable branch confirms nothing and stays a failure too.

The outcome is carried as `nothingToDo` beside the status rather than as `completed`, because the
compaction did not happen. Reporting it as completed would have claimed a chapter was closed. It
shares only its *lifetime* with a success: it fades, and it is not dismissable, because there is
nothing for the Navigator to resolve.

**Preventing the pointless attempt.** `manualCompactionAvailability` collects the three reasons
compaction can be unavailable in one ordered rule, replacing an inline ternary chain, and
`ComposerContextMenu` already accepted `unavailableReason`. An unknown branch state never forbids
the action: letting Pi refuse costs a moment, while wrongly forbidding removes a working action.

**Keeping the flag honest.** The branch state is recorded wherever the app already inspects, and
cleared as soon as a turn is admitted for that Journey — a turn appends entries, so the branch can
no longer end in a compaction. Without that clearing the menu would have kept refusing after a
compaction followed by ordinary work, which is worse than the bug this CR set out to fix.

### Validation

- `cargo test --locked`: 213 passed. `npx vitest run`: 200 files, 1298 tests. `tsc`, `build`,
  `roadmap:check`, `git diff --check` clean.
- Dev installed at `0.2.0-alpha.26`, binary `0966c1121fea161f`.

### Declared limits

- `Nothing to compact (session too small)` is Pi's other benign refusal and is **not** recognised as
  benign here. Its condition is Pi's own size threshold from its compaction settings, which the
  Desktop does not read, so claiming to know it would be a guess. It remains a dismissable failure.
- The notice is still session-local React state. Durability across restart is a separate decision.
- TypeScript matches one string across the native boundary: the `Pi refused to compact:` prefix our
  own Rust constructs. It is our contract rather than Pi's prose, and it is pinned by a Rust test,
  but it is a coupling worth naming.

## Closure — 2026-09-30

Validated by the Navigator in the Dev build. Closure evidence: `cargo test --locked` (213 passed),
`npx vitest run` (200 files, 1298 tests), `tsc`, production build, `roadmap:check`, and
`git diff --check` all passed. Dev artifact `0.2.0-alpha.26` was installed and the manual
compaction availability, benign refusal, and persistent genuine-failure paths were prepared for
homologation. No release, push, tag, or publication is implied by this closure.
