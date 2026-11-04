[< RS026](index.md)

# CR192: The 0.2 Carry Left Segment Receipts Stale

**Status:** done
**Line:** 0.3 and 0.4 · Desktop state

## Friction

Found on 2026-11-04 while building CV-013.DS-003. A Conversation Segment's `complete.json` records
the SHA-256 of its manifest and of each segment, and the app checks them before it returns older
history (`load_conversation_segment_projections`, `load_current_conversation_segment_projection`:
"Conversation Segment projection failed verification."). Segments hold `sessionFile` values. The
0.2 carry (`scripts/carry_02_state.mjs`, CV-010.DS-005 slice 5a-2, run on 2026-11-01) rewrote those
values and did not hash the segments again.

Nobody has reported a symptom yet; what the person sees when older history fails to verify is not
yet observed.

## Evidence (read-only, 2026-11-04)

In the production 0.3 folder, 893 of 926 segments fail their recorded hash; the 33 that pass were
written after the carry. In the production home (`home-77eb45ba-…`): 221 fail, 28 pass. For every
one of the 221, the 0.2 original at the same relative path in `ai.mirrormind.desktop` hashes to the
recorded value, and the 0.3 file equals that original with the carry's `sessionFile` and
`piSessionFile` move applied, and nothing else. Of the production home's 32 manifests, 31 verify
and one fails in 0.2 as well, before any carry.

## Proposed Direction

Recompute the hash of a segment only when the proof above holds for it: the 0.2 original verifies,
and the carried file is that original with the carry's path move. Do it in Nautilus's folder after
the DS-003 carry, so neither the 0.2 nor the 0.3 folder is written, for example as an option of
`carry_03_state.mjs` that takes the 0.2 folder as evidence. Leave anything else as it is, the
manifest that was already stale in 0.2 included. Fix before CV-013.DS-004, so the cutover carries
working history.

The 0.3 folder itself stays as it is: it is the way back, and 0.3 is closed.

## Built (2026-11-04)

Asked by the Navigator ("conserte a CR192"). Code `443383cf`, in `scripts/carry_03_state.mjs`, so the
repair happens when CV-013.DS-004 carries the state, in Nautilus's folder.

- A home carried from 0.2 is known by its `carried-from-0.2.json`, whose `recordedAs` names the folder
  its records were written in. That folder, the live `ai.mirrormind.desktop`, is the evidence;
  `--evidence-02` names another copy. It is only read.
- A stale manifest or segment entry is repaired when the original at the same place hashes to the
  recorded value and the 0.3 file parses to that original with the 0.2 carry's move
  (`<0.2>/pi-sessions/` to `<0.3>/homes/<home>/pi-sessions/`). Its new hash is the hash of the file
  as Nautilus receives it. Anything else stays as it was and is counted as unproven.
- Spec: four tests added to `cv013Ds003CarryState.test.mjs` (now 18): repaired on proof; edited,
  drifted (0.2 wrote after the carry) and missing originals left; neither folder written; nothing
  repaired without the 0.2 folder or for a home not carried from 0.2; another evidence folder.
  Mutations, all caught after two test gaps were closed and two dead guards removed.
- Suites: TypeScript 2,626 tests.

**Rehearsal on a clone of production**, the live 0.2 folder as evidence (unchanged afterwards):

| Home | Segments verifying in 0.3 | In Nautilus |
| --- | --- | --- |
| `home-77eb45ba` (production) | 28 of 249 | 249 of 249 |
| the three rehearsal homes | 4 of 676 | 674 of 676 |

891 segments repaired, 6 entries unproven. Two are segments of the rehearsal homes. Four are
manifests, one per carried home, all the same conversation: a Desktop Conversation of the
`mirror-desktop` Journey (`desktop-thread-mirror-desktop-18d8def4b1051920`, generation 1), whose
manifest was written on 2026-09-28, a day after its receipt, while still on 0.2. It was stale before
any carry, so it is not this CR's; it is noted here and left as it is.
