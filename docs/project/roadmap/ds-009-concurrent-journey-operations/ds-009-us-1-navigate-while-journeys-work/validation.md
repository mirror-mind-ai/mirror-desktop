# Validation — DS-009.US-1

## Status

Passed

## Automated Checks

- npm test (76 files / 408 tests); npm run build; cargo test stable (41); cargo test --features development-channel (41); git diff --check

Checks status: passed

## E2E

Decision: required

Evidence: A DEV-only attempt used disposable Journey A (`sandbox-pet-store`) and Journey B (`journey-tree-homologation`) with exactly one new A invocation. The Journey behavior passed, but the validation route failed its stable-channel isolation condition and did not directly capture the transient Recording marker; details follow.

### Passed DEV observations

- A rendered `Working`; cancel was available only while running A was selected.
- Pointer navigation selected B while A continued working; keyboard Enter returned from B to A before native `done`.
- B stayed free of A messages, runtime activity, warnings, diagnostics, context, errors and cancel.
- B retained the editable draft `B DRAFT US1 ISOLATED` while Send and attachments were disabled; pressing Enter did not submit it.
- Settings could be opened read-only, while Save global defaults, Restore Harness defaults, Apply for this session and Reset session controls were disabled.
- Returning to A before `done` showed the current assistant/runtime snapshot and no `provider_interrupted` evidence.
- Returning after settlement showed exactly one new user/assistant pair. The persisted generation contained six messages total (four baseline plus the two new messages), three reconciliation turns total, latest turn states `committed/committed/committed`, classification `in_sync`, empty reason codes, and no interruption or failure code.
- B retained its isolated draft after settlement. No second invocation occurred.

### Failed or incomplete DEV observations

- The Recording transition completed between AX samples and was not directly captured. The deterministic suite covers this state, but the required integrated observation remains incomplete.
- The stable app was already running before the attempt. Because the debug and installed processes exposed the same accessibility bundle identity, an attempted Dev activation briefly targeted stable and selected Software Zen from the previously selected IA Agêntica presentation. Stable `journey-preferences.json` and `dedicated-journey-conversations/softwarezen/generation-1.json` were written at `2026-08-31T09:46:12-0300`. No stable invocation or promotion occurred, but this is still a fail-condition channel interaction.

### Required rerun boundary

Repeat only after explicitly closing the pre-existing stable app and recording a before/after stable app-data baseline. Use fresh disposable Dev Journeys, exactly one invocation for that route, and a high-frequency observer for the Recording transition.

## Isolated Incomplete DEV Rerun

A second controlled attempt used new disposable Journeys `US1 Rerun A 0831` and `US1 Rerun B 0831` with exactly one invocation in A. Stable and production isolation passed, and the high-frequency observer captured the transient owner phase, but the required A → B → A route was not exercised because the pointer target was resolved from a Pinned layout that reordered before the click.

### Passed observations

- A rendered `Working`, entered `Recording`, and settled normally.
- A 5 ms AX observer recorded the exact accessible transition `US1 Rerun A 0831 is recording the completed turn`, followed by `IDLE` and `completed_after_recording=true`.
- The settled A generation contained exactly one user/assistant pair with no blank or duplicate message.
- The only reconciliation turn classified `in_sync`; Harness, Pi, and Mirror states were `committed/committed/committed`, with empty reason codes and no failure or interruption.
- The stable app-data manifest was byte-for-byte identical before and after: 472 entries and aggregate SHA-256 `1a98660e5439d860488c9b30e5be0dbbdbb5e5f66253e0e60424650f2b2a7d2d`.
- The production Mirror database remained unchanged at size `92893184` and mtime `1788182123805850994` ns.

### Incomplete observations

- Pinned cards reordered after A became active. The pointer coordinate intended for B resolved to A's reordered card, so B was not selected.
- Pointer A → B, keyboard B → A, B isolation under occupancy, and Recording while B was selected were therefore not exercised in this rerun.
- No compensating click or second invocation was attempted.

