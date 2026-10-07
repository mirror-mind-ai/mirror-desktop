[< RS021](index.md)

# CR110: Make Journey Creation Recover from Registry Change

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr110-rebase-stale-create-intent`

## Friction

When creating a Journey, Desktop rejects the action with:

> Journeys changed in Mirror. Reload the tree and try again.

The Navigator initiated a local creation but is sent back to reload the entire tree and repeat the
intent. It is unclear whether a real concurrent Mirror mutation occurred, the Desktop's own sync
changed the registry between read and write, the local revision is stale, or the conflict is being
reported too broadly. A basic create action therefore becomes unreliable and forces the Navigator
to reconstruct work manually.

## Outcome

Journey creation either completes atomically against current registry authority or reports a precise,
actionable conflict with an honest recovery path. A benign or self-caused freshness change does not
force the Navigator to reload and re-enter the same creation unnecessarily.

## First Investigation

Characterise the exact reported path before relaxing any registry conflict rule:

1. Reproduce the failure and record the selected parent, local registry revision/source version,
   proposed Journey identity, and native/Mirror response — without recording private Journey
   content.
2. Trace the create command from UI intent through the local registry writer, Mirror mutation and
   refresh/rebind path. Identify the exact comparison that emits `Journeys changed in Mirror.`
3. Determine whether the conflicting revision was created by another Mirror client/process, an
   external Mirror mutation, the Desktop's own prior refresh, or a writer/read ordering race.
4. Compare safe cases: no concurrent change; unrelated concurrent change; parent-branch change;
   identical idempotent retry; and a true collision on the proposed Journey identity.
5. Establish which authority coordinates are necessary to retry safely: source version, parent
   identity, registry revision, proposed id/name, and any returned Mirror receipt. Never retry by
   replaying a stale broad tree snapshot over newer Mirror authority.

## Acceptance

- A Journey creation with current, non-conflicting authority succeeds without an unnecessary reload.
- A stale but safely rebasable create intent can be retried against current authority without losing
  the chosen parent or duplicating the Journey.
- A genuine conflict names what changed at the relevant scope and offers a bounded next action;
  generic “reload and try again” is not the only recovery path.
- An unrelated registry change does not discard a valid create intent or overwrite another change.
- Retrying is idempotent: it never creates duplicate Journeys, duplicate hierarchy nodes or
  conflicting Mirror records.
- The registry tree converges to Mirror authority after success, rejection or recovery, and the
  selected/expanded sidebar state remains truthful.
- Tests cover the reported rejection, self-refresh/race, unrelated concurrent mutation, relevant
  parent mutation and duplicate retry.

## Boundaries

No blind automatic retry, no last-writer-wins tree replacement, no mutation of an unrelated Journey
and no weakening of registry provenance/version checks. This CR concerns recovering a named create
intent; it does not authorize automatic merging of concurrent hierarchy edits.

## Plan (2026-10-06)

### The mechanism, established from code and the live store

The Desktop builds every mutation request with `expectedSourceVersion` taken from the registry it
loaded (`createMutationRequest`, `src/domain/journeyMutation.ts`). That registry is loaded at startup
and refreshed only by an explicit reload, an onboarding import, or the Desktop's own successful
mutation. Mirror's `journey mutate` recomputes `source_version` as one SHA-256 over **every** Journey
row's `id`, `key`, `content`, `version`, `updated_at` and `metadata`
(`memory/storage/journey_admin.py`) and refuses with `stale_source` when it differs. The native layer
maps that code to *"Journeys changed in Mirror. Reload the tree and try again."*

So any write to any Journey row in Mirror between the Desktop's load and the create refuses the
create — including writes the create does not conflict with. The realistic trigger is the Navigator's
own Mirror use from Pi: `set_journey_path` (`memory/services/journey.py`) rewrites a Journey's
`content` and `updated_at`, which is exactly what `mm-journey` does when it updates a path. Nothing in
the Desktop notices, and the next create fails.

**It is self-inflicted staleness, reported as a conflict, with manual re-entry as the only recovery.**
The conflict rule itself is right — a digest over the whole tree is the honest authority — and is not
weakened.

Live check at the time of planning: the registry file's `sourceVersion` equals Mirror's current
digest, and no Journey row has changed since `2026-09-30`. There is no live reproduction; the failure
needs a Mirror-side write between load and create.

A failed `stale_source` leaves nothing behind: the core raises inside `BEGIN IMMEDIATE`, rolls back,
and writes no receipt. A rebased request under a **new** `requestId` therefore cannot duplicate
anything, and reusing the old id would be wrong — the digest would differ and the core would answer
`idempotency_conflict`.

### Slices

- **D1 — recognise the refusal.** `STALE_SOURCE_MESSAGE` in the domain, equal by construction to
  the native literal (a source guard holds them identical); `isStaleSourceError`.
- **D2 — judge the intent, in the domain.** `rebaseCreateIntent(freshRegistry, { slug, parentId })`
  returns `rebasable` with a recomputed position, or a `conflict` naming the one thing that changed:
  the id is now taken, or the parent is gone.
- **D3 — reload inside the form.** On a stale refusal, `executeJourneyMutation` reloads the tree
  (same reconciliation as the explicit reload), then for a create judges the intent: rebasable → the
  pending request is rebuilt from the fresh registry with a new request id and the message says one
  more Confirm will create it; conflict → the message names it, and a vanished parent is reset to
  Root. Other operations get the reloaded tree and *"review the form and confirm again"*. **Nothing is
  retried on its own**: the retry is the Navigator pressing Confirm.

### Files

- `src/domain/journeyMutation.ts` — D1, D2.
- `src/app/App.tsx` — D3, `rebaseJourneyAdministrationAfterStaleSource`.
- `src/tests/staleCreateIntentRebase.test.ts` — 11 guards.

### Acceptance and exclusions

As captured. Excluded: any change to Mirror's digest or comparison; refreshing the registry on dialog
open (shrinks the window, does not remove it, and adds a `uv` subprocess to every open); automatic
retry of any kind; and the `update_journey` finding recorded under CR100.

## Implementation and closure (2026-10-06)

All three slices landed as planned. One domain function, one App function, no native change.

The existing boundary test *"keeps mutation failures inside the open administration form"* shaped
D3: the reload happens inside the form's own catch and never touches the tree's refresh-failure
state. A second existing guard pins the native error mapping, which is why D1 matches the message by
equality instead of changing it.

The retry reuses the form's existing mechanism: `executeJourneyMutation` already prefers a pending
request whose operation and payload match the form. After a rebase the pending request carries the
fresh `sourceVersion`, a new `requestId` and the recomputed position, and the form recomputes the same
position from the now-fresh registry, so pressing Confirm submits the rebased request without new
wiring.

Gates: `tsc` clean, **236 files / 1,722 tests** (+11), build clean, roadmap READY, native unchanged.

## Closure review

**Proportionality.** The capture asked for five characterisations before any change. Four were
answered from code and the store (the exact comparison, what makes it stale, the idempotency
coordinates, the safe-retry authority); the fifth — reproducing the failure — was not possible, the
store having no Journey change since 2026-09-30. The fix follows the capture's acceptance exactly and
does not touch the rule it was careful not to weaken.

**Debt.**
- ~~The success path after a rebased Confirm is Dev-validated by tests only. Field verification needs
  a Mirror-side Journey write between load and create, which cannot be forced from the Desktop.~~
  **Resolved 2026-10-07** — the Navigator provoked exactly that write and the path ran in production.
  See Field verification below. The two conflict branches remain Dev-validated only.
- A create whose parent was reset to Root keeps the typed name, id and description; the Navigator
  must choose the parent again. Deliberate: choosing it silently would be guessing.
- `appendJourneyPosition` is still evaluated in `submitJourneyAdministration` before the call, so a
  parent that vanishes between the reload and the next Confirm throws outside the form's catch.
  Pre-existing; narrowed, not closed.
- The other five operations get a reload and a prompt, not a rebase. Their intents carry a Journey
  id whose continued existence is the only thing to check, and the reloaded tree shows it.

## Field verification (2026-10-07)

Collected in production on `alpha.40`. Full reading:
[alpha-40-field-verification-2026-10-07.md](../../../update/alpha-40-field-verification-2026-10-07.md).

The Navigator provoked the situation this CR could not reproduce: a `mm-journey` path update in Pi
(`reflexo`, `2026-10-07T17:23:20.689490Z`), then a Journey creation in the Desktop without reloading
the tree. The surface said the tree had already been edited, offered Confirm, and the Journey was
created.

The records close the chain arithmetically. The single receipt for the create (`teste`, request
`026623a1-204b-4d70-b1ea-a2bc034e15a3`, `17:24:32.874546Z`) carries `source_version 8c616407...`,
which reproduces exactly as the digest of the 79 live journey rows minus `teste`, and
`result_version 1b4c7c9b...`, which reproduces as the digest of all 79 — both recomputed with Mirror
core's own `source_version` algorithm. Because no journey row changed between 2026-09-30 and the
`reflexo` edit, the tree digest was constant at `c645679d...` across the entire window in which the
Desktop could have loaded it, so knowing when it loaded is unnecessary. The successful create was
therefore submitted against a digest the Desktop did not hold when the Navigator pressed create, and
the only path producing that is the reload-and-rebase this CR added.

The refusal left no record, as designed: `stale_source` raises inside `BEGIN IMMEDIATE`, rolls back and
writes no receipt. That is the property this CR relied on when it chose a new request id over reusing
the refused one, and one receipt with no duplicate is what a correct run looks like. What the store
cannot supply — that the surface named the edited tree and showed Confirm — is the Navigator's report,
recorded as report rather than as record.

**Still Dev-validated only:** both conflict branches. The id was free (`teste` had been created and
removed back in August) and the parent existed, so neither "id taken" nor "parent vanished, reset to
Root" was exercised.
