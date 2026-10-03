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

- [CR118: Anchor a Segment to the History It Can See](cr118-anchor-a-segment-to-the-history-it-can-see.md) — captured
- [CR117: Make a Correction Legible While It Is Live](cr117-make-a-correction-legible-while-it-is-live.md) — done
- [CR116: Release a Journey Stranded in Finishing](cr116-release-a-journey-stranded-in-finishing.md) — done
- [CR115: Stop the Idle Post-Terminal Recovery Loop](cr115-stop-the-idle-post-terminal-recovery-loop.md) — done
- [CR096: Verify the Published Download Alias](cr096-verify-the-published-download-alias.md) — done
- [CR095: Record Each Journey Binding Repair as Durable Evidence](cr095-record-each-journey-binding-repair-as-durable-evidence.md) — done
- [CR093: Defend the Mirror Conversation Journey Binding](cr093-defend-the-mirror-conversation-journey-binding.md) — done
- [CR077: Reconstruct Reasoning from Pi Session Evidence](cr077-reconstruct-reasoning-from-pi-session-evidence.md) — done
- [CR076: Surface the Thinking Process of Every Model](cr076-surface-the-thinking-process-of-every-model.md) — done
- [CR075: Serve the Latest Release to Every Installed Version](cr075-serve-the-latest-release-to-every-installed-version.md) — done
- [CR074: One-Command Deterministic Release Deployment](cr074-one-command-deterministic-release-deployment.md) — done
- [CR073: Surface Stalled Provider Streams](cr073-surface-stalled-provider-streams.md) — dismissed
- [CR072: Load Navigator-Approved Provider Extensions Explicitly](cr072-load-navigator-approved-provider-extensions-explicitly.md) — done
- [CR071: Stop Offering Models the Desktop Invocation Cannot Run](cr071-stop-offering-models-the-desktop-invocation-cannot-run.md) — done
- [CR070: Restore Visibility of Pre-Agent Send Rejection](cr070-restore-visibility-of-pre-agent-send-rejection.md) — done
- [CR069: Stop Presenting Non-Fatal Provider Warnings as Unsent Messages](cr069-stop-presenting-non-fatal-provider-warnings-as-unsent-messages.md)
- [CR063: Align Synchronization Recovery Notice with the Presented Conversation](cr063-align-sync-recovery-notice-with-presented-conversation.md)
- [CR062: Make Post-Terminal Finalization Self-Healing and Actionable](cr062-make-post-terminal-finalization-self-healing-and-actionable.md)
- [CR061: Reconcile Mirror Append Timestamp Idempotency](cr061-reconcile-mirror-append-timestamp-idempotency.md)
- [CR056: Release Composer After Completed Terminal-Durable Lease](cr056-release-composer-after-completed-terminal-durable-lease.md)
- [CR055: Release Composer After Terminal Provider Error](cr055-release-composer-after-terminal-provider-error.md)
- [CR054: Surface Provider Terminal Errors in the GUI](cr054-surface-provider-terminal-errors-in-the-gui.md) — done
- [CR053: Clarify Effective Model in Agent Arguments Settings](cr053-clarify-effective-model-in-agent-arguments-settings.md) — done
- [CR052: Ship Generation-Ready Notice Contrast in Light Themes](cr052-ship-generation-ready-notice-contrast-in-light-themes.md)
- [CR039: Make Mirror Synchronization Recovery Actionable](cr039-make-mirror-synchronization-recovery-actionable.md)
- [CR038: Coalesce Composer Draft Persistence](cr038-coalesce-composer-draft-persistence.md)
- [CR037: Confirm App Closure While Agents Are Working](cr037-confirm-app-closure-while-agents-are-working.md)
- [CR036: Restore Generation Ready Notice Contrast in Light Themes](cr036-restore-generation-ready-notice-contrast-in-light-themes.md)
- [CR030 — Restore Journey Expansion Arrow Contrast in Light Themes](cr030-restore-journey-expansion-arrow-contrast-in-light-themes.md)
- [CR031 — Recover from Unrestorable Previous Response](cr031-recover-from-unrestorable-previous-response.md)
- [CR029 — Restore responsiveness for long conversations](cr029-restore-responsiveness-for-long-conversations.md)

