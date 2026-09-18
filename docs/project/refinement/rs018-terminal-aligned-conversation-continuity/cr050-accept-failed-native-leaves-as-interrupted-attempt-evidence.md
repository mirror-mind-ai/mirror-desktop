[< RS018](index.md)

# CR050 — Accept Failed Native Leaves as Interrupted-Attempt Evidence

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

CR049's first isolated baseline used a provider/model combination rejected by Codex. Pi durably recorded the admitted user entry followed by an assistant entry whose `stopReason` was `error` and whose visible content was empty. Exact transcript inspection correctly reported the user as incomplete while naming the later failed assistant entry as the active leaf.

CR048's frontend classifier currently requires `incompleteUserEntryId === leafEntryId`. It throws `inactive_native_attempt_evidence_invalid` for the valid failed-leaf shape, causing normal Conversation restore to fall into `runtime_read_failed`. The transcript and journal remain intact, but the Conversation Surface becomes unavailable instead of explaining the interrupted attempt.

## Expected Behavior

- Exact Pi inspection remains the only source of incomplete-attempt evidence.
- A visible incomplete user entry may be followed by an active native assistant/tool leaf that did not complete with `stop` or `length`.
- The classifier validates active-branch ordering rather than requiring the incomplete user to be the physical leaf.
- A failed native assistant entry with no visible response produces the passive interrupted-attempt notice after occupancy is inactive.
- A successful terminal assistant still clears incomplete evidence in Rust inspection and produces no notice.
- Malformed, absent or out-of-order incomplete evidence still fails closed.
- Composer availability and provider retry policy do not change.

## Evidence

Private-data-free isolated CR049 fixture on 2026-09-18:

- user entry `32ae9c2f` was admitted;
- assistant leaf `c3a6eb49` had `stopReason: error` and no visible content;
- journal terminal outcome was `process_died`;
- Pi inspection semantics retain the user as incomplete;
- CR048 candidate derivation rejected the differing leaf and surfaced `runtime_read_failed`.

No production data was involved. The unsupported model choice is a separate sandbox configuration correction; the restore failure is a product defect independent of which provider error produced the native shape.

## Initial Boundary

Likely change:

- extend the pure CR048 classifier to validate that the incomplete user exists visibly on the inspected active branch and is not ordered after a role-bearing leaf;
- retain the inspected native leaf ID as candidate evidence;
- add failed-assistant, tool-tail, successful-assistant and malformed-order tests;
- rerun the CR048 interruption/relaunch route before resuming CR049.

Do not weaken Rust active-branch inspection, infer from Desktop projections, retry the provider or alter availability.

## Authority Boundary

CR050 was captured from a product defect found during the explicitly authorized CR049 sandbox. Capture does not authorize implementation. CR049 remains blocked until this defect is resolved or the Navigator chooses another disposition.

## Outcome

Captured for explicit planning and implementation authority.
