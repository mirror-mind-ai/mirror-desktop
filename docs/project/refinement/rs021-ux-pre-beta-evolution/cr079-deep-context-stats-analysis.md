[< RS021](index.md)

# CR079: Always Legible Context Reading

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr079-deep-context-stats-analysis`

## Problem

The Pi terminal keeps context-window numbers permanently on screen. Mirror Desktop
frequently shows a sentence instead — `Checking context stats…`, `Waiting for first context
usage…`, `Waiting for usage from selected model…` — and stays there for a long time, often
until a turn is sent, sometimes never. Even after sending, the number appears only once the
assistant finishes responding.

The Navigator's account is that the numbers are never there when they are needed. The terminal
gives an approximate, always-present reading; the Desktop gives an exact reading that is
usually absent. For the decision the reading actually supports — is this conversation close to
its limit, should it be compacted, can it survive a model switch — an approximate number now is
worth more than an exact number later.

## Investigation (2026-09-28)

**The terminal formula is one line and never degrades to prose.** In
`dist/modes/interactive/components/footer.js` of the installed `pi-coding-agent` 0.87.0, the
window comes from `contextUsage?.contextWindow ?? state.model?.contextWindow ?? 0` and the
percent from `contextUsage?.percent`, rendered as `?/272K` when the percent is null and
`41.3%/272K` otherwise. The window falls back to the *selected model's* declared window, so it
is present even when usage is not.

**The terminal does not bind the reading to the model that measured it.** `getContextUsage()`
in `dist/core/agent-session.js` estimates over the session projection and divides by the
current model's window. It returns `{ tokens: null, contextWindow, percent: null }` only after
a compaction with no post-compaction assistant response — and even then the window survives.

**The Desktop already has every window it needs.** `list_pi_models` is loaded at boot into
`piModelCatalog` and parsed in `src-tauri/src/agent_settings.rs`. Probed live on the
Navigator's machine, it covers all four Model Intents:

| Model | Window |
|---|---|
| `openai-codex/gpt-5.5` | 272K |
| `openai-codex/gpt-5.6-sol` | 272K |
| `claude-bridge/claude-fable-5-1` | 1M |
| `claude-bridge/claude-opus-5` | 1M |

`displayContextWindow` in `src/app/App.tsx` already derives from that catalog. It is then
discarded: when there is no token count, `authoritativeContextUsage` becomes `undefined` and
the footer prints a sentence. The window is available and thrown away.

**Four distinct causes produce the waiting experience**, in order of impact.

1. **The model-identity gate.** `contextIdentityMatches` requires
   `authoritativeContextStats.providerModel === providerModelLabel(effectiveProviderConfig)`.
   Every Model Intent switch discards a valid reading, and `contextStateForInspection` returns
   `model_mismatch` for the session's own last measurement, holding the sentence until the new
   model completes a full turn. A token count is a property of the Conversation, not of the
   model that will read it. This gate also hid the number in exactly the situation that
   motivated CR080: the same tokens are 10% of a 1M window and 37% of a 272K one.
2. **Nothing re-inspects.** The reading effect depends on conversation, generation, session
   file, streaming, provider config and `contextRefreshEpoch`. Its retry is bounded to three
   attempts inside roughly 300ms. A `waiting` result then freezes with no timer, no polling and
   no file watch.
3. **A new Conversation cannot estimate.** In `extract_context_stats_from_pi_entries` the
   estimate branch ends with `provider_model?`, which is `None` until an assistant has replied.
   A fresh Conversation with a typed prompt returns nothing where the terminal would already
   show a percentage.
4. **Compaction hides the window.** Desktop and terminal agree that tokens are unknown until
   the next response, but the terminal still shows `?/1.0M` while the Desktop shows a sentence.
   With CR080's manual compaction this now happens on demand — and the `compact` response
   already carries `estimatedTokensAfter`, which the Desktop parses for the chapter card and
   then ignores for the reading.

## Decision

**The footer always reads `<value>/<window>`.** The window comes from the selected model's
catalog entry; the value comes from the best available evidence; unknown is a glyph, never a
sentence. The Navigator chose the vocabulary:

| Reading | Meaning |
|---|---|
| `41%/272K` | measured by the model now selected |
| `~41%/272K` | an estimate, a measurement by another model, or `estimatedTokensAfter` after a compaction |
| `?/272K` | genuinely unknown |
| `–/272K` | no session, or Pi context not initialized |

The sentences are not deleted; they move to the tooltip, where they remain useful for
diagnosis without occupying the one line the Navigator reads at a glance.

**An estimate is not an invention.** The CR's exclusion against invented percentages is
preserved by the `~` marker, not by silence. Tokenizers differ between model families, so a
count measured under `gpt-5.5` may be off under Claude; `~` is exactly the claim that the
number is indicative. Withholding it entirely was the more misleading option, because it left
the Navigator with nothing.

## Scope

1. **One reading function.** A pure `projectContextReading` produces text, confidence, tooltip
   and tone. The footer renders it and no longer formats prose.
2. **Unbind the reading from the measuring model.** Session and generation remain the cache
   authority; the measuring model only decides `~`. `model_mismatch` stops suppressing the
   number.
3. **Estimate without an assistant reply.** The Rust snapshot carries `estimated` and no longer
   requires a provider/model pair to return an estimate.
4. **Spend the compaction evidence.** `estimatedTokensAfter` becomes an approximate reading for
   both manual and automatic compaction instead of an unknown state.
5. **Re-read on a bounded cadence.** After a turn settles, on Journey selection, and while the
   reading is still absent, with an explicit attempt bound rather than indefinite polling.
6. **Retire the stale window snapshot.** `PI_MODEL_CONTEXT_WINDOWS` in `providerConfig.ts`
   contains none of the four models actually in use; the live catalog leads and the snapshot
   becomes a last resort.

## Acceptance

- The footer never renders `Checking context stats…`, `Waiting for first context usage…` or
  `Waiting for usage from selected model…` as its visible label.
- A Model Intent switch keeps a number on screen, marked `~` until the new model measures.
- A Conversation with no assistant reply still shows an approximate percentage.
- A compaction leaves `~<percent>/<window>` rather than an unknown-state sentence.
- The window is shown even when the token count is unknown.

## Exclusions

- No invented exact percentages; every approximation is marked `~`.
- No change to compaction policy, model selection policy or context budgeting.
- No re-tokenization of the Conversation to make cross-family estimates exact.
- No unbounded polling of the Pi session file.