CR116 is `done` with Driver `@alissonvale` and Delivery
`refinement/rs016-cr116-stranded-finalization-recovery`. The Navigator validated it in Dev on
2026-10-03. It resolves the incident where a Journey stayed in `Finishing` after its turn completed:
the three per-Journey serialization layers are bounded at 120 seconds, so an operation that never
settles rejects its caller and lets the queue continue; the repair route now relies on native
occupancy rather than the renderer's permanently-finalizing flag. The answer stayed durable in Pi
throughout. Proportionality review concluded proportional. Debt Review is `follow_up`: the exact
operation that hung remains unestablished and could justify phase-level observability later, but no
follow-up is selected.

CR117 was closed, **reopened** and closed again on 2026-10-03; it is `done` under @alissonvale with Delivery `refinement/rs016-cr117-delivered-reconciliation-guards`, captured the same day from two Navigator observations in daily
use. It was briefly recorded as a CR116 Phase 2 and promoted to its own CR before CR116's delivered
work was released, because one CR cannot coherently hold both a released phase and an unplanned one.
Its diagnosis established that the status vocabulary already models `applied` and already refuses it
without exact Pi evidence — what is missing is the timing, because the only producer of `applied`
runs on the terminal `done` event, so a live correction stays `Correction queued` until the turn
ends. It also established that corrections are rendered in the user prompt's row, the one part of the
turn guaranteed to be scrolled away when a correction is sent, and that the obvious way to observe
delivery would reread the whole Pi session, which CR114 measured at 55 MB. The plan therefore
required a bounded or event-driven signal and rejected full-session polling. The slice 1 spike then
found that Pi already emits `queue_update` carrying its own steering queue, which the Desktop was
discarding — an event-driven signal costing no reads at all. The same spike falsified the plan's
assumption that only call timing had to change: Pi mints a session entry id only at persistence, so
the live signal cannot produce `applied`, and a `delivered` state was added rather than weakening
`applied`'s exact-evidence contract. Slice 4 drew the
correction inside the card of the run it corrected and removed it from the prompt cluster; its
chronological-position detail was deliberately not built, because the run's trail mixes timestamped
messages with untimed note subdivisions and a spliced position would assert an order the data cannot
support. The wording says the correction reached the model's input, not that the model read it.

Homologation took two Dev rounds. Round 1 validated the placement and every terminal case but found
the status still stuck on queued, because the live transition was being written to the run's
conversation value and overwritten on the next statement by the ref that is a live run's steering
authority — an implicit rule this CR violated and then made explicit in `liveSteeringEvidence.ts`,
held by a test that reproduces the trap. Round 2 validated the live status. Round 2 also surfaced a
separate observation, recorded without a plan: a correction can end a turn rather than redirect it.
That was diagnosed read-only as model behaviour — the run settled as completed and its closing text
answered the correction — and no part of this CR changed what is sent to Pi, so it is not reachable
by a Desktop transport change. That closure was premature. Pulling CR097 found that a correction reaching
`delivered` never acquired `piUserEntryId`: the status list was hand-written in four places, and the
two guards in `App.tsx` deciding whether reconciliation runs had been missed. Round 1's observation
of `applied` had been valid only because the live transition was broken and the status sat at
`accepted`, which those guards do admit — so round 2's fix silently invalidated it. The CR was
reopened and the repair removed the duplication instead of patching the guards, closing two further
members of the same defect class with it. Proportionality review concluded proportional. Debt Review
was `follow_up` on four items with none selected: the turn-ending observation, reload recognisability
which belongs to CR097, the documented limit on chronological placement, and the fact that the work
is Dev-validated only with no published alpha carrying it. The Navigator validated the guard repair, which
closed the CR a second time. Proportionality remained proportional: the repair removed the
duplication that caused the drift rather than patching the guards, and closed two further members of
the same defect class with it. CR117 shares the
correction surface with CR097 and records an explicit boundary with it.

