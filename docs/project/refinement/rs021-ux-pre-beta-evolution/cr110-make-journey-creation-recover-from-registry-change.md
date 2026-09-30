[< RS021](index.md)

# CR110: Make Journey Creation Recover from Registry Change

**Status:** captured
**Driver:** —
**Delivery:** —

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
