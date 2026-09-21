[< RS016](index.md)

# CR069: Stop Presenting Non-Fatal Provider Warnings as Unsent Messages

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr069-non-fatal-provider-warnings`

## Problem

During the RS020 acceptance homologation (2026-09-21), every turn in Eval displayed:

```text
Message was not sent
Warning: No models match pattern "claude-bridge/claude-fable-5"
```

Both halves are wrong for this case:

1. **The message was sent.** The turn ran, the response streamed, and the exact pair reached Mirror. The `Message was not sent` banner is reserved language for genuine pre-agent rejection, but it currently presents any terminal stream warning.
2. **The warning is expected noise.** `claude-bridge` is a Pi extension the Navigator uses to expose extra models; Mirror Desktop invokes Pi with `--no-extensions`, so Pi cannot resolve the `claude-bridge/claude-fable-5` pattern from the user's Pi configuration and warns on every invocation while continuing with the effective Desktop-selected model (`openai-codex/gpt-5.5` at the time).

## Expected Behavior

- The `Message was not sent` banner appears only when the message genuinely did not reach the agent (pre-agent rejection with Composer restore).
- Non-fatal provider warnings emitted during a run that reaches a completed terminal stay out of the Composer banner surface; they belong to the run's diagnostics disclosure.
- Expected environment noise caused by Desktop's own invocation contract (`--no-extensions` hiding Pi extension models) is either suppressed or presented once with an explanation that names the effective model actually used.

## Notes

Related captured work: CR054 (surface provider terminal errors) and CR053 (clarify effective model). This CR is distinct: it corrects false failure presentation for successful turns rather than surfacing genuine failures.

## Implementation Outcome (2026-09-21)

`terminalStreamWarningNoticeKey(...)` now requires the run status and returns a key only for `failed` runs, so the `Message was not sent` banner is reserved for runs that genuinely did not complete — the pre-agent rejection path, which restores the Composer and marks the run failed. Warnings emitted during completed or cancelled runs (including the expected `--no-extensions` claude-bridge pattern noise) no longer occupy the Composer surface. Genuine provider-failure presentation remains CR054's captured scope.

## Validation

- Red-then-green unit coverage: completed, cancelled, idle and running statuses suppress the banner key; failed produces it.
- Complete frontend suite: 920 tests. TypeScript/Vite build passed; roadmap consistency `READY`; whitespace clean.

Eval candidate installed atomically without launching on 2026-09-21, Stable and Eval closed; executable SHA-256 `a33a0f112b13a41a747adbb17b1f35d29113b047e331ce38cb9586ffc1010027`. Navigator homologation pending.

## Closure

Closed on 2026-09-21 after Navigator Eval validation confirmed that ordinary turns show no unsent-message banner and no claude-bridge warning, while synchronization stays silent.

Proportionality and debt review: `no_action`. One predicate gained the run status it always needed; genuine provider-failure presentation remains CR054's captured scope.
