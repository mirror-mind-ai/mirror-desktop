[< RS021](index.md)

# CR111: Preserve the Agent Comment Trail Across Turns

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr111-agent-comment-trail`

## Focus

The Navigator pulled CR111 and requested the diagnosis on 2026-09-30.

## Friction

The Agent Comments surface has two incompatible visual grammars for the same kind of work.

While an agent is working, comments appear as a coherent reading trail: aligned points on one
vertical conductor make sequence, continuation and work-in-progress legible. In the observed live
surface, the agent's plan, each file read and truncation continuation belong to one scanable trail.

After the agent finishes and the Navigator sends a following turn, that same material is rendered as
one large Agent card per comment/turn. Each card repeats the agent header, model identity, container
and disclosure affordance. The sequence is fragmented into stacked boxes, making the quieter,
continuous live presentation unavailable precisely when the work becomes history to review.

The issue is not that comments should be hidden or merged into an answer. It is that a faithful
comment trail loses its reading form across the live → settled → subsequent-turn boundary.

## Outcome

Agent comments retain one coherent, accessible trail presentation wherever their structural
relationship is continuous — while live, after settlement, after a subsequent turn and after reload.
Cards remain available only where a genuine turn/workspace boundary needs to be named, not as an
incidental consequence of the stream becoming persisted.

## First Investigation

1. Trace the two render paths shown in the images: live runtime activity / `Agent Comments` trail,
   and settled or reconstructed conversation cards. Identify the exact identity and boundary data
   each receives (run, turn, assistant message, stream boundary, comment order and completion).
2. Establish the structural rule for continuity. Determine when adjacent comments belong to one
   agent turn, one run with intervening operations, distinct turns, a model change, an interruption,
   a compaction chapter or a restored historical segment. Do not infer grouping from prose.
3. Compare the same real Pi-backed comments before completion, after completion, after a following
   user turn and after reload. Record which projection or persistence step discards the existing
   trail boundary.
4. Inventory interaction currently carried by a card: model attribution, copy action, turn details,
   action count, keyboard order, accessible names and focus. The trail must preserve or relocate
   these without making every comment a card again.
5. Test long trails, one-comment turns, comments separated by operations, interrupted runs and
   comments from adjacent models. The live and restored reading forms must express distinctions
   that are structurally true.

## Acceptance

- A contiguous agent-comment sequence retains the conductor/trail reading form after the agent
  settles, after a later user turn and after reload.
- Adjacent comments are grouped only by durable structural authority (run/turn/message boundary and
  recorded stream order), never by similarity of text.
- A genuine boundary — different turn/run where appropriate, model change, interruption, chapter,
  or restored segment — remains visibly and accessibly distinguishable.
- Model attribution, copy, turn details and action disclosure remain reachable without repeated
  card chrome for every comment in a continuous trail.
- The live trail and its reconstructed counterpart preserve the same comment order and do not
  invent transcript, answer status or an agent action Pi did not record.
- The design stays readable with a single comment, a long trail, screen readers, keyboard focus,
  light/dark themes and reduced motion.
- Tests cover live, settled, subsequent-turn and reload surfaces from the same recorded comment
  sequence.

## Boundaries

No merging of comments into final answers, no suppression of recorded comments, no prose-based
classification and no alteration of Pi/Mirror transcript authority. This CR changes the stable
reading surface, not the underlying comment, turn or action evidence.

## Diagnosis — 2026-09-30

### One comment is one message, and one card renders one message

`RuntimeProjectionState.agentComments` is documented at `src/app/runtimeActivityModel.ts:49` as
"the run's agent comments in order, **one per assistant message**". That is the whole defect in one
line: a run's trail is N assistant messages, and `AgentTurn` renders exactly one message.

While the run owns the live projection, `projectAgentComments` builds the trail from that
run-scoped array, so one card holds the entire `<ol class="agent-comment-trail">`. That is the first
image.

At rest the live projection is gone, and each message falls into the fallback at
`src/app/conversationTurnPresentation.ts`:

```ts
return restoredRole === "trail" && restoredComment.trim()
  ? { commentTrail: [restoredComment] }
  : {};
```

Every restored comment becomes a trail of exactly one item, inside its own card, with its own agent
header, model badge, copy action and disclosure. That is the second image. The conductor line is
still rendered — it simply has one point.

### The grouping is already computed, then discarded

`projectAgentCommentRoles` in `src/domain/piBackedConversationSurface.ts:420` walks the messages and
accumulates exactly the group the trail needs:

```ts
let run: string[] = [];
const closeRun = () => {
  for (const id of run.slice(0, -1)) roles[id] = "trail";
  run = [];
};
```

Consecutive assistant messages, delimited by any user message, are a run. The function keeps only
`roles[id] = "trail"` for all but the last and throws the array away. CR083 therefore preserved each
comment's **role** — note rather than answer — but not its **grouping** — these notes are one
continuous trail.

So the authority is not missing and does not need to be invented. It is derived on every
reconstruction and dropped at the moment it would be useful.

### Nothing persists the trail either

`TerminalAgentActionProjection` (`src/domain/journeyConversation.ts:43`) holds `status`,
`operations` and `reasoningSummaries`. It has no `agentComments`, and the whole evidence record is
keyed to a single `assistantMessageId`. A settled run therefore keeps its operations but not the
shape of its narration, and could not re-group the other messages even if it did.

### Why it changes on the next turn rather than at completion

`ConversationTranscript.tsx:289` selects the projection per message:

```tsx
runtimeProjectionMessageId === message.id
  ? runtimeProjection
  : terminalEvidence...?.projection ?? reconstructedProjection...
