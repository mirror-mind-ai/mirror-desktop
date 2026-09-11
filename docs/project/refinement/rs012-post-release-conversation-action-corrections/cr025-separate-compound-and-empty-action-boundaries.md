[< RS012 — Post-release conversation action corrections](index.md)

# CR025 — Separate compound and empty action boundaries

## Problem

A real `mirror-desktop` turn rendered two exposed Agent Action titles as one concatenated label and attached a later tool to an earlier action across an empty summary boundary.

The exact terminal evidence showed:

- one summary record containing two standalone emphasized paragraphs: `Synthesizing roadmap and document status inconsistencies` and `Reviewing release status and update rehearsals`;
- six following tools assigned to that compound record;
- an earlier empty summary record ignored without clearing prior ownership, causing the following tool to remain under the preceding action.

## Expected Behavior

Each independently emphasized standalone paragraph inside one exposed summary record becomes a distinct Agent Action in source order. The last visible action from that record owns subsequent operations until another summary boundary. Earlier titles from the same record remain honest tool-free action statements.

An empty summary is still an ownership boundary: it clears the prior action so a following operation receives its existing fallback label. Ordinary multiline or multiparagraph narrative that is not wholly composed of standalone emphasized titles remains one action and is not heuristically split.

## Builder Assessment

`projectAgentActionGroups()` currently creates exactly one group for every non-empty reasoning-summary record. `formatSummary()` removes standalone bold markers line by line and joins the complete content, producing the observed concatenated label. Empty summaries `continue` without resetting `currentSummaryGroup`, which explains the unrelated tool ownership leak.

The correction can remain pure and presentation-only. A strict parser can split a summary only when every non-empty paragraph is exactly one Markdown-bold or Markdown-underline title. For all other content it returns the existing single formatted label. The projector emits one group per recognized title, marks only the last split group active when the source summary is streaming, and assigns following operations to that last group. Encountering an empty summary clears current ownership before continuing.

No persisted schema or runtime event contract needs to change. Existing terminal evidence will render correctly after upgrade because action groups are derived at presentation time.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- The Navigator authorized implementation with Driver `@alissonvale` and Delivery `refinement/rs012-cr025-action-boundary-splitting`.
- Detection uses only exposed summary text and strict standalone emphasis structure; it does not request or infer hidden reasoning.
- Tool identity, status, arguments, output, source order, persistence, and System Surface placement remain unchanged.
- Existing conversation/app data is read-only validation evidence and is not rewritten or migrated.
- No push, release, tag, publication, endpoint mutation, or installation is authorized.

## Plan

1. Add focused red fixtures reproducing the exact compound-summary and empty-summary sequences.
2. Introduce a pure strict summary-title projection: split only two or more non-empty paragraphs when every paragraph is wholly wrapped by matching `**…**` or `__…__` markers.
3. Emit stable derived group IDs from the source summary ID and paragraph index; preserve one existing group ID for ordinary summaries.
4. Let only the final split title inherit source streaming activity and following tool ownership.
5. Clear current ownership on every empty summary boundary so later operations use honest fallback actions.
6. Preserve mixed narrative, multiline summaries, concurrent operation status, persisted terminal evidence, and CR022 disclosure behavior.
7. Run focused projection/component/persistence suites, the complete frontend suite, `npm run build`, and `npm run tauri:build:dev` before Navigator validation.

## Acceptance

- The reported compound record renders two separate action titles in source order, never one concatenated title.
- The first split title remains tool-free; all operations following the record belong only to its final title.
- An empty summary clears previous ownership and the next operation becomes its own fallback action.
- A single emphasized title and mixed or ordinary multiparagraph summaries remain one action.
- Active state belongs independently to the correct final split action and its child tools.
- Existing completed evidence renders correctly without persistence migration or data rewrite.
- CR022 automatic disclosure, historical counts, source order, and fallback labels remain intact.
- Focused tests, full frontend tests, frontend build, isolated Dev build, and Navigator validation pass before closure.
