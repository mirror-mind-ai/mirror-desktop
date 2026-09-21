[< RS020](index.md)

# CR068: Accept the Frictionless Conversation Through Release-Shaped Validation

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Previous acceptances homologated single turns or isolated repairs; both CR063 false positives were discovered by the Navigator in ordinary multi-turn use after acceptance. RS020 must not close on component evidence.

## Expected Behavior

Release-shaped validation of the essential journey on the RS020 line:

1. full automated gates: CR064 contract, complete frontend suite, Rust suites for Stable and Eval feature sets, build, roadmap consistency, whitespace;
2. an Eval candidate built and atomically installed without launching, Stable closed;
3. Navigator homologation in Eval on production data: five consecutive turns in the `mirror-desktop` Conversation with zero synchronization notices, navigation away and back, application restart with clean rehydration, and one controlled append-failure recovery in an isolated fixture (not production);
4. durable evidence recorded: journal, outbox and Mirror agreement for every homologated turn, executable hashes and artifact paths.

## Acceptance Horizon

- All four steps recorded with evidence in this document.
- Any friction observed during homologation reopens the responsible CR; CR068 cannot absorb fixes.
- RS020 closure, push, merge, Alpha.14 packaging, publication and Stable promotion remain separate Navigator decisions after acceptance.

## Boundaries

Production data is read-only during homologation except ordinary conversation use. Failure injection happens only in isolated fixtures. No provider or model substitution.
