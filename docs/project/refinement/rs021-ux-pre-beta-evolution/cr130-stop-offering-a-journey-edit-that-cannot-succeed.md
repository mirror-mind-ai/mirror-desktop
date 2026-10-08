[< RS021](index.md)

# CR130: Stop Offering a Journey Edit That Cannot Succeed

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr130-stop-offering-an-edit-that-cannot-succeed`
**Contains:** [CR100](cr100-make-journey-image-updates-supported.md) — Mirror core debt, parked

## Friction

**Edit Journey** offers Name, Description and Project path with a *Save changes* button. Pressing it
always fails. Mirror answers `unsupported_operation` and the Navigator sees:

> Mirror rejected the Journey mutation: unsupported_operation.

This has been true since `e164401` (*Let Journey details change without changing identity*,
2026-09-02). Renaming a Journey from the Desktop, or editing its description, has never worked against
any released Mirror core.

The cost is not only the failed action. The error is generic, so the Navigator cannot tell *which*
field was refused, and anything else changed in the same dialog — a Journey image, which is
device-local and applies immediately with its own success message — makes the failure look like it
belongs to that instead. CR100 was captured on exactly that misreading.

## Outcome

The Desktop offers only what it can complete. A field whose change Mirror cannot accept is not
presented as editable with a Save that fails; the Project path, which Mirror *can* accept today, works.
The Navigator can tell what is editable, what is not, and why.

## First Investigation

The cause is established and recorded in [CR100](cr100-make-journey-image-updates-supported.md).
In summary:

- `src/app/App.tsx` — the edit branch of `submitJourneyAdministration` calls
  `executeJourneyMutation("update_journey", { journeyId, name, description, projectPath })`.
- Mirror core's `journey mutate` (`memory/services/journey_admin.py:145`, production `0.31.14` and the
  development checkout) accepts exactly `create_journey`, `set_project_path`, `clear_project_path`,
  `move_journey`, `delete_journey`, and fails anything else with `unsupported_operation`. There is no
  metadata update operation **in that contract**.
- **Corrected 2026-10-07: core is not incapable, it is unexposed.**
  `JourneyService.update_identity_fields` updates title and status by rewriting `content`, and
  `JourneyService.update_metadata_fields` updates `project_path`, `sync_file`, `icon`, `color` and
  `parent_journey`. Both are reachable **only** through the Mirror web server
  (`src/memory/web/server.py:514` and `:519`) — never through the CLI and never through
  `journey mutate`. They write the journey row directly, bypassing both `expectedSourceVersion` and the
  receipt ledger.
- **Description has no update path anywhere.** `update_identity_fields` handles title and status only.
  Description is written once, by `create_journey`, into the `## Description` section of `content`.
- `src-tauri/src/main.rs` has no mapping for `unsupported_operation`, so it falls through to
  `Mirror rejected the Journey mutation: {value}.`

**Project path is separable and supported by core, but the Desktop does not wire it.**
`set_project_path` and `clear_project_path` are in core's accepted set. ~~and the Desktop already has
request builders for both~~ — **corrected 2026-10-07: it does not.** They appear in the
`JourneyMutationOperation` union in `src/domain/journeyMutation.ts:3` and nowhere else; no call site
submits either one. `createMutationRequest` is generic and can build them, so the path change can be
made to work today without any core change, but it is new wiring rather than a reroute.

**One existing guard pins the broken call** and will have to be dealt with honestly rather than
deleted: `src/tests/journeyMutation.test.ts`, *"offers one prefilled Edit Journey form while keeping
identity and hierarchy immutable"*, asserts `appSource` contains
`executeJourneyMutation("update_journey"`. It was written to prove the Desktop sends a canonical
metadata update; what it actually pins is a call that cannot succeed. Like CR126's matcher guard, it
should be re-aimed at what remains true, not weakened.

## Acceptance

- No control in the Desktop submits `update_journey` while no Mirror core accepts it.
- A Project path change through Edit Journey **succeeds**, using the two operations core already
  accepts, including clearing a path.
- Name and description are visible and not presented as editable-and-savable; the surface says plainly
  that changing them needs a newer Mirror, without implying the Desktop is broken.
- Changing a Journey image and leaving the dialog produces no failure message, because no canonical
  mutation is attempted.
- `unsupported_operation` gains a named message at the native boundary, so if any path ever reaches it
  the Navigator reads something actionable rather than a raw code.
- The existing Edit Journey guard asserts the new, true wiring. No test is deleted to make the suite
  pass.

## Boundaries

**Containment, not repair.** This CR does not make name and description editable. That requires
Mirror core and is parked as CR100. Nothing here authorizes editing, patching or releasing Mirror
core in any checkout.

