[< RS026](index.md)

# CR185: Keep the Output Surface Moving While the Agent Works

**Status:** done
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

## Page Timeline (2026-11-02)

During the turn, at production's size: 20.7% compositing, 34 ms per streamed event, 6.9 frames per
second. Native commands were light. The cost is what the page keeps live, the whole conversation;
see the measurement record.

## Correction (2026-11-03)

The earlier reading, "the page keeps the whole conversation live", was wrong: it came from save
payloads that the renderer padded with stored history. The surface is the current chapter (73
messages in the third recording) and the page still drew about 7 frames per second during the turn.
The cause is open again; see the measurement record.

## Reading of the Fourth Timeline (2026-11-03)

Per five-second bucket (script `timeline8.py`), the fourth recording shows:

- Frames run back to back (median gap 2 ms) at 7–8.6 per second, each about 115–130 ms long,
  **whether or not the page is working**: before Send, while the Navigator only typed, the main
  thread was 7–8% busy; after the turn, 2–5%. Frame length does not follow main-thread work.
- Only while text streams (65–85 s) does the main thread rise to 52%, of which the layer-tree
  flush (`composite`) is 28%; frames stretch to 160 ms and drop to 6 per second.
- Infinite CSS animations (the Working and Finishing indicators, the runtime dots) fire 8–13
  iterations per second from Send to the end of finishing, so the page never stops producing frames
  during a turn. All animate `opacity`/`transform` except `journey-agent-working`, which animates
  `background` and `box-shadow`, a repaint each frame.

Open question before any repair: a frame that lasts ~115 ms with an idle main thread is paid outside
the page's script, either by the compositor on this GPU or by the recording itself, since the
Screenshots instrument captures every frame. The recordings so far cannot separate the two. The next
measurement drops the Screenshots instrument; if frames stay near 115 ms, the cost is the app's
compositing; if they fall, CR185 reduces to the 28% layer flush during streaming.

## Fifth Timeline, Without Screenshots (2026-11-03)

Same rehearsal, one turn (Send 01:51:34Z, lease released 01:52:58Z), Screenshots instrument off.

- **The ~115 ms frames were the recording.** Without Screenshots, frames last 27–39 ms and the page
  draws 30–38 per second during the turn. The earlier "5–8 frames per second" readings measured the
  instrument, not the app.
- **Working without streaming text (75–118 s):** 35 frames per second, main thread 36% busy, of
  which `composite` (the layer-tree flush) is 30%: about 8.6 ms on every frame, while scripts are
  under 1%. The frames are driven by the infinite indicator animations; the flush cost per frame
  is paid whether anything on the transcript changed or not.
- **Streaming text (118–143 s):** main thread 40% mean and up to 92% in five-second buckets;
  `composite` 42%, `message` handlers 29% (19 events per second, median 2 ms, p90 38 ms); 23 frames
  per second.

So CR185 is two costs: a flush of roughly 9 ms per frame that scales with what the page keeps
composited, multiplied by animations that keep frames coming; and the stream handler during text.
The stylesheet promotes almost nothing explicitly (no `will-change`, no 3D transforms, one
`isolation`), and the transcript has no `content-visibility`, so every row of the chapter stays in
the tree each frame walks.

## First Repair: the Per-Frame Flush (`32d7163`, 2026-11-03)

- The Working glow (`journey-agent-working`, on the Journey status and the conversation list)
  animated `background` and `box-shadow`. It now lives on a `::after` layer that only fades; the
  host keeps its static colours. Every infinite animation shown during a turn now animates only
  `opacity` or `transform` (the voice-recording pulse, shown only while dictating, is left as is).
- Transcript rows carry `conversation-row`: `content-visibility: auto` with
  `contain-intrinsic-size: auto 320px`, so rows off screen are skipped by layout and paint and keep
  their measured height once drawn.
- Spec `src/tests/cr185CompositedSurface.test.ts`, failing first; six mutation controls, all caught.
  TS suite 2,507. No Rust change.

Check owed: a recording without Screenshots; `composite` should fall well below 30% while Working,
and scrolling back through the chapter must not jump.

## Sixth Timeline: the First Repair Made It Worse (2026-11-03)

Same rehearsal, no Screenshots, one turn (Send 02:05:02Z, lease released 02:06:32Z).

| Working, no text yet | fifth (before) | sixth (after `32d7163`) |
|---|---:|---:|
| frames per second | 35 | 48 |
| `composite` share of the window | 30% | 72% |
| flush per frame | ~8.6 ms | ~15 ms |

While text streamed the main thread was saturated (records overlap past 100%). After the turn it
returned to 1–8%. Both more frames and costlier frames, so the repair added work rather than
removing it. The two halves were not measured apart. `content-visibility: auto` is withdrawn
first, because its cost scales with the number of rows (the engine decides each row's relevance on
every rendering update); the glow change stays and is measured alone next.

## Seventh Timeline and the Field Sentence (2026-11-03)

With `content-visibility` withdrawn and the glow on its fading layer (Send 02:15:31Z, lease released
02:16:57Z, no Screenshots): Working without text, 29 frames per second, `composite` 34% (fifth:
35 and 30%); streaming text, main thread 52–106% in five-second buckets, as in the fifth. The glow
change is neutral on this machine; it stays because it also lets the conversation list honour
reduced motion. The 72% of the sixth recording was `content-visibility`.

The Navigator, after this turn: **"não pulou e não está lento"** (the scroll did not jump and the
turn is not slow).

Closed on that sentence. What the Navigator felt as slowness was the end of the turn (CR184) and,
in recordings, the Screenshots instrument. The per-frame flush (about 34% while Working) and the
stream handler (p90 38 ms) remain measured costs with no felt friction; they are not repaired
without one. Production confirmation comes with the next alpha.

**Shipped in:** v0.3.0-alpha.10 (2026-11-03). Checked in production on 2026-11-03: the Navigator updated, ran a turn in `mirror-desktop` and reported "Tudo parece ter funcionado perfeitamente".

## Rehearsal Removed (2026-11-03)

On the Navigator's word ("limpe o ensaio"): the `ensaio-cr185` home, its development app-data
folder (`home-cb4f0735…`, 488 MB with the copied conversation) and the measurement scripts and
samples under `/private/tmp` were deleted; the development app is bound to `ensaio-5c-2` again.
The timeline exports on the Navigator's Desktop are theirs to keep or delete.
