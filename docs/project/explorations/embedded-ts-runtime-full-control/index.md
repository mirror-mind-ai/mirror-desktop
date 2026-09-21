# Exploration Direction: Embedded TS Runtime, Full Control

**Status:** direction captured, not yet explored
**Captured:** 2026-09-21, by explicit Navigator decision
**Origin:** the `--no-extensions` cost chain surfaced by the silent `claude-bridge` failure (CR070/CR071)

This is a captured direction awaiting a proper Explorer Mode pass. It is not an
Exploratory Story, a product design proposal or implementation scope.

## The Question

Mirror Core is being ported to TypeScript. Would that allow Mirror Desktop to
embed both Mirror and Pi — one bundled Node runtime hosting both as libraries —
and gain full control over the invocation contract?

## Why This Direction Exists

Mirror Desktop today talks to two external CLIs it does not control:

- **Pi** is invoked with `--no-extensions` to guarantee a single conversation
  writer (DS-005 Writer Isolation: the `mirror-logger` extension would otherwise
  persist conversations in parallel with the Desktop outbox) and a deterministic
  runtime when running inside arbitrary project directories. The flag is blunt:
  it also removes provider extensions such as `claude-bridge`, which are not
  writers. That collateral cost stayed invisible until a bridge model silently
  killed a DEV run (CR070's origin), and the Navigator judged the cost high.
- **Mirror** is invoked as an installed Python CLI, with version skew between
  Desktop, Pi and Mirror managed by runbook discipline rather than packaging.

The invariant we actually need is **no second conversation writer** — not
"no extensions". Embedding would let Desktop enforce the invariant precisely:
load provider extensions programmatically, skip persistence extensions, or make
them unnecessary by calling the Mirror persistence API directly with the exact
message identities Desktop already owns.

## Grounding: the `mirror-ts-core` Branch

Verified on 2026-09-21 in `mirror-dev`, branch `origin/mirror-ts-core`
(535 commits ahead of `main`, roadmap `CV22 — TypeScript Core Port`):

- Strategy is a **database-seam strangler**, not a rewrite: the TS core and the
  Python core share one `memory.db`, and Python dissolves one command at a time
  behind a parity net (Python oracle, committed synthetic golden corpora, CI
  parity runs). Dual implementations coexist deliberately, with parity enforced
  per command — the authority question is governed at the seam, not deferred.
- The TS core targets **Node ≥ 24** with built-in `node:sqlite`, **zero runtime
  dependencies**, no build step, and a single driver-seam module. This is an
  unusually favorable shape for embedding: a sidecar needs no native builds and
  no dependency tree.
- TS2 (extension compatibility host) is currently paused on an explicit
  Navigator decision about seventeen extension-reachable capabilities — the
  extension-runtime question is live in CV22 itself.

## What Embedding Would Dissolve

- The `--no-extensions` dilemma and therefore CR071's permanent-unavailability
  framing: provider extensions like `claude-bridge` become loadable; the
  unavailable indicator becomes transitional.
- CLI output parsing for errors: quota, network and model failures arrive as
  structured errors (CR054 and CR053 become presentation work over typed data).
- Version skew: the updater ships Desktop, Pi and Mirror TS as one tested set.
- Part of the append choreography: same-process transactional SQLite writes.

## Hard Boundaries Any Exploration Must Preserve

- **Single conversation writer.** Embedding must not reintroduce a second
  persistence path. Direct API persistence replaces the outbox seam only if it
  keeps exact message identity, idempotency and crash-window recovery.
- **RS020's lessons survive relocation.** The turn journal, monotonic
  publication and the convergence routine address crash windows and replica
  truth, not process boundaries. In-process execution simplifies them; it does
  not delete their reasons.
- **One Mirror authority over one database.** The strangler-with-parity model
  in CV22 is the governing mechanism. Desktop must consume the TS core at
  whatever seam CV22 declares stable, never fork its own Mirror behavior.
- **Multi-harness reality.** Terminal Pi, Gemini CLI, Codex and Claude Code
  keep consuming Mirror. Desktop embedding must not require capabilities that
  drift from the shared contract.

## Open Questions for the Exploration

1. Does pi-mono expose a stable programmatic API suitable for library hosting,
   or is the CLI contract still the stronger coupling surface?
2. Sidecar packaging: Node runtime size, notarization implications, updater
   growth (today's DMG is ~7 MB), and Tauri sidecar lifecycle management.
3. What is the minimum CV22 maturity Desktop should wait for (which commands
   strangled, which seam declared stable) before embedding Mirror TS?
4. Does the extension-runtime decision paused in TS2 change the shape of
   provider-extension loading for an embedded Pi?
5. Interim step worth evaluating: a Desktop-curated extension directory for the
   spawned Pi (providers in, writers out) as a bridge before full embedding.

## Relationship to Open Work

CR070 and CR054 proceed regardless: truthful error surfaces are prerequisites
that embedding would inherit, not replace. CR071's unavailable indicator is the
interim treatment and should link here as its horizon.