**Not a local-only rename.** Storing a Desktop-local Journey name would create a second source of
truth for canonical identity and hide the debt instead of containing it. The registry is Mirror's.

**Not the web server's update endpoints.** They exist and would make a rename work today, and the
Desktop must still not call them. Every Journey mutation the Desktop makes goes through a contract that
compares a digest over the whole tree and records a receipt; CR110's field verification showed that
contract doing real work, refusing a create because the tree had moved. A writer that skips the digest
and the receipt would be a second authority over the same rows, silently invalidating every other
client's loaded tree and leaving no record that it did. The correct upstream ask is to add the operation
**to the bounded contract**, not to reach around it.

**Not removing the dialog.** Edit Journey still has work to do: it hosts appearance, and it will host
the path change. Only the unsatisfiable submission goes.

**Reversible by design.** When core gains the operation, the containment must come out cleanly — so it
should be one guarded boundary, not scattered conditionals.

## Plan (2026-10-07)

Six slices. The first two make the dialog do something real, the next two make it tell the truth, and
the last two close the holes that let the false promise exist.

**D1 — A domain function decides what a path edit actually is.**
`projectPathIntent(registry, journeyId, typedPath)` in `src/domain/journeyMutation.ts` returns
`{ kind: "set", projectPath }`, `{ kind: "clear" }` or `{ kind: "unchanged" }`, comparing the typed
value against the registry entry's `projectPath`. It exists because core's `exact()` predicate
accepts only `{journeyId, projectPath}` for `set_project_path` and only `{journeyId}` for
`clear_project_path`, so the decision cannot be a payload detail — it selects the operation.

**D2 — The edit branch submits that intent instead of `update_journey`.**
In `submitJourneyAdministration`, edit mode dispatches `set_project_path` or `clear_project_path`.
`unchanged` closes the dialog without any mutation: a form that was opened and changed nothing must not
write, and must not report an error either.

**D3 — `update_journey` is removed from the type union.**
Out of `JourneyMutationOperation` and out of the two inline unions in `App.tsx`. The native boundary
pipes the request JSON to `journey mutate` without inspecting the operation name, so the type system is
the only place that can forbid it — and after this it does, at compile time rather than at runtime.

**D4 — Name and description become read-only, with one note.**
Edit mode renders them the way it already renders the slug: `readOnly`, with an `aria-describedby`
note. The note says Mirror has no canonical update operation for them yet, so they cannot be changed
here. The summary line stops promising what it cannot do — it currently reads *"Update canonical name,
description and project path"*, which is the false promise in its most explicit form.

**D5 — `unsupported_operation` gets a named message.**
At `src-tauri/src/main.rs`, beside the other mapped codes. After D3 nothing should reach it; it is
mapped because an unmapped code reaches the Navigator as a raw identifier, and this is the exact code
that produced this CR.

**D6 — Two guards re-aimed, neither deleted.**
`src/tests/journeyMutation.test.ts` asserts `executeJourneyMutation("update_journey"` in two places:
once as the Edit form's canonical submission, once as a region boundary for the appearance guard. Both
are rewritten against the new wiring. The appearance guard's intent — that device-local appearance
never enters a canonical payload — is preserved by moving the region to the new submission.

### Files

- `src/domain/journeyMutation.ts` — `projectPathIntent`, union without `update_journey`
- `src/app/App.tsx` — edit branch of `submitJourneyAdministration`, the two inline unions, the
  read-only fields and note, the summary line
- `src-tauri/src/main.rs` — `unsupported_operation` mapping
- `src/tests/journeyMutation.test.ts` — two guards re-aimed
- `src/tests/journeyEditContainment.test.ts` — new

### Acceptance

Carried from the capture, plus what the plan added:

- No control submits `update_journey`, and the type union no longer permits constructing it.
- Setting a path on a Journey that had none submits `set_project_path` with exactly
  `{journeyId, projectPath}`.
- Changing an existing path submits `set_project_path` with the new value.
- Emptying the field submits `clear_project_path` with exactly `{journeyId}`.
- Opening the dialog and saving with nothing changed submits no mutation and reports no error.
- Name and description are visible, `readOnly`, and carry one note saying why.
- The summary line does not claim name or description will be updated.
- `unsupported_operation` maps to a named message.
- Both existing guards assert the new wiring. Neither is deleted.

### Validation

`tsc`, the full vitest suite, `cargo test`, `npm run build`, `roadmap:check`. The path operations are
guarded by digest and receipt exactly like every other mutation, so CR110's rebase path and the
stale-source guard must still pass unchanged.

### Exclusions

