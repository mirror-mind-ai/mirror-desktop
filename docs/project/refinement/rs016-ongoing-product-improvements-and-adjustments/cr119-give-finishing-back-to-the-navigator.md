[< RS016](index.md)

# CR119: Give Finishing Back to the Navigator

**Status:** planned
**Driver:** —
**Delivery:** —

## Problem

The Navigator reported that `Finishing` was stuck during a live session on `v0.2.0-alpha.33`,
Journey `mirror-desktop`, and confirmed on selection that it has happened in other turns and other
sessions in production. It was not stuck. The reported turn lasted **315 seconds** and then settled
correctly, and the wider measurement below shows the Navigator's recollection is right: this recurs.

That distinction matters less than it sounds. For five minutes the turn read `Finishing`, sending was
blocked, and the only honest conclusion available to the reader was that the application had hung
again. A state that is indistinguishable from the CR116 strand, for minutes at a time, is a product
problem whether or not it eventually resolves.

## Evidence

Read-only measurement across **every production Journey**, not only this one, taken while the
application was running. Finishing duration is the interval between
`terminalEvidence.capturedAt`, when the turn's work ends, and `updatedAt`, when the record reaches
`settled` — exactly the window a reader spends watching `Finishing`.

**575 settled records carry both timestamps, and all 575 also carry the Pi session's entry count at
capture.** Six records span 1.4 to 99.7 hours; those were settled by recovery on a later launch
rather than waited through, so they are excluded instead of averaged in. The remaining **569**:

| | |
|---|---|
| median | 3.9 s |
| mean | 84.5 s |
| p90 | 242.1 s |
| maximum | 3,242.3 s |
| over 120 s | **97 of 569 (17%)** |

Most turns settle in seconds. The problem is a long tail that is common enough to meet a reader
regularly.

**It is concentrated, not uniform.** Median Finishing by Journey, where at least three records exist:

| Journey | n | median | max |
|---|---:|---:|---:|
| flip-podcast | 61 | 86.4 s | 49,272 s |
| flip-website | 62 | 53.4 s | 201,726 s |
| **mirror-desktop** | 38 | **49.9 s** | 1,812 s |
| alissonvale-com | 61 | 5.7 s | 5,013 s |
| livro-lideranca-soberana | 62 | 4.4 s | 8,577 s |
| venda-de-livros | 64 | 2.3 s | 92 s |
| amplia-website | 22 | 1.5 s | 2.1 s |

(The maxima above include the recovery-settled records, which is why some exceed the filtered range.)

**Across Journeys it tracks Pi session size, strongly.** Rank correlation **+0.714** (n=569), and
bucketed medians rise monotonically by a factor of about 53:

| session entries | n | median | p90 |
|---|---:|---:|---:|
| 0–500 | 251 | 2.2 s | 5.4 s |
| 500–2,000 | 157 | 4.5 s | 301.9 s |
| 2,000–5,000 | 123 | 27.7 s | 464.7 s |
| 5,000–9,000 | 34 | 49.9 s | 426.9 s |
| 9,000+ | 4 | 117.1 s | 315.3 s |

**But inside one Journey that correlation vanishes entirely.** For `mirror-desktop` generation 4,
where the session grew only from 7,750 to 9,087 entries — near-constant by comparison — Finishing
ranged from **5.2 s to 1,812.5 s** with no relationship to anything recorded:

| within `mirror-desktop` (n=38) | rank correlation |
|---|---:|
| session entry count | **−0.008** |
| turn work duration (`committedAt − startedAt`) | **+0.005** |
| entries the turn itself added | **+0.021** |

Its distribution is wide rather than clustered: 11 turns under 10 s, 7 between 120 s and 300 s, 5
between 300 s and 600 s, 2 above 600 s — in the same Journey, at the same session size.

**So there are two phenomena, not one.** A size-driven floor that separates Journeys, and an
episodic factor that swings a single Journey across three orders of magnitude. Nothing currently
recorded explains the second.

## Diagnosis (at planning)

**Four hypotheses were tested against existing data and none survived as an explanation.**

1. *Settlement re-reads the whole Pi session.* **Ruled out by code.**
   `loadDedicatedJourneyConversation`, which `loadActiveSettlementEvidence` calls, explicitly discards
   its session argument — `void session;` — and invokes `load_dedicated_journey_conversation`, which
   reads the stored projection only. The settlement load path does not touch the session file.
2. *Compaction settling triggers the full-session refresh and a republish of every Segment.* **No
   support.** `refresh_conversation_segments` does read the whole session, and it runs only when a
   compaction settles, which made it the strongest episodic candidate. But of 569 Finishing windows,
   **zero** contain a Segment `closedAt` from the same Journey. Weak as a disproof — only 68 close
   events are visible, and `closedAt` is Pi's compaction timestamp rather than the Desktop's publish
   time — but it found nothing.
3. *Session size drives it within a Journey.* **Falsified**: −0.008.
4. *Bigger turns cost more to settle.* **Falsified**: +0.005 against work duration, +0.021 against
   entries added.

What remains for the cross-Journey floor is most likely that session size is a **proxy** for
conversation and projection size, so the cost sits in durable projection writes and Segment
publication volume rather than in reading the session. That is reasoning, not measurement, and it is
labelled as such.

**This is why the first slice measures rather than fixes.** Four candidates have been eliminated with
the data that exists; the remaining variance cannot be attributed without per-phase timing. Building
a reduction now would mean optimising a phase chosen by intuition, and the one intuition that looked
strongest — the session read — is already disproved. The bound labels every operation it wraps
(`BoundedOperationOptions.label`), so the phase names already exist in code; nothing records how long
each takes.

