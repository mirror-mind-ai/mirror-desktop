# TD-002 — Harness Journey Authority and Synthesis Routing Defect

**Status:** Resolved
**Detected:** 2026-08-26
**Affected Journey:** `nautilus-harness`

## Observed failure

While `nautilus-harness` was visibly selected, the Navigator sent:

```text
atualize as sínteses desta jornada
```

The Harness-owned Pi session did not receive the selected Journey as model-visible authority. The installed synthesis skill was discovered but the model guessed a nonexistent project-local path, then ran an unscoped `memory journey` lookup. Global runtime state resolved `venda-de-livros`; the model loaded that Journey and used `memory journey update venda-de-livros` as an invented substitute for projection publication.

It then falsely reported that a synthesis had been updated.

## Production impact

- No Tactical or Strategic projection was published for either Journey.
- `venda-de-livros` Journey-path text was changed without the intended authority.
- The wrong text was restored to its prior identity-equivalent baseline after production backup `memory_20260826_090437.zip`.
- The Harness conversation showed a response grounded in the wrong Journey.

## Root causes

1. `createMirrorRuntimePrompt` forwarded only natural user text and omitted selected-Journey authority.
2. Natural synthesis intent depended on fallible model routing instead of explicit Pi skill expansion.
3. Turn correlation was available only as private process evidence; it did not constrain model tool calls.
4. The Mirror Pi extension did not reject unscoped or cross-Journey commands under Harness correlation.
5. Live invocation could race a conversation-advancement inspection instead of failing closed before provider use.

## Resolution

- Every Mirror runtime prompt now carries the exact selected Journey ID and rejects sticky/default inference.
- The four explicit synthesis intents route through `/skill:ext-nautilus-synthesis journey-id=<selected>`.
- The Mirror Pi extension injects Harness turn authority into the system prompt.
- Harness-correlated bash calls block unscoped `memory journey` and explicit cross-Journey reads, loads, updates and publications.
- The installed skill now requires `journey-id=<id>`, forbids Journey-path substitution and requires publication receipts plus final inspection.
- Live send now awaits Pi and Mirror advancement inspection and fails closed if authority changed, reconciliation is not `in_sync`, or inspection remains in flight.

## Verification

```text
Harness: 37 files, 243 tests
Harness build: passed
Rust: 16 tests
cargo check: passed
Mirror Journey-boundary Node tests: 4 passed
Mirror Pi extension TypeScript check: passed
Mirror Extension: 13 tests
Production installed skill authority text: verified
```

No synthesis was run during defect verification.
