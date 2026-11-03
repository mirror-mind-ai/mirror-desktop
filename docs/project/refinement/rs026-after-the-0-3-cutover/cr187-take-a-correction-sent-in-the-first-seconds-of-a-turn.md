[< RS026](index.md)

# CR187: Take a Correction Sent in the First Seconds of a Turn

**Status:** captured
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
