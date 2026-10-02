# Setup And Re-Render Prompt Draft

Status: draft for Navigator review. Not implemented. No code references this file yet.

This is the real product of the Workflow surface. Everything else is plumbing. The app
can host a declared view cheaply, but the Navigator only gets a declared view if the
prompt reliably produces one, and only produces an honest nothing when there is nothing.

## Why These Prompts Must Be Written Before Code

The Journey's agent has no knowledge of Mirror Desktop. It cannot read this repository,
does not know what the Workflow tab is, and has never seen the manifest schema. So the
prompt has to be entirely self-contained: schema inline, file name fixed, markdown subset
stated, prohibitions explicit.

The prompt is also where the failure mode of CR105 can reappear. CR105 broke because the
app imposed a generic shape on a Journey that had its own. If the prompt invites the agent
to produce a workflow, the same error returns one layer up, now wearing the Journey's
voice and therefore harder to detect. This exploration proved the risk on itself twice by
reading `vida-economica`'s cadence from directory shape and concluding a closed cycle was
incomplete, with full shell access available the whole time.

## Measured Constraints The Prompts Must Respect

- The surface is rendered by `ArtifactMarkdown`, which supports headings of levels one
  through three only (mapped to `h2` and `h3`), unordered and ordered lists, fenced code,
  blockquotes, tables with per-column alignment, and inline strong, emphasis and code.
- Links are not rendered. Markdown link syntax appears as literal text. The prompt must
  forbid links.
- Headings of level four and deeper are not parsed as headings and appear as paragraphs
  with literal hash characters.
- The manifest must carry no leading dot in any path component, because
  `omitted_workspace_component` rejects dotted components, which also excludes `.mirror`.
- The declared surface file must be `md`, `markdown` or `txt` and under one megabyte,
  because `documentation_preview_kind` returns `unavailable` otherwise and
  `DOCUMENT_PREVIEW_MAX_BYTES` is `1024 * 1024`.
- Both prompts must stay well inside `COMPOSER_DRAFT_MAX_CHARS`, currently 51,200, since
  `setJourneyComposerDraft` truncates silently. The drafts below are roughly 4 KB each.

## Manifest Schema Carried Inline By The Prompt

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

Five fields, no semantics. The app never interprets `title` beyond displaying it, and
never looks inside `contract` or `sources` except to read modification times.

## Draft: Setup Prompt

The button that prefills this appears when the Journey root has no `mirror-workflow.json`.

```text
I want this Journey to declare its own workflow view, so Mirror Desktop can host it in a
Workflow tab instead of guessing at it.

Your task is to FIND the workflow this Journey already follows. Do not design one.

Step 1. Look for a workflow that is already written down. Read JOURNEY.md and then survey
the Journey's documentation. You are looking for prose that already describes: when the
work resumes, what gets read on resumption, the ordered steps of the work, the vocabulary
used for states or stages, where state is recorded, and any boundary about what you may do
versus what the human does. This Journey may already carry all of it in a single document.

Step 2. Look for where the state actually lives. A workflow view is only useful if it
reflects current state, so find the files that hold it: structured data, status files,
manifests, or a canonical document per unit of work. Name the exact paths.

Step 3. Report before writing anything. Tell me what you found, with paths, and what you
did not find. Then stop and wait for my confirmation.

If and only if I confirm, write three things:

1. A contract document, in prose, in this Journey's own language, addressed to you rather
than to the app. It declares: the sources of truth with exact paths, the form the view
takes, the rule for deciding what is current, the closed vocabulary of states and the
ordered stages, where state is persisted, and how the view is to be regenerated. If a
document like this already exists in this Journey, do not duplicate it. Keep it where it
is and point the manifest at it.

2. The rendered view itself, as a markdown file, written from the sources named in the
contract and from nothing else. Keep it to one screen if you can. Use only: headings of
level one to three, bullet and numbered lists, tables, fenced code, blockquotes, and
inline bold, italic and code. Do NOT use links of any kind; they will render as literal
text. Write it in this Journey's own language.

3. A file named exactly mirror-workflow.json at the root of this Journey, beside
JOURNEY.md, with exactly these fields:

{
  "schemaVersion": 1,
  "title": "<short label for the tab>",
  "surface": "<relative path to the markdown view you wrote>",
  "contract": "<relative path to the contract document>",
  "sources": ["<relative path>", "<relative path>"]
}

All paths are relative to the Journey root, use forward slashes, and must not contain any
component beginning with a dot. The surface file must end in .md, .markdown or .txt and
stay under one megabyte. List in "sources" every file whose change should mark the view as
out of date.

Hard rules for all of this:

- Do not invent a workflow. If this Journey does not already follow a describable process,
say so and stop. A wrong view is worse than no view, because I will trust it.
- Do not infer state from our conversation history, from your memory of past sessions, or
from old transport files. Read the current files.
- Do not infer the process from the shape of the directory tree. Folder names and counts
suggest patterns that are frequently wrong.
- Do not change anything else in this Journey.

If you cannot find enough to work from, do not just refuse. Describe what you did observe:
the structures that repeat, the documents that exist, the state that appears to be tracked
somewhere, and specifically what is missing to make a declared view possible. That
description is what I need in order to decide the next step.
```

