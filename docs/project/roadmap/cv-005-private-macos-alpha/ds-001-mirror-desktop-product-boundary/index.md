[< CV-005](../index.md)

# CV-005.DS-001 - Mirror Desktop Product Boundary

**Status:** 🟡 Planned

## Outcome

The application presents itself externally as Mirror Desktop and uses deliberate new-product coordinates, while every inherited Nautilus name is classified before change as product identity, generic Mirror-owned capability, genuine Nautilus method semantics or legacy compatibility state.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-005.DS-001.TS-1 | Namespace and Durable-State Inventory | Technical Story | Every inherited Nautilus identifier is classified with an explicit rename, retain or migrate decision before implementation changes begin | 🟡 Planned |
| CV-005.DS-001.US-1 | Recognize Mirror Desktop | User Story | Window, navigation, conversation states, settings, diagnostics, icons and user-facing guidance consistently identify the application as Mirror Desktop | 🟡 Planned |
| CV-005.DS-001.TS-2 | Parallel Product and Channel Identity | Technical Story | User and development builds use new Mirror Desktop bundle, app-data and channel identities without overwriting the installed Nautilus Harness application or its data | 🟡 Planned |
| CV-005.DS-001.TS-3 | Legacy Identity Compatibility Boundary | Technical Story | New state adopts approved Mirror Desktop coordinates while required Nautilus records, projection namespaces and method semantics remain readable and explicitly bounded | 🟡 Planned |

## Inventory Contract

The inventory must classify at least:

- Tauri product names, window titles, bundle identifiers and app-data roots;
- package, Cargo, command, event and diagnostic names;
- icons, sidebar labels, empty states, settings copy and documentation;
- Pi prompt authority labels and new conversation display names;
- persisted thread files, generations, receipts, source interfaces and schema values;
- Pi session IDs, Mirror conversation labels and correlation environment keys;
- Nautilus Tactical and Strategic projection namespaces and explicit synthesis intents.

Each coordinate receives one disposition: rename for product identity, genericize as Mirror-owned capability, retain as Nautilus method semantics, or preserve behind an explicit legacy compatibility reader.

## Done Condition

This Delivery Story is done when the inventory is reviewable and complete for all production code paths; every external application surface names Mirror Desktop; new user and development builds have distinct Mirror Desktop identities; the existing Nautilus Harness bundle and app data are not overwritten; method-owned Nautilus projections and synthesis behavior remain correctly named; new and legacy state behavior is covered by deterministic tests; and no global search-and-replace was used as a substitute for classification.

## Boundary

This story does not make the runtime portable, publish a bundle or migrate another user's app data. It establishes the product boundary and the compatibility rules that later stories consume.
