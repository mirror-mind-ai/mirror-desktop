[< RS023](index.md)

# CR134: Name the Owner of Running Work Without Hiding That It Runs

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

`Working`, `Ready` and related signals are attached to the Journey even when the work is happening in one conversation below it. `JourneyRuntimeState.entries` is `Record<journeyId, Entry>` (`journeyRuntimeState.ts:50`), so a Journey workspace and every conversation inside it share one runtime entry and cannot be told apart by key. The sidebar, the Journey header and the area above the Composer therefore all report a Journey as working when the work belongs to one conversation within it — a parent impersonating its child. The Navigator cannot tell, from any surface, which workspace is actually busy.

**And the Journey signal is the only one that is always there.** That is the harder half of this CR, and it constrains the fix more than the attribution does.

- In `sidebar-compact`, the CSS hides `.focused-conversation-sidebar` and `.journey-conversation-toggle` outright, while `.journey-agent-status.placement-sidebar` keeps dedicated compact rules (`app.css:5196`–`:5208`, `:5303`–`:5329`). When the sidebar collapses, conversations disappear and the Journey status survives — CR082 chose that deliberately.
- A Journey's conversation list is only shown while that Journey is expanded, so an unexpanded Journey has no conversation row to carry anything.
- CR135 will add a third way for a conversation to be invisible: the Navigator hiding it.

So a conversation row is a surface the Navigator can remove in three independent ways, and a Journey row is not. Any design that moves the running-work signal down to the conversation hands the Navigator a way to run a process with no indication anywhere that it is running.

## Outcome

Every status surface says whose work it is, and no surface can be configured into silence about work that is running. The Journey row remains the guaranteed carrier: it always shows that work exists inside it, and it distinguishes work the Journey's own workspace owns from work a conversation below owns.

## Precedent

This tension has been resolved once already, in this function, for a different cause. `deriveJourneyAgentStatus` carries CR080's note: *a compaction is the agent working, but it owns no run and writes no journal, so runtime ownership cannot speak for it. The Journey is occupied for minutes either way, and a status that stayed idle would hide that work from the reader.* CR080 decided that an occupied Journey must say so even when runtime ownership cannot explain why. CR134 is the same rule applied to a different gap: the owner is known but is not this workspace.

CR102 supplies the vocabulary. It established that every state owns a shape, so the glyph alone identifies it, after measuring that colour and motion carried almost nothing — Working and Finishing sat 1.15 apart on the default theme and were identical on the light families under reduced motion. A new distinction must therefore be topological, not a colour or an animation.

## First Investigation

1. Confirm that `entry.identity.authority` reliably identifies the owning workspace in every runtime phase, including `reserved`, `running`, `finalizing` and the post-terminal recovery window, and including a restored entry after reload.
2. Separate the two questions that look like one. A sidebar row for any Journey asks *does this Journey's own workspace own the run, or does a conversation inside it?* The Composer and the selected-workspace header ask *is the run mine, or someone else's?* Both derive from the same authority and they are not the same comparison; establish what each needs, and what identifies a Journey's own workspace — its root thread, its active generation, or its `journey_workspace` selection.
3. Decide whether locus is a dimension or a state. Six statuses multiplied by two loci would be twelve glyphs; a `{status, locus}` pair keeps `deriveJourneyAgentStatus` orthogonal and needs one new topology rather than six. Establish which the surfaces can actually consume.
4. Design the `inside` topology against CR102's constraints: it must survive a shared colour register, stripped animation and greyscale, and it must remain legible at the compact sidebar's size.
5. Establish the route from the signal to the work. If the Journey row is the only visible carrier, it must lead to the owning conversation — including when that conversation is hidden, unexpanded, or the sidebar is compact.
6. Determine what a workspace with no live entry should read when its Journey has one, and confirm it is not a false `Ready` that invites a send the Journey will refuse.

## Acceptance

- The sidebar, the selected-workspace header and the Composer say whose work is running: the Journey's own workspace, or a conversation inside it.
- ~~A parent Journey does not read `Working` merely because a child conversation is working.~~ **Superseded 2026-10-08 — see Correction.** A Journey whose conversation is working always indicates that work is running inside it; what it must not do is present that work as its own workspace's.
- Running work is never representable only on a surface that can be hidden, collapsed or left unexpanded. With the sidebar compact, the conversation list hidden, the Journey unexpanded, and the owning conversation hidden by CR135, the Journey row still shows that work is running inside it.
- The `inside` distinction is topological and survives a shared colour register, stripped animation and a greyscale display, at compact sidebar size.
- From the Journey's indicator the Navigator can reach the owning conversation, including when it is hidden, unexpanded or the sidebar is compact.
- A workspace that is not the owner does not read `Ready` in a way that implies a send would be admitted while the Journey is occupied; the surface distinguishes *free* from *occupied elsewhere*.
- Status derivation is a pure function of the asking surface and the durable runtime entry, covered by guard-level tests for: work here, work inside, nothing working, and each of the three invisibility routes.

## Correction (2026-10-08)

The Navigator rejected this CR's original framing before any work began, and the objection stands: *Journeys are always visible in the sidebar, so the working icon is easy to see. At the conversation level it is different — the conversation may be hidden or the sidebar may be collapsed. That would mean I could have a process running without visibility over it.*

The original acceptance criterion — that a parent Journey must not read `Working` merely because a child is working — treated the Journey signal as a falsehood to remove. It is instead the only carrier that survives every way a conversation can become invisible, and removing it would have produced exactly the blind spot the Navigator named. The criterion is struck through above rather than deleted, because it was this CR's premise and the correction is the useful part of the record.

What changed: the CR now carries a visibility invariant alongside the attribution one, the Journey indicator is extended rather than demoted, and reachability from the signal to the owning conversation became an acceptance criterion rather than an afterthought. The scope grew, and the growth is real work, not restatement.

## Boundaries

No change to how runtime is keyed, no change to admission or occupancy, and no new concurrency — this CR makes ownership legible, not parallel. No change to transcript authority. It must not present an occupied Journey as available, and it must not reduce the visibility of running work on any surface, in any sidebar or visibility configuration.
