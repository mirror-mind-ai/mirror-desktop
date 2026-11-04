[< Refinement Workbench](../index.md)

# RS027 — Re-examine the Older Open Work

**Status:** active

## Framing

Created by the Navigator on 2026-11-03, reorganizing the backlog after CR188. These CRs were captured
on the 0.2 line or in the first days of 0.3, and the code under them has changed since: the
TypeScript Core, CR184's settlement on the surface, CR173's own provider. Before any of them is
built, each needs a verdict on whether it is still needed.

The Navigator moved them here from RS025 and RS016. That is a deliberate exception to the
reference-only rule RS025 and RS026 follow: the move records that their next step is a decision,
not a build.

## Verdicts

Each CR gets one of three verdicts, with evidence from 0.3:

- **keep**: the friction still happens; the CR's evidence is refreshed and it returns to the queue;
- **close**: it no longer applies; the CR is closed with the reason;
- **merge**: it is the same work as another CR, which absorbs it.

Statuses below are unchanged until a verdict is recorded.

| CR | From | Status | Question to answer |
|----|------|--------|--------------------|
| [CR159](cr159-say-why-the-provider-refused-a-turn.md) | RS025 | in_progress | Does the 0.3 line name a provider refusal? The real refusal of 2026-11-01 ("Third-party apps now draw from your extra usage") is the evidence to read it against. |
| [CR163](cr163-a-hung-mirror-append-freezes-every-exit.md) | RS025 | in_progress | Can the TypeScript append still hang a finishing? Its field check was owed on the Python append. |
| [CR166](cr166-recover-this-turn-does-nothing-on-a-turn-still-running.md) | RS025 | in_progress | The first half is on `main` (the exit says which guard held it). Does a turn still running still offer Recover on 0.3? |
| [CR164](cr164-the-hung-append-test-races-its-own-stderr.md) | RS025 | captured | Does the hung-append test still race its stderr, or did the 0.3 append retire the test? |
| [CR155](cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md) | RS025 | parked | Does a finishing still hold a live lease with no exit, now that a turn settles on the surface (CR184)? |
| [CR161](cr161-give-every-finishing-the-same-exits.md) | RS025 | parked | The same question as CR155, for every kind of finishing; decide the two together. |
| [CR148](cr148-give-an-unanswered-turn-back-its-own-identity.md) | RS016 | captured | Does an unanswered turn still lose its own identity on 0.3? |
| [CR131](cr131-make-the-mirror-a-channel-validates-against-identifiable.md) | RS016 | captured | Written when Dev and production ran different Python Mirror checkouts. Each 0.3 build embeds its own TypeScript Core; this may no longer apply. |

## Order

After CR187 and CR190 (RS026). The Navigator chooses the order within this RS.