CR096 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr096-download-alias-verification`. It records that the blocking post-publication verification covers only the manifest URLs installed applications poll, leaving the site download alias `downloads/macos/mirror-desktop-latest.dmg` unchecked. Because staging and upload of that alias are both conditional on a DMG being supplied, a publication without one completes every stage, passes verification and prints success while the site keeps serving the previous installer. Verified by hand after v0.2.0-alpha.21, where the alias was byte-identical to the built artifact — correct, but confirmed after the fact rather than guaranteed. Implemented: verification now refuses to run without the published DMG digest, checks the alias version, its canonical target, its advertised URLs and the digest of the served bytes, and records all of it in the publication evidence. The Navigator validated it on 2026-09-26 after the new checks were run read-only against the already-published v0.2.0-alpha.21, with two negative controls confirming they block. Proportionality review concluded proportional; Debt Review concluded `follow_up`, recording that the prepare-to-publish digest hand-off is proven by reading state rather than by a run — it resolves on first use — and that GitHub Release assets stay unverified by explicit exclusion.

CR095 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr093-cr095-journey-binding-defense`. It closes the observability gap CR093's Dev homologation revealed: the Journey binding repair healed silently and recorded nothing, so attribution was only possible by elimination across `runtime_sessions`. It adds bounded durable provenance for each performed rebind beside the outbox, following the CR087 conflict-record pattern, plus a bounded read command. It deliberately adds no Navigator-visible notice: a single repair is ordinary self-healing, and CR086 settled that self-repairing state must not become visible flicker. The Navigator validated it on 2026-09-26 after Dev homologation produced exactly one record naming `cr093-drift-decoy` as the previous Journey — which also became the first direct confirmation that CR093's repair, rather than a Mirror-side side effect, performs the write. Proportionality review concluded proportional; Debt Review concluded `follow_up`, recording that nothing reads the evidence yet and that the honest priority is the upstream correction in RS022 / CR094 rather than a notice for a defect we intend to eliminate.

CR093 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr093-cr095-journey-binding-defense`. The Navigator validated it on 2026-09-26 after Dev homologation on Journey `sandbox-pet-store` proved a deliberately drifted Journey binding heals inside the delivery with no visible notice and no extra journal revisions, with the Mirror Mode side-effect confound excluded because no `runtime_sessions` row was touched. Proportionality review concluded proportional; Debt Review concluded `follow_up`, recording CR095 and the unit-test-only coverage of the ownership refusal. It records the 2026-09-26 incident in which a Mirror Mode activation without an explicit Journey rebound a Desktop-provisioned Mirror conversation to another Journey, sending two accepted turns to the wrong Journey and leaving the next turn permanently rejected with `mirror_append_journey_mismatch` while the convergence routine retried it as if transient. Its implemented scope is Desktop self-defense: rejection classification by whether repetition can change the outcome, immediate attention for bounded contract rejections, and ownership-proved re-assertion of the Journey binding through the Mirror support scripts the Desktop already ships. Mirror core is out of scope and unavailable for modification; the upstream defect is registered as [RS022](../rs022-mirror-core-debts/index.md) / CR094. Navigator homologation of the repair path in a built bundle remains outstanding.

CR063 is `promoted` into [RS020](../rs020-convergent-turn-synchronization/index.md). Its partial presented-projection correction remains in the refinement baseline; its two recorded false-positive diagnoses (2026-09-20 and 2026-09-21, identical settled durable evidence with a stale renderer replica) are founding evidence for the RS020 structural treatment.

CR062 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr062-post-terminal-self-healing`. The Navigator accepted its exact model-free recovery from the zero-outbox frontier after production-backed Eval homologation settled the preserved turn, emptied the Journey outbox, retained exact Mirror message identity and preserved Pi JSONL without provider execution. Subsequent manual Eval validation accepted the transient-notice and stable Composer-placeholder corrections. Debt Review concluded `no_action`; push, merge, publication, release and Stable installation remain separately governed.

CR061 is `done` with Driver `@alissonvale` and Delivery `refinement/rs016-cr061-mirror-timestamp-idempotency`. The Navigator accepted the Desktop-only timestamp-idempotency correction after production-backed Eval validation removed both target items from the outbox, committed both exact generation projections and cleared the synchronization notice without provider execution. Debt Review concluded `no_action`.

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
