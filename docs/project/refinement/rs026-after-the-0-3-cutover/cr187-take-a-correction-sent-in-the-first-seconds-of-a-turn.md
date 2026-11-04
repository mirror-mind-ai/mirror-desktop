[< RS026](index.md)

# CR187: Take a Correction Sent in the First Seconds of a Turn

**Status:** shipped in v0.3.0-alpha.13, awaiting the Navigator's check in production
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-03: a correction sent right after the turn is sent is
rejected; one sent after some time is accepted.

## What Is Known

From production's `mirror-desktop` conversation (steering evidence and the Pi session):

| Turn sent | Correction | After | Outcome |
|-----------|------------|------:|---------|
| 2026-11-01 19:19:49.7 | "vai" | 3.0 s | rejected 1.2 s later |
| 2026-11-03 13:41:13.4 | "npm" | 3.3 s | rejected 0.5 s later |
| 2026-11-03 13:41:13.4 | "rodar o npm" | 14.7 s | accepted, applied 13:41:54 |

- Pi recorded the turn's prompt at **13:41:54.175**, 41 s after Send, and the accepted correction
  right after it. So Steering into Pi's queue already works before the prompt runs; what fails is
  the first seconds.
- Both rejections came back quickly, so they are not `steer_pi_invocation`'s 2 s wait running
  out. They are one of its early refusals: the invocation not yet in the registry ("does not
  exist"), not yet RPC, or Pi answering the `steer` command with an error before its session is
  ready. The rejection's reason reached the surface as a warning but is not kept in the evidence.
- The Composer offers Steering as soon as the turn is live in the renderer, before the native
  invocation can take it.

## Direction (measure first)

Reproduce in development with a correction one second after Send, and keep the reason in the
evidence. Then repair where it fails: a correction that arrives before the invocation can take it
waits, staged as pending, and is delivered when the invocation is ready, instead of being rejected.
The 41 s between Send and Pi's prompt is a separate cost, noted here and not repaired by this CR.

## Falsifier

A correction sent one second after Send is applied to that turn, in development and then in
production.

## Cause (2026-11-04)

Pi is not the one refusing. Its RPC `steer` queues a correction at any point once it reads the
command (`_queueUserInput` in Pi 1.4.0), including before the prompt runs, which is why the
correction at 14.7 s was taken. The refusal was the Desktop's. The Composer offers Steering as soon
as the turn is live in the renderer, and `steer_pi_invocation` then found, in turn:

1. no invocation, before `start_pi_invocation` reserved it ("does not exist");
2. an invocation reserved but without a child, until the worker attached it ("is not running");
3. a child whose prompt had not been written yet. This one did not refuse, but it could write the
   correction to Pi ahead of the prompt it corrects.

The first-seconds cases were not reproduced in the running app before the repair; the cause was read
from the code and from Pi's source.

## Repair (2026-11-04)

- `steer_pi_invocation` answers `waiting` in all three moments and writes nothing.
  `steering_target_readiness` decides from the lease phase and terminal state; only an invocation
  that is over still refuses. A `prompt_sent` flag, set under the child's lock by the write that
  sends the prompt, keeps a correction from preceding it.
- `deliverSteeringWhenReady` (`src/app/steeringDelivery.ts`) keeps the correction `pending` and asks
  again every 250 ms. It stops when the correction is admitted, when the run ends (the settlement
  then records it as unconsumed), or after 120 s, which rejects it with that reason.
- `settleSteeringDelivery` writes the outcome onto the run's freshest conversation. Writing it onto
  the copy staged before the wait would have replaced the messages streamed meanwhile.
- A rejected correction keeps its reason in `rejectionReason`, persisted and validated.

Spec: `src/tests/cr187EarlySteering.test.ts` and `cr187_early_steering_tests` in `main.rs`. Each
was checked failing first and by mutation.

## Validation in Development (2026-11-04)

The Navigator sent a correction about one second after Send in the development app and reported
"deu certo": the correction was taken and applied to that turn, with no rejection warning. The
production half of the falsifier waits for the next release.
