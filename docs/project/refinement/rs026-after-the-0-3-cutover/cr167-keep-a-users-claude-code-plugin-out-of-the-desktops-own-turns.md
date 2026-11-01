[< RS026](index.md)

# CR167: Keep a User's Claude Code Plugin Out of the Desktop's Own Turns

**Status:** captured
**Line:** 0.3 · Desktop and Core (`mirror-ts`)

## Friction

Found in CV-010 DS-005 phase 5c item 2 (2026-11-01), read in code and **not reproduced**. It does
not affect the Navigator, who does not use Claude Code, so it does not block the cutover. It would
affect a new user who already uses Claude Code with Mirror.

## Mechanism (as read)

1. The Core wires Claude Code by linking its plugin under `~/.claude/skills/mirror-mind`, user scope.
2. `pi-claude-bridge` starts its Claude child with `settingSources: ["user","project"]`
   (`src/index.ts:2317`, 0.9.3), so user-scope plugins and hooks load inside every bridged turn.
3. Mirror Desktop 0.3 removes `MIRROR_HOME` and `MIRROR_USER` from its Pi
   (`runtime_channel.rs:392`), so the plugin's hooks find the home through `~/.config/mirror/env`.

Every bridged turn the Desktop runs would then be logged a second time as a `claude_code`
conversation, in the Desktop's home or, worse, in another home, splitting memory silently. The model
would also receive the Operating Instructions twice. 0.2 shows the same shape today through the
project hooks in `~/mirror/.claude` (conversation `c912ef55`, 2026-11-01).

Wider and not Mirror's: any user hooks or settings a person has in Claude Code also run inside the
Desktop's bridged turns.

## Proposed Direction

1. Reproduce first, in a sandbox `HOME` with the plugin linked and a bridged turn run through the
   Desktop's Pi; the plan rests on code reading until then.
2. The Desktop marks its Pi with a variable; the Core's hooks skip a session that carries it. Core
   change, extend-only, through `mirror-ts`'s PR route.
3. Negative case: a Claude Code session started by the user, outside the Desktop, still logs.
