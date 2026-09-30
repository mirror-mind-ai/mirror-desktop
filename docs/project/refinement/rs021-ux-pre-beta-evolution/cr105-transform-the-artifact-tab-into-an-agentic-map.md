[< RS021](index.md)

# CR105: Transform the Artifact Tab into an Agentic Map

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction / Opportunity

The Artifact tab is a file-oriented surface. The desired surface is an Agentic Map: a navigable map
of the agent's working field rather than a passive list of artifacts.

## Outcome

The Artifact tab becomes an Agentic Map that helps the Navigator orient within the Journey's
agent-relevant material, understand relationships and provenance, and move intentionally to a
source or artifact without pretending that generated structure is authoritative when it is not.

## First Investigation

This is an exploratory product change, not a UI rename. First render and inventory the current
Artifact tab's sources, hierarchy, document/artifact distinction, provenance, actions and empty
states. Then define what "map" means in observable user decisions before selecting an information
architecture or implementation.

## Acceptance

- The Navigator can orient to the relevant working material faster than with the current tab.
- Every mapped item retains an honest source, path or provenance and a bounded action.
- Generated relationships, summaries or agent interpretations are visibly distinguished from
  filesystem/Journey authority.
- The map remains useful with no artifacts, deeply nested material and externally referenced files.
- Existing artifact opening, reveal and safety boundaries continue to work.

## Boundaries

No autonomous file modification, no implicit indexing beyond existing authority, no claim that the
map is a complete representation of the Journey, and no implementation before an explicit Explorer
or Builder handoff establishes the map's user decisions.
