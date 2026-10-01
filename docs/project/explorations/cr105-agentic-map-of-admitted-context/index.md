# Exploration Handoff: CR105 Agentic Map of Admitted Context

**Journey:** `mirror-desktop`
**Change Request:** [CR105](../../refinement/rs021-ux-pre-beta-evolution/cr105-transform-the-artifact-tab-into-an-agentic-map.md)
**Exploration closed:** 2026-10-01
**Builder status:** oriented, not pulled. No code was changed during exploration.

## Editorial Synthesis

CR105 is not a richer artifact browser. It is a deliberately partial view of **what effectively
entered the agent's context** for the selected Journey and the active Conversation. The map does
not represent the Journey. It represents the agent's field of perception, and its incompleteness is
part of its honesty rather than a defect to hide.

The map answers one question for every item it shows: **how did this enter the agent's field?**
Provenance stops being a footnote and becomes the grammar of the surface.

The first GUI keeps the existing split tree and preview. Above the workspace tree a small region
named the agent's field lists the contextual territories. The artifact tree remains complete as
quiet background relief, because it orients the Navigator in the available workspace. Items the
agent actually saw gain visible presence over that relief. Selecting any contextual item opens an
admission panel: how it entered, source authority, the turn that admitted it, and recency.

No graph is built in this CR. A graph may emerge later, only from authoritative relationships.

## What Was Decided

- **Semantic boundary.** The map shows material that effectively entered context, never merely
  material the agent could access. Availability is shown, but silently, and never dressed as
  perception.
- **Five territories.** Journey briefing, workspace artifacts, active Conversation, attached or
  referenced sources, applicable operating instructions.
- **Artifact relief.** The complete artifact tree stays. Artifacts actually read are marked.
  Artifacts never read keep the quiet available marker.
- **Admission grammar.** Every contextual item declares one of five entry modes (see table).
- **Two presence states.** "Seen in this Conversation" and "evidenced as present now" are
  different and must not be collapsed. The second is only shown when a compaction boundary makes
  it derivable.
- **Shape before colour.** Marker shape carries the distinction. Colour reinforces only.
- **No new ledger.** Admission is derived from existing durable evidence. Nothing new is stored.

## Admission Grammar

| Entry mode | Meaning | Evidence that exists today | Honest default when evidence is absent |
|---|---|---|---|
| Injected by Journey | Material placed before the agent by the turn envelope | Prompt envelope `[Mirror Desktop Journey authority]` per user entry | Not applicable |
| Carried by Conversation | Retained transcript tail plus compaction summaries | Chapter closures with `firstKeptEntryId` | Whole branch treated as "seen", none as "present now" |
| Attached by Navigator | Files the Navigator selected for a turn | "Files explicitly selected by the user" JSON block in the prompt | Shown as **referenced**, never as read |
| Read during work | Content the agent opened with a tool | `read` tool call with `arguments.path` | Not shown as read. Shell commands are **not** parsed for reads |
| Applied as instruction | Operating frame the agent received | Envelope classification: `mirror_desktop`, `nautilus_harness`, `unknown`, `raw` | Shown by class; `raw` means no authority header, `unknown` means an unrecognised one |

## Measured Facts That Constrain the Design

These were verified in the checkout on 2026-10-01. They are not assumptions.

1. **The Journey briefing is not injected into the turn.** The prompt packet built by
   `createMirrorRuntimePrompt` in `src/agent/piProcessStream.ts` contains the authority envelope,
   the request and attached file references only. Pi is launched with `--no-context-files`. The
   briefing reaches the agent only when the agent itself runs a Mirror load command in a shell.
   Therefore the briefing territory must be shown as **available through Mirror, admission not
   evidenced in this Conversation**, unless a durable signal is later added by Mirror Core.
2. **File reads are evidenced only by the `read` tool.** Session files record tool calls with
   name and arguments. In a sampled production session, `bash` dominated (1969 calls) over `read`
   (228). Reads performed through `cat`, `sed` or `grep` inside `bash` are not derivable without
   parsing shell text, which the design forbids. The map will therefore **under-report** what the
   agent saw. This limit must be stated on the surface. The read path lives only on the assistant
   `toolCall` block, while `toolName` and `isError` live on the following `toolResult` entry, so
   admission requires joining the two by `toolCallId`.
