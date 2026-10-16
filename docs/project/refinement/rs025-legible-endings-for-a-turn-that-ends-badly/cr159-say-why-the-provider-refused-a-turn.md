[< RS025](index.md)

# CR159: Say Why the Provider Refused a Turn

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs025-batch-a-naming`

## Friction

Reported from the field on 2026-10-16, production `v0.2.0-alpha.50`, Journey `alissonvale-com`,
conversation *"Comunidade Alisson Vale"*:

> *"Eu mando um turno e o agente interrompe a execução sem explicações."*

Two consecutive turns ended with nothing shown. The explanation existed on disk the whole time.

## What Actually Happened

The provider refused, eight times, and the app had no path to say so.

Turn journal, `turn-journal/alissonvale-com.json`, thread
`desktop-thread-alissonvale-com-18de8c5db6b02b50`:

| created (UTC) | phase | terminalOutcome | cancellationIntent | piExecution |
|---|---|---|---|---|
| 2026-10-16T12:40:45 | settled | completed | none | present |
| 2026-10-16T12:45:43 | settled | completed | none | present |
| **2026-10-16T12:53:12** | **interrupted** | **process_died** | **none** | **null** |
| **2026-10-16T12:53:49** | **interrupted** | **process_died** | **none** | **null** |

`cancellationIntent: "none"` on both — **the Navigator did not cancel.**

In the Pi session JSONL, every assistant entry of those two turns carries:

```json
{
  "role": "assistant",
  "content": [],
  "stopReason": "error",
  "usage": { "totalTokens": 0, "cost": { "total": 0 } },
  "provider": "openai-codex",
  "model": "gpt-5.6-sol",
  "thinkingLevel": "medium",
  "errorMessage": "Codex error: An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists."
}
```

Eight such entries across the two turns — **four per turn**, each followed by a `context_edit` with
`replacement: null`, which is Pi removing the failed entry before retrying. Backoff ran roughly
2 s, 3 s, 6 s, 10 s; then the process exited and the app saw the child die.

**One distinct error message across all eight.** A provider-side 500-class refusal.

### What rules this out as our configuration or the Navigator's input

The **same conversation, same model, same settings** completed two turns at 12:40 and 12:45 — seven
minutes earlier. `journeyOverrides["alissonvale-com"]` is
`openai-codex/gpt-5.6-sol` with `thinkingLevel: "pi-default"`, which Pi resolved to `medium`. Nothing
was misconfigured and nothing changed between the successes and the failures.

## The Defect

The error text is in the data, is read by nothing, and therefore cannot be shown.

- **`errorMessage` appears 0 times in all of `src-tauri/src/*.rs`.** In TypeScript it appears only in
  `piProcessStream.ts` — once for *compaction* failures (`mapCompactionEnd`, line 384) and once for a
  stream event of `type: "error"` (line 521) — and in the self-update panels. **Never for a transcript
  assistant entry.**
- Every place that recognises an assistant answer accepts **only** `stopReason ∈ {"stop", "length"}`:
  `src/domain/inactiveNativeAttempt.ts:37`, `src-tauri/src/main.rs:5254`, `:5357`, `:5443`.
- `main.rs:8823` **does** know about `"error"` — `!matches!(..., Some("aborted" | "error"))` — but only
  to exclude the entry from the context-token snapshot. It is arithmetic, not an error path.

So the projection rejects the entry, `terminalEvidence.piExecution` lands as `null`, and the only
thing left for the Navigator is `process_died` with no text.

**Instrument control.** The same search finds other fields of the same object — `stopReason`,
`thinkingLevel`, `assistantText` — and correctly returns 0 for `responseId`, which genuinely is not
used. The zero for `errorMessage` is a real zero, not a blind search.

## Why This Is Not CR054 Reopened

[CR054: Surface Provider Terminal Errors in the GUI](../rs016-ongoing-product-improvements-and-adjustments/cr054-surface-provider-terminal-errors-in-the-gui.md)
is `done`, and its Problem statement describes this symptom exactly: *"present the turn only as an
interrupted attempt without showing the concrete error that caused the interruption."* Its scope even
asked for tests covering *"a generic provider error"*, which this is.

**The symptom is the same; the mechanism is not.** CR054's case was a usage-limit error, and the
surfacing it produced reads the stream event path (`type: "error"`). This refusal arrives as a
**transcript assistant entry** with `stopReason: "error"` and an `errorMessage` field, a shape nothing
in the load path reads. A closed CR's debt arriving from the field in a new shape is a new CR, not a
reopening — CR054's own evidence stays true.

## Expected Behavior

When a turn ends with no assistant answer and the transcript carries a provider `errorMessage`, the
interrupted-attempt surface names the concrete reason. The existing invariants hold unchanged: no
fabricated assistant response, no implicit provider retry, Composer stays available.

## Proposed Scope

~~Recorded so it can be decided. Not selected, nothing implemented.~~ **Planned 2026-10-16 as RS025 Batch A.** Nothing implemented yet.

**Scope.** Read `errorMessage` from a transcript assistant entry whose `stopReason` is `"error"`,
carry it into the turn journal's terminal evidence, and render it in the interrupted-attempt notice.
Sanitise to a bounded length. Keep `{"stop","length"}` as the definition of an *answer* — an error
entry must still not count as one.

**Files.** `src-tauri/src/main.rs` (the entry projection and its terminal evidence),
`src/domain/inactiveNativeAttempt.ts`, the interrupted-attempt surface, plus tests beside each.

**Acceptance.** A turn whose only assistant entries carry `stopReason: "error"` presents the provider
message. A turn with a genuine answer is unchanged. A cancelled turn is still reported as cancelled,
not as a provider error.

**Validation.** A fixture built from **this real session's shape** — `content: []`, zero usage,
`stopReason: "error"`, `errorMessage` present. A control per guard. An absence assert that the error
entry is still not counted as an answer, so the fix cannot smuggle an empty turn into the transcript.

**Exclusions.** Does not add provider retry. Does not change model or provider selection. Does not
touch the compaction error path, which already surfaces its own message.

## Open Question, Not Yet Answerable

Whether Pi also emitted a stdout stream event of `type: "error"`, which **would** have had a live
surface at `piProcessStream.ts:521`. There is no stdout/stderr capture of the child on disk, so
"never emitted" cannot be distinguished from "emitted and dropped". Settling it needs instrumentation,
not inference. If it was emitted and dropped, that is a second defect on the live path and this CR's
durable-surface repair would not cover it.

## Collateral Finding

The Navigator's composer draft did **not** survive: `composer-drafts.json` holds no key for this
Journey. The text itself is recoverable from the Pi JSONL — the user message is recorded intact in
both failed turns — but the app cleared the draft on send and did not restore it when the turn died.
Worth its own capture if it recurs; recorded here rather than silently dropped.

## Provenance

Production app data read on 2026-10-16, read-only, with production running at pid 27709.
Journal, Pi session JSONL, `agent-settings.json`, `composer-drafts.json` and the catalog inspected
directly. Code facts from `main.rs`, `inactiveNativeAttempt.ts` and `piProcessStream.ts` at `b47c4e3`.
No occurrence was staged; this is the field's own case.

## Implemented (RS025 Batch A, 2026-10-16)

On `refinement/rs025-batch-a-naming`. Gates: vitest **267 files / 2,196 tests**, `tsc` clean,
frontend build clean, `cargo test` 328 passed. Not merged, not released, not field-checked.

**A deviation from the Proposed Scope, decided on a field fact.** The scope said *carry the message
into the turn journal's terminal evidence*. The repair reads it from the **transcript leaf** instead,
because the session file settles where the message is when the Navigator looks: Pi removes each
failed attempt with a `context_edit` (`replacement: null`) before retrying, **but not the last one**.
After the fourth refusal the error entry — `221ddf6c` at 12:53:36, `968faaab` at 12:54:12 — is the
leaf of the active branch, and stays so until the next user message. The leaf is exactly what
`deriveInactiveNativeAttemptCandidate` already identifies. Enriching the journal would have meant
reading the session file inside the native terminalization path for a fact the frontend already
loads; the smaller change is also the one that keeps the Pi JSONL as the transcript authority.

**What changed.** Rust: `error_message` on `PiBranchEntry` and `DedicatedPiTranscriptEntry`, read
from `message.errorMessage`, serialised as `errorMessage`; the entry is still **not** an answer —
`incomplete_user_entry_id` stays set, asserted. TypeScript: `errorMessage?` on the transcript entry
type; the candidate carries `providerFailure` when the leaf is an assistant `stopReason: "error"`
entry with a non-blank message, bounded at `PROVIDER_FAILURE_MAX_CHARS = 600` with the cut marked,
and the key is **absent** otherwise so *no detail* and *empty detail* stay distinguishable.
`App.tsx` hands `interruptedProviderFailure ?? inactiveNativeAttempt?.providerFailure` to the
notice CR054 already built — the journal's run-correlated detail first, the leaf as fallback.

**Controls.** A fixture in the field's exact shape; an error leaf with no message, a blank message,
and a plain user leaf all carry nothing; an error entry still throws when a real answer follows it,
so the fix cannot smuggle an empty turn in as completed. Two existing source guards that named the
old wiring literally were updated to the new one.

**Field check owed.** The next provider refusal on a build carrying this must show
*The provider reported: …* under *Previous attempt was interrupted*. The open question about the
stream `type: "error"` event remains unanswerable without a stdout capture and this change does
not depend on it.

## Dev Build Carrying Batch A (2026-10-16)

Source `03674f3` on `refinement/rs025-batch-a-naming`. Installed at `/Applications/Mirror Desktop Dev.app`,
binary **`03cc4fba34ed065a3f66e4daede3d5a125cb6f349b736de551500fe8fef7c4b4`**, replacing `7423733e…`
(backup `/tmp/Mirror Desktop Dev-20261016-115823.app`, hash-verified before removal). Bundle identity `ai.mirrormind.desktop.dev` checked
before the destination was touched; the `ps` gate passed twice, after being corrected — its first
form matched the shell command that contained the pattern, so it reported "running" for a closed
app, and the state was unknown until the gate anchored on the process path.

**Shipped-chain evidence.** `dist/assets/index-*.js` 11:55:13 precedes the binary 11:57:21;
installed hash equals built hash. In the bundle: `still records the agent as executing` 1×,
`cannot tell whether the agent is still executing` 1×, `Still finishing after` **2×** (1× before —
the count delta is the discriminator for the second section). `The provider reported:` 2×,
unchanged: CR159's wiring introduces **no new literal**, so it is not grep-verifiable in the bundle;
it is covered by `cargo test`, the source guards and the field check.