### External evidence

- `/tmp/us1-rerun-runtime-phases.log`
- `/tmp/us1-rerun-recording-direct.png`
- `/tmp/us1-rerun-a-working.png`
- `/tmp/us1-stable-before.json`
- `/tmp/us1-stable-after.json`
- `/tmp/us1-production-db-before.json`
- `/tmp/us1-production-db-after.json`

## Failed Automated Pointer Validation

A third controlled attempt used new disposable DEV Journeys `US1 Final A 0831` and `US1 Final B 0831`, Tree view, and exactly one invocation in A. The environment was certified as Nautilus Harness Dev with the `DEV LAB` badge, `development` channel, bundle `com.nautilus.harness.dev`, development app-data, Mirror Dev home/database, and no stable process.

After A became `Working`, a new AX snapshot resolved B by the exact accessible name `US1 Final B 0831 Pin US1 Final B 0831`. Its fresh AX geometry was position `(102.0, 685.0)`, size `(212.0, 34.0)`, and the physical automation attempted `(162.0, 702.0)`. Immediate verification returned `selected_header=US1 Final A 0831`: the header remained in A. The procedure stopped immediately without a compensating click, keyboard navigation, or second invocation. This is evidence of automated pointer delivery/hit-testing failure, not yet a reproduced product pointer defect; the implementation retains its pointer handler and deterministic behavioral coverage.

The 5 ms AX observer captured A transitioning from `Working` to the exact accessible state `US1 Final A 0831 is recording the completed turn`, then `IDLE` and `completed_after_recording=true`. A settled with exactly one user/assistant pair, one reconciliation turn classified `in_sync`, Harness/Pi/Mirror states `committed/committed/committed`, empty reason codes, and no failure or interruption. B retained zero messages and zero turns.

Stable and production isolation remained exact. Stable contained 472 entries before and after with aggregate SHA-256 `1a98660e5439d860488c9b30e5be0dbbdbb5e5f66253e0e60424650f2b2a7d2d`. The production Mirror database retained size `92987392` and mtime `1788185203411348239` ns.

External evidence:

- `/tmp/us1-final-working-snapshot.txt`
- `/tmp/us1-final-pointer-b.png`
- `/tmp/us1-final-runtime-phases.log`
- `/tmp/us1-final-recording-after-pointer-failure.png`
- `/tmp/us1-final-stable-before.json`
- `/tmp/us1-final-stable-after.json`
- `/tmp/us1-final-production-db-before.json`
- `/tmp/us1-final-production-db-after.json`

## Human-Assisted Pointer Attempt

A fourth attempt used new disposable Journeys `US1 Assisted A 0831` and `US1 Assisted B 0831`, Tree view, one bounded invocation in A, and a human physical-pointer gesture. The environment was certified as Nautilus Harness Dev with `DEV LAB`, development bundle/app-data and no stable process.

The human pointer gesture successfully changed the selected header to `US1 Assisted B 0831`. B presented its own empty conversation with zero messages and zero reconciliation turns, no A runtime content and no cancel. This confirms that the product pointer handler responds to a physical human gesture and that the prior AX clicks were automation delivery/hit-testing failures.

The gesture arrived after A had already completed its approximately 114-second `Working` interval. The observer had recorded `Working`, then `Recording` with header A, then `IDLE` before the human click. Therefore B isolation and blocked controls under live occupancy, keyboard B → A during `Working`, and `Recording` while B remained selected were not exercised. No second invocation or compensating automated click occurred.

A settled with exactly one user/assistant pair and one reconciliation turn classified `in_sync`; Harness, Pi, and Mirror states were `committed/committed/committed`, with empty reason codes and no failure or interruption. Stable app-data remained byte-for-byte identical at 472 entries and aggregate SHA-256 `1a98660e5439d860488c9b30e5be0dbbdbb5e5f66253e0e60424650f2b2a7d2d`.