```

The finished turn keeps the live trail only while it is still the message the live projection points
at. Sending the next turn moves `runtimeProjectionMessageId` to the new assistant message, the
previous turn falls back to terminal evidence or reconstruction, and it fragments. This matches the
reported trigger exactly: completion alone does not break it; the following turn does.

### A second difference, which is not the same defect

The two images also differ in proximity. `classifyAssistantTurnProximity` marks everything but the
latest assistant message as `historical`, and `AgentTurn` then collapses actions and system surfaces
behind `Show turn details`. The first image is the latest turn with its surfaces inline; the second
shows historical cards with the disclosure.

That behaviour is deliberate and is not what this CR was raised about. It is recorded here so the
repair is not mistakenly scoped to it, and so the grouped card is designed against the historical
form it will actually have.

### What the repair has to respect

Grouping must happen at the render boundary, not by merging message content. Merging would fabricate
transcript, which this CR's own boundary forbids, and would destroy per-message facts that are real:

- `responseModels[id]` is per message, so a model change inside a run is a true attribution
  boundary.
- `MessageCopyAction` is bound to each message's own body.
- `reconstructedAgentActions` attaches the blocks that preceded each assistant message to that
  message, which is why the first and third cards in the second image each show `1 action` and the
  middle one shows none.
- `chapterDividers[id]`, `interruptedFragments[id]`, search anchoring by
  `data-conversation-message-id` and `messageRefs` are all per message.

So the cluster must keep every message addressable while presenting one trail.

### Open design questions, to decide before implementing

1. Where do per-message actions and surfaces go inside a grouped card — interleaved at their point
   in the trail, or collected into one disclosure for the whole run? Interleaving is more truthful
   about ordering; collecting is closer to the live reading the Navigator asked for.
2. Does a model change inside a run break the group, or annotate a point within it?
3. A chapter divider between two comments of the same run must break the group, since the divider is
   a real boundary in the transcript.

These are presentation decisions with no single correct answer from the data, so they are named here
rather than settled unilaterally.

## Navigator decisions — 2026-09-30

1. Per-message actions and surfaces are **collected into one disclosure** for the whole run.
2. A model change **annotates a point** inside the trail rather than breaking the run.
3. A chapter divider **breaks the run**, because it is a real boundary in the transcript.

## Repair — 2026-09-30

### The grouping is recovered, not invented

`projectTranscriptRenderItems` applies the same structural rule `projectAgentCommentRoles` already
walked and discarded: consecutive assistant messages are one run, any request closes it, and a
chapter divider closes the run it falls in. A lone assistant message is a run of one, so the
renderer has no special case.

### One run is one card

`AgentTurn` now renders a run. `trailParts` carries the run's earlier messages, and the closing
message keeps the role it already had. The trail is assembled from the parts' comments followed by
the closing message's own live trail, so the live path is unchanged and the restored path finally
matches it.

Nothing is merged that Pi recorded apart. Each part keeps its own presentation, and the card keeps
every message individually addressable: each trail point carries its own
`data-conversation-message-id` and registers its own element, so conversation search and the chapter
index still reach a note inside a grouped run.

One correctness detail was needed for the closing message. Its restored presentation has neither
`commentTrail` nor `closingComment`, so the previous `trail ? closingComment : agentComment` rule
would have dropped the answer once a trail existed. The closing prose is now the live
`closingComment` when the projection named one, and otherwise the message's own comment.

### The three decisions

- **Collected detail.** Action and surface regions are built from every part of the run, counted
  together, and rendered inside the single `Show turn details` disclosure. Each part keeps its own
  projection rather than being flattened into one, because operation ids only resolve inside the
  projection that recorded them.
- **Annotated model change.** A trail point renders its model badge only where
  `ResponseModelBadge.changed` is already true, so the existing attribution rule decides it and no
  new classification was introduced.
- **Divider breaks the run.** Handled in the grouping, so a divider is always carried by the first
  message of a rendered item and still precedes every row.

Copying a grouped run now yields the narration the Navigator can actually see, rather than only the
closing message.

### Two guardrails were deliberately re-anchored

`chapterDivider.test.tsx` and `importedActivity.test.ts` asserted source order against the literal
`{messages.map((message) => {`. Both behaviours still hold — the divider precedes every row kind and
unlinked imported context still precedes the loop — so the anchors were updated to the grouped loop
and the divider assertion now covers both row kinds. No other assertion was changed.

### Validation

- `npx vitest run`: 202 files, 1317 tests. `tsc`, production build, `roadmap:check` and
  `git diff --check` clean.
- Dev installed at `0.2.0-alpha.27`, binary `0b54be66af4a6a2b`.

### Declared limits

- Historical proximity still collapses detail behind the disclosure while the latest turn renders it
  inline. That is the pre-existing CR083 behaviour named in the diagnosis and was not changed.
- Grouping is a render-time decision derived on every projection. Nothing new is persisted, and the
  underlying comment, turn and action evidence is untouched.
- A run whose messages carry separate interrupted fragments renders them in order in one region. In
  practice only the last message of a run can have been interrupted.