3. **Attachments are references, not admitted content.** The prompt tells the agent to "decide
   with available tools whether and how to read each file". An attachment is "read" only if a
   matching `read` call exists.
4. **The compaction boundary is legible.** Each chapter closure carries `firstKeptEntryId`. Entries
   at or after the latest boundary are candidates for "present now"; earlier entries are "seen in
   this Conversation" through the summary only.
5. **The instruction envelope is already classified.** `project_dedicated_user_text_and_envelope`
   in `src-tauri/src/main.rs` distinguishes four classes: `mirror_desktop`, `nautilus_harness`,
   `unknown` and `raw`.

## GUI Sketch Agreed in Exploration

```text
┌────────────────────────────────────────────────────────────────────┐
│ Agentic Map                                                       │
│ Partial context of Conversation "CR105 scope"                     │
│ 4 items evidenced present now  ·  7 more seen in this Conversation│
│ Reads through shell commands are not detected.                    │
├──────────────────────┬─────────────────────────────────────────────┤
│ AGENT'S FIELD        │                                             │
│                      │  JOURNEY BRIEFING                            │
│ ○ Journey briefing   │  Mirror Desktop                             │
│ ◉ Active Conversation│  Status, stage, description, focus          │
│ ● Sources (2 of 3)   │                                             │
│ ◉ Instructions       │  Available through Mirror.                   │
│                      │  Admission in this Conversation: not         │
│ WORKSPACE            │  evidenced.                                  │
│                      │  Source: Journey registry                    │
│ ▾ docs               │                                             │
│   ○ architecture.md  │                                             │
│   ● roadmap.md       │                                             │
│   ◉ cr105.md         │                                             │
│ ▾ src                │                                             │
│   ○ App.tsx          │                                             │
│   ● turnJournal.ts   │                                             │
│                      │                                             │
│ ○ available          │                                             │
│ ● seen in this Conv. │                                             │
│ ◉ present now        │                                             │
└──────────────────────┴─────────────────────────────────────────────┘
```

Admission panel shown when a contextual item is selected:

```text
Context presence
Present now
Read during turn "Defining CR105 scope"  ·  11:42
Source: docs/project/refinement/.../cr105-transform-the-artifact-tab-into-an-agentic-map.md
Authority: workspace file
```

## Durable Story and Provenance Defect

- Story id used: `d38edf01`, now `promoted`.
- **Defect.** That id belongs to the September exploration titled "Mirror Desktop accumulated
  several durable representations of one agent turn" (transcript authority, settlement,
  rebuildable projections). The CR105 thickening overwrote its current story text instead of
  opening a new story. The title in the Mirror story list still shows the September subject.
- **Consequence.** Builder must treat `d38edf01` as mixed provenance. The CR105 content is the
  text reproduced in this directory. The September content is not reproduced here and may need
  recovery from the Mirror database history if that earlier exploration is ever resumed.
- The Mirror operational projection refresh reported `schema_validation_failed` on every
  exploration mutation. Source records were committed; the derived projection was not refreshed.
  This is a Mirror Core issue, outside `mirror-desktop`.

## Source Evidence

No conversation transcript was attached to this handoff. The evolution is reconstructed in
[exploratory-story.md](exploratory-story.md). Code facts were measured directly and are cited with
paths in [builder-orientation.md](builder-orientation.md).

## Transfer Documents

- [Exploratory Story](exploratory-story.md): how the question moved from "artifact browser" to
  "admitted context".
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, non-assumptions.
- [Product Design Proposal](product-design-proposal.md): Navigator-facing behaviour and states.
- [Builder Orientation](builder-orientation.md): evidence inventory with code locations, slice
  plan, test plan, rules and verification route. Read this last and keep it open while
  implementing.

## Builder Reading Order

`index.md`, then `exploratory-story.md`, then `handoff-info.md`, then
`product-design-proposal.md`, then `builder-orientation.md`. Treat the set as exploration output
with measured constraints, not as settled delivery scope. Pulling CR105 requires explicit Navigator
intent and the status change in the refinement indices.
