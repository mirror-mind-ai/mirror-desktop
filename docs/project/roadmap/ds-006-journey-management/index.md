[< Roadmap](../index.md)

# DS-006 - Journey Management

**Status:** ✅ Done

## Outcome

Navigator can manage and navigate the Journey list as a real working cockpit: switch across Journey conversations, search the list, order Journeys intentionally and pin important Journeys for quick access.

## Why This Matters

The Harness has one persisted conversation per Journey, but the Journey sidebar is still a static prototype list. Once conversations persist, Journey navigation becomes part of the core product: the Navigator needs to move between different Journey sessions, find the right Journey quickly, keep important Journeys visible and eventually manage a growing list.

This story turns the sidebar from a decorative selector into the cockpit's Journey management surface.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-006.US-1 | Navigate Journey Sessions | User Story | Navigator can switch between Journeys and see each Journey's own persisted conversation/session state | ✅ Done |
| DS-006.US-2 | Search Journeys | User Story | Navigator can search across all Journeys in the list by name or description | ✅ Done |
| DS-006.US-4 | Order Journey List | User Story | Navigator can view Journeys in useful orders such as pinned-first, recent activity or name | ✅ Done |
| DS-006.US-5 | Pin Important Journeys | User Story | Navigator can pin/unpin Journeys so important work remains fixed at the top of the list | ✅ Done |
| DS-006.US-6 | Journey List Empty and Growth States | User Story | The list remains understandable when there are few, many or no Journeys available | ✅ Done |
| DS-006.TS-1 | Journey Registry Model | Technical Story | Harness defines a local Journey registry/view model separate from conversation persistence | ✅ Done |
| DS-006.TS-3 | Journey Preference Persistence | Technical Story | Harness persists non-secret Journey list preferences such as pins and sort order locally | ✅ Done |
| DS-006.TS-4 | Journey Management Guardrails | Technical Story | Journey management does not imply file mutation, Mission execution, Mirror sync or arbitrary filesystem access | ✅ Done |

## Repositioned Mirror Integration Work

The Mirror-specific import, rendering and reload packages originally delivered during DS-006 were moved under [CV-002.DS-001 — Mirror Journey and Conversation Import](../cv-002-mirror-integration/ds-001-mirror-journey-and-conversation-import/index.md). DS-006 now remains the sidebar/Journey management delivery, while CV-002 owns Mirror as a product integration capability.

## Guardrail Contract

Journey Management is bounded by these invariants:

- Journey registry import, conversation reload and Mirror title generation are explicit user actions.
- App startup, Journey selection, search, sorting and pinning do not import Mirror and do not invoke Pi.
- Runtime state is local Harness state: `journey-registry.json`, `journey-preferences.json` and one canonical `journey-conversations/<journey-id>.json` file per Journey.
- Journey preferences store only non-secret UI state: pins, active Journey, recents and list order.
- Mirror reads are read-only except the explicit generated-title action, which is scoped to one selected Mirror conversation and delegates to Mirror's own title service.
- Selected conversation reload overwrites only the active Journey's canonical local conversation file and backs up the previous file first.
- Imported activity is historical and inert; tools, commands, Ariad surfaces and provenance are rendered as records, not executable actions.
- Local reference opening is constrained to allowed workspace roots and rejects URLs, null bytes and paths outside those roots.
- Provider settings remain separate from Journey preferences and must not persist secrets through Journey Management.

## Done Condition

DS-006 is done when the Navigator can search, sort, pin and switch Journey sessions in the sidebar, with each Journey preserving its own conversation continuity, the local registry reflecting the real Mirror Journey hierarchy through explicit import, and local non-secret preferences persisted where appropriate.

## Boundary

This delivery manages the Journey list and Journey selection experience. It may explicitly read Mirror Journey and conversation metadata to bootstrap local Harness state, but it does not create the full Nautilus Method grammar, execute Missions, mutate Journey workspaces, browse arbitrary files, sync continuously with Mirror, create remote accounts, persist secrets, or introduce multiple conversations per Journey.
