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

- [CR061: Reconcile Mirror Append Timestamp Idempotency](cr061-reconcile-mirror-append-timestamp-idempotency.md)
- [CR056: Release Composer After Completed Terminal-Durable Lease](cr056-release-composer-after-completed-terminal-durable-lease.md)
- [CR055: Release Composer After Terminal Provider Error](cr055-release-composer-after-terminal-provider-error.md)
- [CR054: Surface Provider Terminal Errors in the GUI](cr054-surface-provider-terminal-errors-in-the-gui.md)
- [CR053: Clarify Effective Model in Agent Arguments Settings](cr053-clarify-effective-model-in-agent-arguments-settings.md)
- [CR052: Ship Generation-Ready Notice Contrast in Light Themes](cr052-ship-generation-ready-notice-contrast-in-light-themes.md)
- [CR039: Make Mirror Synchronization Recovery Actionable](cr039-make-mirror-synchronization-recovery-actionable.md)
- [CR038: Coalesce Composer Draft Persistence](cr038-coalesce-composer-draft-persistence.md)
- [CR037: Confirm App Closure While Agents Are Working](cr037-confirm-app-closure-while-agents-are-working.md)
- [CR036: Restore Generation Ready Notice Contrast in Light Themes](cr036-restore-generation-ready-notice-contrast-in-light-themes.md)
- [CR030 — Restore Journey Expansion Arrow Contrast in Light Themes](cr030-restore-journey-expansion-arrow-contrast-in-light-themes.md)
- [CR031 — Recover from Unrestorable Previous Response](cr031-recover-from-unrestorable-previous-response.md)
- [CR029 — Restore responsiveness for long conversations](cr029-restore-responsiveness-for-long-conversations.md)

CR061 is `in_progress` with Driver `@alissonvale` and Delivery `refinement/rs016-cr061-mirror-timestamp-idempotency`. It corrects the Alpha.13 defect where an initially persisted Mirror turn remains unsettled because Pi-backed recovery presents different timestamps for otherwise identical messages, producing `idempotency_conflict` without actionable GUI feedback.

CR056 is `promoted` to RS019 / CR057. The post-alpha.12 retained-lease incident proved that terminal finalization and secondary settlement debt still possess admission authority after Pi has stopped; RS019 removes that authority structurally rather than adding another isolated recovery patch.

CR055 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr055-provider-error-composer-release`. The Navigator accepted the implemented correction that clears stale Composer blocking after terminal provider failure, and Debt Review concluded `no_action`.

CR054 is `captured` and unassigned. It records the need to surface bounded provider terminal errors, such as ChatGPT usage-limit failures, instead of showing only a generic interrupted-attempt notice.

CR053 is `captured` and unassigned. It records the Settings confusion caused by showing literal `--provider` and `--model` values in editable Arguments even though the effective agent profile strips and reinjects provider/model/thinking at send time.

CR052 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr052-generation-ready-notice-contrast`. The Navigator accepted the light-theme generation-ready notice correction, and Debt Review concluded `no_action`.

CR039 is `promoted` to RS018 / CR040. Its recovery incident revealed the same competing-authority structure later reproduced by the Flip Podcast Segment checkpoint failure. Its original plan remains evidence, but its isolated implementation is superseded by the terminal-aligned Conversation authority contract.

CR038 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr038-coalesced-composer-drafts`. The Navigator accepted coalesced composer draft persistence and the rebuilt close-route flush behavior, and Debt Review concluded `no_action`.

CR037 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr037-confirm-app-closure`. The Navigator accepted the rebuilt dev app route: the main window `x` closes when idle, active/finalizing agent work requires explicit confirmation, and the light-theme explanation box contrast was corrected. Debt Review concluded `no_action`.

CR036 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr036-generation-ready-notice-contrast`. The Navigator accepted the rebuilt isolated Mirror Desktop Dev light-theme route, and Debt Review concluded `no_action`.

CR030 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr030-journey-expansion-arrow-contrast`. The Navigator accepted the rebuilt isolated Mirror Desktop Dev light-theme route, and Debt Review concluded `no_action`.

CR031 is `promoted` to RS017 after its bounded recovery experiment exposed a broader availability failure spanning projection, journal, outbox and successor admission. Its experimental branch remains evidence, not an independently validated release correction.

CR029 is `done`. Its accepted bounded delivery isolates transcript rendering, indexes immutable presentation and lazily materializes historical action detail without changing persistence, compaction or authority semantics.
