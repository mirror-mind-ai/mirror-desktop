[< RS021](index.md)

# CR104: Make Compaction Failures Actionable and Expirable

**Status:** in_progress
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

## Phase 2 — Recommended, Pending Decision

Prefer prevention over explanation. If the leaf is already a compaction, `Compact now` can be
offered as unavailable with that reason **before** spending a model call and minutes of waiting;
`ComposerContextMenu` already accepts an `unavailableReason` for exactly this. A refusal that still
arrives can then be corroborated against the Desktop's own reading of the session rather than
against Pi's wording.

This requires extending the native inspection contract, which is shared by several surfaces, so it
is left as an explicit decision rather than bundled into Phase 1.
