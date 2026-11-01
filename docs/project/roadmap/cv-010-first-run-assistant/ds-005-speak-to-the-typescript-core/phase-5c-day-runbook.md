[< DS-005](index.md)

# Phase 5c — The Day: Runbook

Production's Mirror moves to the 0.3 line: one home path, one core. Written 2026-11-01, from the
phase 5c rehearsals (`ensaio-5c`, `ensaio-5c-2`), the 5b rollback rehearsal and the 5c item 2
sandbox. **Nothing here runs without the Navigator's word on the day.** A word for one part covers
that part only.

The day has three parts:

- **Part A**, about 15 minutes. The Navigator runs it in Terminal. The agent is not reachable,
  because it lives in 0.2 and 0.2 is quit in A2.
- **Part B.** The agent runs it inside 0.3, in the `mirror-desktop` Journey, one step per word.
- **The way back**, at any point if 0.3 cannot run a turn.

Every command block is copied whole. "Stop" means: do not go on; take the way back or ask the
lifeboat.

## Facts This Runbook Rests On (measured 2026-11-01)

| What | Value |
|---|---|
| Production home | `~/.mirror-minds/alisson-vale`, 675 MB, ledger `016_builder_workbench_display_codes`, 81 Journeys, 1,125 Conversations, 51,316 messages |
| 0.2 app | `/Applications/Mirror Desktop.app`, 0.2.0-alpha.58; data in `~/Library/Application Support/ai.mirrormind.desktop` |
| 0.3 app | `/Applications/Mirror Desktop TS.app`; data in `~/Library/Application Support/ai.mirrormind.desktop.ts`; must be **0.3.0-alpha.3** on the day |
| Web console | LaunchAgent `com.alissonvale.mirror-web-console` |
| Free disk | 88 GB |
| Not existing yet (A4, A5, B1 and B3 create them) | `~/Mirror Backups`, `~/.mirror-minds/alisson-vale.pre-0.3`, `~/.pi/agent/AGENTS.md.pre-0.3`, `~/.config/mirror` |

Shorthands used in the blocks below (paste once per Terminal window):

```bash
H=~/.mirror-minds/alisson-vale
R=/Users/alissonvale/.mirror-journeys/vida-tecnica/ia-agentica/mirror-mind-ai/mirror-desktop
Q() { sqlite3 "file:$1/memory.db?mode=ro" "select (select id from _migrations order by id desc limit 1),(select count(*) from conversations),(select count(*) from messages),(select count(*) from identity where layer='journey')"; }
```

## Before the Day (Can Be Done Any Time)

1. **Bring the installed 0.3 app to alpha.3.** Open `/Applications/Mirror Desktop TS.app`. It is
   bound to `fred-soares`, so this is harmless. Go to Settings › Check for updates and install.
   Confirm that Settings shows 0.3.0-alpha.3, then quit it.
2. **Quit the User build left in the repository**
   (`src-tauri/target/release/bundle/macos/Mirror Desktop TS.app`, bound to `ensaio-5c-2`). It
   shares the data folder with the installed app, so two copies must never run at once.
3. **Prepare the lifeboat.** Open a Terminal, `cd "$R"`, start `pi` and send one short message.
   It must answer. This Pi has no Mirror package (global settings: browser, gmail,
   `pi-claude-bridge`, `pi-cc-patch`), so it works whatever state Mirror is in. Leave it open for
   the whole day.

## Part A — The Navigator, in Terminal

### A1. Let 0.2 Finish, Then Quit It

In 0.2, wait until no turn is running. Then check that 0.2's outbox is empty:

```bash
cat ~/Library/Application\ Support/ai.mirrormind.desktop/mirror-append-outbox.json
```

The output must show an empty item list (`"items":[]`). If it does not, wait and check again. The
carry (A8) refuses a non-empty outbox anyway. Then quit 0.2 with Cmd+Q, and quit
`Mirror Desktop TS.app` if it is open.

```bash
ps -axo pid,comm | grep -i "mirror desktop" | grep -v grep
```

Expected output: nothing.

