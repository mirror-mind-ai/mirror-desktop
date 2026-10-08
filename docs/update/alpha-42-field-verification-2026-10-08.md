# v0.2.0-alpha.42 field verification

**Date:** 2026-10-08
**Journey authority:** `mirror-desktop`
**Status:** upgrade attested; **CR127 verified via D4** after the first prediction failed; CR132 not collected

## Upgrade attested

The Navigator upgraded production. Established by hash rather than by version string, because a
version string is not a contract identifier \u2014 the lesson CR131 was captured for.

| artifact | SHA-256 |
|---|---|
| `/Applications/Mirror Desktop.app/Contents/MacOS/mirror-desktop` | `6dad00b18ece928df66065d3b06200f9947e41e5dd820784b61faf5e9647f5a1` |
| `src-tauri/target/release/mirror-desktop` (built candidate) | `6dad00b18ece928df66065d3b06200f9947e41e5dd820784b61faf5e9647f5a1` |
| bundled `Mirror Desktop.app` binary | `6dad00b18ece928df66065d3b06200f9947e41e5dd820784b61faf5e9647f5a1` |

All three identical. `CFBundleShortVersionString` and `CFBundleVersion` both `0.2.0-alpha.42`.

Process `7171` started `2026-10-08T14:06:16` local, which is `17:06:16Z`.

## Why no state was read

The reading was declined at **1 min 47 s** of uptime.

Reading production immediately after a restart has misled this work before; it was declined at 79 s
on alpha.39 and at 50 s on alpha.40, and the alpha.41 reading was only taken at roughly 20 minutes,
where it held. A snapshot taken while the app is still completing its own startup recovery is not a
sequence, and the risk is a wrong conclusion rather than a wrong file.

**Declining to read is a result, and it is recorded as one.**

## CR127 \u2014 provocable, and the provocation belongs to the Navigator

A settlement on `o-sentido-do-ser` should now **complete** where it previously failed, carrying in
`diagnostics`:

```
conversation_segment_manifest_unreadable: coordinate_invalid (segment 1, sourceFromEntryId)
```

That Journey holds the one manifest on this machine that the parser refuses \u2014
`o-sentido-do-ser/nautilus-thread-o-sentido-do-ser/generation-1.json`, mtime Sep 30 10:01,
`sourceEntryCount: 0`. Opening a Journey and taking a turn is a GUI action the assistant cannot
perform.

## CR132 \u2014 not provocable, and this is stated rather than worked around

A settlement cannot be made to hang on demand. The threshold and the offer decision are proved by
unit guard, including the exact boundary and the refusal while native execution is active, but the
control *appearing* requires a real `Finishing` that passes 60 s.

This verification is therefore **opportunistic, not schedulable**. When it happens the expected
observations are:

1. A notice naming the elapsed wait, with a **Stop waiting** control.
2. Confirming it releases the composer and a new turn is accepted **without restarting the app**.
3. The settlement timing ledger gains an `outcome: "failed"` record whose reason is
   `settlement_wait_abandoned_by_navigator` \u2014 an event that previously wrote nothing at all.

And one observation that would falsify the threshold: a legitimate settlement completing above
60,000 ms, which would mean the control was offered in front of a turn that was going to finish.

## Also still owed, unchanged by this release

- **CR126 / CR097** field verification, whose observable event is the next corrected turn.
- **CR110's two conflict branches**, Dev-validated only.

## CR127 collected — the Journey settles, the prediction failed (2026-10-08)

The Navigator took one turn in `o-sentido-do-ser`. Full record in the CR. In short:

**The Journey settled**, for the first time — journal `phase: settled`, `revision` 5,
`recoveryDisposition: complete`, 17.8 s end to end; settlement `outcome: settled`, 19 phases, 1.5 s,
with `publish_segments` completing in 86 ms and the whole Mirror outbox chain behind it.

**The predicted diagnostic never fired.** The manifest was re-derived at `17:12:17Z`, thirty seconds
before the settlement, from a Pi session that now holds 59 entries, so the null coordinates became
real ones and there was nothing left to tolerate.

