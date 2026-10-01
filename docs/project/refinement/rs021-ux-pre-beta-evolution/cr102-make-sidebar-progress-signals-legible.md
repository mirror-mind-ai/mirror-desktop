[< RS021](index.md)

# CR102: Make Sidebar Progress Signals Legible

**Status:** done
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

## Repair — 2026-10-01

### Shape carries the state

`JourneyAgentStatusIndicator` now renders a glyph per state: Idle an outline ring, Working a solid
dot, Finishing a thick annulus, Ready the CR106 disc and check unchanged, Interrupted a disc with a
bar, Failed a disc with a cross. A guardrail asserts no two states produce the same markup, which is
what keeps colour and motion from quietly becoming the carrier again.

### Two decisions changed from the direction above

**Working and Finishing keep one colour register.** The direction said to split the light rule into
two. Splitting it would have inflated a 1.15 lightness difference into something presented as
information. They mean the same thing — the agent is busy — and their glyphs now say which phase, so
they share the accent register deliberately. What changed instead is the weight: `76%` accent
measured 2.29:1 at worst, under the floor; `50%` measures 3.97:1. Redundant coding is kept where the
meaning differs in kind, across registers, rather than manufactured between two phases of one kind.

**Failure is orange-red, not pink.** The first candidate measured 20 ΔE from the `rose` accent,
which is close enough that a Navigator using rose would meet failure and ordinary activity in one
hue. `#ff7043` sits 48 ΔE away. The guardrail measures every accent against both terminal registers,
so this cannot regress when a palette is added.

### Measuring the right thing

The first version of the register guardrail used contrast ratio to ask whether two colours were
distinct and failed a sound pair at 1.14. Contrast ratio compares lightness: a slate and a soft red
can sit at the same luminance and still be unmistakable. The guardrail now converts to CIELAB and
measures perceptual distance, and keeps contrast ratio for the question it does answer — whether a
signal is visible against its own backdrop.

### Registers, measured

| Token | Dark | Light families |
| --- | --- | --- |
| `--ui-held` | `#a8b3bd`, disc 6.52:1, bar 8.54:1 | `#4b5563`, disc ≥ 6.21:1, ink 7.56:1 |
| `--ui-danger` | `#ff7043`, disc 5.41:1, cross 7.07:1 | `#b42318`, disc ≥ 5.30:1, ink 6.57:1 |
| Working / Finishing | unchanged accent | worst accent and family 3.97:1, was 2.29:1 |

### Interruption and failure are read, never stored

`deriveJourneyTurnOutcome` reads the Journey's latest journal record. A pre-terminal phase is a run
that never settled, which is what a restart leaves behind, and `decideTurnJournalRecovery` already
calls that an interruption — so the sidebar agrees with it rather than reporting nothing. `cancelled`
reads as interrupted and `spawn_failed` / `process_died` as failed. Consulting only the latest record
is what makes the signal self-clearing: a later run supersedes it with no acknowledgment state to
keep, which the Boundaries require. An unreadable journal reports nothing, because a failed read is
not evidence of a failed run.

Live work and a fresh arrival both outrank a stored outcome, so a Journey never shows the previous
run's failure while the agent is working or just after it finished cleanly.

### The rail has a backdrop again

The compact badge takes an opaque `--sidebar-surface` background, so its contrast is a known
quantity over any custom Journey image rather than unmeasurable by construction.

### Validation

Gates: `tsc` clean, 207 files / 1383 TypeScript tests, `cargo test --locked` 231 passed, production
build, `roadmap:check` READY, `git diff --check` clean.

### Rail placement repair — 2026-10-01

Homologation exposed that the compact rail cut off Idle and active badges; a Journey with a custom
mark that was Working appeared to have no progress signal at all. This was measured rather than
inferred: the list clipped at x=63 while its scroll width reached 77; an ordinary badge extended to
x=68, and the custom-mark badge to x=80, leaving 17 of its 19 pixels outside the clip.

The expanded card's named grid areas (`name`, `context`, `status`) remained active in the rail,
whose template defines only one `icon` cell. They created implicit columns outside the tile. Because
an absolutely positioned grid item is contained by its grid area, not the tile, the status badge's
`right: 1px` anchored to that outside column. The card copy is now explicitly hidden in the rail (as
the tree copy already was through its wrapper), and the badge resets to `grid-area: auto` so it is
contained by the tile. Re-measurement: scroll width equals client width (55), and every badge spans
x=42–61, two pixels within the clip and overlapping its Journey mark.

Two guardrails preserve those structural facts. Gates after the repair: `tsc` clean, 207 files /
1385 TypeScript tests, production build, `roadmap:check` READY, `git diff --check` clean. Dev build
`0.2.0-alpha.27` (`10912e6cd2b051a6`) was installed with backup
`/Applications/Mirror Desktop Dev.app.backup-20261001-113426`; production remained running and
untouched.

## Closure — 2026-10-01

The Navigator validated the six-state sidebar signal, including the compact-rail placement repair.
CR102 is closed.

### Declared limits

- A Journey whose last run failed or was interrupted shows that state in place of its last-worked
  time until a new run settles. That is truthful, but it does occupy the line indefinitely.
- Interruption and failure are per Journey, not per Conversation. A Journey with several threads
  reports its latest record regardless of which thread produced it.
- Ready still expires five seconds after it is acknowledged and does not survive a restart, by
  CR106's decision. Only interruption and failure are durable.
- The outcome is re-read when a visible Journey's runtime phase changes or the visible set changes.
  A journal altered by something other than this app is not noticed until one of those happens.
- Maximised legibility was measured against the three light families and the six accents that exist
  today. A new accent or theme family has to clear the same floors, which the guardrails enforce.

## Boundaries

No new notification ledger, no change to process or admission semantics, and no overloading of the
same control with pinning or selection.
