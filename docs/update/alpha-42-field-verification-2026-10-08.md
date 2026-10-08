# v0.2.0-alpha.42 field verification

**Date:** 2026-10-08
**Journey authority:** `mirror-desktop`
**Status:** upgrade attested; both field verifications **not yet collected**

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
