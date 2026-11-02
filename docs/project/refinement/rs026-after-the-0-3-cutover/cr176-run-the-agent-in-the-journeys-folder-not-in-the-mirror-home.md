[< RS026](index.md)

# CR176: Run the Agent in the Journey's Folder, Not in the Mirror Home

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Found by the Navigator on 2026-11-02, testing CR173 in development (`ensaio-5c-2`, Journey
`vida-tecnica`): asked "Em que diretório estamos?", the agent answered with the Mirror home. The
Navigator expected the Journey's project path.

The code confirms it. Every Pi turn and compaction is built by `pi_turn_command` →
`isolate_pi_command` → `RuntimeChannelProfile::apply_to_command`, which sets the working directory
to the bound home (DS-005 slice 2e, deliberately: "a data folder, never a Mirror checkout whose
`.pi/extensions` would load"; pinned by `every_pi_turn_is_built_isolated_in_the_0_3_home`).

That was safe against one danger and opened another. A mediated turn runs with Pi's default tools
(read, bash, edit, write; the turn path passes no `--no-tools`), so every relative path the agent
uses resolves inside the folder that holds `memory.db`, `identity/`, `backups/` and `extensions/`:

- a file the person asks for is created in the wrong place, next to their memory;
- a relative shell command (`rm`, `git init`, a script's output) acts on the home;
- the agent's own sense of where it is, which shapes every answer about files, is wrong.

The Journey's folder is known: `registered_journey_root` reads it from the Journey tree
(`projectPath`) and the documentation view already uses it.

## Direction

1. **A turn runs in its Journey's registered project path** when the Journey has one.
2. **A Journey without one runs in a neutral folder of its own** under the app's data root (not the
   home), made on first use, so relative writes land somewhere harmless and visible.
3. **The home is never a turn's working directory.** Mirror's data is reached through the host.

### To measure before building

Changing the folder changes what loads from it. Each needs a measurement in a sandbox, not a guess:

- Pi's context files: the turn path does not pass `--no-context-files`, so `AGENTS.md` / `CLAUDE.md`
  found from the new folder up would enter the turn. Possibly wanted (the project's instructions),
  possibly not; the Navigator decides.
- A project's `.pi/settings.json` and `.pi/extensions` under `--no-extensions`.
- Claude Code (CR173's provider) started in a project with its own `.claude/`: hooks are off
  (`disableAllHooks`), tools are `[]`; check skills, settings `env` and `.mcp.json`
  (`strict-mcp-config`).
- A Journey whose project path is a Mirror checkout (`~/mirror`, where this machine's policy forbids
  starting Pi): refused, or run in the neutral folder with a sentence that says why.
- Resumed sessions: Pi records the session's directory; a session started in the home and resumed
  elsewhere.
- Compaction and title suggestion follow the turn's folder (title has no tools; compaction must not
  diverge).

## Acceptance

- Spec first: the working directory is the Journey's project path, else its neutral folder, never
  the home; the slice 2e guard is rewritten to pin that, with mutation controls.
- Sandbox: "which directory are we in?" answers the project path; a write without a path creates
  the file there; nothing new appears in the home.
- The `~/mirror` case is handled as decided above.
