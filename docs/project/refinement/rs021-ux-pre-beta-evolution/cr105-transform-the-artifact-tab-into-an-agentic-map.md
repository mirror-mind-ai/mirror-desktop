[< RS021](index.md)

# CR105: Transform the Artifact Tab into an Agentic Map

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr105-agentic-map`

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

## Exploration Outcome (2026-10-01)

The Explorer handoff that establishes the map's user decisions exists at
[docs/project/explorations/cr105-agentic-map-of-admitted-context/](../../explorations/cr105-agentic-map-of-admitted-context/index.md).
It resolves "map" as **a partial view of what effectively entered the agent's context**, not a
representation of the Journey. The complete artifact tree stays as quiet relief; items the agent
evidently read gain presence; every contextual item states how it entered.

Measured constraints that bound the first slice:

- The Journey briefing is not injected into Desktop turns. It is shown as available through
  Mirror with admission not evidenced.
- File reads are evidenced only by `read` tool calls. Shell reads are not detected and the surface
  must say so.
- Attachments are references until a matching `read` exists.
- The compaction boundary (`firstKeptEntryId`) separates "seen in this Conversation" from
  "present now".

Implementation guidance, evidence inventory, slice plan and test plan are in
[builder-orientation.md](../../explorations/cr105-agentic-map-of-admitted-context/builder-orientation.md).

## Pull (2026-10-01)

Pulled by explicit Navigator intent. Delivery slice and the two open design questions
(briefing region in the first slice; turn label after compaction) are still to be confirmed with
the Navigator before code. Implementation starts with the domain derivation in
`src/domain/admittedContext.ts` under TDD; no GUI change until the derivation tests are green.
