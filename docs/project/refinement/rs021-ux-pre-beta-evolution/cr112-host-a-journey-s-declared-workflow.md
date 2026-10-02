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
