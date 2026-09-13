[< Parent](../index.md)

# CV-007.DS-004.TS-1 - Authoritative Release Reading Contract

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

Release staging derives one bounded versioned reading from the canonical release-note source and carries it as additive updater metadata that Mirror Desktop can validate against the exact offered release.

## Scope

- Define the `ReleaseReading` envelope and parser.
- Extract title, digest, highlights, complete Markdown body, canonical URL and body SHA-256 deterministically from `docs/releases/vX.Y.Z.md`.
- Include the envelope in every staged updater manifest without removing existing Tauri fields.
- Validate product, version, URLs, hashes and field bounds in the application.
- Preserve compatibility with historical manifests lacking the envelope.

## Acceptance Behavior

```text
Given a canonical versioned release note
When release staging creates updater manifests
Then every manifest carries a bounded ReleaseReading for that same version
And application parsing accepts only internally consistent content
And existing Tauri updater clients remain compatible
```

## Out Of Scope

- LLM summarization, remote fetching, release publication, updater signing changes and UI composition.

## Validation

Focused release tooling and domain parser tests, staged-manifest inspection, full release-tooling regression and aggregate Delivery Story validation.