**Verifying it destroyed the instance.** Zero of 178 manifests now carry a null coordinate. The trigger
named in the debt line was a decaying artifact, and the line directly beneath it had already said that
a refresh would heal it. Both were written in the same pass and the contradiction went unnoticed.

**So D2's tolerance remains unverified in the field and now has no trigger**, since D4 guarantees no
new instance is produced. Reachable in test, unreachable in the field.

**Reading was taken at 7 minutes of uptime, not the ~20 planned.** Defensible here and stated so it is
not mistaken for the general rule: the record being read is a single append-only entry stamped
`17:12:47–48Z` and written once at the end of settlement, so it is a dated event rather than a
snapshot of a system mid-startup. The earlier declines were about concluding what the app did at boot.

## CR127 verified — D4, on a reproduction of the original scenario (2026-10-08)

The Navigator created `journey-nova` and took one turn. The probe recorded above as *"the best
available probe, not a reliable reproduction"* **reproduced exactly**. Full record in the CR.

**The manifest is written at generation activation, before any turn exists** — `18:05:22.894Z`, with
the Journey created at `18:05:12.130Z` and the first turn not created until `18:05:44.610Z`. The Pi
session held only its header, so `sourceEntryCount` is 0 and `turnCount` is 0: the exact input that
produced the original defect.

**`sourceFromEntryId` and `sourceThroughEntryId` are absent, not `null`.** That is D4, observed in
production on the input that used to break.

**The turn settled** — journal `phase: settled`, `revision` 5, `recoveryDisposition: complete`;
settlement `outcome: settled`, 19 phases all completed in 1.39 s, `publish_segments` at 79 ms, with
`failure` and `diagnostics` both correctly absent.

**The flush ordering is now characterised**, which the previous entry said was not understood. And the
CR's own claim that the defect *"explains one of the five and no more"* was an understatement: pre-CR127
every newly created Journey's first turn met a null-coordinate manifest. Corrected at its source.

**D2's tolerance still has no field trigger**, unchanged — the file this probe produced is valid,
because absent is what the parser wants.

**Residue:** `journey-nova` is now a real Journey in Mirror, created as a probe. Left in place like
`teste`; removal needs explicit intent naming it.

## Residue removal, authorised naming both targets — one removed, one refused (2026-10-08)

Executed against the production Mirror through its released runtime
(`uv run python -m memory journey ... mutate`), not through the Desktop GUI. A consistent backup was
taken first: `/tmp/memory-pre-journey-removal-20261008T183044Z.db`, 80 Journey rows.

**`teste` removed.** `delete_journey` receipt
`navigator-residue-removal-teste-2026-10-08`, `faab3823…` → `0f8b8b61…`. Verified arithmetically
rather than trusted: the result digest **reproduces** over the 79 remaining `layer='journey'` rows.
It had none of the twelve associations the guard counts.

**`journey-nova` refused, and the refusal is correct.** Mirror core declines to delete a Journey that
would orphan records — `count_journey_associations` (`src/memory/storage/identity.py:82`) counts twelve
relations and `journey_admin.py:102` raises `journey_not_empty` if any is populated, rolling back.

```
first attempt : journey_not_empty:conversations,runtime_sessions
confirmed now : journey_not_empty:conversations
```

The two reasons differ because the runtime session row existed during the attempt and has since gone
with the session. **Current blocker is one Mirror conversation holding 2 messages**, the probe turn
itself. Journey rows stayed at 79 and **no receipt was written**, consistent with the alpha.40 finding
that a refusal leaves no record by design.

### Why this was not forced

There is no canonical operation to remove a Mirror conversation. `delete_journey` is the only
destructive operation in the allow-list, so clearing the blocker would mean raw SQL against the Mirror
database, bypassing the receipt mechanism and the digest lineage that every other change in this record
is verified against. **Not done, and not done quietly.** Removing the Journey's conversation is a
different target and needs intent naming it.

`journey-nova` therefore remains, holding one settled turn. It is now the only such residue, `teste`
having gone.
