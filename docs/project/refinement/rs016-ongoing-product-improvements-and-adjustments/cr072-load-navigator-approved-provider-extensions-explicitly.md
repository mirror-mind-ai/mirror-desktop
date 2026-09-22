[< RS016](index.md)

# CR072: Load Navigator-Approved Provider Extensions Explicitly

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr072-global-pi-extensions`

## Problem

Mirror Desktop invokes Pi with `--no-extensions` to guarantee a single
conversation writer and a deterministic runtime. The flag is blunt: it also
removes provider extensions such as `pi-claude-bridge`, whose models the
Settings catalog still offers because the catalog is read through
`pi --list-models` **without** `--no-extensions`. Offered models are therefore
unrunnable (CR070's origin incident), and the Navigator judged losing provider
extensions a high cost.

## Investigation Findings (2026-09-21)

- Pi `0.86.1` natively supports curated loading: `--extension, -e <path>` loads
  an explicit extension file, and `--no-extensions` "disables extension
  discovery (explicit -e paths still work)". No Pi change is required.
- `pi-claude-bridge` declares its entry (`src/index.ts`) via
  `package.json#pi.extensions` under `~/.pi/agent/npm/node_modules/`; an audit
  found no persistence writes — it registers a model provider and an AskClaude
  tool. Agentic tool work is already approved in Desktop invocations.
- The offered-but-unrunnable mismatch lives between `list_pi_models`
  (no `--no-extensions`) and the mirror-mediated invocation
  (`--no-extensions`).

## Design Decision (Navigator, 2026-09-21)

The first draft proposed a Desktop-managed allowlist. The Navigator redirected:
Desktop should mirror what is already installed in Pi rather than ask the user
to curate a second list — `pi install` is the curation. Verification made this
cleaner than a name-based denylist:

- `mirror-logger.ts` exists **only** in project-local `.pi/extensions/`
  directories (the Mirror checkouts). It is not a global package and not a
  global user extension.
- The global set is therefore already writer-free: `packages` in
  `~/.pi/agent/settings.json` (`pi-agent-browser-native`, `pi-gmail`,
  `pi-claude-bridge`) plus `~/.pi/agent/extensions/` (`librarian`).

The boundary is structural, not nominal: **global loads, project-local never
does.**

## Expected Behavior

- The mirror-mediated invocation keeps `--no-extensions` (discovery stays
  disabled, so project-local extensions — where conversation writers live —
  are structurally excluded) and appends one `--extension <entry>` per global
  Pi extension: each settings `packages` entry resolved through its
  `package.json#pi.extensions` declaration under `~/.pi/agent/npm/`, plus each
  entry in `~/.pi/agent/extensions/`.
- No new Desktop-side list to maintain: installing or removing an extension
  with `pi install` / `pi remove` changes what Desktop loads, exactly like the
  terminal.
- Catalog and invocation agree: models provided by globally installed
  extensions are offered as runnable. CR071's unavailable indicator remains
  for the residual cases (an extension model whose global entry cannot be
  resolved, or future project-only providers).
- Defense in depth for the invariant: if a `mirror-logger` entry ever appears
  in the global set, Desktop refuses to pass it and surfaces why — the single
  conversation writer contract outranks parity with the terminal.

## Implementation Considerations

- Desktop mirror-mediated runs pass `--approve`: tools contributed by global
  extensions (browser, gmail) will run auto-approved, a broader posture than a
  prompting terminal session. This mirrors the existing treatment of built-in
  tools and skills; if the Navigator wants provider-models-only without
  extension tools, Pi's `--tools` allowlist is the available instrument, at the
  cost of maintaining a tool list.
- Entry resolution must fail visibly per extension (skip-and-report), never
  abort the invocation for one unresolvable package.

## Implementation Outcome (2026-09-21)

`src-tauri/src/pi_global_extensions.rs` resolves the global set:
`settings.json#packages` (`npm:` sources only) through each package's
`package.json#pi.extensions` declaration, plus `~/.pi/agent/extensions/`
files and directories (directory entries via `pi.extensions` or
`index.ts|js`). Every unresolvable item — unsupported sources, missing
packages, undeclared manifests, skill-shaped directories such as the
user's `librarian` — is skipped with a note, never aborting the
invocation. The `mirror-logger` refusal guards both by package name and
by resolved entry path.

The mirror-mediated invocation keeps `--no-extensions` and appends
`--extension <entry>` per resolved item; skip notes surface as stderr
warnings (visible in diagnostics, not banner-owning under CR069). The
conversation-title suggestion call receives the same curated entries,
since it inherits the user's `--model` and would otherwise fail on
extension-provided models.

## Validation

- Five red-then-green unit tests cover npm resolution, writer refusal by
  name and by path, skip-and-report of unresolvable material, user
  extension files/directories, and the empty case.
- Full Rust suite: 167 passed. Full frontend suite: 926 passed.
  TypeScript/Vite build passed; roadmap `READY`; whitespace clean.
- Manual DEV homologation pending: a `claude-bridge/claude-opus-5` send
  must now execute end-to-end.

## Relationship

Supersedes the permanent framing of CR071's indicator; the
[embedded TS runtime direction](../../explorations/embedded-ts-runtime-full-control/index.md)
remains the long-term dissolution. CR053/CR054 continue unaffected.
