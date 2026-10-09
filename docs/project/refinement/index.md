[< Project roadmap](../roadmap/index.md)

# Refinement Workbench

This index is the canonical project record for Refinement Story and Change Request
backlog status for `mirror-desktop`. Linked documents preserve context and evidence; they do
not own status. If a linked document and this index disagree, this index wins.

The records below were materialized from the complete legacy Workbench inventory on
2026-09-09. From this point forward, this file and its linked documents are the sole
Refinement authority; SQLite must not be consulted or dual-written.

## Current Focus

- Refinement Story: RS023
- Change Request: CR133 is the next pull. RS023 was promoted from CR109 on 2026-10-08, after the
  Navigator prioritised it as the last fragile point of the app. The characterisation recorded in
  the Story showed its four symptoms are not one change: `expandJourneyConversations` selects before
  it expands, one `Record<journeyId, Entry>` serves a Journey and its conversations alike, the
  sidebar's *Show N more* is the app's truncation cap rather than a Navigator choice, and the Rust
  registry indexes `entries` by `journey_id`. The first three are renderer and preference work,
  independently releasable; the fourth is an authority change in Rust, so CR136 is gated behind the
  other three reaching the field. CR133 goes first because it is the fix for the reported
  instability — losing access to work in flight
- Note: this index orders open work intentionally, but the numeric Order column has collisions
  (Order 1 and 4 are held by terminal and open rows alike), so CR133–CR136 carry `—` like every CR
  added since CR126 and their priority is recorded here instead. Reconciling that column is an open
  Workbench decision, not a correction this entry made
- Note: CR107, CR108 and CR111 had documents and no index row at all, the same gap CR109 had. All
  three are `done` and were already listed in RS021's own index with Driver and Delivery, so their
  rows were added as a factual repair rather than a scope decision. `npm run roadmap:check` did not
  catch any of the four, because `scripts/roadmap_consistency.mjs` never reads CR documents
- Change Request: CR121 and CR123 are `done` and their field readings are recorded in
  `docs/update/alpha-36-production-reading-2026-10-05.md`: CR123 verified outright, with
  `livro-lideranca-soberana` writing its first receipt at `historicalMessageCount: 344`, the value
  predicted from the store before the release. CR121 is verified in structure — both new phases
  present, 0 ms each, which confirms deleting its timing slice was right — but its `failure`
  payload is still unexercised, because CR123 removed the failure it was going to describe
- Change Request: CR122 is `done`. Its owed production reading is recorded in
  `docs/update/alpha-35-production-reading-2026-10-05.md`: no conversation lost a message, the heal is
  exact wherever the new build has read, and the settlement-success claim still waits on one ordinary
  turn. Found by pursuing an open question in the settlement model
  (`docs/architecture/settlement-durable-state-model.md` §5a): the harness checkpoint records the
  loaded surface's length, which CR114 made scope-dependent, so bounded commits are refused as
  regressions, 17 production turns sit with a pending harness body, that body is CR121's throw, and
  12 of 20 Journeys read `conflicted` because reason codes never clear. Content is safe in Mirror.
  Recommended as the next pull, ahead of CR120 and in place of CR121's investigation
- Change Request: CR110 is `done`. Mirror refuses a create when any Journey row changed since the
  Desktop loaded its tree — the Navigator's own `mm-journey` path update is enough — and the only
  recovery was leaving the form to reload and retype. The form now reloads the tree itself, keeps a
  create whose parent still exists and whose id is still free, and asks for one more Confirm under a
  new request id; a real conflict names what changed. Nothing is retried on its own
- Change Request: CR100 is `parked` as a Mirror core debt, recorded in RS022's register. Its title
  is inaccurate and kept for traceability: Journey images are device-local and work. What fails is the
  Edit Journey dialog's Save changes, which submits `update_journey` — an operation no Mirror core
  accepts, so renaming a Journey from the Desktop has never worked. Revisit trigger recorded;
  containment is open
- Change Request: CR130 is `done` and **field-verified in production** (2026-10-08). Set, change and
  clear each wrote a receipt on `agentic-ai-for-delphi-consulting`; the digest chain is unbroken back to
  alpha.40 and the final digest reproduces over 79 rows. The path operations had never run before in
  this Mirror's history