The production Mirror database comparison diverged and independently blocks acceptance: size remained `93016064`, but mtime changed from `1788186612999080274` ns to `1788187539641975535` ns across the human-assisted round trip. The Dev runtime remained bound to Mirror Dev, but the required production before/after equality did not hold. Dev was closed after settlement.

External evidence:

- `/tmp/us1-assisted-ready-for-human.png`
- `/tmp/us1-assisted-after-human-b.txt`
- `/tmp/us1-assisted-human-b.png`
- `/tmp/us1-assisted-phases.log`
- `/tmp/us1-assisted-recording.png`
- `/tmp/us1-assisted-stable-before.json`
- `/tmp/us1-assisted-stable-after.json`
- `/tmp/us1-assisted-production-db-before.json`
- `/tmp/us1-assisted-production-db-after.json`

## Attentive Human Pointer Attempt

A fifth attempt used new disposable Journeys `US1 Attentive A 0831` and `US1 Attentive B 0831`, Tree view, exactly one invocation in A, and an attentive human pointer gesture during occupancy. The physical click selected B while A was `Working`; immediate observation confirmed header B, B's own empty conversation, no A runtime content or cancel, disabled Send and attachments, and A still marked `Working`.

The high-frequency observer then captured `US1 Attentive A 0831 is recording the completed turn` with header `US1 Attentive B 0831`, followed by `IDLE` while B remained selected. A settled with exactly one user/assistant pair and one turn classified `in_sync`, states `committed/committed/committed`, empty reason codes, and no failure or interruption. This proves the product pointer route and Recording ownership while B is selected; previous physical AX click failures were validation-harness delivery limitations.

Keyboard B → A was not exercised. AX focus was assigned to A without first reactivating the Dev window; the subsequent synthetic text/Enter was delivered to the coding conversation instead of Nautilus. The mistake was detected, no keyboard result was claimed, and no second invocation occurred.

Stable remained byte-for-byte identical at 472 entries and SHA-256 `1a98660e5439d860488c9b30e5be0dbbdbb5e5f66253e0e60424650f2b2a7d2d`. With conversation logging muted before the baseline, the production Mirror database also remained exact at size `93020160` and mtime `1788188050837066459` ns.

External evidence:

- `/tmp/us1-attentive-ready.png`
- `/tmp/us1-attentive-human-B.png`
- `/tmp/us1-attentive-after-human-b.txt`
- `/tmp/us1-attentive-phases.log`
- `/tmp/us1-attentive-recording.png`
- `/tmp/us1-attentive-stable-before.json`
- `/tmp/us1-attentive-stable-after.json`
- `/tmp/us1-attentive-production-db-before.json`
- `/tmp/us1-attentive-production-db-after.json`

## Complete Human Navigation with Production Isolation Divergence

A sixth controlled attempt used `US1 Keyboard A 0831` and `US1 Keyboard B 0831`, Tree view, and exactly one bounded invocation in A. Stable and Dev were absent before launch; only the certified Nautilus Harness Dev runtime was opened with `DEV LAB`, the development channel, bundle/app-data `com.nautilus.harness.dev`, validated Mirror Dev coordinates, and conversation logging muted before the baseline.

During `Working`, a human pointer selected B. Observation confirmed header B, B's empty conversation, no A content or cancel, editable draft, disabled Send and attachments, and A still marked `Working`. The Dev window was then explicitly activated and A's exact fresh row focused. A human Enter selected A: the header returned to A, its current snapshot and cancel reappeared, A remained `Working`, and no `provider_interrupted` appeared. A second human pointer gesture selected B before completion.

The 5 ms observer captured `Recording` for A with header B and then `IDLE` while B remained selected. A final human pointer returned to A after settlement; the transcript was present without blanking or duplication. Persistence contained exactly one user/assistant pair and one reconciliation turn classified `in_sync`, states `committed/committed/committed`, empty reason codes, and no failure or interruption. B remained uninitialized with zero messages and turns; no second run occurred.

