[< RS026](index.md)

# CR168: Name a Channel Refusal Instead of invalid_record

**Status:** done
**Line:** 0.3 · Desktop

## Friction

Phase 5a-2 rehearsal (recorded in DS-005): a carried thread opened in a Dev build was refused by
`validate_thread_runtime_channel`, which is correct, and the app's generic load catch showed it as
`invalid_record`. The Navigator saw a corrupt-looking record where the truth was "this conversation
belongs to the other channel".

## Proposed Direction

The load path names a channel refusal on its own words (which channel the thread belongs to, which
channel this build is), and keeps `invalid_record` for records that really are invalid. Negative
case: a valid thread of the build's own channel loads unchanged.

## Delivered on `main` (`eb43319`)

- `validate_thread_runtime_channel_name` refuses with "This conversation belongs to another Mirror
  Desktop build: it was made by the {stored} build, and this is the {active} build." A thread from
  before channels counts as the user build's, as before.
- `otherBuildRefusal` (`src/domain/otherBuildRefusal.ts`) recognizes that sentence by its first words;
  the conversation load reads it before any other reading of the failure and shows "This
  conversation belongs to another Mirror Desktop build … Nothing was changed." instead of "needs
  recovery / invalid_record". A record that really is invalid is still shown as one.
- Spec first; 4 mutation controls applied and caught (a fifth did not apply and is not counted).
  Full suites: 2498 TypeScript, 452 Rust.
- Checked with group B's script ([RS026](index.md#group-b-check)).

Then (2026-11-02): group B step 4. The Driver marked the development `vida-interior` thread as the
user build's (backup kept, hash checked). The Navigator opened it in development and saw "This
conversation belongs to another Mirror Desktop build: it was made by the user build, and this is the
development build." and "Open it in the build that made it. Nothing was changed.", with no "needs
recovery". The Driver restored the file from the backup (hash equal to the original, channel
`development`) and deleted the backup. Closed.

**Shipped in [v0.3.0-alpha.7](../../../releases/v0.3.0-alpha.7.md)** (2026-11-02).
