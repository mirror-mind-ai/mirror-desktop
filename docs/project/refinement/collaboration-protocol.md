[< Refinement Workbench](index.md)

# Collaborative Refinement Protocol

The canonical `docs/project/refinement/index.md` owns focus, ordering, status, Driver,
and Delivery. Linked RS/CR documents own narrative, plans, evidence, decisions, and
outcomes. Git owns diffs, history, conflicts, collaboration, and recovery.

## Authority Boundary

- Never inspect, compare, reconcile, or dual-write legacy SQLite Workbench state.
- Reading never selects or executes work.
- Focus, status, assignment, commit, push, merge, publication, and release require
  explicit Navigator authority.
- IDs never encode people, journeys, databases, local paths, conversations, or runtime IDs.

## Contributor Route

1. Inspect the complete canonical index and relevant linked documents.
2. Capture a concrete problem and expected behavior under an explicit RS without changing focus.
3. Select explicitly; selection changes no status.
4. Record scope, files, acceptance, validation, exclusions, and boundaries before moving to `planned`.
5. Obtain explicit Driver and Delivery decisions before moving to `in_progress`.
6. Implement the approved plan and record checks as evidence; evidence alone is not validation.
7. Require explicit Navigator acceptance before `validated`.
8. Record proportionality and debt review before terminal closure.
9. Return a handoff with RS/CR, status, Driver, Delivery, changed files, checks, validation,
   limitations, unresolved decisions, and requested next action.

`parked`, `rejected`, and `promoted` require a reason. `parked` also requires a revisit
trigger; `promoted` requires a Delivery target. Terminal CRs stay as history. Ordinary
Git conflicts protect concurrent identity, focus, assignment, status, and narrative
edits; semantic conflicts stop for Navigator resolution and are never settled from SQLite.
