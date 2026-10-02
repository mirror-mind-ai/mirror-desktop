[< RS021](index.md)

# CR112: Host a Journey's Declared Workflow

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr112-host-journey-workflow`

## Friction / Opportunity

A Journey's agent can assemble the shape of its work by reading the Journey's own material,
while the Navigator encounters that shape one file at a time. The Context surface honestly
shows what was evidenced in the active Conversation, but it cannot tell the Navigator what
his Journey's work means or how it is organised. That is not a gap the app can close by
calculating a more elaborate tree. The exploration measured two real Journeys with distinct
shapes, and full shell access still produced a confident wrong reading of `vida-economica`'s
cadence from directory structure.

The Journey must declare its own workflow. Mirror Desktop's role is to give that declaration
a stable, honest home.

## Outcome

Mirror Desktop gains a `Workflow` tab beside `Conversation` and `Context`. The tab hosts a
markdown view a Journey's own agent has rendered from a Journey-owned prose contract and its
declared sources. The app renders it without interpreting the Journey's vocabulary, states,
stages or structure.

The Workflow tab exists for every Journey. For a Journey that has not declared a workflow it
shows honest absence and offers a setup gesture. The gesture only prefills a prompt in the
existing composer. It neither runs an agent nor mutates the Journey. A separate re-render
gesture prefills a prompt to refresh a declared view when its sources have changed.

The initial validation case is `livro-lideranca-soberana`, not a Journey-specific branch in
the implementation. Its existing `docs/surface-status-do-projeto.md` already declares the
sources of truth, form, current-chapter rule, three states, six ordered stages, persistence
under `workflow_stages` and the regeneration invocation. The first delivery must show that
existing form without asking the app to understand it.

## Contract

A Journey declares its Workflow surface through three artifacts:

1. A Journey-owned prose contract addressed to the Journey agent. It declares sources of
   truth, form, vocabulary, state rules and how to regenerate the view.
2. A rendered markdown surface written by that agent from the contract's declared sources.
3. A small JSON manifest at the Journey root, beside `JOURNEY.md`, named
   `mirror-workflow.json`.

The manifest has exactly five semantic-free fields:

```json
{
  "schemaVersion": 1,
  "title": "Status do projeto",
  "surface": "docs/workflow-surface.md",
  "contract": "docs/surface-status-do-projeto.md",
  "sources": [
    "livro/estrutura.yml",
    "livro/status.yml"
  ]
}
```

All declared paths are relative to the Journey root, use forward slashes and contain no
component beginning with a dot. The app displays `title`, renders `surface`, and uses
`contract` and `sources` as declared provenance and freshness inputs. It assigns no meaning
to their contents.

The Workflow contract does not live under `.mirror/projections`. Those projections flow from
Mirror into a Journey. The Workflow declaration flows from a Journey up to the app, an
opposite direction of authority.

## User-Facing States

- **Undeclared:** no `mirror-workflow.json` exists. Explain that this Journey has not declared
  a Workflow view and offer the setup prefill.
- **Ready:** manifest, surface and declared sources are readable and no declared source is
  newer than the surface. Render the surface without claiming it is fresh.
- **Possibly stale:** a declared source is newer than the surface. Render the old surface under
  a notice that declared sources changed after it was written, and offer the re-render prefill.
- **Unavailable:** manifest malformed or unreadable, unsupported schema version, declared
  surface missing, unreadable or oversized, or a declared path invalid. Show absence with a
  specific reason. Never render a partial substitute.

A static source list cannot prove completeness. The canonical book contract also depends on
the current chapter's `capitulo.md` and a proof `manifesto.json`, whose paths vary by chapter.
The tab can prove a known source changed, not that nothing relevant changed. It must never say
"fresh" or "up to date".

## Acceptance

- A Journey with no manifest shows the undeclared state and a setup control that only calls the
  existing composer-prefill path. No form, invocation, hidden state, `useEffect`, local storage
  or session storage is introduced.
- The setup and re-render prompts are pure domain functions, remain below a tested margin of
  `COMPOSER_DRAFT_MAX_CHARS`, and say respectively: find, do not invent; and regenerate from
  the contract, do not improve it.
- Both prompts carry the manifest schema inline. The Journey agent cannot be assumed to know
  this repository, its product terms or its contract format.
- The setup prompt prohibits inferring workflow or state from Conversation memory, old
  transport files or directory shape. When material is insufficient it requires a descriptive
  observation of what exists and what is missing, not a bare refusal.
- `livro-lideranca-soberana` renders its Journey-owned status view through the tab using the
  existing `ArtifactMarkdown` renderer. The app does not encode `workflow_stages`, its six
  stage names, or its three state names.
- The agent-produced markdown uses only the renderer's supported subset: headings through
  level three, lists, tables, fenced code, blockquotes, and inline strong, emphasis and code.
  Links are forbidden because `ArtifactMarkdown` renders no links.
- Editing a declared source marks the view possibly stale through a pure domain derivation.
  Rust provides file facts, no component derives freshness in an effect.
- A malformed manifest, unknown schema version, unsafe path, symlink, unsupported surface type
  or oversized surface produces a reasoned unavailable state without escaping the selected
  Journey root.
- The new bounded Rust command reuses `validate_document_relative_path` and the existing
  symlink rejection. It is required because `read_journey_document_at` previews only `md`,
  `markdown` and `txt`, not JSON.
- The existing `artifacts` surface id stays Context's persisted selection state. Workflow gets
  its own persisted surface id. The workspace tree remains only in Context.
- The setup prompt is validated in a real `livro-lideranca-soberana` agent Conversation before
  this CR is marked done. A unit test does not prove the agent found rather than invented.

## Boundaries

- No workflow inference, indexing, background scan, new persistence or LLM call is added to
  Mirror Desktop.
- The app does not edit a Journey. It renders declared files and pre-fills text only.
- The app does not expose prompt or envelope text in Context or Workflow.
- No YAML parser is added. JSON follows the existing `serde_json` dependency and the
  `.mirror/projections/current.json` precedent.
- The first slice does not solve how a young Journey should be guided to crystallise a workflow.
  The book's contract emerged roughly two months after its first structural data appeared, so a
  form, wizard or template that asks a young Journey to declare one is explicitly out of scope.
- No release, push, tag, publication or production mutation is authorised by this CR.

## Evidence And Design Record

The handoff that originated this CR lives in
[`docs/project/explorations/host-the-journey-s-declared-workflow-in-a-workflow-surface/`](../../explorations/host-the-journey-s-declared-workflow-in-a-workflow-surface/index.md).
Read its `product-design-proposal.md` and `setup-prompt-draft.md` before implementation.
The latter contains the prompt drafts and records the two questions not yet settled by product
validation: whether setup must pause for Navigator confirmation before writing the three
artifacts, and whether the prompt itself should follow the Journey's language.

## Implementation (2026-10-01)

### Rust: facts only

`read_journey_workflow_at` in `src-tauri/src/main.rs` reads `mirror-workflow.json` from the Journey
root and reports what it found. It reuses `bounded_documentation_root`,
`validate_document_relative_path` and the same symlink rejection the document reader already
applies, and adds no new reading capability beyond returning JSON, which the existing reader cannot
do because `documentation_preview_kind` answers `unavailable` for every extension other than `md`,
`markdown` and `txt`.

Three transport states: `undeclared` when no manifest exists, `unavailable` with a reason when the
manifest is a symlink, oversized, unreadable, not a JSON object, missing a required field, or
declares a path that escapes the workspace, and `declared` otherwise. For each declared path it
returns a fact carrying `status`, `sizeBytes` and `modifiedAt`. Only the declared surface carries
`content`, bounded by `DOCUMENT_PREVIEW_MAX_BYTES`. The contract's text is never read, because the
contract faces the Journey agent rather than the app.

An unknown `schemaVersion` still parses and is reported as found, so deciding what the app supports
stays a pure-domain decision with a test rather than a branch inside the file reader.

### Domain: the derivation and the prompts

`src/domain/journeyWorkflow.ts` validates the transport and derives the view, mirroring how
`tacticalStale` is produced in `journeyProjections.ts`. The view is `undeclared`, `ready`,
`possibly_stale` or `unavailable`. Both the declared contract and the declared sources count as
freshness inputs, since the manifest names no others. The derivation fails safe: a surface without
a modification time, a declared input that cannot be read, or any declared input newer than the
surface all yield `possibly_stale`.

The surface never claims freshness in words. A declared source list cannot prove completeness, and
in the canonical case the contract also depends on a per-chapter `capitulo.md` and a proof
`manifesto.json` whose paths vary, so the app can prove that a known input changed and never that
nothing relevant did. A test asserts the rendered markup matches no positive freshness claim.

`src/domain/journeyWorkflowPrompts.ts` composes both prompts as pure functions. They carry the
manifest schema inline, fix the file name, forbid inventing or designing a workflow, forbid
inferring state from Conversation memory, old transport files or directory shape, require a
descriptive observation instead of a bare refusal, and restrict the view to the markdown subset
`ArtifactMarkdown` actually renders.

Measured while writing them: `ArtifactMarkdown` renders **no links at all**, since its inline
tokens are only strong, emphasis, code and text, so link syntax would survive as literal text on
the surface. Headings resolve to `h2` and `h3` from levels one to three only. Both prompts
therefore forbid links explicitly. A test bounds each prompt below half of
`COMPOSER_DRAFT_MAX_CHARS`, because `setJourneyComposerDraft` truncates silently at that bound and
would drop the prohibitions last.

### Surface and wiring

`src/app/JourneyWorkflowSurface.tsx` is a single `tabpanel` section whose body branches on the
derived view. It takes everything through props and contains no `invoke`, `useEffect`,
`localStorage`, `sessionStorage` or `dangerouslySetInnerHTML`, asserted from its own source. Both
controls call `onCompose`, which `App.tsx` wires to `setJourneyComposerDraft`, the same path
`JourneyArrivalSurface` uses, and the copy repeats its promise that nothing is sent until the
Navigator decides.

Both controls carry `.secondary-button`. That class is already named in the light families'
white-ink catch-all opt-out list and already has a measured light treatment, so a new transparent
text button could not repeat the CR105 defect of readable ink on the dark shell and white ink on a
white surface. A test asserts both the rendered class and the presence of `.secondary-button` in
that opt-out list in the shipped stylesheet.

The loader in `App.tsx` mirrors the projection loader beside it: the declaration is held as read
and the view is derived in render, so no freshness is computed inside an effect.

`workflow` joins `OperationalSurface` with its own id, `aria-controls` target and availability
entry. Context keeps the `artifacts` id as persisted selection state, and the workspace tree stays
with Context so Workflow holds only the declared view.

### Deliberately not done

No Journey was mutated. `livro-lideranca-soberana` has no `mirror-workflow.json` today, measured
read-only, so the tab reports the undeclared state there. Writing the three artifacts into that
Journey is its own agent's work through the setup prompt, and belongs to the Navigator.

## Gates (2026-10-01)

- `npm test`: 213 files, 1466 tests, all passing, including 13 derivation tests, 11 prompt tests
  and 12 surface tests added by this CR.
- `npx tsc --noEmit`: clean.
- `cargo test` in `src-tauri`: 236 passed, 3 ignored, up from 231 with the five manifest tests
  added by this CR.
- `npm run roadmap:check`: READY.
- Running dev binary verified to carry the registered `read_journey_workflow` command, and the dev
  server verified to serve the `Workflow` label and the new surface module.

## Defect Found In Dev, And Repaired (2026-10-01)

The Navigator reported that the regenerate control wrote the prompt but did not take them to the
composer, so it read as a button that had not worked.

Measured cause: the composer section in `App.tsx` carries
`hidden={!operationalChatSelected || ...}`, so it does not exist on screen for any surface other
than the Conversation. The gesture wrote the draft into state and into `composer-drafts.json`
correctly, and every visible pixel stayed the same. The same defect applied to the setup control,
since both call the one `onCompose`.

`JourneyArrivalSurface` never had this problem and that is why the pattern looked safe when it was
copied: that surface renders inside the Conversation panel, where the composer it fills is already
visible a few centimetres below. Reusing its prefill contract from a different tab silently dropped
the half of the gesture that the layout had been providing for free.

Repair, in the wiring rather than the surface, so the surface stays free of side effects. A named
`composeWorkflowRequest` in `App.tsx` writes the draft, calls the existing `showConversation()`,
and then places the cursor through a new `composerInputRef` on the composer textarea, in a
`requestAnimationFrame` because the textarea does not exist until the Conversation surface paints.

Moving to the composer is the opposite of sending, so the boundary is unchanged, and a test asserts
the handler contains neither `generatePacket` nor `submitActiveSteering`. The surface copy now also
names the destination: the request is written into the Conversation composer, and nothing is sent
until the Navigator decides.

Gates after the repair: `npm test` 213 files, 1467 tests, all passing. `npx tsc --noEmit` clean.

## Remaining

- Validate the setup prompt in a real `livro-lideranca-soberana` agent Conversation: that it finds
  the existing contract rather than inventing one, and that it writes a manifest the app accepts.
  No unit test can establish this.
- Validate the descriptive refusal path in a Journey that has no workflow written anywhere.
- Navigator walkthrough of the four states in the running app, including the light families.
- Re-check both Workflow gestures in dev after the composer navigation repair.
