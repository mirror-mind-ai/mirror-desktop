/**
 * CR112: the prompts the Workflow surface pre-fills into the composer. They are the part of this
 * feature that carries its value, so they are pure functions with their own tests rather than
 * strings buried in a component.
 *
 * The Journey's agent cannot read this repository, has never seen the manifest schema and does
 * not know what the Workflow tab is, so every prompt is self-contained.
 *
 * Nothing here runs an agent. The composer receives text and the Navigator decides.
 */

import { WORKFLOW_MANIFEST_FILE_NAME } from "./journeyWorkflow";

/**
 * The prohibitions exist because CR105 failed by imposing a generic shape on a Journey that had
 * its own. Invited to produce a workflow, an agent would repeat that error one layer up, now in
 * the Journey's own voice and therefore harder to catch. The same exploration proved the risk on
 * itself twice by reading a monthly cadence off a directory tree and misreading a closed cycle.
 */
const findingRules = `Hard rules for all of this:

- Do not invent a workflow. Do not design one. If this Journey does not already follow a
describable process, say so and stop. A wrong view is worse than no view, because I will trust it.
- Do not infer state from our conversation, from your memory of earlier sessions, or from old
transport files. Read the current files.
- Do not infer the process from the shape of the directory tree. Folder names and counts suggest
patterns that are frequently wrong.
- Do not change anything else in this Journey.`;

/**
 * ArtifactMarkdown renders headings of levels one to three, lists, tables with per-column
 * alignment, fenced code, blockquotes, and inline strong, emphasis and code. It renders no
 * links at all, so link syntax would survive as literal text on the surface.
 */
const renderingRules = `Use only: headings of level one to three, bullet and numbered lists,
tables, fenced code, blockquotes, and inline bold, italic and code. Do not use links of any kind;
they will render as literal text.`;

const manifestSchema = `{
  "schemaVersion": 1,
  "title": "<short label for the tab>",
  "surface": "<relative path to the markdown view you wrote>",
  "contract": "<relative path to the contract document>",
  "sources": ["<relative path>", "<relative path>"]
}`;

const manifestRules = `All paths are relative to the Journey root and use forward slashes.
Paths must not contain any component beginning with a dot.
The surface file must end in .md, .markdown or .txt and stay under one megabyte.
List in "sources" every file whose change should mark the view as out of date.`;

export function composeWorkflowSetupPrompt(journeyName: string): string {
  return `I want this Journey, ${journeyName}, to declare its own workflow view, so Mirror Desktop
can host it in a Workflow tab instead of guessing at it.

Your task is to find the workflow this Journey already follows. Do not design one.

Step 1. Look for a workflow that is already written down. Read JOURNEY.md and then survey this
Journey's documentation. You are looking for prose that already describes: when the work resumes,
what gets read on resumption, the ordered steps of the work, the vocabulary used for states or
stages, where state is recorded, and any boundary about what you may do versus what I do myself.
This Journey may already carry all of it in a single document.

Step 2. Look for where the state actually lives. A workflow view is only useful if it reflects
current state, so find the files that hold it: structured data, status files, manifests, or a
canonical document per unit of work. Name the exact paths.

Step 3. Report before writing anything. Tell me what you found, with paths, and what you did not
find. Then stop and wait for my confirmation.

If and only if I confirm, write three things:

1. A contract document, in prose, in this Journey's own language, addressed to you rather than to
the app. It declares: the sources of truth with exact paths, the form the view takes, the rule for
deciding what is current, the closed vocabulary of states and the ordered stages, where state is
persisted, and how the view is to be regenerated. If a document like this already exists in this
Journey, do not duplicate it. Keep it where it is and point the manifest at it.

2. The rendered view itself, as a markdown file, written from the sources named in the contract
and from nothing else. Keep it to one screen if you can. ${renderingRules} Write it in this
Journey's own language.

3. A file named exactly ${WORKFLOW_MANIFEST_FILE_NAME} at the root of this Journey, beside
JOURNEY.md, with exactly these fields:

${manifestSchema}

${manifestRules}

${findingRules}

If you cannot find enough to work from, do not just refuse. Describe what you did observe: the
structures that repeat, the documents that exist, the state that appears to be tracked somewhere,
and specifically what is missing to make a declared view possible. That description is what I need
in order to decide the next step.`;
}

export function composeWorkflowRerenderPrompt(journeyName: string): string {
  return `The Workflow view for this Journey, ${journeyName}, is out of date. Please regenerate it.

Read ${WORKFLOW_MANIFEST_FILE_NAME} at the root of this Journey. Read the contract document it
names, and follow that contract exactly. Rewrite the surface file it names, from the sources the
contract declares and from nothing else.

Rules:

- The contract is the authority on form, vocabulary and what counts as current.
Do not improve on it. If you believe the contract itself is now wrong, say so and stop rather than
quietly writing a different view.
- Read the current files. Do not reconstruct state from our conversation, from your memory of
earlier sessions, or from older copies of these documents.
- ${renderingRules}
- Change only the surface file, unless the contract tells you to update a state file as part of
this work.
- If the manifest names a path that no longer exists, report the broken path and stop.`;
}
