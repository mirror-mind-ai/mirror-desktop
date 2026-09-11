[< Mirror Desktop Roadmap](index.md)

# Baseline Reconciliation Plan

**Journey:** `mirror-desktop`  
**Prepared:** 2026-09-11  
**State:** executed under CR026; pending Navigator validation
**Purpose:** make the delivered roadmap internally coherent, close historical refinement residue, and leave a neutral authority surface for the next product vision without inventing that vision in advance.

## Starting Evidence

The product baseline is materially ahead of its documentation state:

- The root roadmap declares every Delivery Story in the Operable Agent Cockpit arc done, and CV-002 through CV-006 done.
- Every child of CV-007 is done, and trusted self-update has release, updater, rehearsal, recovery and publication evidence through `v0.2.0-alpha.4`.
- The technical-debt ledger has no open item; TD-001 is resolved.
- The live roadmap tree still contains 44 nonterminal status declarations: two Capability Values marked in progress, four completed top-level Delivery Story indexes marked planned, and 38 completed child indexes marked planned.
- CV-001's own table still marks DS-009 planned and omits delivered DS-012.
- The root recommendation still says to pull CV-007 next.
- The Refinement Workbench still marks RS010 active although CR013 is done, and leaves CR003 and CR014 captured despite available terminal evidence.
- The published Operational projection still points to completed CV-007.DS-003 and predates RS011 and RS012 closure.

These are authority and provenance defects, not evidence that all named capabilities must be rebuilt.

## Authority Model To Establish

1. A work item's own `index.md` owns its authored status.
2. Parent tables are summaries and must match the linked child indexes.
3. A parent may become done only when its done condition and accepted closure evidence cover its children.
4. Existing parent-level closure can provide provenance for an inherited child that lacks a separate historical receipt, but reconciliation must say so explicitly; it must not fabricate a past validation event.
5. Generated `.mirror/projections/` files are refreshed through the released Mirror publisher after authored files are coherent. They are never hand-edited as status authority.
6. The Refinement Workbench remains file-first. Legacy SQLite Workbench state is neither inspected, reconciled nor dual-written.
7. External constraints such as Apple Developer ID signing, notarization, architecture coverage and future stable-channel policy are named as future capability candidates, not used to falsify the completion state of the delivered alpha/updater baseline.

## Delivery Plan

### Phase 1 — Produce a Reconciliation Receipt

Create one reviewable receipt that enumerates every live roadmap `index.md`, its authored status, parent summary status and available completion provenance. Classify each mismatch as:

- `stale_status_with_direct_receipt` — the same package has `done.md`, validation or equivalent terminal evidence;
- `stale_child_status_with_parent_closure` — the accepted parent closure explicitly lists the child package;
- `aggregate_mismatch` — all children are terminal but the parent is not;
- `historical_or_superseded` — preserved context that must not appear as current work;
- `genuinely_open` — no terminal evidence; requires an explicit Navigator decision rather than automatic closure.

The receipt must record the starting count of 44 nonterminal declarations and account for every one. No status changes occur until this classification is reviewable.

### Phase 2 — Reconcile the Operable Agent Cockpit Tree

Reconcile the 38 stale child indexes and four stale Delivery Story indexes against their existing closure authority:

- DS-002 through DS-005: use each Delivery Story's `done.md`, review and validation as direct closure authority, then align its child status declarations with the recorded child-work-package closure.
- DS-006: align the remaining stale child indexes with the DS-006 closure receipt; preserve relocated Mirror-import history under CV-002.
- DS-007: align all seven children with the accepted DS-007 closure receipt without inventing separate historical validation files.
- CV-002.DS-001 absorbed packages: align the four stale child indexes with both their direct receipts and the explicit `Absorbed Historical Work` table.
- CV-001: add DS-012, mark DS-009 done, update the application name in current outcome language where safe, and mark CV-001 done only after its table and done condition agree.

Historical implementation plans and reviews remain historical. Reconciliation changes status/provenance, not the meaning of already delivered behavior.

### Phase 3 — Close Trusted Self-Update as a Baseline Capability

Mark CV-007 done after a bounded evidence review confirms that DS-001, DS-002 and DS-003 satisfy the authored done condition. Update both the CV index and root Capability Value table.

