[< Updates](../project/refinement/index.md)

# alpha.41 Field Verification — CR130's Project Path Operations in Production

**Kind:** field verification
**Date:** 2026-10-08
**Release:** `v0.2.0-alpha.41` — The Form Stops Promising What It Cannot Do
**Change Request:** [CR130](../project/refinement/rs021-ux-pre-beta-evolution/cr130-stop-offering-a-journey-edit-that-cannot-succeed.md)
**Reported by:** Navigator — *"Atualizei a versão e testei. Tudo funcionou."*

## Summary

The Navigator upgraded production to `alpha.41` and exercised Edit Journey's project path field. The
durable record confirms all three operations CR130 wired — **set, change, clear** — ran against
production and settled. Every digest in the chain reproduces arithmetically.

**CR130's field verification debt is resolved.**

## Production Identity

| fact | value |
|---|---|
| Installed version | `0.2.0-alpha.41` |
| Binary mtime | `Oct 7 15:44` |
| Binary SHA-256 | `aaaef35730c216e11635583145f7c0aa6515afe6e659d0adfb0160a863d569bb` |
| Built candidate SHA-256 | `aaaef35730c216e11635583145f7c0aa6515afe6e659d0adfb0160a863d569bb` — **identical** |
| Running pid | 80948, since `2026-10-08T08:28:33` local = `11:28:33Z` |
| Read taken at | ~20 min after start — not an immediate-post-restart read |

Identity is proven by hash against the built binary, not by string probe.

## What the Ledger Records

Four receipts exist from 2026-10-07 onward. The first is alpha.40's verified create; the three that
follow are this verification, all on `agentic-ai-for-delphi-consulting`:

| time (UTC) | operation | request | source → result |
|---|---|---|---|
| `2026-10-07T17:24:32.874546Z` | `create_journey` (alpha.40) | `026623a1` | `8c6164076b` → `1b4c7c9b31` |
| `2026-10-08T11:35:07.574444Z` | **`set_project_path`** | `b2b60fa4` | `1b4c7c9b31` → `10fef8a1e6` |
| `2026-10-08T11:35:44.978487Z` | **`set_project_path`** | `66492f96` | `10fef8a1e6` → `7a2b3ef15f` |
| `2026-10-08T11:35:56.171513Z` | **`clear_project_path`** | `d38b8d2b` | `7a2b3ef15f` → `4b69b3e506` |

**Set, changed, cleared — exactly the three the release asked for**, 49 seconds end to end, each with a
distinct `requestId`.

### The chain is unbroken

Each receipt's `source_version` equals the previous receipt's `result_version`, with no gap, from
alpha.40's create through to the clear. Nothing mutated the tree outside the guarded contract during
the window.

### The final digest reproduces

Recomputed independently with the exact semantics of `source_version()` in
`src/memory/storage/journey_admin.py` — canonical JSON of `{id, key, content, version, updated_at,
metadata}` over every `layer='journey'` row ordered by `key`, `metadata or ""`,
`sort_keys=True, separators=(",",":")`:

```
reproduced over 79 live rows : 4b69b3e506c04cad4c5dae0f6d532ba67a8cb45680eb17c76ee4d5424b35d960
last receipt result_version  : 4b69b3e506c04cad4c5dae0f6d532ba67a8cb45680eb17c76ee4d5424b35d960
```

Identical.

## These Operations Had Never Run Before

The all-time operation census is decisive:

| operation | all-time count |
|---|---|
| `create_journey` | 24 |
| `move_journey` | 19 |
| **`set_project_path`** | **2** |
| `delete_journey` | 1 |
| **`clear_project_path`** | **1** |

All three path receipts are from today. In this Mirror's entire history, **the path operations had
never been exercised once** before alpha.41.

This independently confirms the correction recorded on 2026-10-07: the claim that the Desktop already
built `set_project_path`/`clear_project_path` requests was false — both existed only in a type union,
with no call site. CR130 wired them for the first time, and the ledger shows their first use.

## The Clear Removed the Key, It Did Not Empty It

After `clear_project_path`, the canonical row holds:

```json
{"parent_journey": "ia-agentica", "sibling_position": 0}
```

`project_path` is **absent**, not `""`. The Desktop's registry agrees — the Journey's entry carries
`['description','id','name','nativeId','parentId','siblingPosition','stage','status','updatedAt']` and
`projectPath` is absent, while **75 other Journeys in the same registry do carry a `projectPath`**. So
the field is populated normally elsewhere and its absence here is the clear taking effect, not a
read failure.

This matters against §5b of the settlement model, where absence and emptiness collapsing into one
value is the heaviest open debt: on this path core distinguishes them correctly.

## CR110's Refresh Carried CR130's New Operations

The registry file's `sourceVersion` is `4b69b3e506c0…`, identical to the live digest and the final
receipt's `result_version`, with `syncedAt` at `2026-10-08T11:35:56.189622Z` — **18 ms after** the
receipt at `11:35:56.171513Z`.

The Desktop reloaded the tree immediately after its own mutation, which is the behavior CR110
established, now exercised through operations CR110 never saw. The two changes compose.

## What This Does Not Establish

- **The two intermediate paths are unrecoverable.** The DB holds only the final state, and the clear
  removed the key, so the actual directory strings that were set and then changed are gone. What is
  proven is that two distinct `set_project_path` mutations settled with different resulting digests —
  so the second genuinely changed the value rather than rewriting the same one.
- **The read-only fields are Navigator report, not record.** That Name, Description, Journey ID and
  slug render read-only with the explanatory note is attested by *"tudo funcionou"*, not by anything
  durable. A refusal that no longer happens writes nothing, by design.
- **`unchanged` was not exercised.** Pressing Save with no modification should close the dialog with
  no mutation and no error. Its correct behavior is the absence of a receipt, which is indistinguishable
  from not having pressed Save. Tests cover it; the field cannot.
- **`unsupported_operation`'s message is now unreachable from the Desktop**, which was the point of
  CR130. The mapping added at `src-tauri/src/main.rs:2340` stays as defence, unverifiable in the field.
- **`projectPathIntent`'s trimmed-string comparison is untested in the field.** Two spellings of one
  directory still read as a change; harmless, and this verification did not probe it.

## Residue

None. `agentic-ai-for-delphi-consulting` ends with no `project_path`, which is the state it started in
— the verification returned the Journey to where it began. The `teste` Journey from alpha.40 remains,
still deliberately not removed.
