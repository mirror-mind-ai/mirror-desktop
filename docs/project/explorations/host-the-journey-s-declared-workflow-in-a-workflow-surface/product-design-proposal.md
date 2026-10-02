# Product Design Proposal: Host the Journey's declared workflow in a Workflow surface

## Product Intent

Mirror Desktop gains a Workflow tab that hosts a view the Journey itself declares, instead of a generic surface the app computes. The CR105 surface is kept and renamed Context, and the terms field and territories leave the product and stay with Nautilus. The first slice covers only the canonical livro-lideranca-soberana case: a Journey-owned prose contract facing the agent, a rendered markdown surface written by the agent, and a small app-facing JSON manifest at the Journey root. A setup button prefills a prompt asking the Journey's own agent to find or build the workflow, or to report descriptively that there is not enough material.

## User-Facing Behavior

Mirror Desktop gains a Workflow surface. The Journey declares its own workflow and the app hosts it; Mirror does not compute or detect it. Scene: the Navigator builds a process together with the agent and feels an asymmetry of grasp, because clicking a file shows position and content while the big picture never appears. What he was building in both canonical Journeys was the Journey's workflow, which settles the naming. Three measurements confirm the term: the Nautilus method uses workflow exactly once and only to deny it (this relation is not a rigid workflow or a hierarchy), so the product borrows nothing; the Navigator had already named the key workflow_stages inside livro/status.yml, so the word was already in his data; and it appears in 263 messages, 17 memories and 4 identity entries. Context is the confirmed name for the kept CR105 surface, and both field and territories are retired from the product because Human Territory makes territories a Nautilus term too. The canonical case (livro-lideranca-soberana) has both the process and a declared surface: docs/surface-status-do-projeto.md declares sources of truth, form, current-chapter rule, three states, six ordered stages, persistence under workflow_stages and invocation, over data in livro/estrutura.yml and livro/status.yml. Measurement now shows vida-economica already has its workflow written in prose too, in docs/rotina-mensal-pagamentos.md: a monthly trigger, an activation reading list, a resume rule for open versus closed cycles, an explicitly ordered rhythm (gather sources, confirm initial balances, fill accounts payable, calculate transfers, guide manual payments one at a time, record each confirmation, request final balances, update saldos.md, record snapshots, leave a resumption point), an authority boundary stating that payments are always executed manually by the human while the agent only guides, calculates, records and checks, and three phase tables for before paying, order of payment and after paying. So both Journeys already carry their workflow as prose; the difference is that livro also declared its surface while vida-economica declared only its process. Insufficient data will therefore be the rare outcome in mature Journeys, and the setup prompt's real work is usually to find a workflow already written rather than to invent one. The Navigator resolves the deferred detection question by refusing to change Mirror for it: the Workflow surface carries a setup or start button that writes a prompt for the Journey's own agent, giving it every detail needed either to build the workflow or to finish by reporting that there is not enough data. Measurement places that button correctly against existing house discipline. src/tests/tacticalJourneyWorkspace.test.tsx asserts that a Journey-projection surface shows staleness while carrying no form, input, textarea, button or select, and that its source contains none of invoke, generatePacket, AgentRun, useEffect, localStorage or sessionStorage, nor dangerouslySetInnerHTML. JourneyArrivalSurface does carry buttons, but they only prefill the composer through onChoose and its copy states that nothing is sent until the Navigator decides. The house rule is therefore no invocation, no hidden state and no side effects, while prefill is allowed, and the setup button sits on the permitted side because it composes a message rather than running the agent. A concrete consequence: Rust supplies the raw mtimes and a pure function under src/domain derives the state, following how tacticalStale is already produced in journeyProjections.ts; nothing is computed in a useEffect. Two design requirements for the prompt itself. It must forbid inventing a workflow, carrying the same prohibition the Navigator's own contract already states about never inferring state from conversation memory or stale transport files, because otherwise the genericity error that broke CR105 reappears at the prompt layer; this session proved that risk twice on itself by misreading vida-economica's cadence from directory shape. And refusal must be descriptive rather than negative, since observing a repeating monthly folder structure and a prose routine without declared stages or a state file is itself material the Navigator can work from. The rest of the contract stands as measured: a Journey-owned prose contract facing the agent, a rendered markdown surface written by the agent, and a small app-facing JSON manifest at the Journey root beside JOURNEY.md declaring schemaVersion, title, surface path, contract path and source paths, with no semantics, because omitted_workspace_component rejects dotted components, no YAML parser exists in either manifest, ArtifactMarkdown already renders the canonical table, mtime comparison gives staleness that fails safe with hashing at 0.191 ms as the upgrade, and App.tsx already passes journeyRoot. The workspace tree stays with Context so Workflow stays pure. The artifacts id persists as selection state and the new tab needs its own id. First slice covers only the canonical livro case.

## What The Product Should Feel Like