- Change Request: CR132 is `done`. `Finishing` is displayed exactly when the run is not running and
  `cancelVisible` requires it to be running, so the label and a visible Cancel were mutually exclusive
  by construction while `sendBlocked` was true. Implementation found the root: CR116 made recovery able
  to repair a stopped settlement, but nothing clears the renderer's `isFinalizingTurn` except the
  settlement block's own `finally`, which never runs when its `await` never returns — so the durable
  state could be fully repaired while the composer stayed locked forever. The act ends the wait and
  records it, releases no lease and writes no competing turn record, and is withheld while native
  execution is active because occupancy admission and CR115/CR116's repair refusal share one predicate
- Change Request: CR127 is `done`. The root cause the plan had written off as unrecoverable was
  recovered by exercising the producer instead of chasing the lost artifact: a fresh Pi session has no
  entries, so the Rust writer emitted `null` for coordinates it did not have, and the parser correctly
  refused it. The writer now omits them, the parser names its predicate, an unreadable manifest no
  longer abandons a settled turn, and a cross-language golden-file test pins the two derivations
  together. One production manifest still carried the defect and it belongs to `o-sentido-do-ser`,
  which explains one of the five manifest-only Journeys and not the others
- Change Request: CR131 is `captured`. The Dev and production channels bind to different Mirror
  checkouts exposing different `journey mutate` contracts, and both report version `0.31.14`. A Dev
  validation of CR130 would have reported the defect as nonexistent, because in Dev the refused
  submission succeeds. Characterisation first: version is not a contract identifier
- Change Request: CR130 is `done`. The Edit Journey dialog submitted an operation Mirror's
  `journey mutate` contract never accepted, so Save changes could not succeed and had not since
  2026-09-02. The operation is gone from the type union, the project path now changes through the two
  operations core does accept, name and description are shown read-only with the reason, and a form
  that changed nothing writes nothing. Three guards re-aimed, none deleted
- Change Request: CR129 is `captured`. A settlement repaired by recovery writes no record at all:
  `recoverPostTerminalPersistence` never opens a collector, so the ledger keeps the failure and
  nothing after it. This has blocked a diagnosis twice in two days, in both directions —
  `mirror-mind` where the ledger said failed and the journal said completed, and `softwarezen`
  where a published claim had to be corrected to "not established" for want of a phase trace
- Change Request: CR127 is `planned`, on a cause established from the record CR121 already writes:
  `failure.phase = load_segments`, `failure.reason = "Conversation Segment authority is invalid."`
  The manifest is derived in Rust and validated in TypeScript by two independently written rule
  sets, and an unparseable manifest is fatal while an absent one is benign — §5b inverted. The
  capture's receipt-ordering mechanism and its determinism claim are both falsified and corrected
  at the source
- Change Request: CR128 is `done`. Recovery now pairs stale records against unclaimed *requests*
  rather than closed turns, interrupts a record only when a later request proves its run is over, and
  names a trailing open request instead of judging it. Replayed over the store: the two `softwarezen`
  records resolve, two others stay exactly where they were. Field verification owed. Originally:
  CR128 was `captured`. A machine restart mid-turn, then `continue`, left two journal
  records at `running` for a single Pi turn the agent actually closed — so `match_unclaimed_pi_turn`
  refuses with `mirror_append_pi_recovery_ambiguous` (stale 2, unclaimed 1) and the refusal is
  permanent. A 952-character answer closed at `12:36:07Z` is in the Pi session, absent from the
  conversation, never delivered to Mirror, and the Journey reports `Finishing` for work nobody is
  doing. This is the debt recorded when CR126 closed, under a cause nobody anticipated
- Change Request: CR127 is `captured`. Every newly created Journey's first settlement fails its
  inline path: `load_segments` requires `complete.json`, which only `publish_segments` can mint, and
  publication runs after the load. Witnessed on `alpha.38` in `mirror-mind`. The turn itself
  completed through recovery, which is what makes the deeper finding instrumental — recovery opens no
  collector, so a rescued settlement is indistinguishable from a failed one
