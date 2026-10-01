[< Refinement Workbench](../index.md)

# RS021: UX Pre-Beta Evolution

**Status:** active

## Framing

Alpha has proven the core local-first desktop loop: Journey selection, Pi-backed agent execution, durable conversation continuity, release/update governance, and local voice composition. The next transition is not a new foundational capability; it is the product maturity required before calling the channel beta.

This Refinement Story groups user-experience corrections and investigations that are too concrete to remain as general feedback and too cross-cutting to belong to one Delivery Story. The common theme is reducing friction in daily Desktop use: model switching while work is alive, context visibility, long-conversation management, active-run signaling, collapsed sidebar polish, agent-comment continuity, scroll recovery, and macOS window semantics.

## Desired Outcome

Mirror Desktop feels less like an alpha harness and more like a beta-ready daily application. The Navigator can keep working while changing safe preferences, understand context-window state, recover the end of the conversation quickly, recognize active agents at a glance, use the collapsed sidebar comfortably, read adjacent agent comments without visual collision, and close the window without ending the app process unexpectedly.

## Authority Contract

- Journey authority is exactly `mirror-desktop`.
- This RS captures and orders Change Requests. CR089, CR104, CR107 and CR108 are closed. No remaining CR is the current focus; later focus changes require explicit Navigator intent.
- Each CR must preserve Pi/Mirror transcript authority and existing Journey/run authority boundaries.
- UX changes must not silently start, cancel, retry, send, compact, split, publish, release, or mutate Mirror data.
- Any behavior that affects active native processes must distinguish safe preference/UI mutation from run-control mutation.
- Release, push, merge, publication, Stable/Beta promotion and production-data mutation remain separate Navigator decisions.

## Work Shape

Captured Change Requests, ordered by Navigator-approved daily-use impact:

