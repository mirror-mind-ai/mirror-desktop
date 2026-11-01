[< Refinement Workbench](../index.md)

# RS026 — After the 0.3 Cutover

**Status:** active

## Framing

Created by the Navigator on 2026-11-01, while CV-010 DS-005 phase 5c was being proven. Phase 5c moves
production to the 0.3 line ("one home path, one core"); the work that does not block that day is
gathered here so it has one place to wait and one order to be taken in.

This RS is a **queue, not a theme**. It owns the new CRs below, captured from the phase 5 rehearsals,
and it orders the open CRs that already live in other Refinement Stories. Those stay where they are
and are referenced, the same rule RS025 applies: moving a CR between stories rewrites history without
delivering anything.

## Intake Rules

- A CR enters only if it does **not** block the cutover. Anything that blocks the day is fixed
  before it, as CR165 was.
- Work starts after the cutover, on the 0.3 line only. `release/0.2` is frozen at alpha.58 and
  retired by the cutover, so nothing here is backported.
- Each new CR names the line and repository it touches; Core work goes through `mirror-ts`'s PR
  route and must only extend.

## New Change Requests

- [CR167: Keep a User's Claude Code Plugin Out of the Desktop's Own Turns](cr167-keep-a-users-claude-code-plugin-out-of-the-desktops-own-turns.md) — **captured** · Desktop + Core · affects new users who already use Claude Code with Mirror
- [CR168: Name a Channel Refusal Instead of invalid_record](cr168-name-a-channel-refusal-instead-of-invalid-record.md) — **captured** · Desktop
- [CR169: Tell a Dev Build Apart From the User Build](cr169-tell-a-dev-build-apart-from-the-user-build.md) — **captured** · Desktop
- [CR170: Pass the Invocation Directory to the Core Explicitly](cr170-pass-the-invocation-directory-to-the-core-explicitly.md) — **captured** · Core
- [CR171: Retire the nautilus_harness Interface Label](cr171-retire-the-nautilus-harness-interface-label.md) — **captured** · Desktop + Core data

## Queue After the Cutover

The proposed order. The Navigator can reorder it; the index's status column stays the authority.

| Order | CR | Home RS | Status | Why here |
|------:|----|---------|--------|----------|
| 1 | [CR166](../rs025-legible-endings-for-a-turn-that-ends-badly/cr166-recover-this-turn-does-nothing-on-a-turn-still-running.md) | RS025 | in_progress | an exit offered that does nothing; seen in the field on 0.3. First half on `main` (`11f8b96`): the exit now says which guard held it |
| 2 | [CR167](cr167-keep-a-users-claude-code-plugin-out-of-the-desktops-own-turns.md) | RS026 | captured | duplicated or misplaced memory for a new user, silently |
| 3 | [CR159](../rs025-legible-endings-for-a-turn-that-ends-badly/cr159-say-why-the-provider-refused-a-turn.md) | RS025 | in_progress | the real refusal arrived on 2026-11-01 ("Third-party apps now draw from your extra usage"); attach it and read it on 0.3 |
| 4 | [CR163](../rs025-legible-endings-for-a-turn-that-ends-badly/cr163-a-hung-mirror-append-freezes-every-exit.md) | RS025 | in_progress | field check owed, now on the TypeScript append |
| 5 | [CR168](cr168-name-a-channel-refusal-instead-of-invalid-record.md) | RS026 | captured | |
| 6 | [CR169](cr169-tell-a-dev-build-apart-from-the-user-build.md) | RS026 | captured | |
| 7 | [CR164](../rs025-legible-endings-for-a-turn-that-ends-badly/cr164-the-hung-append-test-races-its-own-stderr.md) | RS025 | captured | flaky test, test-only |
| 8 | [CR155](../rs025-legible-endings-for-a-turn-that-ends-badly/cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md), [CR161](../rs025-legible-endings-for-a-turn-that-ends-badly/cr161-give-every-finishing-the-same-exits.md) | RS025 | parked | unpark together with CR166, which touches the same exits |
| 9 | [CR170](cr170-pass-the-invocation-directory-to-the-core-explicitly.md) | RS026 | captured | Core |
| 10 | [CR171](cr171-retire-the-nautilus-harness-interface-label.md) | RS026 | captured | cosmetic in data, no hurry |
| — | [CR094](../rs022-mirror-core-debts/cr094-mirror-mode-activation-rebinds-desktop-conversation-journey.md) | RS022 | parked | re-read against the TypeScript Core before resuming |
| — | [CR131](../rs016-ongoing-product-improvements-and-adjustments/cr131-make-the-mirror-a-channel-validates-against-identifiable.md), [CR148](../rs016-ongoing-product-improvements-and-adjustments/cr148-give-an-unanswered-turn-back-its-own-identity.md), [CR156](../rs016-ongoing-product-improvements-and-adjustments/cr156-simplify-the-context-map.md), [CR157](../rs016-ongoing-product-improvements-and-adjustments/cr157-stop-moving-the-whole-conversation-through-every-settlement.md) | RS016 | captured | re-read against 0.3 first; some may no longer apply |
| — | [CR098](../rs021-ux-pre-beta-evolution/cr098-allow-a-journey-to-be-reparented.md), [CR099](../rs021-ux-pre-beta-evolution/cr099-allow-safe-editing-during-another-journeys-work.md) | RS021 | captured | product features, not defects |

## Not Change Requests

Housekeeping owed after the cutover is recorded in DS-005, not here: "Owed at the End of Phase 5"
(the stray `/tmp` folder, the unpushed `mirror-extensions` commits, the merged port branches and
worktree), the rehearsal leftovers (`ensaio-*` homes, `/private/tmp/5c*`), and retiring the Python
hooks, the Python `mirror-logger` and the Python-era `AGENTS.md` in `~/mirror`. See
[DS-005](../../roadmap/cv-010-first-run-assistant/ds-005-speak-to-the-typescript-core/index.md).
