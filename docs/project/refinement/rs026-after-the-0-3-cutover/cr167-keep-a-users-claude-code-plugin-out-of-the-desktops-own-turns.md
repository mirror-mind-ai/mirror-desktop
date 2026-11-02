[< RS026](index.md)

# CR167: Keep a User's Claude Code Plugin Out of the Desktop's Own Turns

**Status:** in_progress
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

## Reproduced (2026-11-02)

Sandbox, nothing of the Navigator's touched: `HOME=/private/tmp/cr167-repro/home`, a throwaway home
`cr167` made by `mirror init` + `mirror seed` (Core 0.39), the plugin linked exactly as `mirror init`
teaches (`~/.claude/skills/mirror-mind`), `~/.config/mirror/env` naming that home. A turn run the way
the Desktop runs one: `pi --print --no-extensions --extension <global pi-claude-bridge 0.9.3> --model
claude-bridge/claude-opus-5`. `ANTHROPIC_API_KEY` was set to an invalid value, so the call failed with
"Invalid API key" at no cost; the hooks fire before the model call, which is all the case needs.

Result: the sandbox home gained a conversation with `interface = claude_code`, holding the prompt (and
the error as the assistant reply). The front-door log shows the plugin's session-start, `mirror
doorman` (the per-turn injection), user-prompt and session-end all ran. So, on a person's machine with
the plugin linked, each Desktop turn through the bridge is logged a second time, in whatever home
`~/.config/mirror/env` names, which need not be the Desktop's, and the model gets Mirror's injected
context on top of the Desktop's.

**Correction of the code reading:** the bridge's main turn (the provider path, `index.ts` ~2032) leaves
`settingSources` at Claude Code's default, which loads every source; `settingSources: ["user",
"project"]` at line 2317 is the AskClaude tool, not the turn. Same conclusion, different line.

## Where the fix belongs (Navigator, 2026-11-02)

Not in the Core. The first direction (the Desktop marks its Pi, the Core's hooks skip it) made the Core
know about one of its clients. The problem is a composition problem, and it belongs to whoever composes:
the bridge decides what Claude Code loads inside a turn. The bridge already filters for the same reason
(it excludes `CLAUDE.md`/`AGENTS.md` as "written for a harness that is not the one running"), but only
for instructions, not for hooks. Any hook a person has in Claude Code, Mirror's or not, runs inside the
Desktop's turns.

## The lever, measured

Claude Code's `disableAllHooks: true`, given as flag settings (the channel the bridge's `settings`
option uses), stops the plugin's hooks. Measured with the binary the bridge runs
(`claude-agent-sdk-darwin-x64`, CC 2.1.306, SDK 0.3.306), same sandbox, invalid key: without it the
prompt was logged as `claude_code`; with `--settings '{"disableAllHooks":true}'` nothing was logged.
It does not touch `settings.json`'s `env` or `apiKeyHelper`, which is why the bridge kept
`settingSources` on. The bridge uses no SDK hooks of its own, so nothing of its behaviour depends on it.

The bridge exposes no way to set it today: `claudeCodeSettings` passes only `autoMemoryEnabled`.

## Proposed Direction

1. A contribution to `pi-claude-bridge` (Eli Dickinson, `elidickinson/pi-claude-bridge`): an option that
   adds `disableAllHooks: true` to the provider path's settings. Per process (an environment variable,
   like the bridge's `CLAUDE_BRIDGE_DEBUG`) so the Desktop can set it for its own Pi without changing
   the person's bridge config; whether it should be the default is the bridge author's call. Opening
   an issue or PR there is a publication and needs the Navigator's word.
2. The Desktop sets it on the Pi it runs (`runtime_channel.rs`, where it already clears `MIRROR_HOME`),
   with a test that pins the variable.
3. Negative case: a Claude Code session the person starts, outside the Desktop, still runs its hooks
   and still logs.
4. Until the bridge has the option, the Desktop can say it: if `~/.claude/skills/mirror-mind` (or a
   Claude Code plugin with Mirror's hooks) is present, the first-run assistant names the double logging.
   Optional, smaller.

The Core does not change.
