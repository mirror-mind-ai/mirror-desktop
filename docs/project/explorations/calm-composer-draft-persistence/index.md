# Exploration Handoff: Calm Composer Draft Persistence

## Editorial Synthesis

The current composer turns every keystroke into a full durable write path: local draft state updates the destination-keyed draft map, which immediately serializes all drafts, crosses Tauri IPC, validates the payload, writes a temporary file and atomically renames it. This gives recovery, but at the cost of unnecessary queued work while the Navigator is still composing. The proposed Builder direction is not to weaken draft durability. It is to separate composition from persistence: keep keystrokes local and immediate, coalesce the latest draft after a bounded idle interval, and flush at semantic boundaries such as blur, destination change, explicit Send and ordinary app closure. Builder should create one CR under the active ongoing-adjustments Refinement Story, then refine measurable acceptance around typing responsiveness, latest-state persistence, destination isolation, failure behavior and recovery after relaunch. The handoff does not select the CR, assign a Driver or Delivery, approve a plan, authorize implementation, commit, push or release.

## Durable Story

- Story id: `9df2b9b4`
- Journey: `mirror-desktop`
- Status: `active`

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

Composer as a Calm Drafting Space

The current implementation confirms the discomfort is structural: each keystroke updates both the local textarea state and the complete destination-keyed draft map; that map change immediately serializes every draft, crosses Tauri IPC, validates the whole payload, writes a temporary file and renames it atomically. A promise of draft recovery has become write-through persistence. The emerging direction is immediate local typing with coalesced delayed durability, plus explicit flushes at semantic boundaries such as pause, blur, destination change, Send and ordinary app closure.

## Transfer Documents

- [Exploratory Story](exploratory-story.md): discovery narrative and continuous thickening.
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, and non-assumptions for Builder.
- [Product Design Proposal](product-design-proposal.md): user-facing product behavior, without implementation detail.
- Full conversation evidence was not included in this handoff.

## Current Attractors

_No attractors recorded._

## Current Experiment Proposal

_No experiment proposal recorded._

## Builder Reading Order

Read this `index.md` first, then `exploratory-story.md`, then `handoff-info.md`, then `product-design-proposal.md`. If `full-conversation.md` exists, read it as source evidence, not as a delivery plan. Treat the set as exploration output, not as a completed delivery plan.
