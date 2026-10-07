[< RS021](index.md)

# CR100: Make Journey Image Updates Supported

**Status:** parked
**Driver:** —
**Delivery:** —
**Debt location:** Mirror core — `memory/services/journey_admin.py:145` (the `journey mutate` accepted-operation set). Not a missing capability: `JourneyService.update_identity_fields` and `update_metadata_fields` already do this work, but only through `memory/web/server.py:514`/`:519`, bypassing the digest and the receipt ledger. Description has no update path anywhere
**Containment:** [CR130](cr130-stop-offering-a-journey-edit-that-cannot-succeed.md) — Desktop-side, captured
**Revisit trigger:** ~~a Mirror core release whose `journey mutate` accepts a metadata update operation~~ **— already satisfied in source, not in any release. See Premise corrected again, 2026-10-07.**
**Register:** recorded in [RS022 — Mirror Core Debts](../rs022-mirror-core-debts/index.md)

## Friction

Changing a Journey image produced `unsupported journey mutation`. The UI offered an action that the
mutation path did not honour, leaving the Navigator with neither a completed change nor a useful
recovery path.

## Outcome

The image action is either supported end-to-end with durable, validated image provenance, or it is
not offered. A supported update has a truthful success or failure surface.

## First Investigation

Reproduce with a disposable image and trace the request from the form through the native mutation
contract and persisted Journey appearance. Establish whether the unsupported result is a missing
operation, an invalid payload shape, or an authority/guard condition before designing repair.

> **This CR's title is inaccurate and is kept for traceability.** Journey *images* are not the
> defect: they are device-local and they work. The defect is the Edit Journey dialog's **Save
> changes**, which submits an operation Mirror core does not accept. See the Cause section below.

## Cause established while planning CR110 (2026-10-06)

The image change is **not** what Mirror refused. Both image handlers in `src/app/App.tsx`
(`applyJourneySystemAppearance`, `chooseJourneyCustomAppearance`) write device-local appearance
state and send no mutation. They live inside the **Edit Journey** dialog, whose *Save changes* submits
`operation: "update_journey"`.

`update_journey` is accepted by **no** Mirror core. The production core (`0.31.14`) allows exactly
`create_journey`, `set_project_path`, `clear_project_path`, `move_journey`, `delete_journey`
(`memory/services/journey_admin.py`), and the development checkout has no such operation either. The
Desktop began sending it in `e164401` (*Let Journey details change without changing identity*,
2026-09-02). Mirror answers `unsupported_operation`, which the native layer renders as *"Mirror
rejected the Journey mutation: unsupported_operation."*

So the sequence behind this capture is: open Edit Journey, change the image (applied locally, with
its own success message), press Save changes, receive the unsupported-mutation error — and attribute
it to the image. **This is inference from code, not a reproduction**; the capture's quoted text is a
paraphrase of the native message. It is the only path in the dialog that can produce that error.

