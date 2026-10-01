# Exploratory Story: CR105 Agentic Map of Admitted Context

## Source

- Journey: `mirror-desktop`
- Story id: `d38edf01` (mixed provenance, see [index.md](index.md))
- Mode: Explorer Mode, 2026-10-01
- Trigger: CR105 ranked first in the RS021 captured priority after CR102 closed and
  `v0.2.0-alpha.28` was published.

## Current Exploratory Story

CR105 becomes a deliberately partial view of what effectively entered the agent's context for the
selected Journey and active Conversation. The initial map has five territories: Journey briefing,
workspace artifacts, active Conversation, attached or referenced sources, and applicable operating
instructions. The artifact inventory remains visible as quiet background relief because it orients
the Navigator within the available workspace. Artifacts actually seen by the agent gain contextual
presence over that relief, with explicit admission provenance. The surface must never imply that
every listed artifact entered context. Each contextual item must say how it entered: injected by
Journey context, carried by the active Conversation, attached by the Navigator, read during work,
or applied as an instruction. Future slices may reveal tool traces, loaded memory or generated
relationships, but only when observation, availability, interpretation and mutation can remain
distinct.

## Narrative Summary

Explore an incremental Agentic Map where available artifacts form quiet background relief and
context actually admitted for the active Journey and Conversation is visibly marked across five
initial territories.

## What Changed Through Exploration

**Opening question.** CR105 as captured asked for a "navigable map of the agent's working field"
and warned that it is a product change, not a UI rename. The first temptation was to decide between
map, graph or catalogue. The exploration refused that and asked instead: what territory does the
Navigator need to perceive and cross while the agent works?

**First pivot: from Journey to perception.** The Navigator reframed the tab as "a partial,
progressive view of what the agent is seeing". This moved the subject from the Journey's material
to the agent's field of perception. Incompleteness stopped being a limitation and became the
surface's honesty.

**Inventory of candidate territories.** Beyond artifacts and the missing briefing, the exploration
named: the active Conversation as a source rather than a transcript copy; external sources brought
into the Conversation; the applicable operating frame; the agent's live tool trail; and memory
loaded by Mirror. The live trail and loaded memory were set aside as later terrain because they
require distinguishing "opened", "received", "inferred" and "modified".

**Second pivot: available versus admitted.** The exploration surfaced the deciding question: does
the map show what the agent could see, or what effectively entered this Conversation's context? The
Navigator chose the second. This made admission evidence a requirement for every contextual item.

**The artifact tension.** If only admitted material is shown, the existing artifact browser
disappears. The Navigator resolved it: keep the complete list as quiet background relief and mark
what was actually seen. Available material stays silent; admitted material gains presence.

**Shape of the first GUI.** Rather than a speculative graph, the agreed form is the existing tree
and preview with a contextual region above the tree, three marker shapes (available, seen in this
Conversation, present now) and an admission panel on selection. The sketch is in
[index.md](index.md).

**Correction after measurement.** Reviewing the checkout showed that the briefing is not injected
into the turn and that only the `read` tool evidences file reads. Both facts narrow what the first
slice can honestly claim and are recorded as constraints rather than open questions.

## Last Story Card

Shape the first GUI around a stable workspace relief plus a contextual overlay, preserving the
existing artifact browser while making admission provenance immediately readable.

## Attractors

None were recorded through the Mirror attractor surface. The exploration's de facto attractor was
the sentence "the map shows how each thing entered the agent's field", which displaced "the map
shows the Journey".

## Experiment Proposal

None was recorded through the Mirror experiment surface. The implicit first experiment is the
first delivery slice described in [builder-orientation.md](builder-orientation.md): mark reads on
the existing tree and show the admission panel, then observe whether the Navigator reads the
markers as perception or as file status.
