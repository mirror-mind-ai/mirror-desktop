[< RS026](index.md)

# CR176: Run the Agent in the Journey's Folder, Not in the Mirror Home

**Status:** in_progress
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

## Measured (2026-11-02)

The app's own Pi 1.4.0, a local fake OpenAI-compatible server recording the exact request, a sandbox
agent directory with an `AGENTS.md`, and a project with a parent `AGENTS.md`, its own `CLAUDE.md`,
`.pi/settings.json`, `.pi/skills/` and `.pi/prompts/` (`/private/tmp/cr176-probe`):

| Working directory and flags | What reached the model |
|-----------------------------|------------------------|
| A data folder, the turn's flags today (`--approve --no-extensions`) | global `AGENTS.md` |
| The project, the turn's flags today | global, parent and project context files, **and the project's skill** |
| The project, `--no-approve --no-extensions` | global, parent and project context files |
| The project, plus `--no-context-files` | nothing, not even the global `AGENTS.md` |

In every case the tools were `read`, `bash`, `edit`, `write`, and the working directory was written
into the system prompt: the agent's "where am I" is the process's working directory, nothing else.

What this settles:

- **`--approve` is project trust**, not tool approval (`pi --help`: "trusts project-local files for
  one command"). Harmless while a turn runs in the home; in a project it would load that project's
  `.pi/settings.json`, skills and prompts, and install packages it declares. A turn outside the home
  must pass `--no-approve`. The person's `trust.json` trusts `/Users/alissonvale` and its children,
  so without the flag a saved decision would load them too.
- **Context files load regardless of trust.** In a project, its `AGENTS.md`/`CLAUDE.md` and every
  parent's enter the turn, as they do for Pi in a terminal there.
- No Journey in the production home points at `~/mirror`. Five have no project path (among them
  `journey-nova`, `vida-interior`). Five point at `~/Code/mirror-dev`, the stale Python checkout,
  whose `.pi/extensions` (`mirror-logger`) `--no-extensions` already keeps out and whose project
  resources `--no-approve` keeps out.

### Adjacent finding, not this CR's

Desktop turns load the person's agent-level skills, among them the Mirror package's `mm-*` skills
(no `--no-skills`). They call `mirror`, which is on the turn's `PATH` (`/usr/local/bin`). The turn
removes `MIRROR_HOME`, so the CLI falls back to `~/.config/mirror/env`, which names the production
user. A development Desktop on a rehearsal home that follows such a skill writes to production.

### Decisions for the Navigator

1. Project context files enter the turn (recommended: yes, as Pi in a terminal does).
2. `--approve` becomes `--no-approve` for turns and compactions (recommended).
3. Where a Journey without a project path runs.
4. Whether the adjacent finding becomes its own CR.

## Decided (Navigator, 2026-11-02)

1. Project context files enter the turn: yes.
2. `--approve` becomes `--no-approve`: yes.
3. A Journey without a project path works in `~/Mirror Journeys/<journey>`.
4. The adjacent finding becomes [CR177](cr177-keep-the-persons-mirror-skills-from-reaching-another-home.md).

## Measured while building

- **Pi takes the working directory from the session file, not the process.** A session created in
  folder A and resumed from folder B still ran in A (`main.js`: "Decide the final runtime cwd …
  --session … may select a session from another project"); a header whose folder is missing makes a
  non-interactive Pi exit. Every Desktop session was provisioned in the home, so changing the
  process's folder alone would have changed nothing.
- **A project's `.claude/settings.json` runs inside a Desktop turn.** With the turn in a project
  whose settings name an `apiKeyHelper`, Claude Code ran it (`HELPER_RAN` written), `--no-approve`
  notwithstanding: Pi's trust does not reach Claude Code's own settings.

## Delivered on `main` (`1b14030`)

- `journey_workspace.rs`: the Journey's registered project path when it is absolute, exists, and is
  not the Mirror home or inside it; otherwise `~/Mirror Journeys/<journey>` (a plain folder name,
  made on first use, links refused), with a sentence on the turn when a registered path was set
  aside. `anchor_session_cwd` rewrites only the session header's `cwd`, atomically, keeping the
  file's mode and every other byte.
- The turn resolves the folder and anchors its session before Pi starts (registry reservation
  held); compaction resolves before its claim and anchors under it; both run Pi there.
- `--no-approve` on turns, compactions, session provisioning and title suggestion.
- The Desktop's provider starts Claude Code with `settingSources: ["user"]`: the person's settings
  apply, a project's and its local settings do not. Measured after: the project's helper no longer
  ran; the person's own still did. One marked line in the fork's `index.ts`; the source hash moved,
  so Claude through Claude Code must be connected again.
- Tests: `journey_workspace` (6), the turn and compaction guards, the provider fork (7); 25
  mutation controls, every one applied and caught (M3 and M7 first survived and the tests were
  strengthened). Full suites: 2483 TypeScript, 449 Rust.

### Navigator check in development (owed)

A Journey with a project path answers "which directory are we in?" with it; one without answers
`~/Mirror Journeys/<journey>`; a file written without a path lands there; nothing new in the home.

**Reported 2026-11-02:** "deu tudo certo nos testes." On disk afterwards: the session used in dev
has its header anchored at `~/.mirror-journeys/vida-tecnica` (the Journey's project path), and the
home `ensaio-5c-2` holds nothing new besides `memory.db` and `backups/`. `~/Mirror Journeys` does
not exist, so the case of a Journey without a project path left no trace; confirmation asked of
the Navigator before closing.

## Acceptance

- Spec first: the working directory is the Journey's project path, else its neutral folder, never
  the home; the slice 2e guard is rewritten to pin that, with mutation controls.
- Sandbox: "which directory are we in?" answers the project path; a write without a path creates
  the file there; nothing new appears in the home.
- The `~/mirror` case is handled as decided above.
