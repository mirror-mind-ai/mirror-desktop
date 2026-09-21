[< RS016](index.md)

# CR069: Stop Presenting Non-Fatal Provider Warnings as Unsent Messages

**Status:** captured
**Driver:** —
**Delivery:** —

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
