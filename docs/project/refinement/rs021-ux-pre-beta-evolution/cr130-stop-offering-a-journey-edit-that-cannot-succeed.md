[< RS021](index.md)

# CR130: Stop Offering a Journey Edit That Cannot Succeed

**Status:** captured
**Driver:** —
**Delivery:** —
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
- Mirror core (`memory/services/journey_admin.py`, production `0.31.14` and the development checkout)
  accepts exactly `create_journey`, `set_project_path`, `clear_project_path`, `move_journey`,
  `delete_journey`. There is no metadata update operation.
- `src-tauri/src/main.rs` has no mapping for `unsupported_operation`, so it falls through to
  `Mirror rejected the Journey mutation: {value}.`

**Project path is separable and already supported.** `set_project_path` and `clear_project_path` exist
in core and the Desktop already has request builders for both. A path change — set, change or clear —
can be made to work today without any core change. Name and description cannot.

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

**Not removing the dialog.** Edit Journey still has work to do: it hosts appearance, and it will host
the path change. Only the unsatisfiable submission goes.

**Reversible by design.** When core gains the operation, the containment must come out cleanly — so it
should be one guarded boundary, not scattered conditionals.
