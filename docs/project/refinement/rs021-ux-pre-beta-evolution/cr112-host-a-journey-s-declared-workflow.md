[< RS021](index.md)

# CR112: Host a Canvas the Journey's Agent Draws

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr112-host-journey-workflow`

This file's slug and the delivery branch still say "workflow". They are kept as historical
identifiers, the same decision CR105 recorded when its readable title followed the product while
its slug, branch and internal names did not. The readable title above is the authority on what is
being built.

## Friction / Opportunity

A Journey's agent can assemble the shape of its work by reading the Journey's own material,
while the Navigator encounters that shape one file at a time. The Context surface honestly
shows what was evidenced in the active Conversation, but it cannot tell the Navigator what
their Journey's work means or how it is organised. That is not a gap the app can close by
calculating a more elaborate tree. The exploration measured two real Journeys with distinct
shapes, and full shell access still produced a confident wrong reading of `vida-economica`'s
cadence from directory structure.

The Journey must say this for itself, and Mirror Desktop's role is to give what it says a
stable, honest home. This CR first read that as a workflow the Journey declares. Measurement
against a second Journey showed the declaration had to be freer than a genre, which is what the
pivot below records.

## Pivot to Canvas (2026-10-02)

The Navigator ran the setup prompt through the evaluation bundle against `vida-economica`, a
Journey whose material belongs to it and not to this one. What came back was not a workflow view.
It was a panel: current cycle with its declared state, eight ordered steps, consolidated financial
position with per-account balances, provisioned future debits, open items with their next action,
and the next resumption date.

The first reading was that the agent had overshot the prompt. Measurement contradicted that.

Measured in that Journey, read-only, with provenance preserved: the agent wrote a 5,884 byte
contract, a 2,911 byte view, and a 470 byte manifest declaring seven sources. The contract
satisfies every rule the prompt stated. It opens with a fidelity rule, names its sources of truth
with exact paths, declares how to decide the current cycle from the folder-naming convention
rather than from the directory tree, fixes a closed vocabulary of five obligation states and eight
ordered stages, says where state persists and that the view must never be its only witness,
explains how to regenerate, and even says to update the source list at the turn of the month. It
declares the view's form in four parts. The view has exactly those four parts and fits one screen.

So the prompt worked. What failed was the word. For the book, a workflow is which stage each
chapter is in, and "workflow" seemed sufficient. For `vida-economica`, what the Journey calls its
own situation is steps plus balances plus open items, because that is what its own
`docs/estado-atual.md` treats as state. The prompt had named a genre, and a Journey whose
situation does not fit that genre produced something truthful that the genre's name made look
wrong.

That is the same structural error CR105 made one layer down, now in the Journey's own voice and
therefore harder to see. CR105 imposed a shape on a Journey that had its own. CR112 imposed a
genre on a Journey that had its own.

### The decision

The tab becomes **Canvas**: the agent's drawing area, where it keeps a durable rendering of what
is happening in a Journey. The app stops naming the genre of the drawing. It hosts a markdown file
and renders it, and the Journey decides what deserves to be there.

This is the third step of one direction. CR105 calculated and was refused. CR112 hosted a
declaration but still named what the declaration had to be about. Canvas hosts the file and names
nothing. At each step the app knows less about the content and hosts more.

The Navigator's own practice is the proof that this is enough. In `livro-lideranca-soberana` he
had already taught the agent to draw the workflow in the Conversation output whenever he asked for
a project status. Canvas is that same practice with a different output channel, and keeping the
agent aware of when to redraw stays the Navigator's job rather than becoming the app's inference.

### Why the word survives measurement

"Canvas" appears nowhere in the 30 documents of the Nautilus method, so it borrows no meaning the
method has already spent and negates no term the method uses. In the product it appears only as a
background colour token, `--light-canvas`, which is semantically compatible and carries no
conflict in the surface vocabulary.

### What survives the pivot

Everything dated 2026-10-01 below describes the superseded design and is kept as a dated record,
not as current specification. The mechanism it built mostly survives: the bounded Rust reader
pattern, the tab with its own surface id, rendering through `ArtifactMarkdown`, the two controls
reusing `.secondary-button`, the composer navigation repair, and the language anchor carried from
the Journey's description.

What dies with the manifest: `schemaVersion` and its unknown-version reporting, the declared
source list, the per-path facts, the freshness derivation and the `possibly_stale` state.

### A vocabulary gap this exposed

The index declares nine Change Request statuses and none of them means "superseded by what it
taught". Closing this CR as `rejected` would be false, since the work was not declined, and
`parked` would imply it could resume as written. So the CR is rewritten in place under a new
readable title, with the superseded contract preserved below as a dated record. The missing status
is a gap worth naming in the index's own vocabulary rather than faking with a wrong label.

## Outcome

Mirror Desktop gains a `Canvas` tab beside `Conversation` and `Context`. The tab renders a markdown
file the Journey's own agent draws and keeps. The app assigns no meaning to its contents: not the
genre, not the vocabulary, not the structure, not the sections.

The tab exists for every Journey. Where nothing has been drawn it shows honest absence and offers a
gesture that teaches the agent to draw and keep the canvas. Where a drawing exists it renders it and
says when it was drawn, never whether it is current. A second gesture asks for a fresh drawing,
which is the Navigator's reminder in the form of a control rather than a freshness claim by the app.

Both gestures only pre-fill the existing composer. Neither runs an agent nor mutates a Journey.

## Contract

Two files, by convention, at the root of the Journey as resolved from the registry's
`projectPath`, beside `JOURNEY.md`. No manifest, no schema, no declared sources.

| File | What it is | What the app does with it |
|---|---|---|
| `canvas.md` | the drawing | reads its content and renders it |
| `canvas-instructions.md` | the Journey's standing instructions to its agent about drawing | reads only whether it exists |

Neither name begins with a dot, because `omitted_workspace_component` makes any dotted component
invisible to the bounded reader. Both sit at the Journey root, which is the registry's
`projectPath` and never a path discovered from git. For `mirror-desktop` the Journey root and the
repository root are the same directory; for `vida-economica` and `livro-lideranca-soberana` the
Journey root is not a repository at all.

The app never reads the content of `canvas-instructions.md`. It names the path in the redraw
prompt and the agent reads the file itself, so the instructions are never transported, never
truncated and never interpreted by the app.

The tab's label is always `Canvas`. The drawing's own title is its first heading, which the agent
controls without any field anywhere. There is no `title` to declare, because there is no manifest
to declare it in.

### What actually reads the instructions, corrected after measurement

Nothing at the Journey root is loaded automatically. Mirror Desktop invokes Pi with `current_dir`
at the Mirror root, so context files are resolved against that directory and never against the
Journey root. Confirmed from inside a live Desktop turn for this Journey: the working directory was
the Mirror root and the injected instruction file was the Mirror root's own `AGENTS.md`. The
Journey checkout's `AGENTS.md` was never loaded.

A real user's machine makes the same point from the other side. Someone running Mirror Desktop has
no checkout of this repository at all, so a root loader file here could not exist for them.

So the instructions file has exactly one live reader: the redraw gesture, which names the path and
lets the agent read the file itself. The app is the loader. Beyond that, the Navigator points the
agent at it in conversation, which is what the Navigator said from the start, that keeping the
agent aware of when to redraw would be their job rather than the app's.

The only per-Journey channel found that Mirror itself feeds is `mm-build`, which instructs the
agent to read `<project_path>/CLAUDE.md` and project docs on load. It is weak for this purpose: it
is `CLAUDE.md` rather than `AGENTS.md`, it happens only when Builder Mode is loaded for that
Journey, and none of `mirror-desktop`, `vida-economica` or `livro-lideranca-soberana` carries that
file. It is recorded here as a fact, not adopted as a mechanism.

An earlier version of this section claimed the opposite, that 22 of 71 Journey roots carry a loader
of standing instructions and that the teaching prompt should ask the agent to wire a pointer into
whichever one it loads. That count was real and measured the wrong thing: it counted loader files
that exist, assuming something loads them, which in this runtime nothing does. The prompt no longer
asks for a pointer, and a test asserts it names no loader file, so the claim cannot return as a
premise for a later decision.

### The names are free

Measured across the 71 existing Journey roots: `canvas.md`, `canvas-instructions.md` and
`CANVAS.md` collide with nothing. For context, the most common root files are `README.md` in 35,
`JOURNEY.md` in 30, `AGENTS.md` in 16 and `CLAUDE.md` in 14.

### The drawing has to be re-read after the agent draws it

The Navigator reported this from the evaluation bundle: after the agent finished writing the
markdown, the tab did not update. Closing and reopening the app was the only way to see it.

Measured cause. The loader in `App.tsx` is an effect whose dependency array is
`[selectedJourney, registryLoaded, runtimeBindingReady]`. None of those change when an agent
writes a file, so the declaration is read once per Journey selection and never again. The derived
view was correct; it was derived from a stale read.

The Canvas design inherits this exposure completely, and more acutely: under Canvas the whole
point is that the agent redraws the file repeatedly during the work. A tab that only reflected the
file as it was when the Journey was selected would be wrong most of the time.

The house already answers this, and the answer is not a file watcher.
`JourneyDocumentationBrowser` carries an explicit reload control, `artifact-tree-reload`, with its
own in-progress state and a failure message that keeps the last good tree on screen. Disk changing
underneath the app is treated as something the Navigator asks about, never as something the app
polls for. That respects the no-background-scan boundary.

So Canvas re-reads `canvas.md` on two gestures and on nothing else: when the Canvas tab becomes
the selected surface, which is the Navigator saying they want to look at it, and through a reload
control on the tab itself, following Context's precedent including keeping the last good drawing
visible when a re-read fails. Reading one bounded file on tab selection is a gesture-driven read,
not a scan, and the derivation stays pure in render rather than moving into the effect.

## User-Facing States

- **Undrawn:** no `canvas.md`. Explain that this Journey's agent has not drawn a canvas and offer
  the teaching gesture.
- **Drawn:** `canvas.md` is readable. Render it and say when it was drawn. Never say current, fresh
  or up to date, because without declared sources the app cannot know and should not imply it.
- **Unavailable:** `canvas.md` is a symlink, oversized, or not valid UTF-8. Show absence with the
  specific reason and never render a partial substitute.

Whether `canvas-instructions.md` exists is a secondary fact, not an error. A drawing without
standing instructions is a drawing that will not be kept, so in that case the tab renders the
drawing and still offers the teaching gesture. The two gestures are not mutually exclusive.

Freshness is gone by design. The superseded design could say a declared source had changed; it
could never say nothing relevant had changed. Canvas declares no sources, so it says only when the
drawing was made and leaves the judgement to the Navigator who asked for it.

## Acceptance

- The two file names are fixed constants in one place, and the app resolves them against the
  registry's `projectPath`, reusing `validate_document_relative_path` and the existing symlink
  rejection.
- A Journey with no `canvas.md` shows the undrawn state and a teaching control that only calls the
  existing composer-prefill path. No form, invocation, hidden state, `useEffect`, local storage or
  session storage is introduced.
- A readable `canvas.md` renders through the existing `ArtifactMarkdown`, with the drawn-at time
  shown and no positive freshness claim anywhere in the markup, asserted by test.
- Selecting the Canvas surface re-reads `canvas.md`, so a drawing the agent produced during the
  session appears without restarting the app. This is the defect the Navigator found in the
  superseded implementation and it must not survive the pivot.
- The tab carries a reload control following Context's `artifact-tree-reload` precedent, with its
  own in-progress state, and a failed re-read keeps the last good drawing on screen under a named
  error rather than replacing it with absence.
- No file watcher, polling interval or background scan is added. Re-reads happen on Journey
  selection, on Canvas surface selection, and on the reload control.
- A symlinked, oversized or non-UTF-8 `canvas.md` produces a reasoned unavailable state without
  escaping the selected Journey root.
- The app reads only the existence of `canvas-instructions.md`, never its content, asserted from
  the transport's own source.
- When `canvas.md` exists and `canvas-instructions.md` does not, both gestures are offered.
- Both prompts are pure domain functions with their own tests, bounded below half of
  `COMPOSER_DRAFT_MAX_CHARS`, since `setJourneyComposerDraft` truncates silently at that bound and
  would drop the prohibitions last.
- The teaching prompt captures intent before drawing, asks what belongs on the canvas and offers
  its own reading of what belongs, writes the first drawing, writes `canvas-instructions.md`, and
  says where it wrote it. It states plainly that nothing loads that file automatically and that the
  redraw gesture is what reads it, so the agent is not invited to invent a loading mechanism. A
  test asserts the prompt names no loader file.
- The teaching prompt states that the instructions are short and about what to draw and when to
  redraw, not a specification of form. This is enforced by prompt and not by code, and the 5,884
  byte contract the same prompt family produced in `vida-economica` is the evidence for why it has
  to be said explicitly.
- Both prompts keep the origin prohibitions intact: never from Conversation memory, never from
  memory of earlier sessions, never from old transport files, never inferred from the shape of the
  directory tree. These were never about workflow; they are about not fabricating fact.
- Both prompts keep the language anchor: the Journey's description quoted inline, the instruction
  to write in that language, and the explicit prohibition on translating into English.
- Both prompts forbid links, because `ArtifactMarkdown` renders none and link syntax would survive
  as literal text.
- The redraw prompt names `canvas-instructions.md` and instructs the agent to follow it, replacing
  `canvas.md` entirely from the Journey's current files.
- `canvas` gets its own persisted surface id. Context keeps `artifacts` as its persisted selection
  state and the workspace tree stays in Context.
- The teaching prompt is validated in a real agent Conversation in a Journey that has no canvas,
  before this CR is marked done. No unit test establishes that an agent found rather than invented.

## Boundaries

- No inference about what a Journey's work is, no indexing, no background scan, no new persistence
  and no LLM call is added to Mirror Desktop.
- The app does not edit a Journey. It renders one declared file, detects another, and pre-fills
  text.
- The app does not interpret, transport or display the content of `canvas-instructions.md`.
- The app does not expose prompt or envelope text in Context or Canvas.
- No manifest, schema version or declared source list is introduced. Their absence is the point.
- The app makes no freshness claim and derives no staleness.
- The three artifacts the agent wrote in `vida-economica` belong to that Journey. They are read
  with provenance preserved and are not modified from here.
- How a young Journey should be guided to crystallise a view remains out of scope. The book's
  contract emerged roughly two months after its first structural data appeared, so a form, wizard
  or template is explicitly excluded.
- No release, push, tag, publication or production mutation is authorised by this CR.

## Canvas Implementation (2026-10-02)

### Rust: one file read, one file detected

`read_journey_canvas_at` reads `canvas.md` from the Journey root and reports whether
`canvas-instructions.md` exists. Three transport states: `undrawn`, `unavailable` with a named
reason, `drawn` with content, size and modification time. It reuses `bounded_documentation_root`,
the existing symlink rejection and `DOCUMENT_PREVIEW_MAX_BYTES`.

The instructions file is answered by `canvas_instructions_present`, which calls
`fs::symlink_metadata` and nothing else. Its text is never read, so it cannot be transported and
cannot be interpreted here. A test serialises the whole transport and asserts the instruction
text does not appear in it. A symlinked instructions file is reported absent, so the absence of
standing instructions is never hidden by an escape route out of the Journey.

Deleted with the manifest: `JourneyWorkflowDeclaration`, `JourneyWorkflowFileFact`,
`workflow_declaration`, `workflow_file_fact`, `journey_workflow_input_fact`,
`journey_workflow_surface_fact`, `read_journey_workflow_at` and the schema-version reporting.

### Domain: no freshness to derive

`src/domain/journeyCanvas.ts` validates the transport and derives the view. The derivation is now
almost nothing, which is the point: `drawnAt` is the only temporal fact, and there is deliberately
no companion field saying whether that moment is recent enough to trust. A test enumerates
`stale`, `possiblyStale`, `fresh`, `current`, `changedInputs`, `missingInputs` and `sourcePaths`
and asserts the view carries none of them, and that its JSON matches no freshness language.

`src/domain/journeyCanvasPrompts.ts` composes both prompts as pure functions. The teaching prompt
captures intent before drawing, asks what belongs and offers its own reading, writes the drawing,
writes `canvas-instructions.md` and asks where it went. It states that nothing loads that file
automatically and that the redraw gesture is what reads it. It says to keep the instructions short
and about what to draw and when to redraw. A test asserts the word "workflow" appears nowhere in it, because naming a genre
is the error being corrected.

The redraw prompt sends the agent to `canvas-instructions.md` rather than carrying its text, and
tells it what to do when that file does not exist. A test asserts it makes no claim that the
drawing is out of date, because without declared sources the app cannot know that.

Both prompts keep the origin prohibitions, the language anchor with the Journey's description
quoted inline, the prohibition on translating into English, and the prohibition on links. Phrase
assertions run against collapsed whitespace, since a line break in prose is as insignificant as a
space and the previous form would have failed on rewrapping and passed only by luck.

### The re-read defect, repaired

The loader is now keyed on `canvasSurfaceSelected` and `journeyCanvasReadNonce` in addition to
Journey, registry and binding. Selecting Canvas re-reads the drawing; the reload control bumps the
nonce. A re-read sets `journeyCanvasReloading` rather than clearing the drawing, so the panel does
not blink through absence on its way back to the same content, following Context's precedent of
keeping the last good tree on screen. A test asserts the dependency list, the absence of
`setInterval`, `setTimeout` and any watcher, and that the in-flight path preserves the drawing.

### Surface and wiring

`src/app/JourneyCanvasSurface.tsx` is a single `tabpanel` taking everything through props, with no
`invoke`, `useEffect`, `useState`, `localStorage`, `sessionStorage` or `dangerouslySetInnerHTML`,
asserted from its own source. When a drawing exists without standing instructions it says so and
offers both gestures, since a drawing nobody will keep is the one case where teaching still
applies.

Both action controls are `.secondary-button`. The reload control is a bare button and is **not**
in the light catch-all's opt-out list, so the mechanism that keeps it legible is a dedicated
light-family rule carrying higher specificity than the catch-all, which is how
`.artifact-tree-reload` survives. It joins that same rule rather than inventing a treatment that
would have to be measured again. A test asserts both halves: that the shared rule names both
classes and the three light families, and that the class is absent from the opt-out list.

`canvas` replaces `workflow` in `OperationalSurface` with its own panel id and availability entry.
Context keeps `artifacts` as its persisted selection state.

### This Journey's own artifacts

The three dogfooding artifacts from `736b90b` are replaced by `canvas.md` and
`canvas-instructions.md` at the Journey root. Nothing else changed.

A one-line pointer was briefly added to this repository's `AGENTS.md` and then reverted, because
measurement showed it inert: Pi runs with the Mirror root as its working directory, so that file is
never loaded during a Desktop turn, and a real user has no copy of it. It is recorded here because
the mistake was a premise error rather than a typo, and the corrected premise is above.

Verified by replaying the reader's rules against the real files: both present, neither a symlink,
1,719 and 1,610 bytes against a one megabyte bound, both valid UTF-8, neither dotted, zero link
syntax occurrences in the drawing, headings no deeper than level two. Derived state: `drawn` with
`instructionsPresent` true.

## Canvas Gates (2026-10-02)

- `npm test`: 213 files, 1,475 tests, all passing, including 11 domain tests, 18 prompt tests and
  14 surface tests for Canvas, plus a regression guard for the re-read defect.
- `cargo test`: 236 passed, 3 ignored.
- `npx tsc --noEmit`: clean.
- `npm run roadmap:check`: READY.

## Superseded Workflow Design (2026-10-01)

Kept as a dated record of what this CR carried before the Canvas pivot. It is not current
specification. The headings below are demoted to mark that, and they are preserved because the
pivot's reasoning is only legible against what it replaced.

<details>
<summary>The superseded outcome, its three-artifact contract, its four states and its acceptance</summary>

#### Outcome

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

#### Contract

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

#### User-Facing States

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

#### Acceptance

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


</details>

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

## Language Anchor (2026-10-01)

The Navigator asked whether the agent might write the workflow in English, and whether the prompt
should name the language used in the Journey briefing. Measurement showed the risk was real and
worse than the question assumed.

The setup prompt said "in this Journey's own language" twice. The re-render prompt said **nothing
about language at all**, and that is the prompt that runs every time a declared source changes, so
drift would have compounded exactly where there was no rule. Both prompts are also written in
English, which pulls an agent towards English regardless of the material it just read.

The briefing is the right anchor, but not the way the question framed it. CR105 measured that the
Journey briefing is never injected into a Desktop turn, so instructing the agent to use the
briefing's language would point it at text it cannot read. The app holds that text and previously
passed it only to the Context surface.

The briefing is also the only anchor that always exists. Measured on the dev registry: 4 of 21
registered Journeys carry a `JOURNEY.md`, while every Journey carries a description. An instruction
to follow the language of the Journey's documents would therefore have had nothing to attach to in
most Journeys.

So `App.tsx` passes `selectedJourneyItem.description` to the Workflow surface, which forwards it to
both prompt composers and never displays it. Both prompts now quote the description and state the
rule explicitly, including a direct prohibition on translating into English. The re-render prompt
additionally anchors to the artifacts it is replacing: changing the language of the contract or the
view is a rewrite, not a regeneration.

The quoted excerpt is bounded at `WORKFLOW_BRIEFING_EXCERPT_MAX_CHARS`, 600 characters, so a long
description cannot push the prohibitions down the prompt. Verified against two real dev briefings:
the Portuguese `ariad` description yields a 4,063 character setup prompt and the English
`mirror-desktop` description yields 3,768, both far inside the composer bound.

Gates: `npm test` 213 files, 1473 tests, all passing. `npx tsc --noEmit` clean.

## Homologation In Eval (2026-10-02)

The Navigator rebuilt and installed the Eval bundle, ran the teaching prompt from the Canvas tab
against `vida-economica`, and homologated the result. The bundle was verified as the Canvas build
before the run: the installed binary carries `read_journey_canvas`, `canvas.md` and
`canvas-instructions.md` and no longer carries `read_journey_workflow` or `mirror-workflow.json`,
and the embedded front-end bundle carries `operational-canvas-panel`, both teaching and redraw
labels, and the corrected prompt sentence, with zero occurrences of the workflow panel, the
`Workflow` label, or the removed pointer sentence.

### The pivot's central claim, tested against its own baseline

The run was deliberately made in that Journey's existing Conversation rather than a fresh one. A
fresh Conversation was considered and rejected, because the prompt's most important prohibition is
against drawing from conversation memory, and in a fresh Conversation there is nothing to wrongly
draw from, so the prohibition would have been verified under the only condition in which it cannot
fail. A loaded Conversation is also the designed condition, since the whole premise is that the
Navigator keeps the agent aware during the work.

`vida-economica` is the only Journey that could test the pivot's central claim, because it is the
only one with a baseline: the same agent, the same material, and a prompt that previously named the
genre. The structural difference between the two outputs is the finding.

The workflow-era view opened with an eight-row table of cycle stages and declared a five-term
vocabulary of obligation states. The canvas drops both entirely and keeps the situation: cash and
runway, account positions, the provision already assumed at Itaú PF with its three dated entries,
and the attentions that remain. Without the genre's name the agent drew what the Journey's
situation is rather than what its process is, which is exactly what the pivot predicted.

### The origin prohibition held, and reached past the old view

Every figure in the drawing traces to a current file of that Journey. Checked by measurement, with
that Journey's provenance preserved and nothing modified there:

- The epigraph is `JOURNEY.md` line 9, close to verbatim.
- `Pagar.me, a receber R$ 728,09` is the one figure the drawing carries that the workflow-era view
  does not. It traces to `conciliacao-mensal/202609/saldos.md` and `conciliacao.md`, which are
  sources rather than conversation. The agent went past the previous view to the primary files and
  picked up something the previous view had missed.
- Every other figure matches the earlier view, which derived from the same sources, unchanged
  between the two runs.

No figure was found that exists only in the Conversation or only in the superseded view.

### The corrected prompt produced instructions with no invented loader

The instructions the agent wrote are short, name the canvas as derived and never the place a fact
is recorded, name the redraw trigger as the Navigator asking for state or the agent having just
changed something the canvas shows, and restate the origin prohibition in the Journey's own words.
They name no loader file and describe no pointer, which is what the corrected prompt asked for and
what the previous version would have made the agent invent.

## Remaining

- On this Journey the root is also the repository root, so `canvas.md` is versioned and will show
  in every `git status` after a redraw. That is a real dogfooding friction and an argument for
  treating the canvas as derived and disposable: this Journey may ignore it in git without losing
  anything, because state never lives there. Left as is for now, to see whether it actually annoys.
- Validation of the teaching prompt against a Journey with no canvas is done and homologated in
  Eval, recorded above. What it did not cover: the three states walked across the four theme
  families, and the `unavailable` state with each of its five reasons, neither of which the
  homologation run would have encountered. Both are covered by tests rather than by eye.
- `livro-lideranca-soberana` remains the clean case for the question `vida-economica` can no longer
  answer, whether the agent finds rather than invents without a baseline to improve on. Not a
  blocker for this Change Request.
- Decide whether the index's Change Request vocabulary should gain a status for work superseded by
  what it taught. Still open, and still the second gap this Change Request exposed in the index.
- `mirror-workflow.json` in `vida-economica` is now dead weight, since no build reads it after the
  pivot. It belongs to that Journey and is not touched from here. The prose contract beside it is
  not dead weight: it is that Journey's own thinking, and the sentence this work borrowed from it
  came from there.
- The renderer's limits are still enforced by prompt rather than by product. A freer agent will
  want to link the Journey's documents, which Context already knows how to open. Not now, but it
  is the next wall.
