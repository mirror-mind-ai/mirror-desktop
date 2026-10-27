[< RS025](index.md)

# CR163: A Hung Mirror Append Freezes Every Exit

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/cr163-bound-the-mirror-append`

## Friction

Field occurrence on 2026-10-22, production `v0.2.0-alpha.55`, Journey `mirror-desktop`, main
thread. A turn's answer was committed by the provider at 13:35:16Z and the application then showed
*Finishing* until the Navigator quit it at ≈13:46:18Z — eleven minutes. Their report, typed into a
sibling Conversation because the main one had become unreachable:

> *"o Try again nao funcionou e o reset não estava habilitado para eu reiniciar. A conversa
> principal da journey não está mais acessível pra mim. Fiquei bloqueado sem poder usar o journey
> novamente."*

## What Happened, Established From the Artefacts

Run `agent-run-2026-10-22T13:34:35.721Z`:

| time (UTC) | fact | evidence |
|---|---|---|
| 13:34:35 | turn admitted | journal `createdAt` |
| 13:35:16 | provider committed the answer | `piExecution.committedAt` |
| ≈13:35:19 | inline settlement reached `outbox_enqueued` | the settle receipt expected exactly that phase |
| 13:35:20 → 13:46:15 | **nothing** — no surviving write anywhere in app data | mtime sweep of the data directory |
| ≈13:46:18 | Navigator quits and relaunches | process start time |
| 13:46:26–33 | recovery settles the turn in 6,246 ms via `pi_backed_outbox` | CR129's first field record |

The inline attempt got **past** `cleanup_lease` and `notify_lease_released` — the recovery record
has no lease phases because there was no lease left to clean — and the outbox item existed, because
recovery's `deliver_outbox` delivered it. So the hang was inside the next inline step:
**`deliver_outbox_item`, the Mirror append, which ran for eleven minutes without returning and
without throwing.** No settlement-timing record was written for the inline attempt — the freeze
precedes the write by construction — and the recovery-skips file is unchanged at 14 records.

## The Defect

Three facts compose it, each individually reasonable:

1. **The append has no bound.** `run_explicit_mirror_append` spawns
   `uv run python -m memory conversations append …` and waits on the child with no timeout. The
   child's stderr is discarded, so a hang leaves no trace of its cause.
2. **The deliver holds the global lock while it waits.** `deliver_pi_backed_mirror_outbox_item`
   acquires the native command serialization mutex — CR149's explicit restoration of the main
   thread's accidental serialisation — as its first statement, and holds it across that unbounded
   wait.
3. **71 commands acquire the same mutex**, including loading a thread, loading a Conversation,
   reading the journal, inspecting the session leaf, inspecting occupancy, and saving drafts.

So one hung append queues the application's entire native data layer behind it. That is every
symptom the Navigator reported: the main Conversation could not load (its load is serialized), a
sibling Conversation could not work either, *Reset session controls* was disabled
(`isFinalizingTurn` never clears because the settlement's `await` never returns), and whatever
button they pressed dispatched work into the same queue and did nothing.

## Why CR161's Exits Could Not Help — Measured

The derivations themselves are correct for this state. Fed today's reconstructed inputs through the
real functions:

| probe | result |
|---|---|
| `deriveStrandedTurn`, frozen record present in renderer state | `stranded: true`, shape `journal_terminal` |
| `deriveStrandedTurn`, record absent from renderer state | `no_record` |
| `settlementAbandonmentOffer`, lease released, 71 s in | `offered: true` |
| `settlementAbandonmentPresentation`, stale active lease, 71 s in | `refusal_named`, the CR155 sentence |

The starvation is upstream of them. The poll that would refresh the journal into renderer state and
advance the stranded clock calls `loadTurnJournal` — a serialized native command, queued behind the
hung deliver — and its `catch` is deliberately quiet. The leaf inspection is serialized too. So the
predicates were evaluated against frozen inputs, and even where a notice could render from
renderer-side state alone (the abandonment offer needs only the finishing clock and the last known
occupancy), **every act it offers routes through the same mutex**. An exit that renders is not an
exit when its act joins the queue that is the defect.

## What Cannot Be Established

- **Why the append hung.** The child's stderr goes to null and nothing captures its stdout until it
  exits. Provider timeouts occurred in the same window (13:21–13:24), so degraded network is
  plausible context — `uv run` can touch the network — but that is context, not proof. The same
  item delivered in 1,659 ms at recovery.
- **Which notices rendered.** Nothing durable records what was on screen. This is the third
  occurrence where that absence blocks a verdict; the debt is no longer incidental.
- **What "Try again" the Navigator pressed.** No notice in this state carries that label; the
  candidates are settings-area buttons or loose phrasing. Unknown referent, recorded as such.

## Boundaries

- Not CR155's case: the lease was already released; `measure_child_liveness` has nothing to add here.
- Not CR161 reopened: its unification behaved correctly on its own inputs; the inputs were starved.
  Its falsifier remains unscorable for this occurrence and that is recorded there.
- Not CR142's lost `done`: the `done` arrived and settlement ran; it is the settlement itself that hung.

## Candidate Direction (not scope — capture only)

A bound on the append child wait, with the timeout surfacing as an ordinary deliver failure — the
`mirrorCommitError` path already draws a *Repair synchronization* button and recovery already
completes this exact delivery. Preserving CR149's serialisation semantics is a constraint, not a
casualty: the bound belongs on the child, not on the mutex. Capturing stderr within a size bound
would let the next hang name its cause.

## Provenance

Production app data read on 2026-10-22, read-only. Journal, settlement timings, recovery skips,
outbox and preferences inspected directly; mtime sweep over the data directory for the freeze
window. `run_explicit_mirror_append`, `deliver_pi_backed_mirror_outbox_item`,
`native_command_serialization.rs`, the stranded poll and both derivations read from source at
`cb85f47`. Probes ran the real derivations and were removed; nothing was committed with them and
nothing was written to production state.

## Planned 2026-10-27

Selected by the Navigator ("siga para o próximo passo", after the alpha.56 upgrade). Driver and
Delivery are not yet named; **nothing is implemented**. Three facts measured today shape the scope,
and the third changes the design.

### 1. The bound has field data behind it

Every inline settlement in production records `deliver_outbox_item`. Over **1,141 completed
deliveries** in 20 Journeys: p50 1,765 ms · p90 2,508 ms · p99 6,134 ms · p99.9 10,128 ms · **max
10,692 ms**. Eighteen exceeded 5 s, three exceeded 10 s, **none exceeded 20 s**. The hang lasted
eleven minutes. A bound of **30 s** sits roughly three times above the slowest delivery ever recorded
and twenty-two times below the hang. (A first pass over the ledger returned zero samples, because I
searched the recovery route's phase name `deliver_outbox`; the inline name is `deliver_outbox_item`.
The record was printed before the zero was believed.)

### 2. Killing the child is safe

Mirror's append (`src/memory/storage/messages.py`, read in the production checkout, not modified) runs
the whole batch inside one `BEGIN IMMEDIATE` transaction, and a repeated append classifies each message
as `existing` rather than inserting it again. A child killed mid-write therefore leaves either nothing
or everything, and the next delivery converges to the same receipt. The frontend already classifies an
unknown append reason as `transient` (`src/domain/mirrorAppendRejection.ts`), so outbox recovery
retries a timed-out delivery without any change to that classification.

### 3. Killing the child is not enough — measured

`uv run` launches `python` as a **grandchild**. A probe with the production `uv` (0.11.12) spawned
`uv run python -c "sleep 60"`, sent `SIGKILL` to `uv` alone, and found **the python grandchild still
alive** afterwards. The same probe with the child in its own session and the signal sent to the
group left nothing alive.

This matters twice. A surviving python keeps the stdout pipe open, so a reader waiting for EOF would
block — **reproducing the hang one level down**. And it may still hold Mirror's SQLite write lock, so
the retry would queue behind it. The voice-transcription path already has a bounded wait
(`voice_transcription.rs`), and copying it would have looked correct: it kills only the direct child,
which is right there because whisper is launched directly, and wrong here.

### Scope

1. **A bounded child runner** (new `src-tauri/src/bounded_child.rs`). It spawns the command in its own
   process group, writes stdin, drains stdout and stderr on reader threads with byte caps, and polls
   `try_wait` against a deadline. On the deadline it kills the **group**, reaps the child, and waits
   for the readers only for a short, bounded grace. It never waits unbounded for anything.
2. **`run_explicit_mirror_append` uses it**, with `MIRROR_APPEND_TIMEOUT = 30 s`. A timeout returns
   `mirror_append_timed_out`. The existing receipt validation, stdout cap (65,536 bytes), reason
   sanitising, legacy-timestamp retry and binding repair are unchanged.
3. **The cause is recorded.** On a timeout or a non-zero exit, a bounded stderr tail (4 KiB) is written
   as one record to `mirror-append-failures.jsonl` in app data, together with the reason, the elapsed
   time and the item, Journey and Conversation ids. The record never contains message content. The
   file keeps its newest 200 records, so idle-pass retries of a persistent failure cannot grow it
   without bound. The write is best-effort and never changes the result.
4. **The timeout reads as itself.** `describeMirrorAppendRejection` gains a plain sentence for
   `mirror_append_timed_out`: Mirror did not answer in time, the turn is saved locally, and delivery
   will be tried again. Its class stays `transient`, and a guard pins that.

### Files

- `src-tauri/src/bounded_child.rs` (new) and its `mod` line in `main.rs`
- `src-tauri/src/main.rs`: `run_explicit_mirror_append` and the failure-record writer
- `src-tauri/Cargo.toml` and `Cargo.lock`: `libc` as a direct dependency for `killpg`. It is already in
  the tree at 0.2.189, so nothing new is downloaded or built.
- `src/domain/mirrorAppendRejection.ts`
- Tests: Rust tests in `bounded_child.rs` and `main.rs`; `src/tests/cr163AppendTimeout.test.ts`

### Acceptance

- A child that never exits returns `mirror_append_timed_out` within the timeout plus a bounded grace.
- **No process of the group survives a timeout, including a grandchild.** This is tested with a real
  `sh` that backgrounds a `sleep` grandchild, and then checks that the grandchild's pid is gone. It
  is the probe above, turned into a guard.
- A timed-out append does not hold the native serialisation mutex: `acquire()` succeeds immediately
  afterwards. The mutex itself is untouched (CR149).
- A child that floods stdout past the cap is refused as `mirror_append_invalid_receipt`, as today. A
  child that floods stderr cannot block on a full pipe.
- Successful appends are unaffected; no failure record is written on success.
- A failure record holds the stderr tail and the ids. The file is capped at 200 records. A failed
  write leaves the delivery result unchanged.
- `mirror_append_timed_out` is `transient` and has a description.

### Validation

TDD, red first. Rust tests use real processes with an injected short deadline; no fake clock stands in
for a child that will not exit. Gates: vitest, tsc, build, cargo test, roadmap. No manual provocation on
Dev: the hang has an unknown cause and cannot be produced on demand, and simulating it with `sleep`
is exactly what the Rust tests already do.

### Field check

**Passive and continuous**, because the hang cannot be provoked. From the release onward, no
`deliver_outbox_item` phase may exceed roughly 62 s: two bounded attempts, for the legacy-timestamp
retry, plus overhead. The ledger records every settlement, so this is checked against every turn,
not only against the next hang. **What refutes it:** a longer `deliver_outbox_item`, or a *Finishing*
over two minutes with a delivery in flight. **What the next hang will add:** a record in
`mirror-append-failures.jsonl` naming its cause, which this CR cannot know.

### Exclusions

- **The CR149 mutex is not changed.** The bound belongs on the child.
- **Three other unbounded child waits are named and left alone:**
  - the conversation-catalog `rebind-journey` call, inside this same delivery, but only on
    `journey_mismatch`;
  - `journey mutate`;
  - native Pi session provisioning.

  The first means the worst case on the rare repair path is still unbounded. That is recorded, not
  hidden.
- **Why the append hung is not diagnosed here.** The failure record is how the next occurrence will say
  so.
- **No durable record of which notice rendered.** That debt blocks CR155's and CR161's verdicts, and it
  is separate work.
- **No change to the Python side, to retry policy or to outbox recovery.**

## Implemented 2026-10-27

Navigator authorised the build ("vai"). Driver @alissonvale, Delivery `refinement/cr163-bound-the-mirror-append`. Built red-first. Not yet
integrated or released.

### What was built

- **`src-tauri/src/bounded_child.rs`** — `run_bounded(command, stdin, limits)`. It puts the child in its
  own process group and serves stdin, stdout and stderr each from its own thread. stdout is capped and
  drained past the cap; stderr keeps a rolling tail. One deadline, measured from spawn, covers both the
  child's exit **and** the end of its stdout and stderr. On the deadline it runs `killpg(SIGKILL)` and
  reaps within a grace, waiting for nothing beyond that.
- **`run_explicit_mirror_append`** now builds the `uv` command and hands it to
  `run_explicit_mirror_append_using(item, command, timeout, failures_path)`, which runs it through
  `run_bounded` with `MIRROR_APPEND_TIMEOUT = 30 s` and a 2 s kill grace. The request bytes, the 256 KiB
  request cap, the 64 KiB receipt cap, reason sanitising, receipt validation, the legacy-timestamp retry
  and the binding repair are unchanged. A test asserts the request the child receives is identical to
  the old one.
- **`mirror-append-failures.jsonl`**, next to the outbox. On a timeout or a non-zero exit it records the
  reason, `timedOut`, `exitCode`, `elapsedMs`, a 4 KiB `stderrTail`, and the item, run, Journey,
  Conversation and generation ids. It keeps the newest 200 records. The write is best-effort, and it
  uses the same staged-rename pattern as the CR087 and CR095 records beside it.
- **`describeMirrorAppendRejection`** names `mirror_append_timed_out`, and its class stays `transient`.
  A test ties the sentence's "30 seconds" to the Rust constant, so the two cannot drift apart.

### Two more unbounded waits, found while building and not in the plan

The plan bounded the child's exit. The code had two other places where it could wait forever, inside
the same function, and either would have reproduced the hang behind a correct-looking timeout:

1. **The stdin write.** The request can be up to 256 KiB and a pipe buffer holds about 64 KiB. The old
   code called `write_all` on the calling thread before waiting. A child that stalls before reading
   its input would block that write indefinitely, so a deadline placed after it would never be
   reached. stdin is now written on its own thread. Once the group is killed, the write fails with
   `EPIPE` and the thread ends.
2. **EOF on stdout after the child exits.** Anything left behind in the group keeps the pipe open.
   The deadline therefore covers the readers as well as the exit. A test has `sh` exit while a
   background `sleep` holds stdout, and asserts that the runner returns within the bound and that the
   `sleep` is gone.

### Evidence that the group kill is load-bearing

The plan called the probe a future guard. It is now three tests, run on real processes:

- **A control** spawns a script whose grandchild records its pid, kills only the direct child, and
  asserts that the grandchild is **still alive**. This proves the liveness instrument can see a
  survivor.
- **Two guards** assert that no grandchild survives a timeout. One covers a child that hangs; the
  other covers a child that exits while its grandchild holds stdout.
- **A mutation run.** With `process_group(0)` and `killpg` removed, exactly those two guards fail and
  the other eight pass. Restored, all ten pass. The mutation run left one `sleep 60` orphan, started
  at the mutant run's timestamp; three restored runs left none.

### Acceptance, as tested

| Acceptance | Test |
|---|---|
| hung child → `mirror_append_timed_out` within timeout + grace | `a_hung_append_returns_timed_out_…` |
| no process of the group survives, grandchild included | `a_timeout_kills_the_whole_group_…`, `a_grandchild_holding_stdout_…`, and the control |
| a hung append releases the serialisation guard within the bound | `a_hung_append_releases_the_serialisation_guard_within_the_bound`. A thread holds the real guard while the append hangs, and the next `acquire()` is timed |
| stdout flood refused as before · stderr flood cannot block | `an_oversized_receipt_is_still_refused_as_invalid`, `a_stdout_flood_…`, `a_stderr_flood_…` |
| success unchanged, nothing recorded | `a_successful_append_is_unchanged_and_records_nothing`, `the_child_receives_the_same_request_as_before` |
| record holds the stderr tail and ids, never message content | asserted on the raw file: neither message's words appear |
| capped at 200 · unwritable record leaves the result unchanged | `the_failure_record_keeps_only_its_newest_two_hundred`, `a_failure_record_that_cannot_be_written_…` |
| `mirror_append_timed_out` is transient and described | `src/tests/cr163AppendTimeout.test.ts`, 6 tests |
| the append path has no `wait_with_output`, `.output()`, `.spawn()` or `Stdio::null` | source guard, comments stripped |
| exactly the two named `wait_with_output` exclusions remain, and the rebind path still uses `.output()` | census guard, size asserted |

Gates: vitest **273 files / 2,269 tests**; cargo **354 passed / 3 ignored**; tsc, build and roadmap
clean. The baseline was 272 / 2,263 and 332 / 3, so this adds 22 Rust tests and 6 TypeScript tests.

### Corrections to the plan

- **The field-check bound is about 65 s, not 62 s.** The legacy retry fires only after
  `idempotency_conflict`, which comes back from a child that answered, so two timeouts cannot happen
  back to back. Each attempt is still bounded by 30 s plus the 2 s grace plus the readers' settle
  time, so the worst case for two attempts is about 64 s.
- **A long `deliver_outbox_item` does not, on its own, refute this CR.** That phase is timed in the
  frontend around `invoke`, so it includes the time spent **queued for the serialisation guard**
  behind other native commands. Those include the excluded unbounded waits. A breach therefore has
  to be read alongside `mirror-append-failures.jsonl`:
  - a long phase with a `timedOut` record near 30 s is the bound working;
  - a long phase with no record is queueing somewhere else, and is evidence about the exclusions;
  - **an append child that ran past about 32 s is a refutation.** A future record with
    `elapsedMs` far above 32,000 would show that.
- **What "never message content" means is narrower than it sounds.** This code never writes message
  fields. The stderr tail is Mirror's own diagnostic output, and a test can only prove that a given
  child did not echo the messages, not that Mirror never will. The tail is capped at 4 KiB, and the
  file stays on this machine.
- **Every non-zero exit is recorded, contract rejections included.** `journey_mismatch` before a
  rebind and `idempotency_conflict` before the legacy retry both write a record. That is deliberate,
  because it is the context the next diagnosis will need, and the 200-record cap bounds it.
