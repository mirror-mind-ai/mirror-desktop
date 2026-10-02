# Where Mirror Desktop stands

## Current focus

**RS021 — UX Pre-Beta Evolution**, and within it **CR112 — Host a Canvas the Journey's Agent
Draws**.

## The current delivery

CR112 is `in_progress` on `refinement/rs021-cr112-host-journey-workflow`. It opened as a declared
workflow and pivoted to Canvas after the teaching prompt was validated against `vida-economica`:
the agent produced something truthful that the genre's name made look wrong.

Gates on the branch are green. 213 test files and 1,475 front-end tests, 236 Rust tests with 3
ignored, `tsc` clean, `roadmap:check` READY.

Still waiting on: a Navigator walkthrough of the three states in the running app including the
light families, and validation of the teaching prompt in a Journey that has no canvas, which is
the only way to learn whether the agent finds rather than invents.

## Open work

| ID | RS | Change | Status |
| --- | --- | --- | --- |
| CR112 | RS021 | Host a Canvas the Journey's Agent Draws | `in_progress` |
| CR097 | RS021 | Keep a Correction Recognisable After Reload | `captured` |
| CR099 | RS021 | Allow Safe Editing During Another Journey's Work | `captured` |
| CR098 | RS021 | Allow a Journey to Be Reparented | `captured` |
| CR100 | RS021 | Make Journey Image Updates Supported | `captured` |

Five open Change Requests, in the order the canonical index declares intentional.

Active Refinement Stories: **RS016** Ongoing Product Improvements and Adjustments, **RS021** UX
Pre-Beta Evolution, **RS022** Mirror Core Debts.

## Known open question

The Change Request status vocabulary has no word for work superseded by what it taught, which is
why CR112 was rewritten in place rather than closed under a false label.