- **No rename, no description edit.** That needs Mirror core and stays parked as CR100.
- **Not the web server's update endpoints**, for the reason recorded in Boundaries.
- **No Desktop-local name.** A second source of truth for canonical identity would hide the debt.
- **The dialog stays.** It still hosts appearance and now the path.
- **No change to the digest-and-receipt contract.** The new operations ride it as-is.
- **Appearance stays device-local.** That Mirror also models `icon` and `color` is recorded as an
  observation on CR100, not acted on here.

## Implementation and closure (2026-10-07)

All six slices landed as planned.

**`projectPathIntent`** (`src/domain/journeyMutation.ts`) returns `set`, `clear` or `unchanged`,
comparing the typed value against the loaded tree's `projectPath` after trimming both. It throws when
the tree no longer holds the Journey, which the form catches into its own message rather than letting
escape — the existing guard requires mutation failures to stay inside the open form.

**`update_journey` is gone from the type system.** Out of `JourneyMutationOperation` and out of both
inline unions in `App.tsx`. Because the native boundary pipes the request JSON to `journey mutate`
without inspecting the operation name, the union is the only place that can forbid it, and it now does
at compile time. `tsc` proved the removal reached every construction site: it failed on the three
remaining ones until each was dealt with.

**The edit branch** dispatches `set_project_path` or `clear_project_path`, and on `unchanged` closes
the dialog with no mutation and no error.

**Name, slug and description are read-only in edit mode**, following the pattern the slug already
used, with one note: *"Name, description, Journey ID and slug are shown as Mirror holds them. Mirror
has no canonical update operation for them yet, so they cannot be changed here."* The summary line no
longer promises *"Update canonical name, description and project path"*.

**`unsupported_operation` is mapped** at `src-tauri/src/main.rs:2340`. Nothing should reach it now; it
is mapped because this is the exact code that produced this CR, and an unmapped code arrives as a raw
identifier.

### Three guards re-aimed, none deleted

The capture expected two. `tsc` found a third.

- *"builds one exact canonical metadata update without mutable identity fields"* asserted the Desktop
  builds an `update_journey` request carrying name and description. Its surviving intent — a canonical
  update carries exactly the Journey it names and nothing else — now runs against `set_project_path`.
- *"offers one prefilled Edit Journey form…"* asserted the unsatisfiable submission. It now asserts
  both path operations and the new note.
- The appearance guard used `executeJourneyMutation("update_journey"` as a **region boundary**. Its
  intent — device-local appearance never enters a canonical payload — is preserved by anchoring the
  region on the edit branch itself.

### Gates

`tsc` clean, vitest **237 files / 1,732 tests**, `cargo test` **267 passed / 3 ignored**, build clean,
`roadmap:check` READY. CR110's rebase path and the stale-source guard pass unchanged.

## Closure review

**Proportionality.** The capture asked for containment and got containment: the only new behavior is a
path change through operations that already existed. Everything else is removal or truthful labelling.

**Debt.**
- **Name and description remain uneditable.** Parked as CR100. The note is honest but it is still a
  dead end for the Navigator.
- ~~**No field verification yet.** The path change is validated by tests only; it needs a real path set,
  changed and cleared against production.~~ **Resolved 2026-10-08** — see Field verification below.
- **`projectPathIntent` compares trimmed strings, not canonical directories.** Core canonicalises the
  path with `_canonical_directory`, so two spellings of the same directory read as a change and submit
  a mutation that results in the same stored value. Harmless — it writes a receipt and the correct
  path — but it means `unchanged` is narrower than it looks.
- **The Edit dialog now has one canonical field and one device-local section.** Whether that still
  deserves to be one dialog is a product question, not answered here.
- **`icon` and `color` are canonical Mirror metadata** while Desktop appearance stays device-local —
  two stores for one concept, recorded on CR100 as an observation and still unaddressed.

## Finding that reframes this CR (2026-10-07, after closure, before any release)

Asked whether CR130 should be validated in production or in Dev, the Dev channel's binding was read
instead of assumed. It points at a **different Mirror checkout**, and that checkout **accepts
`update_journey`**.

| checkout | version | branch / head | `update_journey` | bound to |
|---|---|---|---|---|
| `/Users/alissonvale/mirror` | 0.31.14 | `stable`, 2026-08-30 | **no** | production Desktop |
| `/Users/alissonvale/Code/mirror-dev` | 0.31.12 | — | no | — |
| `.mirror-journeys/mirror-mind/mirror-dev` | 0.31.14 | `main`, contract committed 2026-09-02 | **yes** | Dev Desktop |

The dev core's handler is complete, and its payload predicate is
`set(payload) != {"journeyId", "name", "description", "projectPath"}` — **exactly the payload the
Desktop was sending.** It updates `display_name`, rewrites the content through `_updated_content`, and
handles a null `projectPath` as a clear.

