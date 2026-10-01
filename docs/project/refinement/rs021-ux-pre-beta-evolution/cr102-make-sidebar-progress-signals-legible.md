[< RS021](index.md)

# CR102: Make Sidebar Progress Signals Legible

**Status:** in_progress
**Driver:** —
**Delivery:** —

## Friction

The sidebar does not yet show progress icons adequately. The Navigator cannot reliably read a
Journey's current progress from the existing icon treatment.

## Outcome

Each visible progress signal has a single, legible meaning and accurately reflects the Journey's
current state without competing with selection, pinning, image or agent-status signals.

## Scope — 2026-10-01

"Progress" here means **agent activity**, confirmed by the Navigator. The Outcome above lists
`agent-status` among the signals progress must not compete with, which read as though a separate
durable signal were intended; `status` and `stage` do reach every sidebar item and are rendered
nowhere. That is a real omission, but it is not this CR. It stays unclaimed.

`queued` is struck from this CR by Navigator decision. It has no referent: `JourneyRuntimeOwnerPhase`
is `"running" | "finalizing"`, and there is no admission queue a Journey can sit in. Representing it
would be fiction.

The states this CR owns are therefore **idle, working, finishing, ready, interrupted and failed**.

## First Investigation

Capture the current sidebar across idle, working, finishing, ready, failed and interrupted
states, in expanded and collapsed layouts and both themes. Identify which signal is missing,
ambiguous, stale or visually insufficient before proposing a new icon language.

## Acceptance

- The intended progress states are distinguishable at normal sidebar reading distance.
- A state change is reflected without requiring navigation away and back.
- Signals stay truthful after completion, interruption, failure and app restart.
- The treatment remains readable in collapsed mode, light theme and reduced-motion conditions.

## Diagnosis — 2026-10-01

### Working and Finishing are nearly the same signal, and on light themes exactly the same

Both derive from `var(--accent)` and differ only in lightness and border alpha. Measured contrast
between the two colours, dark themes:

| Accent | Working vs Finishing |
| --- | --- |
| teal (default) | 1.15 |
| green | 1.17 |
| gold | 1.18 |
| blue | 1.34 |
| rose | 1.33 |
| violet | 1.39 |

On the light families the CSS groups them into one rule, `.journey-agent-status:is(.working,
.finishing)`, so they are identical by construction — same colour, same background, same border. This
is the defect CR106 found and fixed for Ready only; its own comment records that the light contract
"grouped Working, Finishing and Ready into one colour by construction". Ready was lifted out of the
group and the other two were left inside.

### On light themes the active states are the least legible

Contrast of the signal against its own badge background, light families:

| State | Contrast |
| --- | --- |
| Working / Finishing, teal | **2.33** |
| Working / Finishing, green | **2.41** |
| Working / Finishing, gold | **2.43** |
| Working / Finishing, blue | 3.21 |
| Working / Finishing, rose | 3.23 |
| Working / Finishing, violet | 3.47 |
| Idle | 4.97 |
| Ready | 4.59 |

Three accents fall below the 3:1 floor for a non-text element. Idle and Ready clear it comfortably,
so the states that report the agent *doing something* are the hardest to see.

### Reduced motion removes the only remaining difference

`@media (prefers-reduced-motion: reduce)` drops the animation from Working, Finishing and Ready.
Motion is what currently separates Working from Finishing, so under that preference the two collapse:
nearly identical on dark themes at 1.15, and pixel-identical on light ones. The acceptance criterion
naming reduced motion fails today, measurably.

### Shape carries nothing among the non-terminal states

Only Ready has a glyph of its own — the CR106 disc with the check knocked out. Idle, Working and
Finishing all render the same dot, 6px expanded and 4px in the rail. Everything rests on colour and
motion, which is exactly where the measurements fail.

### In the rail the contrast cannot be measured at all

The compact badge is absolutely positioned over the Journey mark with a `rgba(255, 255, 255, 0.025)`
background — effectively transparent. When a Journey carries a custom image the signal sits on
arbitrary pixels, so there is no backdrop to measure against. The problem is not a poor ratio; it is
the absence of a defined one.

### Two of the six states are not representable

`deriveJourneyAgentStatus` yields idle, working, finishing and finished. Failure and interruption
collapse into idle, because `finishedAttention` is recorded only when `runTerminal === undefined`.
No icon language can repair that — it is a domain gap.

Read-only authority for both already exists and is durable per Journey. `list_turn_journal` returns
the records, `terminalOutcome` distinguishes `cancelled` from `failed`, and
`decideTurnJournalRecovery` already treats `admitted`, `running` and `interrupted` phases as an
interruption — which is precisely a run that died without settling, the case a restart produces.

Restart truthfulness applies to interruption and failure, which are durable. It does not apply to
Ready: CR106 made Ready a single transient arrival that expires, so losing it across a restart is
correct rather than a defect.

## Design Direction

**Topology carries the state; colour and motion reinforce it.** Six glyphs that stay distinct at rail
size, in greyscale, and with motion disabled: Idle an outline ring, Working a solid disc, Finishing a
disc with a hollow centre, Ready the CR106 disc and check unchanged, Interrupted a disc with a bar,
Failed a disc with a slash. This answers the Working/Finishing collapse, the reduced-motion failure
and the empty shape channel with one decision rather than three.

**Registers stay out of the accent where meaning is fixed.** Following CR106's `--ui-success`,
failure gets its own register per theme family. Interruption does not borrow it: the Navigator chose
to stop, which is not a fault, so it reads in a held register rather than a danger one. Working and
Finishing remain accent-derived, because that activity is the app's own and the accent is the
Navigator's choice.

**The light grouping is split and the floor is measured.** `.working` and `.finishing` get separate
rules, and every one of the six accents must clear 3:1 on all three light families, measured rather
than assumed.

**The rail badge gets a defined backdrop** from `--sidebar-surface`, so its contrast is determinable
over any Journey image.

**Interruption and failure are derived, not stored.** The turn journal is read per visible Journey
and the signal clears when a later run settles. No acknowledgment state and no new ledger, which the
Boundaries forbid.

Declared cost: one `list_turn_journal` call per Journey actually rendered in the sidebar, refreshed
on registry and selection change. That set is bounded by `visibleSidebarJourneys` — pinned, active
and recent — not the whole registry.

## Boundaries

No new notification ledger, no change to process or admission semantics, and no overloading of the
same control with pinning or selection.