- Change Request: CR126 is `done`. A run is one invocation and an invocation starts once, so the
  request is the **first** user entry after the baseline the native side already computes — no
  claim crosses the boundary and no text is interpreted. D3 came out simpler than planned: one
  re-derivation of the turn a recorded pair spans reproduces the old shape for an old pair and
  the new shape for a new one, so no fallback was needed. Verified at scale: **573 of 573**
  stored evidence pairs in production re-derive exactly, zero mismatches. The nine wrong records
  and seven Mirror messages are deliberately not repaired

- Change Request: CR097 is `done`. Slice 1 falsified the capture — steering evidence survives
  now, so the persistence half was resolved by the baseline — and slices 2–5 then found the
  capture's premise wrong: a corrected turn records the **correction** as its own
  `pi.userEntryId`, so the correction was wearing the request's harness identity and the request
  was the orphaned message. The first claim rule refused all 8 real corrections and would have
  shipped inert. Corrected, **8 of 8** are honoured: the correction leaves the transcript and the
  request takes its identity back. The upstream wrong record is recorded as debt
- Change Request: CR125 is `done`. Direction 1 taken: manual scroll anchoring, supplying what
  WKWebView does not implement. The reader's topmost visible message and its screen offset are
  recorded on scroll and restored in a layout effect before paint, so the previous turn
  collapsing into its summary no longer carries the reader's place with it. Planning established
  that the bottom-pinned reader is already stable — the scroller's clamp and the content shift
  cancel exactly — which is why scoping the fix to a reader who has scrolled away is the whole
  fix rather than half of one, and why direction 3 was recorded as unnecessary

- Change Request: CR124 is `done`. The publish-time immutability byte-compare is replaced by a
  deferral to the published file, which is the authority for a closed chapter; integrity is still
  enforced on read by hash against the receipt. Replayed across the store, **all fourteen**
  Journeys' compactions now succeed, and `mirror-desktop` heals `segment-30` on the way. The
  tempting smaller fix — narrowing the settlement bundle like the manual path already does — was
  rejected because it would have made CR120's healing permanently unreachable

- Change Request: CR120 is `done`. Its three slices shipped and are correct — emptiness is now
  judged before the prior-current exemption, an empty published file is healed rather than
  defended, and the shared-anchor shape is pinned end to end including the native wiring. Its
  closure **corrects its own prediction**: `segment-30`'s 22 messages are restored at the next
  compaction and that compaction still fails, on `segment-31`, for the reason CR124 now carries

- Change Request: CR097, pulled into focus on 2026-10-03 by explicit Navigator intent. It is
  `in_progress` under @alissonvale on `refinement/rs021-cr097-restored-correction-identity`. Pulling
  it executed the slice 1 instruction to record CR117's landing, and that record inverted one of
  this CR's premises: CR117's live signal carries no Pi entry id, so it cannot produce `applied`, and
  it introduced `delivered` into the domain while missing the two App guards at `App.tsx:3053` and
  `App.tsx:1741` that decide whether reconciliation runs. A correction that reaches `delivered` —
  CR117's own happy path — therefore never acquires `piUserEntryId`, which is the exact identity
  CR097 consumes. That defect belongs to CR117 and was repaired there after the Navigator reopened
  it, so this CR is no longer blocked. The captured order below is a ranking, not an instruction to
  execute.

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
| 19 | [RS019](rs019-post-terminal-continuity/index.md) | Post-Terminal Continuity | closed |
| 20 | [RS020](rs020-convergent-turn-synchronization/index.md) | Convergent Turn Synchronization | closed |
| 21 | [RS021](rs021-ux-pre-beta-evolution/index.md) | UX Pre-Beta Evolution | active |
| 22 | [RS022](rs022-mirror-core-debts/index.md) | Mirror Core Debts | active |
| 23 | [RS023](rs023-conversations-as-first-class-workspaces/index.md) | Conversations as First-Class Workspaces | active |

## Change Requests

Open work is ordered intentionally. Terminal history follows open work.

