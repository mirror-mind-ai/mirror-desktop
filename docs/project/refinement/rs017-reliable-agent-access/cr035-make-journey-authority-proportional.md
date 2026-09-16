[< RS017](index.md)

# CR035 — Make Journey Authority Proportional to the Operation

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Mirror Desktop currently tells the agent to stop when any loaded context resolves to a Journey different from the selected one. This converts transferred files, historical metadata and legitimate cross-Journey material into authority violations even though Mirror Core does not treat Journey selection as a general filesystem or knowledge perimeter.

## Expected Behavior

The selected Journey remains authoritative for turn destination, context, run correlation, persistence and implicit references such as “this Journey”. Relevant material may originate elsewhere. Only administrative Mirror mutation or destination changes require explicit exact-target authority.

## Impact

The agent can work with real transferred and cross-project material without silently redirecting the conversation or weakening persistence safety.

## Plan Or Decision

Planning pending. Expected scope includes the Desktop runtime prompt, cross-Journey intent tests and inspection of correlated command guards in the `mirror-dev` checkout. Production `~/mirror` remains read-only.

## Evidence

The `flip-podcast` Journey repeatedly stopped because inherited podcast artifacts still declared `nautilus-agentic-method`, even though those files were the intended work material.

## Outcome

Captured without selection, assignment or implementation authority.
