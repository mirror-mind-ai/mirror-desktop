[< RS021](index.md)

# CR107: Make Existing Journeys Startable

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

In production, several existing Journeys cannot begin a Mirror Desktop conversation. For example,
selecting **Vida Técnica** presents the Journey-initialisation surface with:

> MIRROR DESKTOP CONVERSATION  
> This Journey has not started in Mirror Desktop  
> Vida Técnica does not yet have a dedicated Mirror Desktop conversation.

The Journey exists and is intended to be usable, yet its only visible conversation surface says it
has not started. The Navigator cannot enter the core Desktop loop from that Journey.

## Outcome

An existing, selectable Journey can reliably enter its dedicated Mirror Desktop conversation: resume
it when durable authority already exists, provision it when that is genuinely the first use, or show
an actionable, truthful recovery surface when the durable records conflict. A normal existing
Journey must not strand the Navigator on an informational dead end.

## First Investigation

Characterise the reported production Journey against real data and paths before proposing a repair:

1. Read the selected Journey's Mirror identity, Desktop thread registry, active generation, Pi
   session location and any legacy/parity markers.
2. Trace the exact classifier that chooses the initialisation surface and identify which missing or
   conflicting authority made it report `This Journey has not started in Mirror Desktop`.
3. Compare a Journey that opens correctly with Vida Técnica and at least one other affected Journey.
4. Determine whether the correct recovery is safe idempotent provisioning, recovery of an existing
   thread/generation, migration of an older record shape, or an explicit diagnostic state. Do not
   create a replacement conversation until the authority question is answered.

## Acceptance

- A valid existing Journey with recoverable Desktop conversation authority opens or resumes its
  conversation without requiring hidden file or database intervention.
- A valid existing Journey with no Desktop conversation yet has an explicit, available and truthful
  first-start path; it is not left at a dead-end statement.
- Conflicting, missing or unreadable authority is distinguished from an ordinary first start and
  provides an actionable recovery/diagnostic path without overwriting transcript, thread or run
  evidence.
- Recovery is idempotent: repeating it neither creates duplicate dedicated threads nor silently
  changes a Journey's authority.
- The UI does not claim that a Journey has never started when durable Desktop or Pi evidence says
  otherwise.
- The diagnosis and tests cover the reported production shape and at least one clean first-start
  Journey.

## Boundaries

No automatic creation, reset, migration, deletion or replacement of a Journey conversation merely
because it was selected. No weakening of Journey, generation, Pi-session or run authority. This CR
does not turn a failed lookup into permission to start an agent run; it concerns entering and safely
establishing the dedicated conversation surface.
