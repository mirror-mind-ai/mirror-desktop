[< RS026](index.md)

# CR168: Name a Channel Refusal Instead of invalid_record

**Status:** captured
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
