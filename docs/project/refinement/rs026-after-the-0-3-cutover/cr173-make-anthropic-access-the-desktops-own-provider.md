[< RS026](index.md)

# CR173: Make Anthropic Access the Desktop's Own Provider

**Status:** done
**Line:** 0.3 · Desktop only

## Friction

Reaching Anthropic's models is part of what the Desktop promises, not an optional add-on. Today that
promise is borrowed from the person's machine: the Desktop finds `pi-claude-bridge` in
`~/.pi/agent/settings.json` (`pi_global_extensions.rs`) and loads whatever version and configuration it
finds there, including the person's `claude-bridge.json`. Without it, a Desktop user has no Anthropic
models at all.

The borrowing shows up as defects owned by no one: the person's Claude Code hooks run inside the
Desktop's turns (CR167, reproduced 2026-11-02), a compaction could not resolve the provider (CR080),
the bridge's behaviour changes when the person updates it, and the Desktop cannot change one line of
it without asking its author.

## Decision (Navigator, 2026-11-02)

The Desktop owns its Anthropic provider, the way it already owns its Pi (`pi_toolchain`: a pinned
version installed under the app's data root). Two questions are kept apart:

- **Who owns the seam** is decided here: the Desktop, with a pinned fork of the bridge (MIT).
- **Which mechanism crosses it** stays open, in the exploration
  [A Lean Anthropic Provider](../../explorations/a-lean-anthropic-provider/index.md).

Not adopted: `pi-cc-patch`. It rewrites Pi's direct Anthropic OAuth request to look like Claude Code
(billing header, declared Claude Code version, stripped detection prefix); its README describes it as
bypassing third-party app detection. A person may choose it for themselves as a global extension. The
product does not make that choice on their behalf, nor present its own requests as another client's.

## Direction

1. **A pinned fork, installed by the app.** `pi-claude-bridge` 0.9.3 forked under the Desktop's
   control, installed next to the app's Pi with the same discipline as `mirror-host/pi-install.mjs`
   (a lockfile, sha512 integrity, all or nothing, a receipt). The Agent SDK binary is ~271 MB per
   platform: decide between shipping it in the bundle and fetching it on the first Anthropic sign-in,
   as Pi is fetched.
2. **Loaded explicitly.** The Desktop passes its own provider by `--extension`; the person's
   `pi-claude-bridge`, if any, is skipped from the global list (with a line in `skipped`, the way
   `mirror-logger` is), so two copies never register the same provider id.
3. **Three cuts in the fork**, each with a test:
   - `disableAllHooks: true` on the provider path's settings (closes CR167; measured to work with the
     SDK's binary, CC 2.1.306);
   - the AskClaude tool removed (a Desktop turn runs Claude with `tools: []`; Pi runs the tools);
   - configuration fixed by the Desktop, not read from the person's `claude-bridge.json`.
4. **Provider id unchanged** (`claude-bridge`), so persisted model choices (CR154) and history stay
   valid.
5. **Negative checks:** a Claude Code session the person opens still runs its hooks and logs; a person
   who uses the bridge in their own terminal Pi keeps their copy, untouched.

The `disableAllHooks` option is still offered upstream as a courtesy, if the Navigator gives the word.
Nothing here waits for it. The Core does not change.

## Delivered on `main` (2026-11-02)

Four slices, each written spec first with mutation controls (every mutation applied and was caught):

| Slice | Commit | What |
|-------|--------|------|
| Fork | `d0a2d65`, `7afd1d8` | `mirror-host/anthropic/provider/`: the 0.9.3 tarball's `src/`, `LICENSE`, `FORK.md`, `UPSTREAM.sha256`. Only `src/config.ts` differs (checked by the test against the recorded hashes). |
| Installer and pin | `41a8ca0` | `pi-install.mjs --kind anthropic`, sharing lock, cache, sha512 checks, staging and receipt with Pi's install; optional packages kept only for this machine's `os`/`cpu`; the provider's source named by a tree hash; Claude Code's `--version` checked with a throwaway home. `pin.anthropic` (114 packages, SDK 0.3.306, Claude Code 2.1.306); the runtime carries `anthropic/` and its receipt records both hashes. |
| Turns | `a2a3dc2` | `anthropic_provider.rs` accepts an install only when both receipts agree; `RuntimeChannelProfile::pi_extensions()` is now the one place a turn, a compaction, a title and the model catalog take their extensions from; the app's provider goes first and the person's `pi-claude-bridge` is skipped with a note. `install_anthropic_provider` command. |
| Settings | `a844f07`, `0bf99de` | First a separate Settings › Claude models block; folded the same day, at the Navigator's remark, into Model providers as **Claude · through Claude Code**, offered first, whose Connect installs it with progress, then the channel and the model catalog are read again. `anthropicInstalled` in the runtime diagnostic. |

Measured outside the app on 2026-11-02:

- The real installer, run with the Node the app carries against the real lockfile: 107 packages for
  darwin-x64, 134 MB downloaded, 340 MB on disk, 48 s, receipt written.
- The CR167 sandbox with the installed provider: the turn reached Claude ("Invalid API key", the
  intended no-cost failure) and **no `claude_code` conversation was logged**; the upstream bridge in
  the same home logged one. `pi --list-models` through it lists the `claude-bridge` models.

### Navigator check in development (2026-11-02)

On `a844f07`, in `ensaio-5c-2`: installed, started a Journey, ran a turn on an Anthropic model.
"Deu tudo certo." The home holds that one conversation (`nautilus_harness`, 2 messages) and **no
`claude_code` conversation**. The check found CR174 (setup could not leave a broken binding), CR175
(Settings by intent) and CR176 (the agent works inside the Mirror home). `0bf99de` changed only where
Connect lives; it is to be checked again in dev.

**Retest on `0bf99de` (2026-11-02):** with the earlier install moved aside (`anthropic.prev`),
Connect on "Claude · through Claude Code" installed it with progress (10:41) and a turn on an
Anthropic model ran; the same conversation then held 4 messages and still no `claude_code`
conversation. **Closed by the Navigator on this development validation** ("teste ok… podemos fechar").
The release-build re-run below folds into the first alpha that carries CR173 rather than holding the
CR open.

### Departures from the direction

- **AskClaude is unreachable, not deleted.** It registers only when `askClaude.enabled` is set, and
  the fixed configuration never sets it; deleting its code would widen the fork beyond one file and
  make every upstream update a merge instead of a copy.
- **The one-off summary path is untouched.** It already starts Claude with `settingSources: []`,
  measured to run no plugin hook.
- **Until Claude models are installed, the person's bridge is still borrowed**, as before, so nobody
  loses Anthropic access on update. CR167 holds for those Desktops until they install.

### Open

- **Sign-in.** The provider uses the Claude sign-in already on the Mac (Claude Code's Keychain item).
  A person who has never signed in to Claude Code has no way to do it from the Desktop yet. To be
  captured as its own CR once the field shows how it reads.
- **Plan and long context.** The fixed configuration uses upstream's defaults (plan "pro"); a Max
  subscriber's 1M Opus needs a Desktop setting. The Navigator has no plan set today.
- **Release acceptance**, below, on the first alpha that carries this.

## Acceptance

- On a machine with the Mirror plugin linked in Claude Code, a Desktop turn through Anthropic leaves no
  `claude_code` conversation (the CR167 sandbox, re-run against the release build).
- A Desktop with no `~/.pi/agent` at all lists and runs Anthropic models after sign-in.
- The Desktop's Anthropic behaviour does not change when the person updates or removes their own
  `pi-claude-bridge`.
