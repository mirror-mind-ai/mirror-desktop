[< RS026](index.md)

# CR185: Keep the Output Surface Moving While the Agent Works

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02: the output surface feels stuck while the agent operates. It
sometimes takes a while to draw or to scroll.

## What Is Known

- In development, on `ensaio-5c-2`, the Navigator felt no typing delay during a long turn (CR182's
  dev check, 2026-11-02).
- Size is the difference. The largest stored projection of production's `mirror-desktop`
  conversation is **31,761 KB** (`livro-lideranca-soberana`: 12,152 KB); development's
  `vida-tecnica` is **80 KB**.
- CR149 measured the main thread during a settlement on an 11.5 MB projection: command handlers
  that read, parse, re-serialise and fsync whole conversations ran on the thread that delivers
  input. CR157 names that cost. While the agent streams, other per-event work may scale with the
  conversation too.

## Direction (to measure first)

One sampling session in production on `mirror-desktop`, shared with CR182: the Driver samples the
app and its WebContent process while the Navigator scrolls the output and types during a turn.
The repair is aimed at what the samples show: the transcript's render per streamed event, IPC
commands moving the whole conversation, or the WebContent process itself.

## Acceptance

During a turn in production's longest conversation, the output scrolls and draws without a stall
the Navigator can feel.

## First Sample (2026-11-02)

[cr185-output-surface-sample-2026-11-02.md](../../../update/cr185-output-surface-sample-2026-11-02.md):
the app's main thread spent 42% of the minute blocked on WindowServer (`SLSDisplayGetTiming`,
from AppKit's update cycle), not in Mirror Desktop's commands (0.4%) or in the page (70% idle).
Hypothesis: forever-running working animations that repaint (`background`, `box-shadow`) keep the
update cycle busy, and WindowServer answers slowly. Two falsifiers are owed before a repair.

## Falsifiers (2026-11-02)

Production without a turn: 0.8% waiting. Development during a turn on 80 KB: 4.4%. Production
during a turn on 31.7 MB: 42%. The animation-only hypothesis is refuted; the cost needs a turn and
the long conversation. Next: a page timeline on a conversation of production's size, in the
development build.

## Rehearsal of Production's Size (Navigator, 2026-11-02)

The Navigator authorized copying the `mirror-desktop` conversation into a rehearsal, so the page can
be inspected in the development build at production's size.

- New marked home `~/Mirror Homes/ensaio-cr185` (`home-cb4f0735-bdd0-443a-b32d-b6c7a621dc06`),
  created by the pinned core, with Journey `mirror-desktop` added through the host.
- Copied into the development data folder, for that home only: the thread, the projections
  (`dedicated-journey-conversations/mirror-desktop`), the segments and the six `mirror-desktop` Pi
  sessions: 146 files, 483 MB. Every occurrence of production's home data path (2,376) was
  rewritten to the rehearsal's; the thread is marked `development` (CR168 would refuse it
  otherwise). After the copy, no `piSessionFile`, `sessionFile` or `absolutePath` field points at
  production; the remaining mentions are inside message text.
- The bound Mirror conversation `20f40b74` (1,580 messages) was copied from an APFS clone of
  production's database into the rehearsal's; the clone was deleted. Production was only read.
- The development binding moved to `ensaio-cr185`; the previous one is kept as
  `runtime-home.v2.json.before-cr185`.

Owed: the page timeline during a turn, then removing the rehearsal and restoring the binding.