**What this means for the CR.** Renaming a Journey or editing its description from the Desktop has
never worked against any released Mirror core. The repair has two halves that belong to different
owners: Mirror core must gain `update_journey` (Mirror repository, not this Journey's authority), and
until it ships the Desktop must not offer a Save that cannot succeed — project-path changes could be
routed through the two existing path operations, and name/description shown as requiring a newer
Mirror. Whether this CR is parked to Mirror core with a Desktop containment, as CR094 was, is a
Workbench decision and is not made here.

## Acceptance

- A valid supported Journey image update succeeds and remains after restart.
- Unsupported or invalid input is rejected before or at the exact boundary with an actionable
  message; no silent no-op and no misleading success.
- A failed update leaves the last valid image intact.
- Image updates preserve Journey identity, hierarchy and active-run authority.

## Boundaries

No external image fetching, no unbounded image formats or sizes, and no change to avatar or other
appearance ownership outside the Journey image surface.

## Parking (2026-10-06)

Parked under RS022's intake rules, which this finding now satisfies: the observed behavior, the Mirror
core code path that produces it, and the consequence for the Desktop are all recorded above.

**Why it is parked rather than worked.** The correction has two halves with different owners. Mirror
core must accept a Journey metadata update operation — that belongs to the Mirror repository, its own
branches, its own gates and its own release path, and nothing in this Journey authorizes touching it.
The Desktop half is containment only: stop offering a Save that cannot succeed. That is
[CR130](cr130-stop-offering-a-journey-edit-that-cannot-succeed.md), captured separately and reviewed
on its own merits, as RS022 requires.

**Containment status: open.** Nothing contains it today. The Desktop still offers the button.

**What retires this CR.** A Mirror core release whose `journey mutate` accepts a metadata update
operation, after which the Desktop can submit name and description changes and CR130's containment can
be removed. Until then the debt is live and only the correction is blocked.

**Not promoted.** Promotion means handing this to the Mirror repository's own process. That has not
happened and is not authorized here.

## Premise sharpened (2026-10-07)

While planning CR130, the statement "`update_journey` exists in no Mirror core" was found accurate but
too blunt, and the blunt version points at the wrong repair.

What is true: `journey mutate` — the bounded contract the Desktop uses, which guards on a digest over
every Journey row and records a receipt — accepts five operations and no metadata update, failing
anything else with `unsupported_operation`.

What the blunt version got wrong: **core is not incapable.** `JourneyService.update_identity_fields`
updates title and status by rewriting `content`, and `update_metadata_fields` updates `project_path`,
`sync_file`, `icon`, `color` and `parent_journey`. Both exist today and are reachable only through the
Mirror web server, which writes the journey row without the digest check and without a receipt.

So the upstream ask is narrower and more precise than "add the ability to rename": **expose the
existing update through the guarded contract.** Adding `update_journey` to `journey mutate`, with the
same `expectedSourceVersion` comparison and the same receipt, would reuse logic that is already
written and tested rather than introduce new capability.

One part remains genuinely absent rather than unexposed: **description cannot be updated by anything.**
It is written once by `create_journey` and never again.

Also corrected: `icon` and `color` are canonical Mirror metadata fields. The Desktop's Journey
appearance is device-local, so Desktop appearance and Mirror appearance are two separate stores for the
same concept. Recorded as an observation; not a captured defect.

## Premise corrected again (2026-10-07)

The debt is not that Mirror lacks the operation, nor that the capability exists only outside the
guarded contract. **`update_journey` is implemented inside `journey mutate` itself**, in the Mirror
checkout the Dev Desktop binds to (`.mirror-journeys/mirror-mind/mirror-dev`, `main`), committed
`c87825cf` on **2026-09-02** — the same day the Desktop began sending it. Its payload predicate matches
the Desktop's payload exactly.

Production runs `stable` at head 2026-08-30, two days earlier. **The work has been written, committed
and never promoted for five weeks.**

So this is not a Mirror core capability debt. It is a **release-coordination debt**: a Desktop feature
and its core counterpart were built as a pair and only one of them shipped. The ask upstream is not to
implement anything — it is to promote and release what exists.

The earlier readings of this remain instructive about method rather than content. The first version
said the capability was absent; the second found it present but unexposed, through the web server; both
were produced by reading only the checkouts that were convenient — `/Users/alissonvale/mirror` and a
`Code/mirror-dev` that sits at 0.31.12. Neither reading enumerated the checkout the Dev Desktop is
actually bound to. **Enumerate every instance before describing a contract**, the same lesson the
status census and the manifest-loader confusion already produced here.

Nothing about Mirror core is changed, promoted or released by recording this.

## Handoff prepared, promotion unauthorized (2026-10-07)

Promotion was attempted and stopped at the authorization boundary: **the Navigator is not authorized
to push to Mirror core.** Nothing was pushed, committed, rebased or edited in any Mirror checkout.
This section is the handoff RS022 exists to produce, so that whoever holds that authority does not
have to re-investigate.

### Where the work actually is

**Not on `main`.** The previous section said it had sat on `main` unpromoted for five weeks. That was
wrong. `git branch -r --contains` returns nothing: the work exists only as **two local, unpushed
commits** in one checkout, `/Users/alissonvale/.mirror-journeys/mirror-mind/mirror-dev`, on `main`:

| commit | date | title |
|---|---|---|
| `3b55b7c7` | 2026-09-02 | Make Journey metadata edits canonical and atomic |
| `c87825cf` | 2026-09-02 | Let canonical edits absorb legacy Journey prose |

It exists nowhere else in the world. It has never been pushed, never reviewed, and had never been
validated until now.

### Scope

Four files, 210 insertions, 19 deletions:

- `src/memory/services/journey_admin.py` — the `update_journey` handler and allow-list entry
- `src/memory/storage/journey_admin.py` — content updates inside the atomic boundary
- `tests/unit/memory/services/test_journey_admin.py` — **120 lines of new tests**
- `docs/product/architecture.md`

The handler's payload predicate is `set(payload) != {"journeyId", "name", "description",
"projectPath"}` — exactly what Mirror Desktop was already sending. It writes `display_name`, rewrites
the identity content through `_updated_content`, and treats a null `projectPath` as a clear.

### Validation performed (2026-10-07, read-only, no mutation)

Run with CI's own command from `.github/workflows/tests.yml`, in the checkout holding the work:

| gate | result |
|---|---|
| `uv run pytest tests/unit/ tests/integration/ -m "not live"` | **2,648 passed** in 153.91s |
| `uv run ruff check src/ tests/` | All checks passed |
| `uv run ruff format --check src/ tests/` | 378 files already formatted |
| `tests/unit/memory/services/test_journey_admin.py` | 9 passed |

The three `tests/live/` failures are `OPENROUTER_API_KEY is not configured` and are excluded by CI
itself, which states *"API keys intentionally absent — all live tests are excluded via `-m 'not
live'`"*. They are not a defect in this work.