It was committed on **2026-09-02**, the same day the Desktop began sending the operation
(`e164401`, *Let Journey details change without changing identity*; Mirror's `c87825cf`, *Let
canonical edits absorb legacy Journey prose*). Complementary intent, same day.

**So the Desktop's call was never wrong. It was ahead of a Mirror release that never happened.**
Production's `stable` head is 2026-08-30, two days before the pair. The Mirror half has sat on `main`,
unpromoted, for five weeks.

### What this means for this CR

**CR130 is correct about today and wrong about the cause.** Against the Mirror the Navigator actually
runs, Save changes cannot succeed, and offering it is a lie — that part stands, and the Navigator hit
it. But the cause is an unshipped Mirror release, not a missing capability, and the cheap repair is to
promote and release Mirror core, not to amputate a working Desktop feature.

**The containment is heavier to reverse than this CR's own Boundaries promised.** *"Reversible by
design — one guarded boundary, not scattered conditionals"* is not what was built. The operation was
removed from the type union, the form was rewired, the fields were made read-only and three guards
were re-aimed. Restoring it is a real change, not a revert of one condition.

**Dev validation would have falsified this CR's premise.** In Dev the original Save works. Had the
Dev channel been used to validate, it would have reported that CR130 was unnecessary. For anything
touching the Mirror contract, Dev is not a proxy for production — it is a preview of an unreleased
future.

### Recorded, not decided

Nothing is reverted and nothing is released. CR130 is on `main` and has reached no Navigator. The
decision — release it as a correct statement about today's Mirror, revert it in favour of shipping
Mirror core, or reshape it to tolerate both Mirrors by reacting to `unsupported_operation` rather than
by removing the operation — is the Navigator's, and promoting Mirror core is not authorized from this
Journey.

## Field verification and final closure (2026-10-08)

Collected. The Navigator upgraded production and reported *"Atualizei a versão e testei. Tudo
funcionou."* The durable record agrees, and goes further than the report.

Production runs `0.2.0-alpha.41` with binary SHA-256
`aaaef35730c216e11635583145f7c0aa6515afe6e659d0adfb0160a863d569bb`, identical to the built candidate.
The ledger records three receipts on `agentic-ai-for-delphi-consulting` inside 49 seconds —
`set_project_path` (`b2b60fa4`), `set_project_path` (`66492f96`), `clear_project_path` (`d38b8d2b`) —
**set, changed, cleared**, each with its own `requestId`, each `source_version` equal to the previous
`result_version` with no gap back to alpha.40's verified create, and the final digest `4b69b3e506c0…`
reproduces exactly over the 79 live journey rows.

Three things the verification established that the report could not:

- **The operations had never run before.** All-time census: `set_project_path` 2, `clear_project_path`
  1 — every one from that day. This independently confirms the 2026-10-07 correction that the Desktop
  had never built these requests; they existed only in a type union with no call site.
- **The clear removed the key rather than emptying it.** `project_path` is absent from the metadata,
  and absent from the registry entry, while 75 other Journeys in the same registry carry a
  `projectPath`. Against §5b, where absence and emptiness collapsing is the heaviest open debt, core
  distinguishes them correctly here.
- **CR110's refresh carried CR130's new operations.** The registry's `sourceVersion` equals the final
  digest, synced 18 ms after the receipt. The two changes compose, over operations CR110 never saw.

What stays unverifiable is written down rather than implied: the read-only fields are Navigator report
and not record; `unchanged` cannot be field-verified because its correct behavior is the absence of a
receipt; the `unsupported_operation` mapping is now unreachable from the Desktop by design; and the
two intermediate path strings are unrecoverable, though two distinct resulting digests prove the second
set genuinely changed the value. Full evidence:
[alpha-41 field verification](../../../update/alpha-41-field-verification-2026-10-08.md).

### Proportionality, in both directions

The delivered behavior is proportionate: one canonical field wired, one operation removed from the type
system, four fields made read-only with a stated reason. This CR's own **Boundaries** claim was not —
it promised *"reversible by design — one guarded boundary, not scattered conditionals"*, and that is
not what was built. The overstatement is kept rather than edited, because it was the basis on which the
work was accepted. Reversal when Mirror core lands will be real work, and
[CR100](cr100-make-journey-image-updates-supported.md) holds the validated handoff so it will not need
re-investigation.

Remaining debt is carried deliberately: name and description are still a dead end for the Navigator
(parked as CR100, blocked on authorization to push Mirror core, not on engineering);
`projectPathIntent` compares trimmed strings so `unchanged` is narrower than it looks; the dialog mixes
one canonical field with a device-local section; and Desktop appearance and Mirror's `icon`/`color` are
two stores for one concept. None blocks use of what shipped.

**No residue.** The exercised Journey ends with no `project_path`, the state it started in.
