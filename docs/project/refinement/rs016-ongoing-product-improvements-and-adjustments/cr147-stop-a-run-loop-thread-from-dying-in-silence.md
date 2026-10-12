[< RS016](index.md)

# CR147: Stop a Run-Loop Thread from Dying in Silence

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

CR145 made the consequence of this defect recoverable and said explicitly that it did not explain
the cause. This is the cause, captured with a hypothesis sharp enough to test.

On 2026-10-11 a Pi process completed a 65,474-character answer, reported `stopReason: "stop"`, and
exited. Forty-five minutes later the turn journal still read `running` at revision 2 with no
terminal evidence, no settlement record existed, and the native registry still held the lease.
**Terminalization never ran**, and that is established rather than inferred: terminalization drops
the child handle and precedes both the journal write and `emit(Done)`, so a live lease holding a
handle proves it was never reached.

Events were flowing right up to the end — the renderer reached `FINISHING`, which comes from Pi's
own `agent_end`. So the loop was alive while Pi finished and then failed to handle the exit.

## The hypothesis, found by reading how the loop is hosted

Everything that owns terminalization — the `try_wait` loop at `main.rs:8058`, the attach, every
failure path — runs inside a bare **`thread::spawn(move || { … })` at `main.rs:8014`**. The
`JoinHandle` is never retained and nothing ever joins it.

**A panic anywhere in that closure unwinds the thread and dies in total silence.** Every explicit
early return is covered — each calls `fail_pi_process_before_completion`, which terminalizes before
it emits. A panic is covered by nothing. In a release build there is no console, so nothing
anywhere would say it happened.

That produces precisely the observed shape: child gone, journal frozen at `running`, lease still
held, no settlement record, no error on screen, and a renderer waiting forever on a `Done` that
will never come.

### Two candidate mechanisms, and a test that separates them

**A — an isolated panic.** Something on the exit-handling path panicked for this turn only. Predicts
that the *next* turn in the same process is unaffected.

**B — a poisoned registry mutex.** If any thread panics while holding the registry lock, the
`Mutex` is poisoned and every later `lock()` returns `Err` for the life of the process. The attach
site handles that case explicitly; whether the terminalization path does is unestablished. Predicts
that **every** subsequent turn in the same process fails the same way.

**The discriminator is persistence**, and the one incident we have cannot settle it: the app sat
stuck for forty-five minutes and was then restarted, so no later turn ran in that process. Any
future occurrence should be read for this specifically — did the next turn in the same process
work?

## Outcome

A run-loop thread that stops without terminalizing its turn is observable, instead of being a
silence that only shows up as a turn that never finishes.

## First Investigation

1. Establish whether a panic in that closure is in fact unreported — check the panic hook, whether
   one is installed at all, and whether anything it writes survives in a release build.
2. Establish whether the terminalization path can be reached with a poisoned registry lock, and
   what it does when `lock()` returns `Err`. If it gives up silently, hypothesis B is not just
   possible but a second independent defect in its own right.
3. Decide the repair shape. Retaining the `JoinHandle` and observing the thread's end is one
   option; `catch_unwind` around the body with terminalization in the unwind path is another;
   a panic hook that adopts a terminal journal record is a third. These differ in how much they can
   do *after* the stack is already unwinding, and the honest option may be the narrowest one.
4. Establish whether the repair can be characterised by injecting a panic rather than by reproducing
   the original failure, and whether such a test can live in the repo without a panic in a normal
   test run looking like a real failure.
5. Decide whether this subsumes the separately-noted gap that a dispatcher quarantine is
   in-memory-only in a console-less release build, or whether the two merely share a cause.

## Acceptance

- A run-loop thread that ends without terminalizing leaves a durable trace that names the turn.
- A panic on that path does not leave a turn stranded in `running` with a live lease.
- Nothing changes about how a healthy turn terminalizes, settles or emits.
- The repair does not depend on reproducing the original 2026-10-11 failure.

## Boundaries

No change to admission, occupancy, the share, or CR145's reap. CR145 stays the Navigator's exit for
a turn already stranded; this CR is about the system not producing the state in the first place, or
at minimum not producing it quietly. A genuinely hung-but-live Pi remains out of scope — it is a
different defect, and CR145 deliberately refuses that case too.
