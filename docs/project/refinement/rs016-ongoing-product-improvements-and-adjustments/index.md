[< Refinement Workbench](../index.md)

# RS016 — Ongoing Product Improvements and Adjustments

## Framing

A durable refinement umbrella for concrete improvements, usability adjustments and bounded corrections discovered through continued use of Mirror Desktop after the established alpha baseline.

## Desired Outcome

Small, coherent product and engineering adjustments can be captured as independently reviewable Change Requests without creating a new Refinement Story for every observation. Each attached CR preserves its own problem, expected behavior, scope, acceptance, evidence and closure while this RS provides continuity across ongoing product use.

## Intake Rules

- Every adjustment must be captured as a concrete CR before selection or implementation.
- A CR must describe an observed problem and expected behavior; this RS is not an unstructured task list.
- Work remains independently planned, assigned, validated and closed through the Collaborative Refinement Protocol.
- Changes that establish a new product capability, materially expand roadmap scope or require their own coherent refinement arc should receive a dedicated Delivery Story or Refinement Story instead.
- Security incidents, release operations and emergency production repairs do not enter this umbrella by default.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Refinement remains file-first at `docs/project/refinement/index.md`; legacy SQLite Workbench state is not inspected, reconciled or dual-written.
- Creating or attaching a CR does not select it, assign a Driver, choose a Delivery branch or authorize implementation.
- This RS does not authorize commits, merges, pushes, publication, release, deployment or mutation of Mirror identity, memory, credentials, Journey content, conversations or unrelated app data.
- The RS remains open only while it provides a coherent home for bounded ongoing adjustments; it should be reviewed or split when accumulated CRs reveal a distinct product theme.

## Change Requests

- [CR030 — Restore Journey Expansion Arrow Contrast in Light Themes](cr030-restore-journey-expansion-arrow-contrast-in-light-themes.md)
- [CR029 — Restore responsiveness for long conversations](cr029-restore-responsiveness-for-long-conversations.md)

CR030 is `in_progress` with Driver `@alissonvale` and Delivery `refinement/rs016-cr030-journey-expansion-arrow-contrast`.

CR029 is `done`. Its accepted bounded delivery isolates transcript rendering, indexes immutable presentation and lazily materializes historical action detail without changing persistence, compaction or authority semantics.