Opening Workflow should feel like reading the Journey's own status page, not like reading a report the app wrote about the Journey. The Navigator should grasp where the work stands without clicking into a single file. Nothing on the surface should carry Mirror Desktop's opinion about the Journey's process, because the app does not have one and must not appear to.

When the view cannot be trusted, the surface should feel plainly empty or plainly out of date rather than quietly plausible. Serving old content as current is the one failure this surface exists to avoid, and the measured precedent is this Journey's own `.mirror/projections/current.json`, which sat six days stale while announcing nothing.

## Interaction Flow

- The Navigator opens the Workflow tab for a selected Journey.
- The app reads the Journey's manifest from the Journey root, then the surface file the manifest declares, then the modification times of the declared sources.
- With a rendered surface that is newer than every declared source, the surface shows the Journey's own markdown and says nothing about freshness.
- With a rendered surface older than any declared source, the surface shows the markdown under a notice that declared sources changed after this view was written.
- With no manifest, the surface says the Journey has not declared a workflow yet and offers a button that prefills a setup prompt into the composer.
- With a manifest whose surface file is missing, unreadable or declares an unknown schema version, the surface shows absence and the reason, never a partial render.
- At any point with a manifest present, a second button prefills a re-render prompt asking the Journey's agent to rewrite the surface from the declared sources.
- Both buttons only fill the composer. Nothing is sent until the Navigator decides, following the copy already used by `JourneyArrivalSurface`.

## Product-Level States

- `undeclared`: no manifest at the Journey root. Offers the setup gesture.
- `ready`: manifest, surface and sources all readable, surface newer than every declared source.
- `possibly_stale`: manifest and surface readable, at least one declared source modified after the surface. Content still shown, the lag named.
- `unavailable`: manifest unreadable, malformed, of an unknown schema version, or the declared surface missing or oversized. Absence shown with the reason.

The surface never claims a positive `fresh` state in words. The honest vocabulary is silence when nothing indicates staleness, because the declared source list cannot prove completeness. In the canonical case the contract also depends on the current chapter's `capitulo.md` and the proof's `manifesto.json`, whose paths change per chapter, so a static source list covers part of the truth and the copy must not overstate it.

## Acceptance Behavior

- The Navigator opens Workflow on `livro-lideranca-soberana` and can say where the book stands without opening any file.
- Editing `livro/status.yml` makes the tab report that declared sources changed, rather than continuing to present the old view as current.
- Removing or renaming the declared surface file makes the tab show absence with the reason, not an empty frame.
- The app renders the surface without interpreting any of the Journey's vocabulary, states or stage names.
- The setup prompt, pasted into a fresh Conversation in a Journey that has a workflow written in prose, leads the agent to find it rather than to invent one.
- The setup prompt, used in a Journey with no workflow written anywhere, leads the agent to describe what it observed instead of reporting a bare refusal.

## Specification Gaps To Close Before Implementation

- **Manifest file name.** The agent has to find and write this file, so the name must be fixed and stated in the prompt. Proposed: `mirror-workflow.json` at the Journey root, beside `JOURNEY.md`. It must carry no leading dot, since `omitted_workspace_component` rejects dotted components.
- **A new bounded Rust command is required.** `documentation_preview_kind` returns `unavailable` for every extension other than `md`, `markdown` and `txt`, so the existing document reader cannot return JSON. The new command reads the manifest, validates each declared path with the existing `validate_document_relative_path`, rejects symlinks the same way, and returns the manifest together with the modification time of each declared source. It supplies facts only.
- **Staleness derivation.** The booleans are derived by a pure function under `src/domain`, mirroring how `tacticalStale` is produced in `journeyProjections.ts`. No `useEffect`, no clock reading in the component.
- **The re-render gesture.** Without it, every edit to a declared source leaves the tab permanently marked out of date with no path forward inside the product. It is a second prefill button, not an invocation.
- **Prompt size.** `setJourneyComposerDraft` truncates silently at `COMPOSER_DRAFT_MAX_CHARS`, currently 51,200. Both prompts must stay well inside that bound, and a test should assert the margin so a future edit cannot push them over quietly.

## Explicit Non-Goals

- The app does not detect, infer or compute a Journey's workflow.
- The app does not understand the Journey's states, stages or vocabulary.
- The app does not run the agent. Both gestures only prefill the composer.
- The first slice does not add Journey-specific code. `livro-lideranca-soberana` is the validation case, not a branch in the implementation.
- Guiding a Journey that has not yet crystallised a view is out of scope and belongs to its own exploration.

## Open Product Questions

- Does the setup prompt belong in the product as generated text, or should it eventually live as a prose template the Navigator can edit per Journey?
- Should `possibly_stale` name which declared source changed, or only that something did?
- Does the Workflow tab appear for every Journey, or only once a manifest exists? Showing it always makes absence visible and invites composition, which the exploration favours, but it also adds a permanently empty tab to young Journeys.
- What proves the prompt works beyond the canonical case, given that validation requires running it against a real Journey agent?