| Order | ID | RS | Change | Status | Driver | Delivery |
|------:|----|----|--------|--------|--------|----------|
| — | [CR133](rs023-conversations-as-first-class-workspaces/cr133-stop-a-disclosure-from-selecting-a-journey.md) | RS023 | Stop a Disclosure From Selecting a Journey | captured | — | — |
| — | [CR134](rs023-conversations-as-first-class-workspaces/cr134-name-the-workspace-that-owns-the-work.md) | RS023 | Name the Workspace That Owns the Work | captured | — | — |
| — | [CR135](rs023-conversations-as-first-class-workspaces/cr135-let-the-navigator-hide-a-conversation-without-deleting-it.md) | RS023 | Let the Navigator Hide a Conversation Without Deleting It | captured | — | — |
| — | [CR136](rs023-conversations-as-first-class-workspaces/cr136-admit-concurrent-work-inside-one-journey.md) | RS023 | Admit Concurrent Work Inside One Journey | captured | — | — |
| — | [CR109](rs021-ux-pre-beta-evolution/cr109-make-conversations-first-class-workspaces.md) | RS021 | Make Conversations First-Class Workspaces | promoted | — | `RS023 / CR133–CR136` |
| — | [CR107](rs021-ux-pre-beta-evolution/cr107-make-existing-journeys-startable.md) | RS021 | Make Existing Journeys Startable | done | @alissonvale | `refinement/rs021-cr107-startable-journeys` |
| — | [CR108](rs021-ux-pre-beta-evolution/cr108-stop-one-unrecoverable-turn-from-blocking-recovery.md) | RS021 | Stop One Unrecoverable Turn from Blocking Recovery | done | @alissonvale | `refinement/rs021-cr107-startable-journeys` |
| — | [CR111](rs021-ux-pre-beta-evolution/cr111-preserve-agent-comment-trail-across-turns.md) | RS021 | Preserve the Agent Comment Trail Across Turns | done | @alissonvale | `refinement/rs021-cr111-agent-comment-trail` |
| — | [CR126](rs016-ongoing-product-improvements-and-adjustments/cr126-stop-a-correction-from-becoming-its-own-turn.md) | RS016 | Stop a Correction From Becoming Its Own Turn | done | @alissonvale | `refinement/rs016-cr126-corrected-turn-request-identity` |
| — | [CR127](rs016-ongoing-product-improvements-and-adjustments/cr127-let-a-journey-s-first-turn-settle-without-a-receipt-it-cannot-have.md) | RS016 | Let a Journey's First Turn Settle Without a Receipt It Cannot Have | done | — | — |
| — | [CR129](rs016-ongoing-product-improvements-and-adjustments/cr129-let-a-recovered-settlement-say-it-happened.md) | RS016 | Let a Recovered Settlement Say It Happened | captured | — | — |
| — | [CR131](rs016-ongoing-product-improvements-and-adjustments/cr131-make-the-mirror-a-channel-validates-against-identifiable.md) | RS016 | Make the Mirror a Channel Validates Against Identifiable | captured | — | — |
| — | [CR132](rs016-ongoing-product-improvements-and-adjustments/cr132-let-the-navigator-end-a-finishing-that-will-not-end.md) | RS016 | Let the Navigator End a Finishing That Will Not End | done | — | — |
| — | [CR128](rs016-ongoing-product-improvements-and-adjustments/cr128-give-back-the-answer-a-restart-and-continue-strands.md) | RS016 | Give Back the Answer a Restart-and-Continue Strands | done | @alissonvale | `refinement/rs016-cr128-restart-and-continue-recovery` |
| 3 | [CR097](rs021-ux-pre-beta-evolution/cr097-keep-a-correction-recognisable-after-reload.md) | RS021 | Keep a Correction Recognisable After Reload | done | @alissonvale | `refinement/rs021-cr097-restored-correction-identity` |
| — | [CR125](rs021-ux-pre-beta-evolution/cr125-keep-the-reader-s-place-when-a-turn-settles.md) | RS021 | Keep the Reader's Place When a Turn Settles | done | @alissonvale | `refinement/rs021-cr125-conversation-scroll-anchor` |
| — | [CR110](rs021-ux-pre-beta-evolution/cr110-make-journey-creation-recover-from-registry-change.md) | RS021 | Make Journey Creation Recover from Registry Change | done | @alissonvale | `refinement/rs021-cr110-rebase-stale-create-intent` |
| — | [CR130](rs021-ux-pre-beta-evolution/cr130-stop-offering-a-journey-edit-that-cannot-succeed.md) | RS021 | Stop Offering a Journey Edit That Cannot Succeed | done | @alissonvale | `refinement/rs021-cr130-stop-offering-an-edit-that-cannot-succeed` |
| — | [CR117](rs016-ongoing-product-improvements-and-adjustments/cr117-make-a-correction-legible-while-it-is-live.md) | RS016 | Make a Correction Legible While It Is Live | done | @alissonvale | `refinement/rs016-cr117-delivered-reconciliation-guards` |
| — | [CR118](rs016-ongoing-product-improvements-and-adjustments/cr118-anchor-a-segment-to-the-history-it-can-see.md) | RS016 | Anchor a Segment to the History It Can See | done | @alissonvale | `refinement/rs016-cr118-segment-anchor-tolerance` |
| — | [CR119](rs016-ongoing-product-improvements-and-adjustments/cr119-give-finishing-back-to-the-navigator.md) | RS016 | Give Finishing Back to the Navigator | done | @alissonvale | `refinement/rs016-cr119-settlement-phase-timing` |
| — | [CR123](rs016-ongoing-product-improvements-and-adjustments/cr123-let-a-journey-mint-its-first-publication-receipt.md) | RS016 | Let a Journey Mint Its First Publication Receipt | done | @alissonvale | `refinement/rs016-cr123-first-publication-receipt` |
| — | [CR122](rs016-ongoing-product-improvements-and-adjustments/cr122-make-the-checkpoint-count-the-same-thing-every-turn.md) | RS016 | Make the Checkpoint Count the Same Thing Every Turn | done | @alissonvale | `refinement/rs016-cr122-harness-checkpoint-identity` |
| — | [CR121](rs016-ongoing-product-improvements-and-adjustments/cr121-name-the-settlement-that-fails-before-recovery-saves-it.md) | RS016 | Name the Settlement That Fails Before Recovery Saves It | done | @alissonvale | `refinement/rs016-cr121-settlement-failure-legibility` |
| — | [CR124](rs016-ongoing-product-improvements-and-adjustments/cr124-stop-verifying-a-published-chapter-against-a-moving-projection.md) | RS016 | Stop Verifying a Published Chapter Against a Moving Projection | done | @alissonvale | `refinement/rs016-cr124-published-chapter-authority` |
| — | [CR120](rs016-ongoing-product-improvements-and-adjustments/cr120-stop-a-closing-chapter-from-erasing-its-own-file.md) | RS016 | Stop a Closing Chapter From Erasing Its Own File | done | @alissonvale | `refinement/rs016-cr120-closing-chapter-write-guard` |
| — | [CR116](rs016-ongoing-product-improvements-and-adjustments/cr116-release-a-journey-stranded-in-finishing.md) | RS016 | Release a Journey Stranded in Finishing | done | @alissonvale | `refinement/rs016-cr116-stranded-finalization-recovery` |
| 1 | [CR112](rs021-ux-pre-beta-evolution/cr112-host-a-journey-s-declared-workflow.md) | RS021 | Host a Canvas the Journey's Agent Draws | done | @alissonvale | `refinement/rs021-cr112-host-journey-workflow` |
| 2 | [CR105](rs021-ux-pre-beta-evolution/cr105-transform-the-artifact-tab-into-an-agentic-map.md) | RS021 | Transform the Artifact Tab into the Context Surface | done | @alissonvale | `refinement/rs021-cr105-agentic-map` |

