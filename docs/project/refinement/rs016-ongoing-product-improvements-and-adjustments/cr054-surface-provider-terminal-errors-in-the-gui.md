[< RS016](index.md)

# CR054: Surface Provider Terminal Errors in the GUI

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

When the Pi/provider path terminates because the model returns a provider error, Mirror Desktop can present the turn only as an interrupted attempt without showing the concrete error that caused the interruption.

The observed production alpha.10 case happened in the `Mirror Desktop` Journey. The user sent:

```text
execute o proximo passo recomendado.
```

The app later showed only:

```text
Previous attempt was interrupted
It ended before producing a response. No retry was started. You can continue by sending a new message.
```

The actual failure was a model/provider error emitted to Pi:

```text
Error: You have hit your ChatGPT usage limit (plus plan).
```

That message did not reach the visible GUI surface, so the user could not tell whether the problem was a network issue, cancellation, app bug, provider quota limit, or something else.

## Expected Behavior

When a provider invocation terminates with a bounded provider error and no assistant answer, the GUI should surface the error in a user-readable way while preserving the existing no-implicit-retry contract.

The user should see both:

- that the attempt did not produce a response;
- the concrete safe error message or normalized reason, for example a usage-limit notice.

The app must not fabricate an assistant response and must not retry the provider automatically.

## Impact

Without the provider error, the interruption notice is technically true but operationally incomplete. It hides the actionable cause from the user. In this case, the next useful action is not debugging continuity or resetting context; it is waiting for quota reset, changing provider/model, or using another authenticated plan.

The absence of error visibility also makes Terminal-Aligned Conversation Continuity look suspicious: the Desktop correctly keeps continuity available, but the user cannot understand why the previous turn ended.

## Evidence

Navigator screenshot supplied on 2026-09-19 from installed alpha.10 shows the `Mirror Desktop` Journey with the last user message visible and the passive `Previous attempt was interrupted` notice. No assistant response and no provider error are visible.

Navigator reported the underlying Pi/provider error:

```text
Error: You have hit your ChatGPT usage limit (plus plan).
```

This indicates the error existed in the provider/Pi path but was not carried into the visible Desktop recovery surface.

## Proposed Scope

- Inspect how provider errors are represented in Pi JSONL, stderr/stdout process events, failed native leaves and/or turn journal terminal evidence.
- Define a bounded, sanitized provider-error presentation contract for attempts that end before a complete assistant answer.
- Extend the interrupted-attempt GUI to include a safe error detail when exact evidence is available.
- Preserve Composer availability after inactive failure.
- Preserve the no implicit provider retry invariant.
- Add focused tests covering at least a usage-limit provider error and a generic provider error.

## Acceptance

- A provider quota error that terminates a turn without an assistant answer is visible in the GUI.
- The visible text distinguishes provider failure from a generic interruption without overexposing private paths, prompts, environment, credentials or raw unbounded stderr.
- No assistant message is fabricated.
- No provider retry is started automatically.
- Successor send remains available once exact native occupancy is inactive.
- Existing interrupted-attempt behavior without safe error evidence remains passive and non-blocking.

## Exclusions

- No provider credential management changes.
- No automatic model/provider switching.
- No retry button or implicit retry route.
- No mutation of production app data as part of this capture.
- No change to Pi JSONL transcript authority.
- No push, merge, publication or release.

## Authority Boundary

Captured only. This CR is not selected, assigned, planned or authorized for implementation. Selecting, assigning Driver/Delivery, implementing, committing beyond capture, pushing, merging, publication and release remain separate Navigator decisions.
