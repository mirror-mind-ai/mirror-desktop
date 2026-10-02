[< Refinement Workbench](index.md)

# Workflow Surface Contract

This document is addressed to this Journey's agent, not to Mirror Desktop. It declares how to
render the Workflow view that the app hosts, so the app never has to infer this Journey's shape.

Mirror Desktop reads `mirror-workflow.json` at this Journey's root, renders the Markdown file that
manifest names, and compares modification times. It assigns no meaning to anything below.

## Source Of Truth

One file: `docs/project/refinement/index.md`.

That file already declares its own authority: "If a linked document and this index disagree, this
index wins." The Workflow view must therefore be written from the index and from nothing else. Do
not open the linked RS or CR documents to enrich it, do not consult Git history, and do not carry
anything over from an earlier conversation.

If the index and this contract disagree about vocabulary or order, the index wins and this
contract is what needs correcting.

## Form

A single table of open work, preceded by the named current focus.

One screen. No links of any kind, because the surface renderer resolves none and link syntax would
appear as literal text. Headings no deeper than level three.

The table carries four columns, in this order: `ID`, `RS`, `Change`, `Status`. Rows follow the
index's own order, which the index declares intentional: "Open work is ordered intentionally.
Terminal history follows open work."

A short closing line states which active Refinement Stories exist. Nothing else belongs on the
surface. Driver, Delivery, terminal history and phase detail stay in the index and in the CR
documents.

## Rule For What Is Current

The index's `## Current Focus` section is the authority. It names one Refinement Story and one
Change Request. Reproduce exactly those two identifiers. Never infer the focus from which row is
first, from which CR was edited most recently, or from what we happen to be working on in a
conversation.

The index states the reason this matters: "Selecting a focus is an explicit project decision.
Reading this file never selects or executes work."

## Vocabulary

Closed, and taken from the index's `## Status Vocabulary` section.

Refinement Story: `proposed`, `active`, `parked`, `closed`.

Change Request: `captured`, `planned`, `in_progress`, `blocked`, `validated`, `done`, `parked`,
`rejected`, `promoted`.

Never invent, translate, group or abbreviate a status. Write it exactly as the index writes it.

## Which Work Counts As Open

A Change Request is terminal when its status is `done`, `parked`, `rejected` or `promoted`. It is
open when its status is `captured`, `planned`, `in_progress`, `blocked` or `validated`.

Only open Change Requests appear in the table. This matches the acceptance horizon RS021 states
for itself, where a CR is finished once it is terminal with an explicit reason and evidence.

A Refinement Story is listed in the closing line when its status is `active`.

## Where State Lives

Nowhere else. This Journey keeps no separate status file, no database and no generated index. The
canonical status of every Refinement Story and Change Request is the table in
`docs/project/refinement/index.md`, maintained by hand as an explicit project decision.

The index is explicit that this replaced an earlier store: "this file and its linked documents are
the sole Refinement authority; SQLite must not be consulted or dual-written."

## Regeneration

Rewrite `docs/project/refinement/workflow-surface.md` from the current index whenever the index
changes. Change only that file. Do not edit the index as part of rendering the view, and do not
change the manifest unless a declared path actually moved.

If the index has changed in a way this contract does not cover, say so and stop rather than
quietly choosing a different form.