**So the work passes Mirror's own gates for the first time since it was written.**

### What validation does not establish

- **The rebase is unvalidated.** That checkout is **4 commits behind `origin/main`** — a Debt Review
  dead-lock fix, a ruff format, a repo-hygiene commit and a Workbench capture. The gates were run
  before rebasing, so they prove the work in isolation, not the integrated result.
- **No review happened.** These commits have never been seen by CI or by a reviewer.
- **No release arc exists.** `docs/process/versioning.md` requires a release to be *"closed,
  validated, versioned, documented, tagged, and published as a GitHub Release"* before `stable` moves.
  Only *validated* is now true.

### The release this would be

`stable` is at `v0.31.14` (`b2d710eb`, 2026-08-30). `origin/main` is at 2026-09-07. A release from
`main` would therefore carry **six** commits, not two: these plus the four already on `origin/main`.

By `docs/process/versioning.md`, observable behavior changing without closing an epic is a **PATCH**,
so the target is **`v0.31.15`**, needing a narrative note at `docs/releases/v0.31.15.md`. Git tags and
the `stable` branch are the updater contract; production then receives it through the runtime updater.

### Revisit trigger, restated

A Navigator-authorized Mirror core push, after which: rebase onto `origin/main`, re-run the gates,
review, version, write the note, tag, promote `stable`, publish the GitHub Release. Then Mirror Desktop
can restore canonical name and description editing and **CR130's containment comes out.**

### Process observations, recorded not acted on

- `AGENTS.md` names `/Users/alissonvale/Code/mirror-dev` for Mirror development. That checkout is at
  `0.31.12`, head 2026-08-29, and does **not** contain this work. The work lives in a third checkout.
  Two development checkouts at different commits is how this stayed invisible for five weeks.
- The work was committed **directly on `main`**, not on a non-`stable` development branch as
  `AGENTS.md` requires.