| 4 | [CR099](rs021-ux-pre-beta-evolution/cr099-allow-safe-editing-during-another-journeys-work.md) | RS021 | Allow Safe Editing During Another Journey's Work | captured | — | — |
| 5 | [CR098](rs021-ux-pre-beta-evolution/cr098-allow-a-journey-to-be-reparented.md) | RS021 | Allow a Journey to Be Reparented | captured | — | — |
| 6 | [CR100](rs021-ux-pre-beta-evolution/cr100-make-journey-image-updates-supported.md) | RS021 | Make Journey Image Updates Supported | parked | — | — |
| 7 | [CR113](rs021-ux-pre-beta-evolution/cr113-make-composer-typing-responsive-in-large-journeys.md) | RS021 | Make Composer Typing Responsive in Large Journeys | done | @alissonvale | `refinement/rs021-cr113-rs016-cr115-typing-responsiveness` |
| 8 | [CR114](rs021-ux-pre-beta-evolution/cr114-make-the-current-segment-the-default-working-set.md) | RS021 | Make the Current Segment the Default Working Set | done | @alissonvale | `refinement/rs021-cr114-current-segment-working-set` |
| 9 | [CR115](rs016-ongoing-product-improvements-and-adjustments/cr115-stop-the-idle-post-terminal-recovery-loop.md) | RS016 | Stop the Idle Post-Terminal Recovery Loop | done | @alissonvale | `refinement/rs021-cr113-rs016-cr115-typing-responsiveness` |
| 10 | [CR104](rs021-ux-pre-beta-evolution/cr104-make-compaction-failures-actionable-and-expirable.md) | RS021 | Make Compaction Failures Actionable and Expirable | done | @alissonvale | `refinement/rs021-cr104-actionable-compaction-failures` |
| 11 | [CR103](rs021-ux-pre-beta-evolution/cr103-give-the-composer-model-status-a-human-register.md) | RS021 | Give the Composer Model Status a Human Register | done | @alissonvale | `refinement/rs021-cr103-human-model-status` |
| 12 | [CR102](rs021-ux-pre-beta-evolution/cr102-make-sidebar-progress-signals-legible.md) | RS021 | Make Sidebar Progress Signals Legible | done | @alissonvale | `refinement/rs021-cr102-sidebar-progress` |
| 13 | [CR106](rs021-ux-pre-beta-evolution/cr106-use-green-for-ready-completion-signals.md) | RS021 | Use Green for Ready Completion Signals | done | @alissonvale | `refinement/rs021-cr106-ready-green` |
| 14 | [CR101](rs021-ux-pre-beta-evolution/cr101-restore-window-geometry.md) | RS021 | Restore Window Geometry | done | @alissonvale | `refinement/rs021-cr101-window-geometry` |
| 15 | [CR096](rs016-ongoing-product-improvements-and-adjustments/cr096-verify-the-published-download-alias.md) | RS016 | Verify the Published Download Alias | done | @alissonvale | `refinement/rs016-cr096-download-alias-verification` |
| 16 | [CR095](rs016-ongoing-product-improvements-and-adjustments/cr095-record-each-journey-binding-repair-as-durable-evidence.md) | RS016 | Record Each Journey Binding Repair as Durable Evidence | done | @alissonvale | `refinement/rs016-cr093-cr095-journey-binding-defense` |
| 17 | [CR093](rs016-ongoing-product-improvements-and-adjustments/cr093-defend-the-mirror-conversation-journey-binding.md) | RS016 | Defend the Mirror Conversation Journey Binding | done | @alissonvale | `refinement/rs016-cr093-cr095-journey-binding-defense` |
| 18 | [CR094](rs022-mirror-core-debts/cr094-mirror-mode-activation-rebinds-desktop-conversation-journey.md) | RS022 | Mirror Mode Activation Rebinds a Desktop Conversation's Journey | parked | — | — |
| 19 | [CR086](rs021-ux-pre-beta-evolution/cr086-suppress-transient-synchronization-notices.md) | RS021 | Suppress Transient Synchronization Notices | done | @alissonvale | `refinement/rs021-cr086-suppress-transient-sync-notice` |
| 20 | [CR087](rs021-ux-pre-beta-evolution/cr087-project-the-visible-user-request-exactly.md) | RS021 | Project the Visible User Request Exactly | done | @alissonvale | `refinement/rs021-cr087-idempotent-outbox-enqueue` |
| 21 | [CR088](rs021-ux-pre-beta-evolution/cr088-stop-flashing-the-preserved-attempt-panel.md) | RS021 | Stop Flashing the Preserved Attempt Panel | done | @alissonvale | `refinement/rs021-cr088-preserved-attempt-panel` |
| 22 | [CR089](rs021-ux-pre-beta-evolution/cr089-preserve-the-interrupted-partial-response.md) | RS021 | Preserve the Interrupted Partial Response | done | @alissonvale | `refinement/rs021-cr089-preserve-interrupted-partial-response` |
| 23 | [CR084](rs021-ux-pre-beta-evolution/cr084-recenter-to-conversation-end.md) | RS021 | Recenter to Conversation End | done | @alissonvale | `refinement/rs021-cr084-recenter-to-end` |
| 24 | [CR090](rs021-ux-pre-beta-evolution/cr090-run-scoped-model-authority.md) | RS021 | Run-Scoped Model Authority | done | @alissonvale | `refinement/rs021-cr090-run-scoped-model-authority` |
| 25 | [CR078](rs021-ux-pre-beta-evolution/cr078-model-intents.md) | RS021 | Model Intents | done | @alissonvale | `refinement/rs021-cr078-model-intents` |
| 26 | [CR091](rs021-ux-pre-beta-evolution/cr091-attribute-each-response-to-its-model.md) | RS021 | Attribute Each Response to Its Model | done | @alissonvale | `refinement/rs021-cr091-response-model-attribution` |
| 27 | [CR081](rs021-ux-pre-beta-evolution/cr081-agent-running-animation.md) | RS021 | Agent Running Animation | done | @alissonvale | `refinement/rs021-cr081-agent-running-animation` |
| 28 | [CR083](rs021-ux-pre-beta-evolution/cr083-agent-comments-continuity.md) | RS021 | Agent Comments Continuity | done | @alissonvale | `refinement/rs021-cr083-agent-comments-continuity` |
| 29 | [CR082](rs021-ux-pre-beta-evolution/cr082-collapsed-sidebar-polish.md) | RS021 | Collapsed Sidebar Polish | done | @alissonvale | `refinement/rs021-cr082-collapsed-sidebar-polish` |
| 30 | [CR085](rs021-ux-pre-beta-evolution/cr085-close-without-quitting.md) | RS021 | Close Without Quitting | done | @alissonvale | `refinement/rs021-cr085-close-without-quitting` |
| 31 | [CR079](rs021-ux-pre-beta-evolution/cr079-deep-context-stats-analysis.md) | RS021 | Always Legible Context Reading | done | @alissonvale | `refinement/rs021-cr079-deep-context-stats-analysis` |
| 32 | [CR080](rs021-ux-pre-beta-evolution/cr080-compaction-chapters.md) | RS021 | Compaction Chapters | done | @alissonvale | `refinement/rs021-cr080-compaction-chapters` |
| 33 | [CR092](rs021-ux-pre-beta-evolution/cr092-float-the-recenter-control-over-the-conversation.md) | RS021 | Float the Recenter Control Over the Conversation | done | @alissonvale | `refinement/rs021-cr092-floating-recenter-control` |
| 34 | [CR077](rs016-ongoing-product-improvements-and-adjustments/cr077-reconstruct-reasoning-from-pi-session-evidence.md) | RS016 | Reconstruct Reasoning from Pi Session Evidence | done | @alissonvale | `refinement/rs016-cr077-reconstruct-reasoning` |
| 35 | [CR076](rs016-ongoing-product-improvements-and-adjustments/cr076-surface-the-thinking-process-of-every-model.md) | RS016 | Surface the Thinking Process of Every Model | done | @alissonvale | `refinement/rs016-cr076-model-agnostic-reasoning` |
| 36 | [CR075](rs016-ongoing-product-improvements-and-adjustments/cr075-serve-the-latest-release-to-every-installed-version.md) | RS016 | Serve the Latest Release to Every Installed Version | done | @alissonvale | `refinement/rs016-cr075-update-to-latest` |
| 37 | [CR074](rs016-ongoing-product-improvements-and-adjustments/cr074-one-command-deterministic-release-deployment.md) | RS016 | One-Command Deterministic Release Deployment | done | @alissonvale | `refinement/rs016-cr074-one-command-release-deploy` |
| 38 | [CR070](rs016-ongoing-product-improvements-and-adjustments/cr070-restore-visibility-of-pre-agent-send-rejection.md) | RS016 | Restore Visibility of Pre-Agent Send Rejection | done | @alissonvale | `refinement/rs016-cr070-unsent-notice-visibility` |
| 39 | [CR072](rs016-ongoing-product-improvements-and-adjustments/cr072-load-navigator-approved-provider-extensions-explicitly.md) | RS016 | Load Navigator-Approved Provider Extensions Explicitly | done | @alissonvale | `refinement/rs016-cr072-global-pi-extensions` |
| 40 | [CR071](rs016-ongoing-product-improvements-and-adjustments/cr071-stop-offering-models-the-desktop-invocation-cannot-run.md) | RS016 | Stop Offering Models the Desktop Invocation Cannot Run | done | @alissonvale | `refinement/rs016-cr071-unavailable-models` |
| 41 | [CR054](rs016-ongoing-product-improvements-and-adjustments/cr054-surface-provider-terminal-errors-in-the-gui.md) | RS016 | Surface Provider Terminal Errors in the GUI | done | @alissonvale | `refinement/rs016-cr054-provider-terminal-errors` |
| 42 | [CR073](rs016-ongoing-product-improvements-and-adjustments/cr073-surface-stalled-provider-streams.md) | RS016 | Surface Stalled Provider Streams | dismissed | — | — |
| 43 | [CR053](rs016-ongoing-product-improvements-and-adjustments/cr053-clarify-effective-model-in-agent-arguments-settings.md) | RS016 | Clarify Effective Model in Agent Arguments Settings | done | @alissonvale | `refinement/rs016-cr053-effective-model-clarity` |
| — | [CR068](rs020-convergent-turn-synchronization/cr068-accept-the-frictionless-conversation-through-release-shaped-validation.md) | RS020 | Accept the Frictionless Conversation Through Release-Shaped Validation | done | @alissonvale | `refinement/rs020-cr068-release-shaped-acceptance` |
| — | [CR069](rs016-ongoing-product-improvements-and-adjustments/cr069-stop-presenting-non-fatal-provider-warnings-as-unsent-messages.md) | RS016 | Stop Presenting Non-Fatal Provider Warnings as Unsent Messages | done | @alissonvale | `refinement/rs016-cr069-non-fatal-provider-warnings` |
| — | [CR067](rs020-convergent-turn-synchronization/cr067-unify-recovery-into-one-idempotent-convergence-routine.md) | RS020 | Unify Recovery into One Idempotent Convergence Routine | done | @alissonvale | `refinement/rs020-cr067-unified-convergence` |
| — | [CR066](rs020-convergent-turn-synchronization/cr066-extract-a-serialized-turn-finalization-coordinator-from-the-renderer.md) | RS020 | Extract a Serialized Turn Finalization Coordinator from the Renderer | done | @alissonvale | `refinement/rs020-cr066-finalization-coordinator` |
| — | [CR065](rs020-convergent-turn-synchronization/cr065-derive-synchronization-status-from-durable-evidence-only.md) | RS020 | Derive Synchronization Status from Durable Evidence Only | done | @alissonvale | `refinement/rs020-cr065-durable-sync-status` |
| — | [CR064](rs020-convergent-turn-synchronization/cr064-encode-the-multi-turn-happy-path-as-an-executable-contract.md) | RS020 | Encode the Multi-Turn Happy Path as an Executable Contract | done | @alissonvale | `refinement/rs020-cr064-happy-path-contract` |
| — | [CR063](rs016-ongoing-product-improvements-and-adjustments/cr063-align-sync-recovery-notice-with-presented-conversation.md) | RS016 | Align Synchronization Recovery Notice with the Presented Conversation | promoted | @alissonvale | `RS020 / CR064–CR065` |
| — | [CR062](rs016-ongoing-product-improvements-and-adjustments/cr062-make-post-terminal-finalization-self-healing-and-actionable.md) | RS016 | Make Post-Terminal Finalization Self-Healing and Actionable | done | @alissonvale | `refinement/rs016-cr062-post-terminal-self-healing` |
| — | [CR061](rs016-ongoing-product-improvements-and-adjustments/cr061-reconcile-mirror-append-timestamp-idempotency.md) | RS016 | Reconcile Mirror Append Timestamp Idempotency | done | @alissonvale | `refinement/rs016-cr061-mirror-timestamp-idempotency` |
| — | [CR060](rs019-post-terminal-continuity/cr060-rehearse-non-blocking-post-terminal-continuity.md) | RS019 | Rehearse Non-Blocking Post-Terminal Continuity | done | @alissonvale | `refinement/rs019-cr060-post-terminal-rehearsal` |
| — | [CR059](rs019-post-terminal-continuity/cr059-make-post-terminal-settlement-independent-and-run-scoped.md) | RS019 | Make Post-Terminal Settlement Independent and Run-Scoped | done | @alissonvale | `refinement/rs019-cr059-run-scoped-settlement` |
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
