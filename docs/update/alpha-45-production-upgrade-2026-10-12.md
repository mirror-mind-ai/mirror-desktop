[< Update](../index.md)

# Production Upgrade — v0.2.0-alpha.45

**Date:** 2026-10-12

Upgraded by the Navigator. Verified read-only, by hash, after the app had been running for a while
rather than immediately after its restart.

| | |
|---|---|
| Declared version | `0.2.0-alpha.45` |
| Binary SHA-256 | `45b9add572921ef88978e38c925237c7f3a23696a664d943393b9b8eb3f102a3` |
| Previous (alpha.44) | `04226103…` — **differs**, so the bundle really was replaced |
| Process | pid 28603, started 2026-10-12 07:26:05 local |

The declared version alone would not have proved this: both channels report the same
`CFBundleShortVersionString`, and a failed upgrade can leave a correct-looking plist. The hash is
the evidence. It also differs from the CR145 Dev bundle (`714da8b4…`), as it must — the release
pipeline built this one from the tagged tree.

## A flagged risk that is not a risk — corrected

I reported after the field check that *journal capacity is near its ceiling: 3 free slots of 64*,
and framed it as an operational constraint. **Reading `can_prune_retained_record` shows it is not
one.** `Settled | Interrupted | OutboxEnqueued` return `true` unconditionally — the
`UnfinishedPruning` policy is consulted **only** for `Admitted | Running`. All 61 records are
`settled` (51) or `interrupted` (10), so the 62nd turn prunes the oldest terminal record normally
and the count simply stops at 64.

The ceiling only bites when records are *unfinished*, which is precisely the state CR145 now makes
recoverable. So **alpha.45 removed this risk as a side effect**, and the manual reclamation of
2026-10-11 should be the last one this class requires. The pressure was never the cap; it was three
immortal records sitting under it.

## A sharp hypothesis for CR145's root cause, recorded while it is fresh

CR145 made the consequence recoverable and explicitly did not explain the cause. The cause now has
a precise candidate, found by reading how the run loop is hosted.

Everything that owns terminalization — the `try_wait` loop at `main.rs:8058`, the attach, the
failure paths — runs inside a bare **`thread::spawn(move || { … })` at `main.rs:8014`**. No
`JoinHandle` is retained and nothing joins it.

**A panic anywhere in that closure unwinds the thread and dies in total silence.** The explicit
early returns are all covered — each calls `fail_pi_process_before_completion`, which terminalizes
before emitting. A panic is covered by nothing. The observed incident is exactly what that would
produce: the child reaped by the OS as the thread died, the journal frozen at `running` rev 2 with
no terminal evidence, no settlement record, and the registry still holding the lease the dead thread
was supposed to release. In a release build there is no console, so nothing anywhere would have said
so.

This is testable without reproducing the original defect: a panic injected into that closure should
leave exactly the stranded shape, and the repair shape is to make a run-loop thread that stops
without terminalizing **observable** rather than silent.

**Recommended as its own capture** rather than created unilaterally, since a numbered row changes
the census.