Stable isolation passed exactly: 472 entries before and after with SHA-256 `1a98660e5439d860488c9b30e5be0dbbdbb5e5f66253e0e60424650f2b2a7d2d`. Production Mirror isolation diverged despite muted conversation logging and the certified Dev coordinates: size remained `93024256`, but mtime changed from `1788190528215570617` ns to `1788191403057933403` ns. Therefore the complete behavioral route passed, but the mandatory isolation comparison keeps Validation blocked pending diagnosis or acceptance.

External evidence:

- `/tmp/us1-keyboard-ready.png`
- `/tmp/us1-keyboard-human-B.txt`
- `/tmp/us1-keyboard-A-focused-for-human-enter.png`
- `/tmp/us1-keyboard-after-enter.txt`
- `/tmp/us1-keyboard-ready-second-B.png`
- `/tmp/us1-keyboard-second-B-working.png`
- `/tmp/us1-keyboard-phases.log`
- `/tmp/us1-keyboard-recording.png`
- `/tmp/us1-keyboard-B-after-settlement.png`
- `/tmp/us1-keyboard-final-A.png`
- `/tmp/us1-keyboard-stable-before.json`
- `/tmp/us1-keyboard-stable-after.json`
- `/tmp/us1-keyboard-production-db-before.json`
- `/tmp/us1-keyboard-production-db-after.json`

## Production Mirror DB Forensic Attribution

A read-only forensic analysis covered `2026-08-31T15:35:28Z` through `2026-08-31T15:50:04Z`. The only writes attributable in that interval were eight messages from conversation `8a5008b2`, interface `pi`, journey `nautilus-harness`. The first message was written at `2026-08-31T15:43:55.997554Z`, the last at `2026-08-31T15:50:03.036221Z`, and the observed database mtime was `2026-08-31T15:50:03.057933Z`. No `runtime_session` update with interface `nautilus_harness` occurred in the interval. The same correlation recurred later between a Pi message at `2026-08-31T15:57:11.343928Z` and the database mtime at `15:57:11Z`.

The production `memory.db` mtime divergence was therefore caused by the Pi session coordinating validation, not Nautilus Harness Dev. The Dev process remained certified against the development channel, bundle/app-data `com.nautilus.harness.dev`, and Mirror Dev coordinates. Stable app-data remained byte-for-byte identical.

Absolute size/mtime equality is not a valid isolation criterion for a database shared with other authorized writers. Isolation evidence must instead attribute writes by interface, session and affected rows while also certifying the active Dev process coordinates. The reported `MUTED` state did not prevent the coordinating Pi session's writes; this is an external Mirror logging/infrastructure observation for separate investigation, not functional debt in DS-009.US-1.

## Navigator Validation

Route: Navigator directly performed and observed the complete DEV-only A → B → A → B route and accepted the read-only forensic attribution; no smoke repetition is required.

Navigator accepted: yes

Expected observation: A alone shows Working then Recording; B remains presentation-clean and draft-editable with submissions and mutations blocked; cancel is owner-only; returning to A restores its current correlated snapshot and exactly one settled turn.

Pass condition: The complete route passes with exactly one invocation, no cross-Journey leak or mutation, no provider_interrupted, blank, duplicate, failure, or second run, stable app-data unchanged, and no production write attributable to interface `nautilus_harness`.

Fail condition: Any cross-Journey leak, mutation availability, missing owner snapshot, provider_interrupted recovery, duplicate or blank turn, second invocation, stable-channel interaction, or production write attributable to interface `nautilus_harness`.

## Missing Evidence

- none

## Resolved Evidence

- Recording was captured directly by the 5 ms AX observer.
- Pointer A → B was proven by a human physical gesture during `Working`.
- Keyboard B → A was proven by a human Enter gesture during `Working`.
- Recording for A was captured while B remained selected.
- The complete route passed with exactly one invocation and one settled turn.
- Stable app-data remained byte-for-byte identical.
- The production database mtime divergence was diagnosed and attributed to the external Pi logger, with no `nautilus_harness` runtime-session update in the forensic window.
