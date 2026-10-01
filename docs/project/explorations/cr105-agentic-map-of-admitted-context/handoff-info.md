# Handoff Info: CR105 Agentic Map of Admitted Context

## Handoff Summary

Transform the current Artifacts surface into an incremental Agentic Map that shows the Navigator a
truthful, partial view of what effectively entered the agent context for the selected Journey and
active Conversation. Preserve the complete artifact inventory as quiet workspace relief, visibly
distinguish artifacts that were seen and those evidenced as present now, and introduce four
contextual territories beside the workspace: Journey briefing, active Conversation, attached or
referenced sources, and applicable operating instructions.

## Handoff Completeness Checklist

- [x] continuous exploratory thickening
- [x] source evidence list (code facts measured and cited; no transcript attached)
- [x] surfaces and story state
- [x] phases or evolution narrative
- [x] examples or simulations (GUI sketch and admission panel in `index.md`)
- [x] product decisions
- [x] user conversation flows (`product-design-proposal.md`)
- [x] transition rules
- [x] risks
- [x] boundaries
- [x] open questions
- [x] what Builder should preserve
- [x] what Builder should not assume

Still weak: no Navigator walkthrough on a real Conversation has been performed. The first slice is
the instrument for that walkthrough.

## What Builder Should Preserve

- The question each item answers: how did this enter the agent's field?
- The complete artifact tree as background relief. Nothing is hidden to make the map look focused.
- Three presence states carried by shape, not colour alone.
- The explicit statement on the surface that shell-based reads are not detected.
- The briefing shown as available through Mirror with admission not evidenced, until Mirror Core
  provides a durable signal.
- Existing artifact opening, reveal, context menu and path-safety boundaries.
- The distinction between a referenced attachment and a read attachment.

## Risks

- **Over-claiming perception.** Marking a file as "seen" from any signal other than a `read`
  tool call would reintroduce the exact dishonesty the CR exists to remove.
- **Under-reporting read as absence.** Because `bash` reads are not parsed, many files the agent
  did read will show as available only. If the surface does not say so, the Navigator will trust a
  false negative.
- **Collapsing "seen" into "present now".** Without the compaction boundary, these are the same
  set. With it, they diverge. The GUI must survive both cases.
- **Rebuilding the browser.** The existing `JourneyDocumentationBrowser` is 631 lines with
  navigation intents, context menus and tests. Replacing it would lose validated behaviour.
- **Session file cost.** Deriving read paths requires scanning the active branch's tool calls.
  Large sessions must not block the tree. Derivation should be incremental or cached per branch
  inspection.
- **Treating the exploration as settled scope.** The five territories were agreed as direction.
  The slice plan in `builder-orientation.md` is a recommendation to be confirmed at pull time.

## Open Questions

1. Should the first slice ship with only artifacts, Conversation and instructions, deferring
   briefing and sources until a Navigator walkthrough confirms the markers are read as perception?
   Recommendation in `builder-orientation.md`: ship all five regions but with the briefing in its
   honest "not evidenced" state, because a visible empty region teaches the boundary better than an
   absent one.
2. Should Mirror Core gain a durable "briefing admitted" signal so that the briefing region can
   ever become "present now"? This is a `mirror` Journey question, not a `mirror-desktop` one.
3. Which turn label should the admission panel use when a `read` call sits inside a turn that was
   later compacted: the original turn title or the chapter title?
4. Does the map need a per-folder roll-up (for example "3 of 12 files seen") or does that invite
   reading it as coverage?

## Boundaries

- This handoff is not a delivery plan and does not pull CR105.
- No code, test, CSS or roadmap file was changed during exploration.
- No new persistence, ledger, index or background scan beyond existing session inspection.
- No parsing of shell command text to infer reads.
- No graph, generated relationship or summary in this CR.
- No disclosure of protected prompt text. Instructions show origin and scope only.
- No release, tag, push or publication is authorised by these documents.

## Non-Assumptions

- Do not assume the briefing is in the agent's context. It is not, by measurement.
- Do not assume attachments were read. They are references until a `read` call matches.
- Do not assume the story id `d38edf01` carries only CR105 content. It carries September content
  under a CR105 overwrite.
- Do not assume `read_pi_session_context_stats` returns entries. It returns token snapshots only.
  Entries and chapter closures come from `inspect_dedicated_pi_transcript`.

## Promotion Boundary

Builder Mode is active for `mirror-desktop`. Implementation begins only after the Navigator pulls
CR105 by explicit intent and the status is changed in the refinement indices.
