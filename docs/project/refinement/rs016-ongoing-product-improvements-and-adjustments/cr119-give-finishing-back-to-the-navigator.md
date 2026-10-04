[< RS016](index.md)

# CR119: Give Finishing Back to the Navigator

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Navigator reported that `Finishing` was stuck during a live session on `v0.2.0-alpha.33`,
Journey `mirror-desktop`. It was not stuck. It lasted **315 seconds** and then settled correctly.

That distinction matters less than it sounds. For five minutes the turn read `Finishing`, sending was
blocked, and the only honest conclusion available to the reader was that the application had hung
again. A state that is indistinguishable from the CR116 strand, for minutes at a time, is a product
problem whether or not it eventually resolves.

## Evidence

Read-only inspection of `ai.mirrormind.desktop` while the application was **running**. Measured as
the interval between `terminalEvidence.capturedAt`, when the turn's work ended, and `updatedAt`, when
the journal record reached `settled` — which is exactly the window the reader spends looking at
`Finishing`.

**The reported turn.** `agent-run-2026-10-04T17:26:59.293Z`: work ended `17:35:37.660Z`, settled
`17:40:52`, so **315.3 s** in `Finishing`. Final state `settled` / `completed` at revision 5, the same
revision every healthy record carries, so nothing was retried at the journal level. The outbox is
empty and no settlement error was recorded.

**It is chronic, not an incident.** Across the 38 settled records in this Journey's journal that
carry both timestamps:

| | |
|---|---|
| median | 55.2 s |
| mean | 198.1 s |
| maximum | **1,812.5 s** (30 minutes) |
| over 120 s | **15 of 38** |

Slowest windows: `2026-10-03T18:13:08` at 1,812.5 s, `2026-10-03T20:56:42` at 1,150.0 s,
`2026-10-03T21:40:01` at 540.4 s, `2026-10-02T21:26:42` at 468.6 s.

**Almost all of that history is pre-upgrade.** This store ran `alpha.30` until `17:26` UTC today, so
every record above except the reported one predates CR113, CR114 and CR116. The reported turn is
**the only completed turn on `alpha.33` so far**, which means there is exactly one post-upgrade data
point and no basis yet for claiming the newer releases improved it.

**That one data point carries a one-time cost.** It is the first turn after the upgrade, and it is
also the turn in which the durable projection's message array was rewritten from 2,203 entries to 54.
Whether 315 s is the steady state or a migration artefact is **not established**, and the next
completed turn is the first honest measurement.

## Diagnosis

**This is not a CR116 regression.** CR116 bounds each per-Journey persistence and finalization
operation at 120 s, applied inside `journeyPersistenceCoordinator` and `turnFinalizationCoordinator`.
The bound is per operation, not per turn, so a settlement composed of several operations can exceed
120 s in total without any of them breaching it. The module says so in its own words:

> A generous ceiling. A real Journey writes multi-megabyte projections and inspects a 55 MB session,
> so this exists to catch a wait that will never end, **not to police slowness**. A bound that fired
> on ordinary work would be a worse defect than the strand it replaces.

So the behaviour observed is the behaviour CR116 deliberately left in place. It fixed the strand and
declined, on purpose and with a stated reason, to address duration. CR119 is that declined half.

**The cause of the duration is not established.** Candidates worth separating before anything is
built: the native session inspection, which reads the whole Pi session — 60 MB and 9,034 entries in
this Journey today; durable projection writes; Segment publication, which republishes projections and
rewrites the completion receipt; and Mirror append. Nothing currently records per-phase timing, which
is why no candidate can be ranked. **Establishing which phase consumes the time is the first slice,
not a fix.**

## Expected Behavior

Either `Finishing` completes in a time a reader can wait through, or the surface tells the truth about
what it is doing and stops looking identical to a hang. A reader should be able to tell "this is
working, here is what it is doing" from "this will never finish", without reading the journal.

## Proposed Scope

Deliberately not a plan. Candidate directions, to be narrowed by measurement first:

- Record per-phase settlement timing so duration becomes observable rather than inferred from journal
  timestamps.
- Reconsider whether sending must stay blocked for the whole window, given the answer is already
  committed to the Pi session before `Finishing` begins.
- Name the phase in the surface while it runs, so a long wait is legible rather than mute.
- Only then consider reducing the work itself.

## Exclusions

- No change to the CR116 bound, and no lowering of it to police slowness, which its own note argues
  against.
- No claim that the newer releases improved or worsened duration until more than one post-upgrade
  turn has been measured.
- No change to turn authority, transcript authority or the evidence contract.

## Dependencies

Shares the settlement path with CR116, whose bound stays as it is, and with CR114, which reduced the
working set and may already have reduced this cost in ways not yet measured. Independent of CR118.
