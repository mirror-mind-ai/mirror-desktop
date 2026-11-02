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
