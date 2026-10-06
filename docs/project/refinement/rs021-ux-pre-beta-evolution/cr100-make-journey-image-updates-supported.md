[< RS021](index.md)

# CR100: Make Journey Image Updates Supported

**Status:** captured
**Driver:** —
**Delivery:** —

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
