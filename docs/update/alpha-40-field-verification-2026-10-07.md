[< Update](../project/refinement/index.md)

# alpha.40 Field Verification — CR110 Recovered a Stale Create in Production

**Kind:** field verification
**Date:** 2026-10-07
**Release:** `v0.2.0-alpha.40` (CR110)
**Journey authority:** `mirror-desktop`
**Production boundary:** app started `2026-10-07T00:29:17Z`, pid 37318, binary
`abc2f759e0f934d1af9adc3cff3f920da4c78757ce6b213a564949e085bc8cf3` — byte-identical to the one this
release built.

## Why this verification had to be provoked

CR110 shipped with **no live reproduction**. It needs a Mirror write to land between the moment the
Desktop loads its Journey tree and the moment a create is submitted, and no Journey row had changed
since 2026-09-30. The Navigator provoked it deliberately: a path update through `mm-journey` in Pi,
then a Journey creation in the Desktop without reloading the tree.

## Navigator's report

> Fiz o teste de criação da journey e funcionou. Ele avisou que eu já tinha editado a árvore e mostrou
> o botão confirme. Eu confirmei e a journey foi criada.

## What the records establish

Read-only, from the Mirror database and the Desktop's registry file.

**The trigger.** `identity` row `reflexo` (layer `journey`) was updated at
`2026-10-07T17:23:20.689490Z`. That is the `mm-journey` path edit.

**The successful create.** Exactly one `journey_mutation_receipts` row today:

| field | value |
|---|---|
| `operation` | `create_journey` |
| `journey_id` | `teste` |
| `request_id` | `026623a1-204b-4d70-b1ea-a2bc034e15a3` |
| `created_at` | `2026-10-07T17:24:32.874546Z` |
| `source_version` | `8c6164076ba54897df50d582b69338ee4d493eabc2c43743725bd5ace9dc33dc` |
| `result_version` | `1b4c7c9b31f07dffbd2f55b2fff4970a8480e40c4ad01c5ff95d07c19fce5bac` |

**Both digests reproduce exactly**, recomputed over the 79 live journey rows using Mirror core's own
algorithm (`source_version` in `memory/storage/journey_admin.py` — SHA-256 over canonical JSON of
`id`, `key`, `content`, `version`, `updated_at`, `metadata`, ordered by `key`):

- digest of all 79 rows → `1b4c7c9b…` = the receipt's `result_version`
- digest of the same rows minus `teste` → `8c616407…` = the receipt's `source_version`

**The stale value is determined without having to know when the tree was loaded.** No journey row
changed between `2026-09-30T23:27:38Z` and the `reflexo` edit at `17:23:20Z`. The app started at
`00:29:17Z`. So across the entire window in which the Desktop could have loaded its tree, the digest
was constant at `c645679d04e6feaa…` — the value recorded in the registry file during CR110's
investigation and matching `nova-acropole`'s `result_version` from 2026-09-30.

**Therefore the create that succeeded was submitted against a digest the Desktop did not have when the
Navigator pressed create.** `8c616407…` did not exist until `17:23:20Z`. The only path by which the
Desktop could submit it is the one CR110 added: reload the tree in place after the refusal, rebase the
pending create onto it, and submit under a new request id.

**The registry caught up.** `journey-registry.json` now carries `sourceVersion = 1b4c7c9b…`, mtime
`17:24` local — the post-create digest.

**Elapsed: 72 seconds** between the path edit and the successful create. Consistent with edit, attempt,
refusal, Confirm.

## What is confirmed by report rather than by record, and why that is by design

The refusal itself leaves nothing behind. A `stale_source` failure raises inside `BEGIN IMMEDIATE`,
rolls back, and writes no receipt — which is precisely the property CR110 relied on to justify
resubmitting under a **new** request id instead of reusing the refused one, which would have answered
`idempotency_conflict`. So the refused attempt is durably invisible on purpose, and the single receipt
is exactly what a correct run looks like: one refusal that recorded nothing, one submission that
recorded once, no duplicate.

The Navigator's report supplies what the store cannot: that the surface *said* the tree had already
been edited, and that a Confirm button appeared rather than an instruction to leave and start over.

## What this does not verify

**Neither conflict branch was exercised.** A create is refused as a real conflict only when the chosen
id is already taken or the chosen parent no longer exists. Neither happened here, so both branches —
including resetting a vanished parent to Root — remain validated in Dev only.

**The id was free.** `teste` carries two older receipts, from `2026-08-27T12:53:24Z` and
`13:06:24Z`, so that id existed before and was removed. Today's create took a free id and did not
touch the duplicate-id path.

**Only creation was rebased.** Move, delete and path changes get the reloaded tree and a prompt to
confirm again, not a rebase. That behavior is untouched by this verification.

## Residue

A Journey `teste` now exists in Mirror, created by this test. Removing it is an administrative Mirror
mutation and is not performed here; it needs explicit Navigator intent naming the target.

## Status

**CR110's field verification is collected and closed.** The mechanism was established from code and
live digests, the fix was validated by tests, and production has now executed the recovery path once,
end to end, with the arithmetic of both digests reproducing the receipt exactly.
