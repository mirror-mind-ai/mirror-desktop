# Mirror Desktop's Anthropic Provider

A fork of **pi-claude-bridge 0.9.3** by Eli Dickinson (MIT, see `LICENSE`), owned by Mirror Desktop
under [CR173](../../../docs/project/refinement/rs026-after-the-0-3-cutover/cr173-make-anthropic-access-the-desktops-own-provider.md).

- Upstream: <https://github.com/elidickinson/pi-claude-bridge>, commit
  `874fa7c2678456336f23b64e784e2057e608d83e`
- npm tarball `pi-claude-bridge-0.9.3.tgz`, integrity
  `sha512-5OM3X6QLX7Xsv86bD+yiWvQEHdlGdXnaY9DgZg6jG4jpnKiHQ2FZKYVRFHYmDAEccDPfeFwW+NFHnkb+BUM+6Q==`
- `src/` is the tarball's `src/`; `README.md`, `assets/` and `package.json` were not taken. The
  dependencies are pinned by `../package-lock.json` and installed by the app.

## What the fork changes

Only `src/config.ts`. Every other file is byte-identical to the tarball (`UPSTREAM.sha256`, checked by the test), so moving to a newer
upstream is: take its `src/`, re-apply this one file, run `cr173AnthropicProviderFork.test.ts`.

- `claudeCodeSettings` adds `disableAllHooks: true`, so the person's Claude Code hooks (Mirror's
  plugin among them) never run inside a Desktop turn ([CR167](../../../docs/project/refinement/rs026-after-the-0-3-cutover/cr167-keep-a-users-claude-code-plugin-out-of-the-desktops-own-turns.md)).
  It also pins Claude's auto-memory off. It reaches the turn and AskClaude; the one-off summary
  (compaction) already starts Claude with `settingSources: []`, which was measured to run no
  plugin hook, and is left as upstream wrote it.
- `loadConfig` returns the Desktop's fixed configuration and reads no `claude-bridge.json`; the
  notice markers write nothing. With no `askClaude.enabled`, the AskClaude tool is never registered:
  its code stays in `index.ts`, unreachable, to keep the fork one file wide.

The provider id stays `claude-bridge`, so persisted model choices and history keep resolving.
