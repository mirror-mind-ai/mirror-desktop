# Exploration: A Lean Anthropic Provider

**Status:** open · opened by the Navigator 2026-11-02 · Journey `mirror-desktop`

## Question

[CR173](../../refinement/rs026-after-the-0-3-cutover/cr173-make-anthropic-access-the-desktops-own-provider.md)
makes Anthropic access the Desktop's own, through a pinned fork of `pi-claude-bridge`. This
exploration asks the next question: should the Desktop replace the fork with a provider written for
its own needs, and if so, how small can it be?

## What the bridge is

`pi-claude-bridge` 0.9.3 (Eli Dickinson, MIT): ~4,700 lines of TypeScript, 2,733 of them in
`index.ts`. It registers Pi provider `claude-bridge`, which runs Claude Code itself as a child through
`@anthropic-ai/claude-agent-sdk` (0.3.306; binary ~271 MB per platform), under the person's Claude
login. Pi keeps executing the tools; the bridge exposes them to Claude over an in-process MCP server and
runs Claude with `tools: []`. It also carries the AskClaude tool, Claude-side session resumption and
rebuild, compaction sync, prompt capture, long-context plans, rate-limit and usage reporting.

A nested runtime inside a runtime: it explains CR167 (the person's hooks in the turn), CR080
(compaction could not resolve the provider), part of CR159 (refusals visible only in a transcript) and
the two session stores the Desktop reconciles.

## Hypothesis

A minimal provider over the same SDK (stream, tool mapping through MCP, `tools: []`, no CLAUDE.md, no
hooks, no persisted Claude session; Pi's session as the only history) fits in roughly 600 to 800
lines, because the Desktop already owns resumption, compaction and settlement. The gain would be
legibility and ownership, **not a change of nature**: it stays bound to the Claude Code binary and to
the nested model. That is the honest boundary of this exploration.

## What to measure before deciding

- **Prompt cache:** hit rate across a 20-turn conversation, fork versus lean provider. The bridge's
  resumption exists largely to keep the cache warm; dropping it may cost more than it saves.
- **Latency:** time to first token, cold and warm.
- **Refusals and limits:** that rate-limit, usage and refusal messages still reach the Desktop
  (CR159).
- **Size of what is dropped:** which of the bridge's behaviours the Desktop actually exercises
  (`CLAUDE_BRIDGE_DEBUG` logs from a week of real use).

## Out of scope

- Request rewriting that presents the Desktop as another client (`pi-cc-patch` and similar); see
  CR173's decision.
- Any Core change.
