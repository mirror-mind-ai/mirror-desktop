[< Project roadmap](../roadmap/index.md)

# Refinement Workbench

This index is the canonical project record for Refinement Story and Change Request
backlog status for `mirror-desktop`. Linked documents preserve context and evidence; they do
not own status. If a linked document and this index disagree, this index wins.

The records below were materialized from the complete legacy Workbench inventory on
2026-09-09. From this point forward, this file and its linked documents are the sole
Refinement authority; SQLite must not be consulted or dual-written.

## Current Focus

- Refinement Story: RS019 — Post-Terminal Continuity
- Change Request: CR059 — Make Post-Terminal Settlement Independent and Run-Scoped

Selecting a focus is an explicit project decision. Reading this file never selects or
executes work.

## Refinement Stories

| Order | ID | Story | Status |
|------:|----|-------|--------|
| 1 | [RS001](rs001-signed-updater-channel-validation/index.md) | Signed updater channel validation | closed |
| 2 | [RS002](rs002-mirror-desktop-release-notes-generation/index.md) | Mirror Desktop release notes generation | closed |
| 3 | [RS003](rs003-alpha-channel-governance/index.md) | Alpha channel governance | closed |
| 4 | [RS004](rs004-governed-alpha-release-candidate/index.md) | Governed alpha release candidate | closed |
| 5 | [RS005](rs005-private-alpha-endpoint-publication/index.md) | Private alpha endpoint publication | closed |
| 6 | [RS006](rs006-windows-manual-build-handoff/index.md) | Windows manual build handoff | closed |
| 7 | [RS007](rs007-repository-publication-and-windows-handoff/index.md) | Repository publication and Windows handoff | closed |
| 8 | [RS008](rs008-mirrormind-sh-landing-page/index.md) | mirrormind.sh landing page | closed |
| 9 | [RS009](rs009-alpha-mirror-desktop-usage-feedback/index.md) | Alpha Mirror Desktop Usage Feedback | closed |
| 10 | [RS010](rs010-bilingual-website-repository-extraction/index.md) | Bilingual website repository extraction | closed |
| 11 | [RS011](rs011-conversation-surface-semantic-composition/index.md) | Conversation surface semantic composition | closed |
| 12 | [RS012](rs012-post-release-conversation-action-corrections/index.md) | Post-release conversation action corrections | closed |
| 13 | [RS013](rs013-roadmap-baseline-reconciliation/index.md) | Roadmap baseline reconciliation | closed |
| 14 | [RS014](rs014-transient-composer-notices/index.md) | Transient Composer Notices | closed |
| 15 | [RS015](rs015-light-theme-interaction-contrast/index.md) | Light Theme Interaction Contrast | closed |
| 16 | [RS016](rs016-ongoing-product-improvements-and-adjustments/index.md) | Ongoing Product Improvements and Adjustments | active |
| 17 | [RS017](rs017-reliable-agent-access/index.md) | Reliable Agent Access | closed |
| 18 | [RS018](rs018-terminal-aligned-conversation-continuity/index.md) | Terminal-Aligned Conversation Continuity | closed |
| 19 | [RS019](rs019-post-terminal-continuity/index.md) | Post-Terminal Continuity | active |

## Change Requests

Open work is ordered intentionally. Terminal history follows open work.

