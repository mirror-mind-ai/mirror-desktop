# Product Design Proposal: CR105 Agentic Map of Admitted Context

## Product Intent

The Artifacts tab becomes an Agentic Map: a truthful, partial view of what effectively entered the
agent's context for the selected Journey and active Conversation. The Navigator keeps the complete
workspace browser and gains, over it, a legible layer of the agent's perception with explicit
admission provenance.

## What the Product Should Feel Like

Looking at the map should feel like standing beside the agent and seeing which pages are open on
its desk, while the rest of the library remains visible but dim. It should never feel like a
coverage report, a file-status indicator or an audit log. The dominant sensation is orientation:
"this is where the agent's attention has actually been, and this is how each thing got there."

## User-Facing Behaviour

**Header.** The tab is titled Agentic Map. A one-line subtitle names the active Conversation and
states counts for items present now and items seen in this Conversation. A permanent note states
that reads performed through shell commands are not detected.

**Agent's field region.** Above the workspace tree, four rows: Journey briefing, Active
Conversation, Sources, Instructions. Each row carries a presence marker and, where useful, a small
count such as "2 of 3 read".

**Workspace region.** The existing tree, complete, with a presence marker on every file node.
Folders carry no roll-up in the first slice. Expand, select, open, reveal and context menu behave
exactly as today.

**Presence markers.** Three shapes:

- hollow circle: available, no admission evidence;
- filled circle: seen in this Conversation, evidenced by a `read` call or by Conversation carriage
  before the latest compaction boundary;
- filled circle with ring: present now, evidenced at or after the latest compaction boundary. When
  no compaction exists, every seen item is also present now, and the legend says so.

Colour reinforces the three shapes but never carries the distinction alone. Reduced-motion and
high-contrast modes do not change meaning.

**Admission panel.** Selecting a contextual item or a marked file shows, above the preview:

- presence state in words;
- entry mode: injected by Journey, carried by Conversation, attached by Navigator, read during
  work, applied as instruction;
- the turn that admitted it and the time;
- source and authority: workspace file, Journey registry, Navigator attachment, turn envelope.

Selecting an available-only file shows the preview as today, with the line "No admission evidence
in this Conversation".

**Journey briefing page.** A first-class page, not a tree node. Shows the briefing text from the
Journey registry with the statement "Available to the agent through Mirror. Admission in this
Conversation: not evidenced." If a future durable signal exists, the state upgrades.

**Active Conversation page.** Shows the Conversation name, the request that opened the current
turn, the list of compaction chapters that still carry continuity, and the retained tail boundary.
It does not duplicate the transcript.

**Sources page.** Lists Navigator attachments per turn. Each is marked referenced or read.
Externally located files keep their native-open behaviour.

**Instructions page.** Lists the operating envelopes applied in this Conversation by origin and
scope, for example "Mirror Desktop Journey authority, applied on every turn". Unknown envelopes are
named as unknown. No prompt text is displayed.

## Navigator Flow

1. The Navigator opens the Agentic Map while or after the agent works.
2. The header tells them how much of the field is evidenced and what is not detectable.
3. They scan the tree. Filled markers show where the agent's attention has been.
4. They select a marked file. The admission panel says which turn read it and when.
5. They open the Sources page and see an attachment still marked referenced: the agent never read
   it. They decide whether to ask the agent to do so.
6. They open the briefing page and learn that it was never admitted. They decide whether that
   matters for the current work.

## Product-Level States

- No active Conversation: the field region shows "No Conversation selected"; the tree is complete
  with all markers hollow.
- Active Conversation without compaction: seen and present now coincide; legend states it.
- Active Conversation with compactions: markers diverge; chapters listed on the Conversation page.
- Session unreadable: field region shows "Admission evidence unavailable" with the reason; the
  tree still works as today.
- Empty workspace: field region still renders; tree shows the existing empty state.

## Acceptance Behaviour

- A Navigator can tell, without reading implementation notes, which files the agent evidently read
  and which it merely could have read.
- No item is ever marked seen without a matching durable record.
- The surface states its blind spot (shell reads) at all times.
- All existing browser behaviours and tests remain green.
- The map remains useful with zero artifacts, deep nesting and external attachments.

## Explicit Non-Goals

- No graph, relationship inference or generated summary.
- No tracking of writes, edits or commands in this CR.
- No new persistence.
- No parsing of shell text.
- No change to how turns are sent or how Pi is launched.

## Open Product Questions

See [handoff-info.md](handoff-info.md). The two that most affect the first slice are whether the
briefing region ships in its "not evidenced" state and which turn label the panel uses after
compaction.
