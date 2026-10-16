[< RS025](index.md)

# CR159: Say Why the Provider Refused a Turn

**Status:** captured
**Driver:** —
**Delivery:** —

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

Recorded so it can be decided. **Not selected, nothing implemented.**

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
