[< Refinement Workbench](../index.md)

# RS019: Post-Terminal Continuity

**Status:** active

## Framing

RS018 established the correct authority contract: Pi JSONL owns the agent transcript, native process occupancy owns only active execution, Desktop projections are rebuildable views and Mirror synchronization is independent delivery debt. Sustained alpha use after RS018 closure showed that the runtime still keeps one important pre-RS018 coupling.

When Pi reaches an exact terminal outcome, the native registry releases process capacity but retains a same-Journey `finalizing` lease until Desktop projection, journal, outbox and acknowledgement work finishes. Frontend admission treats any registry entry as same-Journey occupancy and also feeds a correlated non-successor-eligible journal record into `localAdmissionReady`. A failure after Pi termination can therefore preserve the complete response in JSONL while disabling the Composer. Relaunch makes the same Journey usable because the process-local registry disappears, proving that the retained block was not durable execution authority.

CR055 fixed one interrupted provider-error route, and CR056 captured the equivalent completed `terminal_durable` route. These are symptoms of the same remaining authority defect rather than independent recovery features.

## Desired Outcome

Once an exact Pi process is terminal and no writer remains active, the Journey becomes available for a successor immediately. Projection publication, journal advancement, outbox materialization, Mirror delivery, acknowledgement and presentation recovery continue as bounded run-scoped debt without retaining Journey occupancy.

Pi JSONL remains the sole transcript authority. Control-plane binding remains exact and fail-closed. No recovery path retries the provider implicitly, discards evidence or allows two active Pi writers for the same Journey.

## Authority Contract

- `reserved` and `running` exact native executions may occupy a Journey.
- Unknown native occupancy may block while bounded inspection completes.
- A terminal registry entry with released process capacity is finalization debt, not Journey occupancy.
- A `terminal_durable`, `projected`, `outbox_enqueued` or `settled` journal record is evidence/debt and cannot independently set `canSend` false.
- Desktop projection, Segment and Mirror failures degrade presentation or delivery only.
- A new run must never let late cleanup from an older run remove, overwrite or misclassify the successor.
- All post-terminal work remains exact, idempotent and keyed by immutable run, turn and Pi entry identity.

## Work Shape

RS019 removes the remaining gate in four ordered slices:

1. separate terminal finalization from Journey occupancy in the native registry and frontend admission;
2. remove post-terminal journal/projection state from Conversation availability;
3. make projection, outbox and acknowledgement work safely independent and run-scoped after occupancy release;
4. rehearse every post-terminal failure frontier and prove immediate successors without restart.

Each CR must preserve current evidence and exact routing. Availability is corrected before cleanup machinery is simplified.

## Acceptance Horizon

RS019 is complete only when fault injection at every post-terminal frontier proves:

- the exact response remains reconstructible from Pi JSONL;
- the Composer becomes available after native terminalization without relaunch;
- a successor starts while older projection or delivery debt remains unresolved;
- late finalization for the older run cannot affect the successor;
- no provider call is retried implicitly;
- debt remains visible, bounded and explicitly recoverable.

Validation must include completion, provider failure, cancellation, process death, stale/missing Desktop projection, outbox failure, Mirror outage, acknowledgement failure, concurrent Journeys and application relaunch.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Production app data remains read-only evidence unless a separate recovery operation is explicitly authorized.
- No production Conversation repair is implied by implementation or validation.
- No Mirror Core schema or runtime change is required.
- No weakening of Journey/thread/generation/Pi-session binding is permitted.
- No implicit provider retry, provider fallback or model substitution is permitted.
- Push, merge, publication, release, stable promotion, notarization and installation remain separate Navigator decisions.

## Change Requests

- [CR060: Rehearse Non-Blocking Post-Terminal Continuity](cr060-rehearse-non-blocking-post-terminal-continuity.md)
- [CR059: Make Post-Terminal Settlement Independent and Run-Scoped](cr059-make-post-terminal-settlement-independent-and-run-scoped.md)
- [CR058: Remove Post-Terminal Journal State from Conversation Admission](cr058-remove-post-terminal-journal-state-from-conversation-admission.md)
- [CR057: Separate Native Terminalization from Journey Occupancy](cr057-separate-native-terminalization-from-journey-occupancy.md)

CR057 is `done` with Driver `@alissonvale` and Delivery `refinement/rs019-cr057-terminal-occupancy-release`. The Navigator accepted the implementation, automated gates and isolated DEV proof that exact native terminalization releases active occupancy, terminal debt remains bounded/inspectable, and an immediate same-Journey successor completes without relaunch after forced post-terminal projection failure. Proportionality/debt review concluded `no_action`, and terminal closure was explicitly authorized.

CR058 is `done`. The Navigator accepted its automated and same-process DEV validation, and the proportionality/debt review concluded `no_action`. Retained post-terminal journal evidence remains available for diagnosis and explicit model-free recovery but no longer participates in Conversation admission or the live submission guard.

CR059 is `done` with Driver `@alissonvale` and Delivery `refinement/rs019-cr059-run-scoped-settlement`. The Navigator accepted the native exact-receipt merge, successor-safe frontend publication, run-scoped settlement diagnostics, automated gates and proportional isolated DEV rehearsal. Its proportionality/debt review concluded `no_action`, and terminal closure was explicitly authorized.

CR060 is `validated`, with Driver `@alissonvale` and Delivery `refinement/rs019-cr060-post-terminal-rehearsal`. The Navigator accepted its bounded private-data-free 4 × 7 evidence contract, complete automated matrix, same-process successor proof and relaunch continuity, including the disclosed one-time development-Mirror provisioning deviation. Proportionality and debt review remain before terminal closure; RS019 closure remains a separate decision.

CR056 is promoted from RS016 to RS019 / CR057 as production evidence of completed terminal evidence being misclassified as retained occupancy.
