[< RS016](index.md)

# CR072: Load Navigator-Approved Provider Extensions Explicitly

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Expected Behavior

- Desktop agent settings gain a Navigator-approved extension allowlist:
  explicit package identities resolved to their declared entry files. Default
  is empty; approval is an explicit per-package Navigator decision recorded in
  settings.
- The mirror-mediated invocation keeps `--no-extensions` and appends one
  `--extension <entry>` per approved package. Discovery stays disabled;
  project-local extensions stay excluded; `mirror-logger` is never eligible
  (it is a conversation writer — the invariant this contract exists for).
- Catalog and invocation agree: models provided by approved extensions are
  offered as runnable; models from non-approved extensions surface through
  CR071's unavailable indicator with the reason, now truthfully transitional
  ("not approved" rather than "impossible").
- Loading an extension executes third-party code in the Pi process; the
  allowlist consent is the boundary that makes this explicit rather than
  ambient.

## Relationship

Supersedes the permanent framing of CR071's indicator; the
[embedded TS runtime direction](../../explorations/embedded-ts-runtime-full-control/index.md)
remains the long-term dissolution. CR053/CR054 continue unaffected.