1. **CR086 — Suppress Transient Synchronization Notices.** Hide self-repairing synchronization flicker and show only durable failures.
2. **CR087 — Project the Visible User Request Exactly.** Fix the native user-text projection so attachments and `/skill:` prompts no longer reach Mirror verbatim or fail enqueue with `mirror_append_item_conflict`.
3. **CR088 — Stop Flashing the Preserved Attempt Panel.** Remove the transient `Resolve the preserved attempt` panel after cancellation; same class as CR086, different surface.
4. **CR089 — Preserve the Interrupted Partial Response.** Keep the partial agent answer when a turn is cancelled mid-response, marked as interrupted.
5. **CR084 — Recenter to Conversation End.** Add a top control that returns the conversation surface to its latest/end position.
6. **CR090 — Run-Scoped Model Authority.** Capture the run's model and stop a global busy flag from blocking model preferences everywhere.
7. **CR078 — Model Intents.** Let the Navigator name model and thinking pairs in their own language and switch between them from the Composer footer.
8. **CR091 — Attribute Each Response to Its Model.** Show which model produced each answer, read from the Pi transcript that already records it.
9. **CR081 — Agent Running Animation.** Separate pinning from active-agent status and replace the overloaded pin affordance with a real running indicator.
10. **CR083 — Agent Comments Continuity.** Make adjacent Agent Comments visually breathe and read as coherent continuation rather than glued text.
11. **CR082 — Collapsed Sidebar Polish.** Improve the aesthetics and usability of the collapsed sidebar.
12. **CR085 — Close Without Quitting.** Make the macOS red close button hide/close the window without terminating the app process.
13. **CR079 — Always Legible Context Reading.** Keep a context percentage and window permanently on screen, marking approximations with `~` instead of replacing them with waiting sentences.
14. **CR080 — Compaction Chapters.** Let structure emerge from compaction: name each closed segment by its own summary, make chapters navigable, and offer manual compaction from the context label.
15. **CR097 — Keep a Correction Recognisable After Reload.** A correction sent during a run reads as an ordinary unanswered request once the Journey is reopened.
16. **CR092 — Float the Recenter Control Over the Conversation.** Move the CR084 control out of the header into a floating bottom-right affordance that is visible only while the surface is away from the end.
17. **CR098 — Allow a Journey to Be Reparented.** Let the Navigator correct a Journey's place in the hierarchy from its edit form.
18. **CR099 — Allow Safe Editing During Another Journey's Work.** Scope edit guards to the Journey that is actually running.
19. **CR100 — Make Journey Image Updates Supported.** Complete or truthfully withhold the Journey-image mutation the UI offers.
20. **CR101 — Restore Window Geometry.** Reopen the app with the last usable position and dimensions.
21. **CR102 — Make Sidebar Progress Signals Legible.** Make Journey progress readable without overloading existing sidebar signals.
22. **CR103 — Give the Composer Model Status a Human Register.** Separate concise model identity and runtime state from raw provider notation.
23. **CR104 — Make Compaction Failures Actionable and Expirable.** Do not leave a stale manual-compaction failure permanently visible.
24. **CR105 — Transform the Artifact Tab into an Agentic Map.** Explore a navigable agent working-field map with honest provenance.
25. **CR106 — Use Green for Ready Completion Signals.** Make agent completion immediately legible without changing Ready semantics.
26. **CR107 — Make Existing Journeys Startable.** Do not strand an existing Journey at an informational “has not started” surface when its Desktop conversation must be resumed, safely provisioned, or diagnosed.
27. **CR108 — Stop One Unrecoverable Turn from Blocking Recovery.** Do not let a single unclaimable historical turn abort delivery recovery for every other turn in the Journey.
28. **CR109 — Make Conversations First-Class Workspaces.** Let the Navigator control the visible conversation working set, see where work actually belongs, and navigate or work across parent and child workspaces without selection instability.
29. **CR110 — Make Journey Creation Recover from Registry Change.** Do not make a Navigator reload and re-enter a valid create intent before distinguishing a real registry conflict from a stale or self-caused freshness change.
30. **CR111 — Preserve the Agent Comment Trail Across Turns.** Do not let a coherent live comment trail become a stack of repeated Agent cards merely because work settled or a later turn arrived.

## Current Captured Priority

This is the current UX-first order for the captured work. It is deliberately not implementation
order: each CR still begins with empirical characterisation, and no CR is pulled merely by being
ranked here.

1. **CR097 — Keep a Correction Recognisable After Reload.** The Conversation can falsely present a
   correction as an unanswered new request, damaging trust in the user's own history.
2. **CR099 — Allow Safe Editing During Another Journey's Work.** A global busy guard stops ordinary
   work in an unrelated Journey while the agent works elsewhere.
3. **CR098 — Allow a Journey to Be Reparented.** The Navigator cannot correct a basic hierarchy
   mistake through the form that purports to edit it.
4. **CR100 — Make Journey Image Updates Supported.** A visible action ends in `unsupported journey
   mutation`; a broken promise is more disruptive than an absent feature.
5. **CR103 — Give the Composer Model Status a Human Register.** The footer is read continually but
   currently merges state and raw provider identity into difficult operational notation.
6. **CR102 — Make Sidebar Progress Signals Legible.** The sidebar is the daily navigation surface;
   progress must be reliably readable there.
7. **CR106 — Use Green for Ready Completion Signals.** A focused completion-colour correction that
   should be characterised and, if compatible, delivered alongside CR102 without collapsing their
   separate acceptance contracts.
8. **CR101 — Restore Window Geometry.** Repeated relaunch friction matters, but it does not make an
   existing action untruthful or block current work.
9. **CR105 — Transform the Artifact Tab into an Agentic Map.** This is strategically promising but
   exploratory and broader than the observed corrective frictions above.

CR104 and CR107 are closed and are therefore removed from the active captured priority. CR108 was
found while validating CR107 and repaired in the same session by explicit Navigator intent, so it
never entered this ranking. CR109, CR110 and CR111 are captured but unranked and unpulled; each
requires authority characterisation before a priority or design is chosen.

