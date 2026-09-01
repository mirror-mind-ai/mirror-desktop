# Nautilus Harness App Principles

**Status:** scoped
**Roadmap source:** DS-003.US-1

## Harness is a body, not a projection

Nautilus Harness is the dedicated desktop application body of Nautilus. It is not a validation script, not a protocol viewer, and not a Mirror skill with a different skin.

The Harness makes Nautilus inhabitable. Method gives meaning, Protocol gives formal portability, Mirror Extension gives reference integration, and Harness gives the user a place to work with the grammar as an application.

## The app reveals the current chamber

The Harness should grow by vertical semantic chambers. A screen should not expose the whole future ontology before the current chamber can be used clearly.

DS-001 gave the app identity. DS-002 gave it Mission formulation. The first real app slice should show identity and a formulated Mission without pretending to execute work.

## Protocol is source, app is experience

The Harness should read Nautilus protocol fixtures or documents as formal source. It may validate, interpret and present them, but it should not create a parallel ontology hidden in UI state.

The app owns experience. The protocol owns portable structure.

## TypeScript owns app and domain logic

Nautilus app logic belongs in TypeScript. Protocol parsing, validation, view models and app state should be implemented in TypeScript.

Tauri may use Rust for the desktop shell, filesystem bridge and native packaging boundary, but Rust should not become the domain layer.

## Desktop compatibility is a product constraint

The Harness must remain compatible with desktop use on Linux, macOS and Windows. Platform-specific features should be treated as optional until the core experience works across all three.

## State starts modestly

The first app body may read local fixtures and keep ephemeral UI state. Persistent operational Nautilus state is out of scope until a later chamber defines what persistence means.

## Errors are part of the surface

If a fixture is invalid, the Harness should show the error clearly. A broken protocol document is not only a developer problem. It is part of the app's current relationship with the grammar.

## Desktop validation is proportional

Desktop E2E smoke is reserved for behavior that crosses a real desktop boundary and cannot be established through deterministic domain, native, persistence or integration evidence. It is not a default ceremony for every feature or story.

When desktop interaction is necessary, related scenarios should be batched into the shortest useful session. The Driver states the expected duration and whether mouse, keyboard or screenshots will occupy the Navigator's computer before starting. Durable state, logs and native inspection are preferred over screenshots unless the visible surface itself is the acceptance evidence.

## Scripts are support, not product

CLI scripts may remain useful for validation, migration and developer checks. They are not sufficient as the Harness body.

A script can prove a rule. The Harness must let the user inhabit it.
