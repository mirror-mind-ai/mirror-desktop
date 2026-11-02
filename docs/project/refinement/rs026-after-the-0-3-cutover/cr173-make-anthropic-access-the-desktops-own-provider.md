[< RS026](index.md)

# CR173: Make Anthropic Access the Desktop's Own Provider

**Status:** captured
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

## Acceptance

- On a machine with the Mirror plugin linked in Claude Code, a Desktop turn through Anthropic leaves no
  `claude_code` conversation (the CR167 sandbox, re-run against the release build).
- A Desktop with no `~/.pi/agent` at all lists and runs Anthropic models after sign-in.
- The Desktop's Anthropic behaviour does not change when the person updates or removes their own
  `pi-claude-bridge`.
