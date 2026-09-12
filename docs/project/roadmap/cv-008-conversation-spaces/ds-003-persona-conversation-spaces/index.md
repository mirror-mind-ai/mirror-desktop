[< CV-008](../index.md)

# CV-008.DS-003 - Persona Conversation Spaces

**Status:** 🟡 Planned

## Outcome

The Navigator can choose a persona such as Strategist from the sidebar and converse with it as a first-class destination, while Mirror Desktop internally uses a stable managed Journey bound to that persona so the established conversation runtime can be reused safely.

## Why This Matters

Personas are currently lenses selected inside broader Journey context. Some conversations begin with the specialist relationship itself. The product should let the user address that relationship directly without forcing them to understand or manually maintain the internal Journey used as its authority substrate.

## Candidate Scope

- Present eligible personas as visually distinct sidebar destinations.
- Provision or resolve one stable Mirror Desktop-managed internal Journey per persona, such as `Talking to Strategist`.
- Bind the managed Journey explicitly to one persona and fail closed when that persona is unavailable or changed.
- Keep managed Journey naming, hierarchy placement and lifecycle secondary to the persona-facing GUI.
- Preserve Mirror identity, memory, attachment, conversation and privacy boundaries.
- Define safe creation, upgrade, archival and removal behavior without deleting user-authored Journeys or conversations.

## Acceptance Direction

The Navigator selects Strategist, sees a persona-first conversation surface and receives responses routed through exactly that persona. Returning later resumes the correct managed conversation authority. The internal Journey does not pollute ordinary Journey navigation, become confused with a user-authored Journey or silently change persona binding.

## Open Questions

- Which personas are eligible and how are display names, icons and ordering sourced?
- Are managed persona Journeys visible anywhere outside the persona surface for diagnosis or portability?
- Who owns their creation, naming, status, path, archival and deletion?
- How does persona identity interact with Journey context, attachments, memories and future multiple conversations?

## Boundary

This story does not turn personas into independent users, duplicate persona definitions in Mirror Desktop, expose arbitrary hidden Journeys, or bypass Mirror's canonical persona routing and identity authority. The internal Journey approach remains a product hypothesis until this Delivery Story is pulled and validated against Mirror contracts.
