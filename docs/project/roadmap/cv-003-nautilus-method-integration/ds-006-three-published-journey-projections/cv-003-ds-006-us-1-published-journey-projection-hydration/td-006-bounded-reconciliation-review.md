# TD-006 - Bounded Reconciliation Review

**Status:** Resolved
**Detected:** 2026-08-26

## Problem

Opening reconciliation for a Mirror conversation with several records expanded the composer row beyond the desktop viewport. Because the application shell is viewport-confined, the reconciliation action fell below the reachable area and the Navigator could not complete reconciliation.

## Resolution

The record list now owns a bounded, keyboard-focusable scroll region. Reconciliation guidance and the explicit action remain outside that region, visible below the records without allowing the composer to consume the whole desktop.

## Validation

```text
Frontend: 39 files, 247 tests passed
Mirror reconciliation component: 4 tests passed
Production build: passed
Rust: 17 tests passed
cargo check: passed
```