Do not make CV-007 closure depend on every future patch rehearsal. The optional installed-app rehearsal from `v0.2.0-alpha.3` to `v0.2.0-alpha.4` is release monitoring evidence, not a reason to keep an already delivered capability perpetually in progress. Likewise, Tauri updater signing must not be restated as Apple signing or notarization.

### Phase 4 — Reconcile Refinement History

Using only the file-first Workbench and external read-only evidence where needed:

- close RS010 because its only CR, CR013, is done and its repository-extraction outcome is recorded;
- mark CR003 done and add links to `docs/update/private-test-release-2026-09-08.md` and `docs/releases/v0.1.1-test.1.md` as its terminal evidence;
- mark CR014 done after recording a fresh read-only GitHub visibility check showing `mirror-mind-ai/mirrormind-site` is private;
- preserve the exact historical scope and exclusions of all three records;
- leave Current Focus empty.

No website deployment, repository visibility mutation, updater publication or release operation belongs to this reconciliation.

### Phase 5 — Replace the Stale Recommendation With a Vision Intake Boundary

Rewrite the root `Current Recommendation` as `Baseline State and Next Horizon`:

- declare CV-001 through CV-007 complete as the delivered baseline;
- state that no Capability Value is active or selected;
- state that the next product direction must begin in Explorer Mode for exactly `mirror-desktop`;
- require an accepted exploratory handoff before authoring CV-008 or changing the product promise;
- identify signing/notarization, native architecture coverage, stable distribution and further alpha feedback as possible inputs, not a preselected roadmap;
- preserve completed Capability Values as historical contracts rather than rewriting them around the future vision.

This leaves the roadmap intentionally empty at the leading edge: ready to receive a vision, but not pretending one has already been chosen.

### Phase 6 — Add Drift Detection

Add a deterministic read-only roadmap consistency check with focused tests. It should fail when:

- a parent table status disagrees with the linked item's authored status;
- a done aggregate contains a nonterminal live child without an explicit documented exception;
- the current recommendation selects a completed item;
- a completed baseline item disappears from its parent table;
- a live roadmap link resolves outside the repository or is missing.

The check reports mismatches; it never edits documents or infers completion. Templates, immutable history and generated projection snapshots are excluded from authored-status enforcement.

### Phase 7 — Refresh Derived Journey Surfaces

After authored roadmap and Workbench checks pass, rebuild the Operational projection with the released Mirror runtime using an explicit `--journey mirror-desktop` boundary. Verify before publication that the resolved Journey ID is exactly `mirror-desktop`, Current Focus is empty, completed refinement through RS012 is visible, and active roadmap work no longer points to CV-007.DS-003.

Do not inspect or update legacy SQLite Workbench records. Do not hand-edit projection JSON. Tactical or Strategic synthesis is not regenerated unless separately requested; a status cleanup does not silently create a new product interpretation.

### Phase 8 — Validate and Close

Required gates:

- the reconciliation receipt accounts for all 44 starting nonterminal declarations;
- the roadmap consistency check reports zero unexplained mismatches;
- Markdown links and authored hierarchy are valid;
- CV-001 and CV-007 done conditions have explicit evidence references;
- RS010, CR003 and CR014 have terminal outcomes in the canonical Workbench;
- the refreshed Operational projection resolves only to `mirror-desktop` and exposes no stale active delivery item;
- application code, release versions, tags, updater endpoints, published artifacts and user/Mirror data are unchanged;
- the Navigator reviews the final baseline language and explicitly confirms that the roadmap is ready for a new product vision.

## Expected End State

```text
Journey: mirror-desktop
Delivered baseline: CV-001 through CV-007 done
Open technical debt: none recorded
Active Delivery Story: none
Active Refinement Story: none
Open captured historical CRs: none
Current recommendation: enter Explorer Mode when the Navigator is ready
Next Capability Value: intentionally undefined
```

## Suggested Delivery Shape

Execute this as one documentation/governance refinement with independent review commits:

1. inventory and reconciliation receipt;
2. roadmap hierarchy/status correction plus drift check;
3. Refinement Workbench terminal reconciliation;
4. root next-horizon language and Operational projection refresh;
5. Navigator validation and closure.

Before execution, create or select a file-first Refinement Story and Change Request, then explicitly assign Driver and Delivery. This plan grants no push, publication, release, repository mutation, projection synthesis beyond Operational refresh, or product-vision decision.