## Acceptance Horizon

RS021 is ready to close only when each CR is terminal (`done`, `parked`, `rejected`, or `promoted`) with an explicit reason and evidence. Beta promotion remains a later, separate decision; this RS only aggregates pre-beta UX evolution work.

## Boundaries

- CR089, CR104, CR107 and CR108 are closed. No remaining CR has been pulled as the next focus; all other remaining CRs stay captured until explicitly pulled.
- No app release, Beta promotion, endpoint publication, Git push or tag is authorized by this document.

## Change Requests

- [CR086: Suppress Transient Synchronization Notices](cr086-suppress-transient-synchronization-notices.md)
- [CR087: Project the Visible User Request Exactly](cr087-project-the-visible-user-request-exactly.md)
- [CR088: Stop Flashing the Preserved Attempt Panel](cr088-stop-flashing-the-preserved-attempt-panel.md)
- [CR089: Preserve the Interrupted Partial Response](cr089-preserve-the-interrupted-partial-response.md) — done
- [CR084: Recenter to Conversation End](cr084-recenter-to-conversation-end.md)
- [CR090: Run-Scoped Model Authority](cr090-run-scoped-model-authority.md)
- [CR078: Model Intents](cr078-model-intents.md)
- [CR091: Attribute Each Response to Its Model](cr091-attribute-each-response-to-its-model.md)
- [CR081: Agent Running Animation](cr081-agent-running-animation.md) — done
- [CR083: Agent Comments Continuity](cr083-agent-comments-continuity.md) — done
- [CR082: Collapsed Sidebar Polish](cr082-collapsed-sidebar-polish.md) — done
- [CR085: Close Without Quitting](cr085-close-without-quitting.md) — done
- [CR079: Always Legible Context Reading](cr079-deep-context-stats-analysis.md)
- [CR080: Compaction Chapters](cr080-compaction-chapters.md)
- [CR097: Keep a Correction Recognisable After Reload](cr097-keep-a-correction-recognisable-after-reload.md)
- [CR092: Float the Recenter Control Over the Conversation](cr092-float-the-recenter-control-over-the-conversation.md) — done
- [CR098: Allow a Journey to Be Reparented](cr098-allow-a-journey-to-be-reparented.md)
- [CR099: Allow Safe Editing During Another Journey's Work](cr099-allow-safe-editing-during-another-journeys-work.md)
- [CR100: Make Journey Image Updates Supported](cr100-make-journey-image-updates-supported.md)
- [CR101: Restore Window Geometry](cr101-restore-window-geometry.md)
- [CR102: Make Sidebar Progress Signals Legible](cr102-make-sidebar-progress-signals-legible.md)
- [CR103: Give the Composer Model Status a Human Register](cr103-give-the-composer-model-status-a-human-register.md)
- [CR104: Make Compaction Failures Actionable and Expirable](cr104-make-compaction-failures-actionable-and-expirable.md) — done
- [CR105: Transform the Artifact Tab into an Agentic Map](cr105-transform-the-artifact-tab-into-an-agentic-map.md)
- [CR106: Use Green for Ready Completion Signals](cr106-use-green-for-ready-completion-signals.md)
- [CR107: Make Existing Journeys Startable](cr107-make-existing-journeys-startable.md) — done
- [CR108: Stop One Unrecoverable Turn from Blocking Recovery](cr108-stop-one-unrecoverable-turn-from-blocking-recovery.md) — done
- [CR109: Make Conversations First-Class Workspaces](cr109-make-conversations-first-class-workspaces.md)
- [CR110: Make Journey Creation Recover from Registry Change](cr110-make-journey-creation-recover-from-registry-change.md)
- [CR111: Preserve the Agent Comment Trail Across Turns](cr111-preserve-agent-comment-trail-across-turns.md)
