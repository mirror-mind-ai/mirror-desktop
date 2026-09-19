# Exploratory Story: Calm Composer Draft Persistence

## Source

- Journey: `mirror-desktop`
- Story id: `9df2b9b4`
- Mode: Explorer Mode

## Continuous Thickening Narrative

The current composer turns every keystroke into a full durable write path: local draft state updates the destination-keyed draft map, which immediately serializes all drafts, crosses Tauri IPC, validates the payload, writes a temporary file and atomically renames it. This gives recovery, but at the cost of unnecessary queued work while the Navigator is still composing. The proposed Builder direction is not to weaken draft durability. It is to separate composition from persistence: keep keystrokes local and immediate, coalesce the latest draft after a bounded idle interval, and flush at semantic boundaries such as blur, destination change, explicit Send and ordinary app closure. Builder should create one CR under the active ongoing-adjustments Refinement Story, then refine measurable acceptance around typing responsiveness, latest-state persistence, destination isolation, failure behavior and recovery after relaunch. The handoff does not select the CR, assign a Driver or Delivery, approve a plan, authorize implementation, commit, push or release.

## Current Exploratory Story

Composer as a Calm Drafting Space

## Narrative Summary

The current implementation confirms the discomfort is structural: each keystroke updates both the local textarea state and the complete destination-keyed draft map; that map change immediately serializes every draft, crosses Tauri IPC, validates the whole payload, writes a temporary file and renames it atomically. A promise of draft recovery has become write-through persistence. The emerging direction is immediate local typing with coalesced delayed durability, plus explicit flushes at semantic boundaries such as pause, blur, destination change, Send and ordinary app closure.

## Last Story Card

Preserve every intention, not every intermediate keystroke: what recovery window feels trustworthy without making writing carry storage work?

## Attractors

_No attractors recorded._

## Experiment Proposal

_No experiment proposal recorded._

## What Changed Through Exploration

This section should preserve the evolution of the exploration: the original question, the meaningful pivots, the corrections that changed the story, and the current point of promotion. If this document was generated from a short runtime summary, Builder should ask the Navigator whether more conversation evidence must be folded in before roadmap work starts.
