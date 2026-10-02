# Where Mirror Desktop stands

## Current focus

**RS021 — UX Pre-Beta Evolution**. No Change Request is selected. CR112 closed on 2026-10-02 and
choosing the next one is an explicit project decision, not something this drawing infers.

## The last delivery

**CR112 — Host a Canvas the Journey's Agent Draws** is `done`, on
`refinement/rs021-cr112-host-journey-workflow`, not yet integrated into `main`.

It opened as a declared workflow and pivoted after the first prompt was validated against
`vida-economica`: the agent produced something truthful that the genre's name made look wrong. A
second correction followed, when a one-line pointer added to this repository's `AGENTS.md` was
measured inert, because the app invokes the agent with the Mirror root as its working directory and
nothing at a Journey root is loaded automatically.

Homologated in Eval. Every figure the agent drew in `vida-economica` traces to a current file of
that Journey, and the drawing dropped the stage table and obligation vocabulary of the previous
view while keeping the situation, which is what the pivot predicted.

Gates on the branch: 213 test files and 1,476 front-end tests, 236 Rust tests with 3 ignored,
`tsc` clean, `roadmap:check` READY.

## Open work

| ID | RS | Change | Status |
| --- | --- | --- | --- |
| CR097 | RS021 | Keep a Correction Recognisable After Reload | `captured` |
| CR099 | RS021 | Allow Safe Editing During Another Journey's Work | `captured` |
| CR098 | RS021 | Allow a Journey to Be Reparented | `captured` |
| CR100 | RS021 | Make Journey Image Updates Supported | `captured` |

Four open Change Requests, in the order the canonical index declares intentional. CR094 is
`parked`, which is terminal.

Active Refinement Stories: **RS016** Ongoing Product Improvements and Adjustments, **RS021** UX
Pre-Beta Evolution, **RS022** Mirror Core Debts.

## Known open questions

The Change Request status vocabulary has no word for work superseded by what it taught, which is
why CR112 was rewritten in place rather than closed under a false label.

The renderer's limits on this canvas are enforced by prompt rather than by product. A freer agent
will want to link the Journey's documents, which the Context surface already knows how to open.
