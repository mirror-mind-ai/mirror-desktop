[< RS016](index.md)

# CR147: Stop a Run-Loop Thread from Dying in Silence

**Status:** in_progress
**Driver:** Navigator (plan approved 2026-10-12, with the recommended acceptance amendment)
**Delivery:** `refinement/rs016-cr147-stop-a-run-loop-thread-from-dying-in-silence`

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

~~Everything that owns terminalization — the `try_wait` loop at `main.rs:8058`, the attach, every
failure path — runs inside a bare **`thread::spawn(move || { … })` at `main.rs:8014`**. The
`JoinHandle` is never retained and nothing ever joins it.~~

**Corrected 2026-10-12, on reading the source for the plan:** the coordinate was wrong and the shape
was right. `:8014` is the **stderr reader** thread (`:7978` is stdout's); both handles *are*
retained and joined. Everything that owns terminalization is the body of **`run_pi_process`**
(`:7799`–`:8281`), which runs on the worker thread spawned by
`thread::Builder::new().name(worker_name).spawn(…)` at `:4216`–`:4226` — whose `JoinHandle` is
discarded on the spot by `.map(|_| ())`. Nothing joins it, nothing observes its end. Kept struck
through because a hypothesis with the wrong line number is the kind of thing that gets "fixed"
at the wrong line.

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


## First Investigation — answered 2026-10-12, against source

**1. A panic in the run loop is unreported, and the one incident cannot be read for it after the
fact.** No panic hook is installed anywhere (`set_hook`, `take_hook`, `catch_unwind`: zero hits
under `src-tauri/src`). `Cargo.toml` has no `[profile.release]`, so the default `panic = "unwind"`
holds — which is what keeps the hypothesis alive: under `abort` the app would have crashed in front
of the Navigator instead of sitting for forty-five minutes. The default hook writes to stderr; there
is no logging plugin; and a Finder-launched bundle's stderr lands nowhere I could find. **A probe was
run and is recorded as inconclusive:** the unified log holds 163,154 lines from the process in the
incident window and zero containing `panick`, but the only `eprintln!` sites in the binary are three
error paths that never fired, so no control exists proving that Rust's stderr reaches the log at all.
The zero means nothing. The repair must write its own trace, because nothing else will.

**2. Hypothesis B is confirmed as a second, independent defect.** The registry is a
`std::sync::Mutex` (`pi_process_registry.rs:3`), which poisons. `terminalize_pi_process`
(`main.rs:7768`) does `registry.lock().map(…).unwrap_or(false)`: a poisoned lock is reported as
*"not the first to terminalize"*. Every caller then does exactly what it does for a duplicate —
nothing. `fail_pi_process_before_completion` (`:7778`) skips the `Error` emit, the journal
adoption and the `Done`; the normal completion path (`:8213`) skips the error emit and, through
`first_terminal && mirror_mediated` at `:8225`, the whole settlement. The two in-loop reads at
`:8142` and `:8178` degrade a poisoned lock to *"not cancelled"* via `.ok()…unwrap_or(false)`. So
once poisoned, **every subsequent turn in that process ends in silence** by construction — not as a
possibility. Whether the 2026-10-11 incident was A or B remains unestablished; both are now defects
regardless.

**3. Repair shape: `catch_unwind` around the body, with the unwind path on a normal stack.** The
three options differ in what they can do and when. Retaining the `JoinHandle` needs a second thread
to observe the first, doubling the thing being repaired. A panic hook runs *during* unwinding,
process-wide, and has no access to the turn's authority — it can say *something panicked* and no
more. `catch_unwind(AssertUnwindSafe(body))` returns after the unwind has finished, on the same
thread, with every captured handle still in scope: it can terminalize, adopt a terminal journal
record, and emit `Error` then `Done` exactly as every explicit failure path already does. **The hook
is still worth having, narrowly**, as the durable trace of last resort for the case where even the
unwind path cannot run. It cannot name the turn from the thread name — `worker_name` is
`nautilus-pi-{journey_id}` (`:4194`), the Journey only, and widening it runs into the 63-byte
pthread name limit on macOS, which truncates silently. A thread-local `RunTarget` set at the top of
`run_pi_process` and read by the hook names the turn without touching the thread name.

**What the unwind path may honestly claim** is the hard part, and it is bounded by truth and by
CR145's boundary. The child may be alive when the loop dies. Reporting `process_died` for a live
process would be a lie; killing it would be a mutation this CR has no authority for; and a new
`TerminalState` variant touches **8 files and 29 sites across both languages** (`piInvocationOccupancy.ts`,
`turnJournal.ts`, `durableSynchronizationStatus.ts`, `journeyConversation.ts`,
`persistedJourneyConversation.ts`, `pi_process_registry.rs`, `main.rs`, `turn_journal.rs`) — a
disproportionate contract widening for a path nobody has seen twice. So the unwind path measures
first: if `try_wait` says the child has exited, it terminalizes as `process_died` with the panic
payload in the evidence and adopts the journal — true, and complete. If the child is alive, it
emits the `Error` naming the panic, writes the durable trace, and **leaves the lease and the handle
in place on purpose** so that CR145's liveness measurement offers the release the moment the child
exits. That is the honest narrow option the investigation anticipated.

**4. It can be characterised by injection, in a new module, without a reproduction.**
`run_pi_process` takes an `AppHandle` and cannot be called from a test. The `catch_unwind` wrapper
therefore lives in a new generic module with no Tauri types — body in, unwind report out — and is
tested by a closure that panics on purpose, asserting the report carries the payload and that a
body which returns normally produces no report. The poisoned-lock half is characterised in
`pi_process_registry.rs`'s own tests by poisoning a mutex (a thread that panics while holding it)
and asserting the mapping names `RegistryUnavailable` rather than `NotFirst`. **A test that panics on
purpose prints one panic line to stderr under `cargo test` and still passes;** the line is named in
the test rather than suppressed, because a process-global silent hook installed from a test races
every other test in the binary. If that noise ever confuses someone, a hook that filters one known
payload is the fallback, and it is deliberately not the first choice.

**5. Not subsumed — they share a cause, not a mechanism.** The dispatcher's quarantine
(`piProcessEventDispatcher.ts:41`, `:238`) is an in-memory list of events that *arrived* and were
rejected by renderer-side validation. CR147 is a native thread dying so that events *never arrive*.
Both are silences in a console-less release build, and the durable trace this CR adds on the native
side is a sink the quarantine could later write to — but routing it there is a renderer change with
its own acceptance and stays a separate capture.

**A related swallow, noted and not folded in:** the reader threads' handles are joined with
`let _ = handle.join()`, so a panic in the stdout or stderr reader is also swallowed. It does not
strand the turn — the loop continues and terminalizes — so it is a lesser silence and is left out.

## Plan

**Three slices, in this order.** B is repaired first because A's unwind path calls terminalize and
must not itself be silent under a poisoned lock; the hook comes last because it is the trace of last
resort and depends on neither.

**Slice 1 — make a poisoned registry legible at terminalization.**
- `src-tauri/src/pi_process_registry.rs`: a `TerminalizeAttempt { First, NotFirst, RegistryUnavailable }`
  and a pure mapping from `Result<MutexGuard, PoisonError>` to it, tested by poisoning.
- `src-tauri/src/main.rs`: `terminalize_pi_process` returns `TerminalizeAttempt`. Its two callers
  (`fail_pi_process_before_completion` `:7778`, the completion path `:8213`) treat
  `RegistryUnavailable` as *first* for the purpose of emitting `Error` (naming the poisoned
  registry), adopting the journal (file-based, independent of the lock) and emitting `Done`. The
  `NotFirst` branch is byte-identical to today's `false` branch — pinned by the diff showing no
  change there.

**Slice 2 — catch the unwind and terminalize from a normal stack.**
- New `src-tauri/src/run_loop_guard.rs`: `UnwindReport { payload: String, thread: Option<String> }`
  and `guard_run_loop<R>(body, on_unwind) -> Option<R>` built on
  `catch_unwind(AssertUnwindSafe(..))`, with payload extraction for `&str` and `String` panics and
  a fallback for other payloads. Tests: injected panic reports its payload; normal return reports
  nothing; the body's return value passes through.
- `main.rs`: the existing `run_pi_process` is renamed `run_pi_process_unguarded` with a
  **whitespace-only diff** — *needing to change its body is the signal to stop.* A new
  `run_pi_process` of the same signature wraps it and, on unwind, runs
  `fail_pi_process_after_unwind`: measure the child via the registry handle; exited → terminalize
  `ProcessDied`, evidence carrying `run loop panicked: {payload}`, adopt journal, emit `Error` and
  `Done`; alive → emit `Error`, leave lease and handle for CR145, write the trace. The spawn at
  `:4218` does not change.

**Slice 3 — the trace of last resort.**
- `main.rs` `fn main()` (`:9910`): a panic hook that chains to the previous hook and appends one
  JSON line `{ at, thread, journeyId?, runId?, payload, location }` to `native-panics.jsonl` under
  the app data directory, resolved once at startup. A thread-local `Option<RunTarget>` set at the
  top of `run_pi_process` and cleared on every exit, including the unwind path, is what lets the
  hook name the turn. **The hook never panics and never blocks**: a failed write is dropped.
  The file is append-only; rotation is excluded.

**Acceptance, as written, with one recommended amendment.** Line 2 — *"a panic on that path does
not leave a turn stranded in `running` with a live lease"* — cannot be met truthfully when the
child is still alive, and meeting it by killing or by mislabelling would be worse than the defect.
**Recommended replacement, a Workbench decision:** *"a panic on that path does not leave a turn
stranded **silently**: the renderer is told, the journal is terminalized when the child has exited,
and the lease is left for CR145 to release when it has not."* Lines 1, 3 and 4 stand as written.

**Validation.** `tsc --noEmit` clean; vitest **unchanged at 257 files / 2,033 tests** because no
TypeScript file changes (a non-zero TS diff is a scope signal); `cargo test` from 286 to 286 + the
new tests; `npm run tauri:build:dev` clean; native diff reviewed slice by slice, with the
`run_pi_process_unguarded` rename verified whitespace-only by `git diff -w`. **Field verification
is the negative half only, by construction:** one healthy Dev turn after install — journal +1
`settled`, timings +1, no `native-panics.jsonl` created, settlement phases all completed — in the
same shape as CR145's joint negative check. The positive half is provoked by test, and the field
cannot provoke it, which the closure will say rather than round up.

**Exclusions.** No new `TerminalState` variant and no TypeScript contract change. No kill of a
live child. No renderer surface for `native-panics.jsonl` and no rotation of it. The reader threads'
swallowed join stays as noted. The hung-but-live Pi stays out, as CR145 refused it. The dispatcher
quarantine stays its own capture. Admission, occupancy, the share and CR145's reap do not change.

## Delivered (2026-10-12)

Three slices, in the planned order, each with its own commit and its own control runs.

| Slice | Commit | What it removed |
|---|---|---|
| 1 | `3017bc9` | A poisoned registry reported as a duplicate, so every later turn ended in silence |
| 2 | `6f6679f` | A run-loop panic unwinding a thread nothing observes |
| 3 | `157a610` | A panic leaving no durable trace that names its turn |

**Slice 1.** `TerminalizeAttempt { First, NotFirst, RegistryUnavailable }` and a pure
`terminalize_attempt` mapping a lock result to it, generic over the guard and the lock error so it
is characterised against a really poisoned `Mutex` — a thread panics while holding the lock — rather
than against a stand-in. `RegistryUnavailable` proceeds to terminal work, and the justification was
verified rather than assumed: `adopt_terminal_journal` returns `Ok(())` when the record is already
terminal with the same outcome and `turn_journal_terminal_conflict` otherwise, so proceeding where
another thread already finished is a no-op rather than a double write. Both callers now emit an
`Error` naming the unreadable registry and its possibly-retained lease. The same one-line silence in
`reserve_then_start`'s spawn-failure path was fixed through the same helper, keeping its `bool` field
rather than widening the error enum.

**Slice 2.** `run_loop_guard.rs`, Tauri-free, holding `guard_run_loop` on
`catch_unwind(AssertUnwindSafe(..))` with a bounded payload description.
`run_pi_process_unguarded` is the old body and **the diff proves it rather than asserting it**:
`main.rs` removes exactly two lines in that slice, both imports, and everything else is a pure
insertion hunk. `unwind_disposition` is a pure mapping from a measured child to what may truthfully
be done, and the measurement and the terminalization happen under one registry lock, per CR145's
rule.

**Slice 3.** `native_panic_trace.rs` with a pure record renderer, a thread-local turn context, and a
chained hook appending to `native-panics.jsonl` in the app data directory. Installed after the
channel validates that the directory belongs to this app, so a trace cannot be written into another
channel's directory.

### What the unwind path may claim, and what it refuses to

| Measurement | What it does |
|---|---|
| Child exited | Terminalizes `process_died`, adopts the journal, emits `Error` then `Done` |
| Child running | Reports and **leaves the lease and handle**, for CR145's release once the OS says the process is gone |
| Already handed back | Reports the panic; nothing is owed |
| Unmeasurable, or registry unreadable | Reports that nothing could be established, and claims nothing about a lease |

**The panic's text is deliberately not written into the journal's `provider_failure`.** The renderer
presents that field as the terminal cause and the field's own comment reserves it for the provider's
error-shaped output. A panic here is this application's failure, not Pi's, and attributing it to Pi
on the Navigator's screen would be worse than saying less. The panic travels in the emitted `Error`
live and in `native-panics.jsonl` durably.

### Acceptance

| Line | How it was established |
|---|---|
| A run-loop thread that ends without terminalizing leaves a durable trace that names the turn | `native-panics.jsonl`, with the turn carried by a thread-local because the hook cannot be given an argument. Pinned by test and by a wiring guard |
| ~~A panic on that path does not leave a turn stranded in `running` with a live lease~~ **→ replaced, see below** | — |
| **A panic on that path does not leave a turn stranded *silently*: the renderer is told, the journal is terminalized when the child has exited, and the lease is left for CR145 to release when it has not** | `unwind_disposition` and its four tests; the wiring guard asserting the unwind path measures, never kills, and never invents provider evidence |
| Nothing changes about how a healthy turn terminalizes, settles or emits | `run_pi_process_unguarded` byte-identical by a pure-insertion diff; `NotFirst` behaviour unchanged; 2,033 TypeScript tests and 3 ignored cargo tests unchanged |
| The repair does not depend on reproducing the original 2026-10-11 failure | Every behaviour is provoked by an injected panic or a poisoned mutex. Nothing waits on a recurrence |

**The second line was replaced with the Navigator's approval**, because it could not be met
truthfully: when the child is still executing, reporting `process_died` is a lie and killing it is a
mutation this CR has no authority for. Retained struck through rather than deleted.

### Validation

`tsc --noEmit` exit 0; vitest **257 files / 2,033 tests, unchanged**; `cargo test` **286 → 314
passed, 3 ignored unchanged**; `npm run tauri:build:dev` clean; **TypeScript diff zero for the whole
CR**, as the plan predicted.

**Sixteen control runs**, each confirming a specific guard can fail: slice 1 four, slice 2 seven,
slice 3 five. The one that matters most is the exact regression shape — the spawn site calling
`run_pi_process_unguarded` directly — which the wiring guard caught.

**Three mistakes of mine in the controls are recorded rather than tidied away.** One control
initially passed when it should have failed, because my test filter did not match the test's name;
it failed correctly once filtered. Two others produced no output at all because my sabotage did not
compile, so they tested the compiler instead of the guard, and were redone in a form that compiles
and violates. **A control that does not compile is not a control**, and the same silence it was
meant to detect is what hid it from me.

### Limits, stated rather than assumed

- **The 2026-10-11 incident is still not attributed to A or B.** Both are now defects and both are
  repaired, but which one happened is unestablished, and the discriminator still needs a recurrence.
  What changed is that a recurrence will now leave a record.
- **`run_pi_process` cannot be called from a test**, so the wiring is pinned against the source
  rather than executed. The catching, the disposition and the record shape are all executed.
- **`native-panics.jsonl` has no renderer and no rotation**, both excluded on purpose. Each record
  is bounded, so one panic cannot write unboundedly, but a loop of panics would still accumulate.
- **The positive half is not field-verifiable.** A panic cannot be staged in the field on demand, so
  the field check is the negative half only — a healthy turn still settling and no trace file
  appearing.
