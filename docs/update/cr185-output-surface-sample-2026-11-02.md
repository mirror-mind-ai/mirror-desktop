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