### A2. Stop Every Other Writer

Quit any Pi, Claude Code or Gemini session started in `~/mirror`; its project hooks write to the
home. The lifeboat Pi runs in the repository, so it stays open. Then stop the web console:

```bash
launchctl bootout gui/$(id -u)/com.alissonvale.mirror-web-console
lsof +D "$H" 2>/dev/null
```

`lsof` must print nothing. If a process still holds the home, quit it and run `lsof` again.

### A3. Note the Starting Point

```bash
Q "$H"
```

Expected: `016_builder_workbench_display_codes|1125|51316|81` or higher counts. Write the line
down; A6 must match it.

### A4. Put 0.2 Away

```bash
ls ~/Mirror\ Backups 2>/dev/null; mkdir -p ~/Mirror\ Backups
mv "/Applications/Mirror Desktop.app" ~/Mirror\ Backups/"Mirror Desktop 0.2.0-alpha.58.app"
```

The `ls` must print nothing, because the folder should not exist yet. 0.2's data folder stays where
it is: the carry reads it, and the way back needs it.

### A5. Keep the Home Aside

```bash
ls -d "$H.pre-0.3" 2>/dev/null; mv "$H" "$H.pre-0.3"
```

The `ls` must print nothing. From this point `alisson-vale.pre-0.3` is the untouched 0.2-era home.
Nothing writes to it until the way back or the end of the window.

### A6. Copy It Back to the Same Path

```bash
cp -cRp "$H.pre-0.3" "$H"
sqlite3 "file:$H/memory.db?mode=ro" "pragma integrity_check"; Q "$H"; Q "$H.pre-0.3"
```

Expected: `ok`, then two identical lines, each equal to A3's. If either differs, **stop**.

### A7. Adopt the Copy in 0.3

1. Open `/Applications/Mirror Desktop TS.app` and confirm it says 0.3.0-alpha.3.
2. Go to Settings › Choose Mirror home… In the folder window press Cmd+Shift+G, paste
   `~/.mirror-minds/alisson-vale` and choose it.
3. The review must name that path and 81 Journeys, 1,125 or more Conversations, and the changes
   `017_journey_parent_column` and `018_drop_hook_injected`. Click **Update and open**.
4. When it opens, **quit at once with Cmd+Q. Do not open or start any Journey**, because the carry
   refuses a home already used in 0.3.

```bash
Q "$H"; cat "$H/.mirror-desktop/home.json"; ls "$H/backups" | grep pre-migration
```

Expected: `018_drop_hook_injected` with the same counts, a `homeId`, and one new
`pre-migration-016_…db` backup.

### A8. Carry the 0.2 State

```bash
cd "$R" && node scripts/carry_02_state.mjs "$H"
```

This is a dry run. Expected, from the rehearsals: about 600 files, about 6,800 paths, 47 Pi session
headers, the global profile, 16 Journey overrides and 14 conversation overrides, and no refusal.
If it refuses, **stop** and read the refusal: it names its cause. Then:

```bash
node scripts/carry_02_state.mjs "$H" --write
```

This takes 15–25 s.

### A9. The Bar

Open `/Applications/Mirror Desktop TS.app`, open the `mirror-desktop` Journey and check that:

- this conversation is there, with its last turns;
- the model is `claude-bridge/claude-opus-5-5`;
- a short turn ("chegamos?") gets an answer **and settles**. It must not stay at *Finishing*.

Open two other Journeys (for example *alissonvale-com* and *89-livros*). Each must show its 0.2
conversation.

If all of this holds, Part A is done and the agent is reachable again in 0.3. If a turn cannot run,
take **the way back**.

## Part B — the Agent, in 0.3 (One Step per Word)

The agent now runs in the bound home and reads `~/.pi/agent/AGENTS.md`, which still forbids
TypeScript on this home. B1 changes that first.

### B1. Update the Machine Policy

Copy `~/.pi/agent/AGENTS.md` to `~/.pi/agent/AGENTS.md.pre-0.3` (after checking that the copy does
not exist), then:

