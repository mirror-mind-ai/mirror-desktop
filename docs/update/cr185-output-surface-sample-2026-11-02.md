# CR185 / CR182 sample — 2026-11-02

**Kind:** measurement record. Where the production app's time went while the Navigator scrolled
the output and typed during a turn.

## Instrument

`sample <pid> 60 10` on three processes at once, 23:01:55Z–23:02:58Z, production alpha.8 (pid
79977), its WebContent (79996, 1.96 GB resident) and its GPU process (79994). Conversation
`mirror-desktop` (largest stored projection 31,761 KB), during the Driver's own turn. The Navigator
scrolled the output and typed in the composer for the minute. Intel MacBook Pro, built-in Retina
display, macOS 26.6.2.

## The app's main thread (receives keys and scrolls before the page does)

| samples | share | where |
|---:|---:|---|
| 2,583 | 47.0% | idle, waiting for events |
| **2,306** | **42.0%** | `UC::DriverCore::continueProcessing` → `modeScheduling` → `NSDisplayTiming displayTimingsForActiveScreens` → `SLSDisplayGetTiming` → `mach_msg2_trap`: blocked on WindowServer |
| 270 | 4.9% | WebKit IPC from the page |
| 148 | 2.7% | Core Animation commit |
| 23 | 0.4% | Tauri IPC (Mirror Desktop's commands) |

CR149's move held: Mirror Desktop's commands are not on this thread. The thread was instead
blocked, almost half the minute, in a synchronous query to WindowServer that AppKit's update cycle
makes. WindowServer ran at about 68–70% CPU.

## The page (WebContent main thread)

| samples | share | where |
|---:|---:|---|
| 3,879 | 69.6% | idle |
| 661 | 11.9% | `WebPage::updateRendering` (layout and style 446, paint 264) |
| 312 | 5.6% | JavaScript |
| 87 | 1.6% | `JSON.parse` |
| 22 | 0.4% | garbage collection |

The page was mostly idle. Rendering is its main cost, and React's own work is small.

## Control (15 s, nobody interacting, same moment)

| process | main-thread share in `SLSDisplayGetTiming` |
|---|---:|
| Mirror Desktop TS (production, turn running) | **45.1%** |
| Mirror Desktop TS Dev (idle, 80 KB conversation) | 0.0% |
| Finder | 0.2% |

The wait is the production app's own, and does not need interaction.

## Reading (hypothesis, not yet proven)

The production app keeps AppKit's update cycle busy, so each cycle asks WindowServer for display
timing, and WindowServer, busy compositing, answers slowly; input waits behind it. During a turn
the working indicators animate forever, and `journey-agent-working` (used by `.journey-agent-status`
and `.focused-conversation-work`) animates `background` and `box-shadow`, which cannot be
composited and are repainted every frame. How large the repainted area is decides the cost, which
may be why production's long conversation suffers and development's does not.

Falsifiers still owed:

1. The same production sample with **no turn running** (scheduled for 23:06Z, after the Driver's
   turn ends). If the wait remains, the turn's animations are not the cause.
2. Development **during a turn**. If its main thread shows the same wait, size is not the cause.

## Falsifier 1, first attempt (contaminated)

The "no turn" sample ran 23:06:11Z–23:06:31Z (app, 20 s) and 23:06:31Z–23:06:41Z (WebContent). The
turn journals show the `mirror-desktop` turn settled at 23:05:46Z, but a `livro-lideranca-soberana`
turn ran 23:06:22Z–23:07:07Z: about 11 s without a turn, then 9 s with one. Result:

| | during the `mirror-desktop` turn | mixed window |
|---|---:|---:|
| app main thread in `SLSDisplayGetTiming` | 42.0% | 16.9% |
| app main thread idle | 47.0% | 72.1% |
| WindowServer CPU | 68–70% | 15% |

Consistent with a cause that runs with a turn, but not clean. Note: the Driver's own turns run in
production's `mirror-desktop`, so the first sample measured the Driver's turn. A clean
production sample with no turn and a development sample during a turn were scheduled for after
23:11Z.

## Falsifiers, clean (2026-11-02)

- **Production, no turn:** 23:11:29Z–23:11:56Z, app main thread, 25 s. The journals show no turn in
  any Journey (the last settled at 23:11:24Z; the next began at 23:14:49Z).
- **Development, during a turn:** 23:14:24Z–23:14:51Z, pid 91943 (the only development process),
  `vida-tecnica` (80 KB). The turn ran 23:14:13Z–23:14:42Z, so about 18 s of the window.

| | app main thread in `SLSDisplayGetTiming` | idle |
|---|---:|---:|
| production, `mirror-desktop` turn (first sample) | **42.0%** | 47.0% |
| production, no turn | 0.8% | 95.4% |
| development, turn, 80 KB conversation | 4.4% | 91.5% |

WindowServer was at 87% CPU when the development sample began, yet development's main thread barely
waited: a busy WindowServer alone does not block. The wait needs a turn **and** the long
conversation.

## Reading

The hypothesis that the working animations alone cause it is refuted: development runs the same
animations during a turn. What remains is something during a turn whose cost grows with the
conversation: most likely what the page re-lays out or repaints as the answer streams (the first
sample's WebContent spent 11.9% in `updateRendering`, 8.0% in layout and style). The next
instrument is a timeline of the page itself, in a build that can be inspected, on a conversation
of production's size.

## The page at production's size (rehearsal `ensaio-cr185`, 2026-11-02)

Development build, the copied `mirror-desktop` conversation (projection 34.1 MB as loaded). One turn
ran 23:36:25Z–23:39:37Z. The Navigator recorded a Web Inspector timeline (screenshots, network,
layout, script, rendering frames, CPU) from 23:36:10Z to 23:40:55Z, scrolling and typing during the
turn. The screenshot instrument took one capture per frame and probably inflates compositing; the
proportions below are read with that in mind.

Native sample of the development app during the turn (23:36:40Z–23:37:13Z): main thread 13.4% in
`SLSDisplayGetTiming` (4.4% on the 80 KB conversation, 42% in production).

### During the turn (timeline 50–185 s)

| | share of the window |
|---|---:|
| `composite` | **20.7%** (≈30 ms per frame) |
| stream events (`message`, 2.4/s, **34 ms** each) | 6.0% |
| `input` events | 4.7% |
| layout, style, paint together | 1.4% |

The page drew **6.9 frames per second** (median frame 119 ms). Mirror Desktop's native commands
were light: draft saves, the turn journal and the Pi leaf, a few per 10 s.

### After the turn settled (timeline 190–315 s)

- `load_dedicated_journey_conversation` returned the **34.1 MB** projection six times between
  23:38:53Z and 23:39:51Z, 2.2–5.7 s each.
- One `message` handler ran **11.95 s**; one composite **12.0 s**; four layouts of 4–5 s each; a
  forced layout of 2.6 s.
- **3,754 `inspect_local_references` calls in 20 s** (23:39:40Z–23:40:00Z), from
  `LinkifiedText`, which asks the native side about the paths of its text when it mounts. That count
  means the whole transcript was mounted again after the turn: the flash of CR184.

### Reading

- **CR184 is a remount.** Settlement reloads the full projection several times and the transcript
  mounts again, every message asking again about its paths. The stall at the end of a turn is that
  work, not the turn.
- **CR185 is the size of what the page keeps live.** During the turn, the page spends a fifth of
  its time compositing and about 34 ms per streamed event; both grow with the conversation the DOM
  holds, and they leave fewer than seven frames per second for scrolling and typing.

## After the CR184 repair (`07dc639`, same rehearsal, 2026-11-03 00:50Z)

One turn, 00:50:22Z to settlement acknowledged at 00:52:19Z; timeline 5.8–178.5 s.

| end of a turn | before | after |
|---|---:|---:|
| `inspect_local_references` calls | 3,754 | **0** |
| longest task | 12.0 s (`message` handler) | 1.5 s (microtask) |
| layouts over 1 s | 4 (4.1–5.2 s) + forced 2.6 s | **0** (longest 0.13 s total in the window) |
| reads of the 34 MB projection, start to settled | 9 | 9 |

The transcript is no longer mounted again. Every remaining stall over 0.8 s lines up, after aligning
the timeline to the network clock (offset 00:49:52.8Z), with the end of a
`load_dedicated_journey_conversation` response: 00:51:02.5Z ↔ 69.9 s (0.91 s), 00:51:42.5Z ↔
109.8 s (0.96 s), 00:52:07.3Z ↔ 134.5 s (0.83 s), 00:52:26.3Z ↔ 153.5 s (1.53 s), each followed by a
composite of 0.6–1.3 s. The renderer parses 34 MB on its main thread every time it reads the
projection.

During the turn the page still drew about 5 frames per second, compositing 11–12% of the time. That
is CR185, untouched by this repair.

## After the second CR184 repair (`1ada90c`, same rehearsal, 2026-11-03 01:13Z)

One turn, 01:13:37Z to acknowledged 01:15:12Z; timeline 13.2–132.6 s.

| per turn | first recording | after `07dc639` | after `1ada90c` |
|---|---:|---:|---:|
| full reads of the projection (34 MB) | 9 | 9 | **1** (before Send) |
| metadata reads (0.47 MB) | — | — | 3, ~0.7 s native each |
| `inspect_local_references` | 3,754 | 0 | 0 |
| longest task | 12.0 s | 1.5 s | **1.0 s** (during the turn) |
| longest task after the lease is released | 12.0 s | 1.5 s | 0.75 s |

What remains is the saves: each payload is still **28.2 MB**, for a surface of 73 messages. The
stored projection's weight is `terminalAgentActionEvidence`: 28.4 MB for 475 turns (median 37 KB,
largest 545 KB, mostly `operations`), against 4.7 MB of messages. The renderer holds the evidence
of every turn of the generation and stringifies it on every save; the remaining stalls (1.0, 0.75,
0.65 s) fall on those saves.

### A correction to the CR185 reading

The first recording's saves held 6,188 messages because the renderer composed the stored history
into them before writing (the read that `1ada90c` removed). The surface itself was the current
chapter all along: 73 messages here. So the page does **not** keep the whole conversation in the
DOM, and CR185's cost during a turn (7.4 frames per second, compositing 8–11%) is not explained by
transcript size. What the renderer does hold at generation size is the evidence map. CR185 needs
its own reading before any repair.