**This is not a CR116 regression.** CR116 bounds each per-Journey persistence and finalization
operation at 120 s, inside `journeyPersistenceCoordinator` and `turnFinalizationCoordinator`. The
bound is per operation, not per turn, so a settlement made of several operations can exceed 120 s
without any of them breaching it. The module says so itself:

> A generous ceiling. A real Journey writes multi-megabyte projections and inspects a 55 MB session,
> so this exists to catch a wait that will never end, **not to police slowness**. A bound that fired
> on ordinary work would be a worse defect than the strand it replaces.

CR116 fixed the strand and declined duration on purpose, with a stated reason. CR119 is that declined
half.

## Where the Measurement Must Live

The turn journal is the obvious home and is the wrong one. Its native record is
`#[serde(deny_unknown_fields)]`, and its `revision`, `phase` and receipt fields gate the recovery
guards that CR116 depends on. Adding a diagnostic payload to a correctness-critical record, behind a
strict schema, buys a tidy location at the cost of coupling measurement to the structure that governs
recovery.

So the timings go to a **separate, append-only per-Journey diagnostics file**, written once per
settled turn. This revises the exclusion first written in this document — "no new durable artifact" —
and the revision is deliberate: one small append per turn is cheaper than the schema risk, and it
keeps a diagnostic concern out of a safety record. It also respects CR116's lesson directly, since
accumulating in memory and writing once is the opposite of the per-event persistence traffic that
caused the original strand.

## Plan

**Slice 1 — accumulate phase timings in memory.** Every operation the two coordinators wrap through
`runBoundedOperation` already carries a `label`. Record elapsed time per label for the turn being
settled, in memory, with no write. Pure and directly testable: given a sequence of labelled
operations, the accumulator reports each one's elapsed time and their total.

**Slice 2 — write them once, when the turn settles.** One append to a per-Journey diagnostics file at
settlement, carrying the run authority, the Finishing window, and the per-phase elapsed times.
Bounded in size with oldest-first eviction, like the journal already is. A failure to write a
diagnostic must never fail a settlement — it is recorded and swallowed.

**Slice 3 — make the wait legible while it runs.** `Finishing` names the phase it is currently in.
The coordinator already knows the label; the surface simply stops being mute. A turn that settles in
two seconds must look exactly as it does today, so the phase name appears only once a wait has
visibly begun.

**Slice 4 — re-run this analysis on real per-phase data** and record which phase dominates, for both
the floor and the episodic swing. That finding is the deliverable that makes a reduction CR possible.

## Files

- `src/app/settlementPhaseTiming.ts` — new: the accumulator.
- `src/app/boundedPersistenceOperation.ts` — surface the elapsed time of a labelled operation to a
  collector without changing the bound's behaviour.
- `src/app/turnFinalizationCoordinator.ts`, `src/app/journeyPersistenceCoordinator.ts` — thread the
  collector through.
- `src-tauri/src/main.rs` — the append-only diagnostics write and its bound.
- `src/app/App.tsx` and the presentation module that renders `Finishing` — slice 3 only.
- New tests for the accumulator, the once-only write, the swallow-on-failure rule and the surface.
- This document, the RS016 index, the canonical index, the Canvas.

## Acceptance

- A settled turn's diagnostics entry carries elapsed time per named phase, and their sum accounts for
  the Finishing window within a small tolerance.
- Exactly one diagnostics write per settled turn. No write per phase.
- A diagnostics write that fails leaves the settlement successful.
- The file is bounded and evicts oldest-first.
- While a wait is visibly under way, the surface names the current phase; a fast turn is unchanged.
- The CR116 bound's behaviour and its abandonment reason are unchanged, and its tests stay green.
- Existing suites green.

## Validation

- **Test-level:** every acceptance line has a test, red before its slice.
- **Dev:** take a turn, confirm one diagnostics entry with phases summing to the observed window.
  Dev's Journeys are small, so Dev will show correctness, not the long tail.
- **Production, after release:** re-run the analysis in this document against per-phase data. The
  honest expectation is that this takes days of ordinary use, because 17% of turns are slow and the
  worst are rarer still.

## Exclusions

- No change to the CR116 bound, and no lowering it to police slowness, which its own note argues
  against.
- **No reduction of the work itself.** Four candidates are already eliminated; choosing a fifth by
  intuition is what this CR exists to avoid.
- No change to send-blocking during `Finishing` — see D2.
- No change to the turn journal's schema.
- No claim about whether recent releases improved duration until post-upgrade turns accumulate.

## Open Decisions

- **D1 — where the timings live.** A separate diagnostics file, for the reason given above.
  Recommended as planned.
- **D2 — whether sending should stay blocked.** The answer is already committed to the Pi session
  before `Finishing` begins, so sending during it may be safe, but turn ordering and run authority
  would have to be reasoned through properly. This is the change that would most reduce the felt cost
  and it is **deliberately not taken here**. Recommended as its own CR, informed by slice 4.
- **D3 — whether slice 3 is enough to call this CR worthwhile.** It makes the wait legible and
  measurable but not shorter. Stated plainly so the Navigator can decide whether to widen scope now
  or keep the reduction as a follow-on.

## Dependencies

Shares the settlement path with CR116, whose bound stays as it is, and with CR114, which reduced the
working set and may already have reduced this cost in ways not yet measured. Independent of CR118.
