[< CV-012](../index.md)

# CV-012.DS-001 - Launch With Only the Canonical Set

**Status:** 🟡 Candidate — ordered by the Navigator on 2026-11-03; not planned

## Outcome

A person who installs the app sees only the canonical set: Journeys and their conversations. The
Context Map and the Agent's Canvas are hidden by default and can be turned back on in Settings,
marked experimental.

## Why Now (Navigator, 2026-11-03)

The rename (CV-013) is the last step before the Navigator goes out to promote the app. A function
that ships in that launch becomes something people use, and moving it into an extension later means
taking it away from them. Hiding it before the launch costs little, because the code stays.

## Candidate Scope

- `OperationalWorkspaceSwitcher` offers Conversation only by default; Context Map (`artifacts`) and
  Agent's Canvas (`canvas`) appear when their setting is on.
- One Settings switch per function, off by default for a new installation. The Navigator's
  installation keeps them on, because the Navigator uses the Canvas daily; how that is decided
  (carried setting or a first-run default) is a planning question.
- A persisted selection of a hidden surface falls back to Conversation instead of an empty view.
- When CV-012's extensions exist, each switch becomes "turn this extension on".

## Open Before Planning

- **Ariad** and the **Tactical and Strategic altitudes** are also outside the canonical set the
  Navigator named. Hide them too in this story, or leave them for now? The Navigator decides.
- Whether hiding also stops the work behind each surface (reads, prompts to the agent about the
  Canvas), or only the surface.