| Order | ID | RS | Change | Status | Driver | Delivery |
|------:|----|----|--------|--------|--------|----------|
| 1 | [CR059](rs019-post-terminal-continuity/cr059-make-post-terminal-settlement-independent-and-run-scoped.md) | RS019 | Make Post-Terminal Settlement Independent and Run-Scoped | captured | — | — |
| 2 | [CR060](rs019-post-terminal-continuity/cr060-rehearse-non-blocking-post-terminal-continuity.md) | RS019 | Rehearse Non-Blocking Post-Terminal Continuity | captured | — | — |
| 3 | [CR054](rs016-ongoing-product-improvements-and-adjustments/cr054-surface-provider-terminal-errors-in-the-gui.md) | RS016 | Surface Provider Terminal Errors in the GUI | captured | — | — |
| 4 | [CR053](rs016-ongoing-product-improvements-and-adjustments/cr053-clarify-effective-model-in-agent-arguments-settings.md) | RS016 | Clarify Effective Model in Agent Arguments Settings | captured | — | — |
| — | [CR058](rs019-post-terminal-continuity/cr058-remove-post-terminal-journal-state-from-conversation-admission.md) | RS019 | Remove Post-Terminal Journal State from Conversation Admission | done | @alissonvale | `refinement/rs019-cr058-journal-admission-release` |
| — | [CR057](rs019-post-terminal-continuity/cr057-separate-native-terminalization-from-journey-occupancy.md) | RS019 | Separate Native Terminalization from Journey Occupancy | done | @alissonvale | `refinement/rs019-cr057-terminal-occupancy-release` |
| — | [CR056](rs016-ongoing-product-improvements-and-adjustments/cr056-release-composer-after-completed-terminal-durable-lease.md) | RS016 | Release Composer After Completed Terminal-Durable Lease | promoted | — | `RS019 / CR057` |
| — | [CR055](rs016-ongoing-product-improvements-and-adjustments/cr055-release-composer-after-terminal-provider-error.md) | RS016 | Release Composer After Terminal Provider Error | done | @alissonvale | `refinement/rs016-cr055-provider-error-composer-release` |
| — | [CR052](rs016-ongoing-product-improvements-and-adjustments/cr052-ship-generation-ready-notice-contrast-in-light-themes.md) | RS016 | Ship Generation-Ready Notice Contrast in Light Themes | done | @alissonvale | `refinement/rs016-cr052-generation-ready-notice-contrast` |
| — | [CR038](rs016-ongoing-product-improvements-and-adjustments/cr038-coalesce-composer-draft-persistence.md) | RS016 | Coalesce composer draft persistence | done | @alissonvale | `refinement/rs016-cr038-coalesced-composer-drafts` |
| — | [CR049](rs018-terminal-aligned-conversation-continuity/cr049-complete-the-release-shaped-rs018-acceptance-route.md) | RS018 | Complete the Release-Shaped RS018 Acceptance Route | done | @alissonvale | `refinement/rs018-cr049-release-shaped-acceptance` |
| — | [CR051](rs018-terminal-aligned-conversation-continuity/cr051-repair-post-native-terminal-delivery-debt-from-pi-evidence.md) | RS018 | Repair Post-Native Terminal Delivery Debt from Pi Evidence | done | @alissonvale | `refinement/rs018-cr051-pi-backed-terminal-delivery-repair` |
| — | [CR050](rs018-terminal-aligned-conversation-continuity/cr050-accept-failed-native-leaves-as-interrupted-attempt-evidence.md) | RS018 | Accept Failed Native Leaves as Interrupted-Attempt Evidence | done | @alissonvale | `refinement/rs018-cr050-failed-native-leaf-evidence` |
| — | [CR048](rs018-terminal-aligned-conversation-continuity/cr048-explain-interrupted-native-attempts-without-blocking-continuity.md) | RS018 | Explain Interrupted Native Attempts Without Blocking Continuity | done | @alissonvale | `refinement/rs018-cr048-interrupted-attempt-notice` |
| — | [CR047](rs018-terminal-aligned-conversation-continuity/cr047-rehearse-terminal-aligned-continuity-under-failure.md) | RS018 | Rehearse Terminal-Aligned Continuity Under Failure | done | @alissonvale | `refinement/rs018-cr047-continuity-endurance-rehearsal` |
| — | [CR046](rs018-terminal-aligned-conversation-continuity/cr046-make-the-conversation-surface-pi-backed.md) | RS018 | Make the Conversation Surface Pi-Backed | done | @alissonvale | `refinement/rs018-cr046-pi-backed-conversation-surface` |
| — | [CR045](rs018-terminal-aligned-conversation-continuity/cr045-make-pre-agent-staging-non-authoritative.md) | RS018 | Make Pre-Agent Staging Non-Authoritative | done | @alissonvale | `refinement/rs018-cr045-pre-agent-staging-atomicity` |
| — | [CR044](rs018-terminal-aligned-conversation-continuity/cr044-materialize-mirror-delivery-debt-before-journal-pruning.md) | RS018 | Materialize Mirror Delivery Debt Before Journal Pruning | done | @alissonvale | `refinement/rs018-cr044-self-contained-mirror-delivery-debt` |
| — | [CR043](rs018-terminal-aligned-conversation-continuity/cr043-keep-bounded-turn-journal-retention-non-blocking.md) | RS018 | Keep Bounded Turn Journal Retention Non-Blocking | done | @alissonvale | `refinement/rs018-cr043-non-blocking-journal-retention` |
| — | [CR042](rs018-terminal-aligned-conversation-continuity/cr042-decouple-successor-admission-from-desktop-projections.md) | RS018 | Decouple Successor Admission from Desktop Projections | done | @alissonvale | `refinement/rs018-cr042-projection-independent-admission` |
| — | [CR041](rs018-terminal-aligned-conversation-continuity/cr041-reconstruct-desktop-conversations-from-pi-session.md) | RS018 | Reconstruct Desktop Conversations from the Pi Session | done | @alissonvale | `refinement/rs018-cr041-pi-session-transcript` |
| — | [CR040](rs018-terminal-aligned-conversation-continuity/cr040-establish-terminal-aligned-conversation-authority-contract.md) | RS018 | Establish the Terminal-Aligned Conversation Authority Contract | done | @alissonvale | `refinement/rs018-cr040-terminal-aligned-authority` |
| — | [CR039](rs016-ongoing-product-improvements-and-adjustments/cr039-make-mirror-synchronization-recovery-actionable.md) | RS016 | Make Mirror synchronization recovery actionable | promoted | — | `RS018 / CR040` |
| — | [CR037](rs016-ongoing-product-improvements-and-adjustments/cr037-confirm-app-closure-while-agents-are-working.md) | RS016 | Confirm app closure while agents are working | done | @alissonvale | `refinement/rs016-cr037-confirm-app-closure` |
| — | [CR036](rs016-ongoing-product-improvements-and-adjustments/cr036-restore-generation-ready-notice-contrast-in-light-themes.md) | RS016 | Restore generation-ready notice contrast in light themes | done | @alissonvale | `refinement/rs016-cr036-generation-ready-notice-contrast` |
| — | [CR030](rs016-ongoing-product-improvements-and-adjustments/cr030-restore-journey-expansion-arrow-contrast-in-light-themes.md) | RS016 | Restore Journey expansion arrow contrast in light themes | done | @alissonvale | `refinement/rs016-cr030-journey-expansion-arrow-contrast` |
| — | [CR035](rs017-reliable-agent-access/cr035-make-journey-authority-proportional.md) | RS017 | Make Journey Authority Proportional to the Operation | done | @alissonvale | `refinement/rs017-cr035-proportional-journey-authority` |
| — | [CR034](rs017-reliable-agent-access/cr034-replace-generic-retry-with-explicit-recovery-routes.md) | RS017 | Replace Generic Retry with Explicit Recovery Routes | done | @alissonvale | `refinement/rs017-cr034-explicit-recovery-routes` |
| — | [CR033](rs017-reliable-agent-access/cr033-separate-local-completion-from-mirror-synchronization.md) | RS017 | Separate Local Turn Completion from Mirror Synchronization | done | @alissonvale | `refinement/rs017-cr033-local-completion` |
| — | [CR032](rs017-reliable-agent-access/cr032-establish-conversation-availability-contract.md) | RS017 | Establish the Conversation Availability Contract | done | @alissonvale | `refinement/rs017-cr032-conversation-availability-contract` |
| — | [CR031](rs016-ongoing-product-improvements-and-adjustments/cr031-recover-from-unrestorable-previous-response.md) | RS016 | Recover from unrestorable previous response | promoted | @alissonvale | `refinement/rs016-cr031-unrestorable-response-recovery` |
| — | [CR029](rs016-ongoing-product-improvements-and-adjustments/cr029-restore-responsiveness-for-long-conversations.md) | RS016 | Restore responsiveness for long conversations | done | @alissonvale | `refinement/rs016-cr029-long-conversation-responsiveness` |
| — | [CR028](rs015-light-theme-interaction-contrast/cr028-restore-search-and-pending-file-contrast-in-light-themes.md) | RS015 | Restore search and pending-file contrast in light themes | done | @alissonvale | `refinement/rs015-cr028-light-theme-interaction-contrast` |
| — | [CR027](rs014-transient-composer-notices/cr027-auto-dismiss-transient-composer-notices.md) | RS014 | Auto-dismiss transient composer notices | done | @alissonvale | `refinement/rs014-cr027-transient-composer-notices` |
| — | [CR026](rs013-roadmap-baseline-reconciliation/cr026-reconcile-delivered-baseline-and-open-next-product-horizon.md) | RS013 | Reconcile delivered baseline and open the next product horizon | done | @alissonvale | `refinement/rs013-cr026-roadmap-baseline-reconciliation` |
| — | [CR014](unassigned/cr014-make-mirror-mind-site-repository-private.md) | — | Make Mirror Mind site repository private | done | — | — |
| — | [CR003](unassigned/cr003-generate-private-test-release-v0-1-1-test-1.md) | — | Generate private test release v0.1.1-test.1 | done | — | — |
| — | [CR025](rs012-post-release-conversation-action-corrections/cr025-separate-compound-and-empty-action-boundaries.md) | RS012 | Separate compound and empty action boundaries | done | — | — |
| — | [CR023](rs011-conversation-surface-semantic-composition/cr023-make-highlighted-blocks-consistently-copyable.md) | RS011 | Make highlighted blocks consistently copyable | done | @alissonvale | `refinement/rs011-cr023-semantic-code-block-copy` |
| — | [CR022](rs011-conversation-surface-semantic-composition/cr022-govern-action-tool-and-turn-disclosure.md) | RS011 | Govern action, tool, and turn disclosure | done | @alissonvale | `refinement/rs011-cr022-action-turn-disclosure` |
| — | [CR021](rs011-conversation-surface-semantic-composition/cr021-compose-agent-turns-into-semantic-groups.md) | RS011 | Compose agent turns into semantic groups | done | @alissonvale | `refinement/rs011-cr021-semantic-turn-composition` |
| — | [CR024](rs011-conversation-surface-semantic-composition/cr024-prevent-agent-output-flicker-when-turn-settles.md) | RS011 | Prevent agent output flicker when a turn settles | done | @alissonvale | `refinement/rs011-cr024-output-settlement-flicker` |
| — | [CR020](rs009-alpha-mirror-desktop-usage-feedback/cr020-tighten-journey-sidebar-header-layout.md) | RS009 | Tighten Journey sidebar header layout | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR018](rs009-alpha-mirror-desktop-usage-feedback/cr018-make-user-channel-source-build-updater-contract-explicit.md) | RS009 | Make user-channel source build updater contract explicit | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR016](rs009-alpha-mirror-desktop-usage-feedback/cr016-improve-light-theme-button-label-contrast-after-journey-start.md) | RS009 | Improve light-theme button label contrast after journey start | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR015](rs009-alpha-mirror-desktop-usage-feedback/cr015-add-artifact-tree-reload-and-investigate-missing-folders.md) | RS009 | Add artifact tree reload and investigate missing folders | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR012](rs009-alpha-mirror-desktop-usage-feedback/cr012-replace-completion-messages-with-finishing-status.md) | RS009 | Replace completion messages with Finishing status | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR019](rs009-alpha-mirror-desktop-usage-feedback/cr019-settle-provider-errors-without-permanent-working-state.md) | RS009 | Settle provider errors without permanent Working state | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR011](rs009-alpha-mirror-desktop-usage-feedback/cr011-context-usage-percentage-is-slow-or-missing.md) | RS009 | Context usage percentage is slow or missing | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR017](rs009-alpha-mirror-desktop-usage-feedback/cr017-keep-development-bundle-independent-from-updater-configuration.md) | RS009 | Keep development bundle independent from updater configuration | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR010](rs009-alpha-mirror-desktop-usage-feedback/cr010-composer-shift-enter-line-breaks-are-not-rendered-in-chat.md) | RS009 | Composer Shift+Enter line breaks are not rendered in chat | done | @alissonvale | `refinement/rs009-cr010-shift-enter-line-breaks` |
| — | [CR013](rs010-bilingual-website-repository-extraction/cr013-move-mirror-mind-site-into-bilingual-repository.md) | RS010 | Move Mirror Mind site into bilingual repository | done | — | — |
| — | [CR009](rs008-mirrormind-sh-landing-page/cr009-implement-mirrormind-sh-landing-page.md) | RS008 | Implement mirrormind.sh landing page | done | — | — |
| — | [CR008](rs007-repository-publication-and-windows-handoff/cr008-publish-repository-and-windows-manual-build-handoff.md) | RS007 | Publish repository and Windows manual build handoff | done | — | — |
| — | [CR007](rs006-windows-manual-build-handoff/cr007-document-simple-windows-manual-build-path.md) | RS006 | Document simple Windows manual build path | done | — | — |
| — | [CR006](rs005-private-alpha-endpoint-publication/cr006-publish-alpha-v0-2-0-alpha-1-to-private-endpoint.md) | RS005 | Publish alpha v0.2.0-alpha.1 to private endpoint | done | — | — |
| — | [CR005](rs004-governed-alpha-release-candidate/cr005-prepare-alpha-release-candidate-v0-2-0-alpha-1.md) | RS004 | Prepare alpha release candidate v0.2.0-alpha.1 | done | — | — |
| — | [CR004](rs003-alpha-channel-governance/cr004-define-alpha-channel-governance.md) | RS003 | Define alpha channel governance | done | — | — |
| — | [CR002](rs002-mirror-desktop-release-notes-generation/cr002-generate-mirror-desktop-release-notes-like-mirror-core.md) | RS002 | Generate Mirror Desktop release notes like Mirror Core | done | — | — |
| — | [CR001](rs001-signed-updater-channel-validation/cr001-configure-signed-updater-channel-before-real-self-update-validation.md) | RS001 | Configure signed updater channel before real self-update validation | done | — | — |

## Status Vocabulary

Refinement Story:

```text
proposed | active | parked | closed
```

Change Request:

```text
captured | planned | in_progress | blocked | validated | done | parked | rejected | promoted
```

Detailed phase history belongs in the CR document. The index records only the current
canonical status.

## Collaboration Convention

The complete route is defined in the [Collaborative Refinement Protocol](collaboration-protocol.md).

- `Driver` names one explicitly assigned human contributor.
- `Delivery` is a pull request link when one exists, otherwise a backticked Git branch.
- The canonical empty value is `—`.
- An `in_progress`, `blocked`, or `validated` CR must record both Driver and Delivery.
- Assignment, reassignment, commit, push, merge, publication, and release remain explicit
  Navigator decisions.

## Artifact Convention

- IDs are stable, project-wide `RSNNN` and `CRNNN` identifiers.
- Each RS owns one directory and one `index.md`.
- Each CR is one evolving Markdown document inside its RS directory.
- Legacy unassigned captures are preserved in `unassigned/`; new captures require an
  explicit RS target.
- Git owns history, collaboration, conflict resolution, and recovery.
- No document grants commit, push, merge, publication, or release authority.
