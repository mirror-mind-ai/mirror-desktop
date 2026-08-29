[< Story](index.md)

# Incident — Production Mirror Checkout Drift

**Status:** contained, corrective work captured
**Refinement source:** `RS013 / CR029 — Protect production Mirror checkout from Harness development`

## What Happened

During Nautilus Harness implementation and troubleshooting, agents used `/Users/alissonvale/mirror` as both the stable runtime dependency and a source-development workspace. Four Nautilus-related experimental commits entered the local `stable` branch without passing through an isolated Mirror Dev checkout, Mirror CI, release notes or the official release/promotion path:

```text
4dc74c5 Prevent Harness turns from escaping selected Journey authority
a2068df Keep Pi support modules outside extension autoload
e7fa03c Make dedicated Harness turn recording idempotent
3699558 Repair Nautilus Mirror commit after runtime session drift
```

Two additional local commits represented older forms of Journey-administration changes that later arrived through the official release lineage. The local production branch reached `ahead 6, behind 12` relative to `origin/stable`.

## Impact

No data deletion was found. The incident nevertheless created material risk:

- unreviewed Nautilus-specific coupling entered the Mirror core;
- one patch broke Pi extension startup and required a follow-up repair;
- correlated logging changes did not satisfy repository formatting gates;
- runtime-session authority became more permissive before root cause closure;
- the production checkout could no longer receive the released stable line cleanly;
- DS-011 appeared isolated at runtime while authorship and promotion remained unguarded.

## Root Cause

The operating model confused dependency execution with modification authority. Stable Harness legitimately executes the released Mirror checkout, but that relationship was treated as permission to patch the dependency during consumer troubleshooting. Existing DS-011 gates covered bundle identity, app data, database and process coordinates, but not the Git checkout, authoring channel or release path.

## Containment

The divergent line was preserved locally at:

```text
incident/nautilus-stable-drift-2026-08-29
```

The production `stable` branch was then restored to the published `origin/stable` release:

```text
7a88a4e Prepare v0.31.12 bounded authority release
Mirror 0.31.12
```

No suspect commit was pushed or silently transplanted. The incident branch is evidence only and is not a release candidate.

## Corrective Boundary

- `$HOME/mirror` is a production runtime dependency and may be inspected or executed, not developed in.
- `$HOME/.mirror-journeys/mirror-mind/mirror-dev`, the checkout associated with Journey `mirror-dev`, is the only normal Mirror source-development workspace for Harness dependencies.
- Mirror changes require Mirror-owned tests, formatting, CI, release notes and release promotion.
- Production receives Mirror changes only through the runtime updater.
- Harness promotion authority never implies Mirror source, commit, push or release authority.
- DS-011 validation now includes production-checkout non-mutation and authorship/promotion isolation.

## Remaining Work

`CR029` owns durable process and tooling guardrails. [The Mirror Dev handoff](../cv-002-mirror-integration/ds-005-explicit-conversation-append-boundary/mirror-dev-handoff.md) classifies the four incident commits instead of treating them as one patch to replay. `e7fa03c` and `3699558` become a generic Mirror append boundary; `4dc74c5` and `a2068df` remain evidence for a separate Harness-owned Journey authority guardrail. No incident commit may be cherry-picked. The Mirror capability must pass the separated Mirror Dev and release lifecycle before Harness consumes it in production.