## Draft: Re-Render Prompt

The button that prefills this appears whenever a manifest exists. Without it, every edit
to a declared source leaves the tab permanently marked out of date with no path forward
inside the product.

```text
The Workflow view for this Journey is out of date. Please regenerate it.

Read mirror-workflow.json at the root of this Journey. Read the contract document it
names, and follow that contract exactly. Rewrite the surface file it names, from the
sources the contract declares and from nothing else.

Rules:

- The contract is the authority on form, vocabulary and what counts as current. Do not
improve on it. If you believe the contract itself is now wrong, say so and stop rather
than quietly writing a different view.
- Read the current files. Do not reconstruct state from our conversation, from memory, or
from older copies of these documents.
- Use only: headings of level one to three, bullet and numbered lists, tables, fenced
code, blockquotes, and inline bold, italic and code. No links of any kind.
- Change only the surface file, unless the contract tells you to update a state file as
part of this work.
- If the manifest names a path that no longer exists, report the broken path and stop.
```

## Open Questions For The Navigator

- **Language of the prompt.** Both prompts are drafted in English, matching the app's
  copy, while both canonical Journeys are written in Portuguese. The prompts instruct the
  agent to write the artifacts in the Journey's own language, which resolves the output.
  Still open whether the prompt itself should be Portuguese when the Journey is.
- **The confirmation step.** The setup prompt asks the agent to report findings and stop
  before writing. That makes the gesture two turns instead of one. It is the right default
  for a prompt that creates three files in a Journey you care about, but it is a choice.
- **Whether the contract should be rewritten when one already exists.** The draft says to
  leave it in place and point at it, which is correct for `livro-lideranca-soberana`,
  where `docs/surface-status-do-projeto.md` already exists and is better than anything a
  fresh pass would produce. Worth confirming that is always the preference.
- **Validation.** Neither prompt is proven. Proving them means pasting them into a real
  Journey agent and seeing what comes back: the canonical case for the finding path, and a
  young Journey for the descriptive refusal path. This should happen before the CR is
  called done, and it cannot be covered by unit tests.

## What Is Testable Without Running An Agent

The prompts should be produced by a pure function under `src/domain`, not inlined in a
component, so that tests can assert: the manifest file name appears, the schema fields all
appear, the prohibition on inventing appears, the prohibition on inferring from
conversation and from directory shape appears, links are forbidden, the descriptive
refusal instruction appears, and the total length stays under a stated fraction of
`COMPOSER_DRAFT_MAX_CHARS`.
