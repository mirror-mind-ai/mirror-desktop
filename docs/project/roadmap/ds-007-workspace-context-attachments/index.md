[< Roadmap](../index.md)

# DS-007 — Workspace Context Attachments

**Status:** 🟠 In Progress

---

## Outcome

Navigator can attach any regular file from any disk location to an explicit Harness message through a native picker or drag and drop. Harness projects the selected absolute paths into the dedicated Pi turn, lets Pi decide how each format should be read, preserves bounded image thumbnails in conversation history and makes displayed local paths deliberately clickable.

## Correction Boundary

The original Journey-confined textual snapshot implementation was rejected during Navigator validation. `RS011 / CR026` supersedes that product contract without erasing its implementation evidence. The current capability follows Pi-style path-reference semantics rather than embedding file bytes into the prompt.

## Product Contract

- A paperclip with tooltip `Anexar arquivos` opens a native multi-file picker.
- Dragging files into Harness enters the same pending selection state as the picker and never sends automatically.
- Any regular file from any absolute disk location and format may be selected. Directories are not attachments.
- Pending items show name, absolute path, size and a removable chip/card before Send.
- Decodable images receive a bounded PNG thumbnail. The derived thumbnail persists with the historical message; the original image bytes do not.
- Harness projects absolute paths as a distinct structured section of the explicit Pi turn. Pi and its available tools decide whether and how to read each file.
- Harness does not parse PDFs, archives, office files, audio, video or arbitrary binary content.
- The user message and conversation history retain file references. Thumbnails are omitted from provider prompt serialization.
- Displayed local paths are clickable. Absolute paths are no longer confined to Journey or Harness roots; opening still requires a deliberate click and a currently resolvable path.
- Selection and preview are model-free. No provider runs until Send.
- Dedicated Journey/generation authority, durable turn staging, interruption behavior and Journey-switch/restart clearing remain unchanged.
- Conversation schema `0.7.0` carries path references and thumbnails while accepting attachment-free `0.5.0` and legacy snapshot `0.6.0` records.

## Candidate Stories

| Code | Story | Type | Corrected Outcome | Status |
|------|-------|------|-------------------|--------|
| [DS-007.TS-1](ds-007-ts-1-bounded-context-attachment-contract/index.md) | Attachment Contract | Technical Story | Strict arbitrary-path file references, exact Journey draft ownership and bounded image thumbnails | 🟡 Planned |
| [DS-007.US-1](ds-007-us-1-attach-journey-context/index.md) | Attach Files | User Story | Navigator can select any files through a paperclip or drag and drop without invoking Pi | 🟡 Planned |
| [DS-007.US-2](ds-007-us-2-review-and-remove-pending-context/index.md) | Review and Remove Pending Files | User Story | Pending paths, sizes and image previews are visible and removable before Send | 🟡 Planned |
| [DS-007.TS-2](ds-007-ts-2-confined-native-file-snapshot-boundary/index.md) | Native File Selection and Thumbnail Boundary | Technical Story | Tauri validates regular files, canonicalizes absolute paths and derives bounded image thumbnails | 🟡 Planned |
| [DS-007.TS-3](ds-007-ts-3-dedicated-turn-context-projection/index.md) | Dedicated Turn File Projection | Technical Story | Selected paths are projected once into the explicitly sent dedicated Pi turn | 🟡 Planned |
| [DS-007.US-3](ds-007-us-3-conversation-attachment-provenance/index.md) | Conversation File References | User Story | Historical messages preserve clickable paths and image thumbnails | 🟡 Planned |
| [DS-007.TS-4](ds-007-ts-4-attachment-limits-and-failure-guardrails/index.md) | Attachment Compatibility and Guardrails | Technical Story | Legacy conversations, staging order, interruption and clearing remain safe | 🟡 Planned |

## Done Condition

DS-007 is done when the Navigator validates the real Tauri flow for native multi-file selection, drag and drop, arbitrary formats and locations, removable pending files, image thumbnails, explicit Send, Pi path projection, clickable historical paths and clearing on Journey switch/restart. Automated evidence must cover domain normalization, native inspection, thumbnail bounds, prompt serialization, persistence compatibility and dedicated-turn staging. No selection gesture may invoke a provider, auto-send, mutate files or ingest arbitrary file content into Harness.

## Boundary

This capability passes user-selected path references to Pi. It does not promise that Pi can understand every format, upload file bytes directly through provider-specific multimodal APIs, attach directories recursively, watch files, preserve the original file after it moves, execute a file without a deliberate click, persist pending selections across app restarts or introduce concurrent Journey execution. Clicking a path delegates opening to the operating system's associated application.
