[< RS016](index.md)

# CR055: Release Composer After Terminal Provider Error

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr055-provider-error-composer-release`

## Problem

After a provider invocation terminates with an error before producing an assistant response, Mirror Desktop can remain blocked behind the notice:

```text
The agent is still finishing the previous message
The preserved attempt remains unchanged until exact native inactivity is established.
```

In the observed production alpha.10 case, the underlying provider error was:

```text
Error: You have hit your ChatGPT usage limit (plus plan).
```

The GUI then stayed in the blocking `still finishing` state until the app was restarted. Restarting the app caused the state to clear or be reclassified, which suggests the native process had already reached a terminal/error state but the live UI did not reconcile occupancy, lease or blocking journal state promptly.

## Expected Behavior

When the provider/Pi path has reached a terminal failure and no assistant answer exists, Mirror Desktop should not remain indefinitely blocked as if the agent were still finishing.

The app should:

- reconcile exact native inactivity without requiring an app restart;
- preserve the failed attempt as evidence;
- keep the Composer available once no exact native execution remains active;
- avoid implicit provider retry;
- present user-readable language rather than internal phrases such as `exact native inactivity`.

## Impact

The current behavior makes a terminal provider failure look like a still-running or unsafe local operation. The user cannot continue from the GUI even though the provider has already failed, and the only discovered escape hatch is restarting the app.

This undermines the Terminal-Aligned Conversation Continuity goal: native occupancy should block only while exact active execution remains. A terminal provider error should become interruption/failure evidence, not a persistent live lease.

## Evidence

Navigator screenshot supplied on 2026-09-19 from installed alpha.10 shows the `Mirror Desktop` Journey with a completed prior assistant message above, then a blocked Composer area displaying:

```text
The agent is still finishing the previous message
The preserved attempt remains unchanged until exact native inactivity is established.
```

The Composer placeholder says:

```text
The previous local turn must be made safe before another message can be sent.
```

Navigator reported that the message remained until the app was restarted. The known underlying provider error for the same scenario was a ChatGPT usage-limit failure.

Code inspection identifies this surface as `showBlockingTurnRecoveryNotice` with `blockingTurnAwaitingNativeLease`, where a `blockingTurnJournalRecord` and selected native lease cause the app to treat the previous turn as still finishing.

## Plan Decision

The Navigator pulled this CR for implementation, confirmed Driver `@alissonvale` and Delivery `refinement/rs016-cr055-provider-error-composer-release`, and authorized implementation. Commit remains locally authorized by standing project convention when files change. Push, merge, publication and release remain separate decisions.

## Proposed Scope

- Inspect the provider-error terminal path, process registry cleanup, `inspect_pi_invocations()` refresh, selected native lease projection and turn journal recovery classification.
- Determine why terminal provider failure can leave `blockingTurnAwaitingNativeLease` true or recovery routes unavailable until relaunch.
- Ensure terminal provider errors become inactive interrupted/failure evidence without requiring restart.
- Replace or augment internal wording around `exact native inactivity` with user-facing language.
- Preserve fail-closed behavior when native occupancy is genuinely unknown or active.
- Add focused regression coverage for terminal provider error, stale live lease cleanup/reinspection and Composer availability.

## Acceptance

- A provider terminal error before assistant completion does not leave the Composer blocked indefinitely.
- Once exact native occupancy is inactive, the Composer is available for a successor message.
- The failed attempt remains preserved and visible as interrupted or failed evidence.
- No provider retry is started automatically.
- Genuine active native execution still blocks successor sends.
- The user-facing notice avoids internal terminology such as `exact native inactivity`.
- Relaunch is not required to clear the stale `still finishing` state.

## Implementation

The interrupted terminal path now explicitly clears the selected Journey's blocking turn journal state after `executeInterruptedSettlement()` completes. That settlement already saves the interrupted projection and calls `releaseDurablePiInvocationLease`, which releases and reinspects the native registry. The added cleanup mirrors the completed-turn path's explicit state release so the Composer is not left blocked behind a stale `blockingTurnJournalRecord` after a terminal provider failure.

The correction is intentionally narrow. It does not change native lease authority, provider execution, retry behavior, transcript authority, Mirror synchronization or recovery route classification. If cleanup fails, the existing fail-closed warning path remains in force.

## Validation

- `npm test -- --run src/tests/journeyRuntimeIntegration.test.ts`: passed, 12 tests.
- `npm test -- --run src/tests/journeySettlement.test.ts src/tests/piInvocationOccupancy.test.ts src/tests/composerTurnStatus.test.ts`: passed, 35 tests.
- `npm test -- --run`: passed, 153 files and 836 tests.
- `npm run build`: passed. Vite emitted the existing chunk-size advisory only.

## Navigator Validation

Accepted by the Navigator after reviewing the implemented correction and validation evidence. The behavior is approved for closure.

## Proportionality Review

The correction is proportional: it adds only selected-Journey UI state cleanup after the existing interrupted settlement frontier has already saved the interrupted projection and released/reinspected the exact native lease. It does not weaken fail-closed occupancy, alter provider execution, introduce retry, change transcript authority, or broaden recovery routes.

## Debt Review

**Decision:** no_action

No additional debt is accepted. CR054 remains the separate captured need to surface provider terminal errors in the GUI; CR055 only resolves stale Composer blocking after terminal provider failure.

## Outcome

Done. The app now clears stale blocking turn journal state after an interrupted terminal settlement releases/reinspects the exact native lease. The Navigator accepted closure.

## Relationship To CR054

CR054 concerns error visibility: the user should see the provider error, such as a usage-limit message.

This CR concerns live-state recovery and Composer availability: the app should not remain blocked behind a stale `still finishing`/native lease state after the provider has already failed terminally.

The CRs may share evidence and implementation surfaces, but they remain separable acceptance concerns.

## Exclusions

- No automatic retry.
- No provider credential management changes.
- No automatic model/provider switching.
- No change to Pi JSONL transcript authority.
- No production data mutation as part of capture.
- No push, merge, publication or release.

## Authority Boundary

Selected and implementation-authorized. Push, merge, publication and release remain separate Navigator decisions.