- Replace the section "TypeScript Mirror must not reach the production home" with "The production
  home is on the TypeScript Core", stating that:
  - the home is at 018 and served by Mirror Desktop TS and the global `mirror-mind`;
  - the Python Mirror in `~/mirror` cannot open it, so never run `uv run python -m memory` against
    it and never start Pi, Claude Code or Gemini in `~/mirror`, whose project hooks call Python;
  - `~/mirror` and `alisson-vale.pre-0.3` stay untouched until the Navigator closes the window back;
  - the Claude Code plugin is not linked (`~/.claude/skills/mirror-mind`), see CR167;
  - Dev builds never bind the production home.
- In "Journey-aware book writing", replace `uv run python -m memory mirror load` with
  `mirror mirror load`. The resolver `resolve_journey_writing.py` already works on 018: it was
  checked read-only on `ensaio-5c-2`.
- In "Production Mirror checkout boundary", add that `~/mirror` no longer serves the production
  home.

### B2. Install the Core Globally

```bash
npm install -g mirror-mind@0.39.0 && mirror --version
```

### B3. Name the Home for the Terminal

```bash
ls ~/.config/mirror 2>/dev/null; mkdir -p ~/.config/mirror && printf 'MIRROR_USER=alisson-vale\n' > ~/.config/mirror/env
mirror runtime diagnose
```

Use this file, not `mirror init`, because the home already exists. If diagnose asks, run
`chmod 700 "$H"`. A missing OpenRouter key is reported, but that is not this step's concern.

### B4. Wire Pi (Only Pi: No Claude Code Link, Navigator 2026-11-01)

```bash
pi install "$(npm root -g)/mirror-mind" && pi list
```

### B5. Prove Both Ends

1. **0.3 still logs once.** Send one turn in 0.3. Then check that the Journey's own Conversation
   grew by 2 messages and that no new `pi` or `claude_code` Conversation appeared. 0.3's Pi refuses
   Mirror's own package, so B4 must not reach it.
2. **The terminal logs.** Start `pi` in a folder that is not `~/mirror` and send one turn. Then
   check that one new `pi` Conversation holds it.
3. Run `Q "$H"`: ledger 018, counts only growing.

### B6. Record

Record the day in DS-005, with the starting line from A3, the receipts, and the B5 checks. Then
commit and push in this repository.

## The Way Back (If 0.3 Cannot Run a Turn)

This restores 0.2 exactly as it was at A1. Whatever was written in 0.3 stays only in the set-aside
copy.

```bash
ps -axo pid,comm | grep -i "mirror desktop" | grep -v grep      # must print nothing: quit 0.3 first
mv "$H" "$H.0.3-attempt-$(date +%Y%m%d-%H%M)"
mv "$H.pre-0.3" "$H"
mv ~/Mirror\ Backups/"Mirror Desktop 0.2.0-alpha.58.app" "/Applications/Mirror Desktop.app"
mv "/Applications/Mirror Desktop TS.app" ~/Mirror\ Backups/      # so it is not opened on the restored home
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.alissonvale.mirror-web-console.plist
Q "$H"                                                            # equals A3's line
```

Then open 0.2.

If Part B has already run, also undo it:

1. `pi remove "$(npm root -g)/mirror-mind"`
2. `npm uninstall -g mirror-mind`
3. remove `~/.config/mirror/env`
4. move `~/.pi/agent/AGENTS.md.pre-0.3` back over `AGENTS.md`

`scripts/phase5_rollback.mjs` (5b) is the last resort. It is only for the case where the
set-aside home is lost: it restores the core's pre-migration backup inside the adopted home.

## After the Day

- **The window back** stays open until the Navigator closes it. Until then, keep `~/mirror`,
  `alisson-vale.pre-0.3`, `~/Mirror Backups` and 0.2's data folder exactly as they are.
- **When the window closes**, the Navigator decides about each of these:
  - retiring the Python hooks and `mirror-logger` in `~/mirror`;
  - the "Owed at the End of Phase 5" list;
  - the rehearsal leftovers;
  - RS026.
