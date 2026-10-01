# Builder Orientation: CR105 Agentic Map of Admitted Context

Written 2026-10-01 for the agent that will implement CR105 after it is pulled. Every code location
below was read in the checkout on that date. Re-verify line numbers before editing; they drift.

All locations were re-verified at pull time on 2026-10-01 against commit `31f1c80`. Two facts were
corrected in the process and are already reflected below: the prompt envelope has **four** values,
not three (`raw` exists for text with no authority header), and transcript entries already expose
`toolName`, `toolCallId`, `isError` and `parentEntryId`, so only the read **path** has to come from
`nativeContent`.

## Before Touching Code

1. Confirm CR105 has been pulled: its status is `in_progress` in
   `docs/project/refinement/rs021-ux-pre-beta-evolution/cr105-transform-the-artifact-tab-into-an-agentic-map.md`
   and in `docs/project/refinement/index.md`. If it is still `captured`, stop and ask.
2. Create the branch `refinement/rs021-cr105-agentic-map` from `main`. Linear history only.
3. Do not touch `docs/project/roadmap/index.md` or `docs/project/roadmap/cv-009-trusted-macos-distribution/`.
   They carry unrelated uncommitted work.
4. Known drift to report, not to fix silently: `docs/project/refinement/index.md` still lists
   CR101, CR102, CR103 and CR106 as `captured` and CR104 as `in_progress`, while the RS021 index
   says all are closed. The top-level index claims authority. Raise this with the Navigator at pull
   time; correcting it is a one-line-per-row change but it is a status mutation.

## Evidence Inventory

What exists, where, and what it proves. Nothing else may be used to claim admission.

| Evidence | Location | Proves | Does not prove |
|---|---|---|---|
| Prompt packet | `createMirrorRuntimePrompt`, `src/agent/piProcessStream.ts` line 71; authority block from line 78 | Authority envelope is injected every turn; attachments are passed as a JSON list of references under `FILE_REFERENCES_MARKER` | That the briefing was injected (it is not); that attachments were read |
| Pi launch flags | `src-tauri/src/main.rs` around lines 7020-7040; provisioning at 555-565 | `--no-context-files`, `--no-extensions` plus explicit global extensions | Any context-file injection |
| Session branch entries | `load_dedicated_pi_transcript` line 4108 and `inspect_dedicated_pi_transcript` line 4123, `src-tauri/src/main.rs`; struct `DedicatedPiTranscriptInspection` line 360; `DedicatedPiTranscriptTurn` line 347; TS mirror in `src/app/journeyThreadStorage.ts` lines 31-80 | Ordered active-branch entries with `nativeContent`, `promptEnvelope`, `chapterClosures`, `unknownPromptEnvelopeCount`, `leafIsCompaction`, `compactionCount` | Anything about entries not on the active branch |
| Tool call blocks | `extractActivityBlocks`, `src/domain/piBackedConversationSurface.ts` line 49; block union at line 45 | `toolCall` blocks with `name` and `arguments`, inside an assistant entry's `nativeContent` | Whether the tool result was error-free unless joined with the `toolResult` entry (see `resultsByToolCallId`, same file, line 236) |
| Transcript entry fields | `DedicatedPiTranscriptEntry`, `src/app/journeyThreadStorage.ts` line 54 | `entryId`, `parentEntryId`, `role`, `promptEnvelope`, `timestamp`, `nativeContent`, `toolCallId`, `toolName`, `isError` | The read path. `toolName` is recorded on the `toolResult` entry, never on the assistant entry |
| `read` tool argument shape | Sampled production session `~/Library/Application Support/ai.mirrormind.desktop/pi-sessions/*.jsonl`; fixture at `src-tauri/src/main.rs` line 11506 | `{"name":"read","arguments":{"path":"<path>"}}` on the assistant entry; `{"role":"toolResult","toolCallId":…,"toolName":"read","isError":false}` on the next | Reads via `bash` (`cat`, `sed`, `grep`): not derivable, must not be inferred |
| Compaction boundary | `PiChapterClosure` struct line 429 and `chapter_closures` at line 4753 (Rust); `src/domain/piBackedConversationSurface.ts` line 29-31 (TS) | `firstKeptEntryId` per compaction | What the model actually retains beyond the kept tail |
| Envelope classification | `project_dedicated_user_text_and_envelope`, `src-tauri/src/main.rs` line 4847 | Four values: `mirror_desktop`, `nautilus_harness`, `unknown` (an unrecognised `[… Journey authority]` header), `raw` (no header at all) | The content of the envelope beyond its class |
| Attachments type | `src/domain/fileAttachments.ts` line 12, `FileAttachment` | Path and metadata the Navigator selected | That the agent opened it |
| Journey briefing text | `journey.description`, declared at `src/domain/journeyRegistry.ts` line 5 and projected at line 65 | What Mirror holds as the briefing | That it entered any turn |
| Workspace tree | `list_journey_documentation_at` line 2730 and `read_journey_document_at` line 2791 (Rust); `src/app/journeyDocumentationStorage.ts` (24 lines, whole bridge) | Files, kinds, preview kinds, sizes, modified times inside the Journey root | Anything about agent perception |
| Context token stats | `read_pi_session_context_stats` line 4090; TS type at `src/agent/piProcessStream.ts` line 579 | Token snapshot and a three-value status only | Entries. Do not use for admission |

## Derivation Rules

Implement these as pure functions in `src/domain/`, tested in isolation before any UI.

1. **Seen set.** For the active branch, collect every `toolCall` block with `name === "read"` and a
   string `arguments.path` from assistant entries' `nativeContent`, then join it to the
   `toolResult` entry with the same `toolCallId` and require `isError !== true`. Resolve the path
   against the Journey root; relative paths appear in fixtures, so resolution must tolerate them. Keep only paths inside the root for
   tree marking; keep outside paths for the Sources page when they match an attachment. Record the
   entry id, turn id and timestamp of the first and last read of each path.
2. **Present-now set.** Take the latest `chapter_closures[].firstKeptEntryId`. A path is present now
   if any of its `read` entries is at or after that entry on the branch. If there is no closure, the
   present-now set equals the seen set and the legend must say so.
3. **Attachment state.** For each attachment in each user entry's prompt packet, state is `read` if
   a `read` call for the same resolved path exists at or after that user entry; otherwise
   `referenced`.
4. **Instruction state.** Group user entries by `promptEnvelope` across all four values. Report
   each class with the count of turns and the first and last turn. `raw` means the turn carried no
   authority header; `unknown` means it carried one Desktop does not recognise, and that is worth
   showing as a distinct, slightly alarming state. Never surface envelope text.
5. **Briefing state.** Always `available_not_evidenced` in this CR. Do not parse `bash` arguments
   for Mirror load commands.
6. **Failed reads.** If the matching `toolResult` has `isError === true`, or no `toolResult` exists
   for the call, the path is not seen. An unanswered `read` is an attempt, not a perception.
7. **Nothing is persisted.** Derivation runs from `inspect_dedicated_pi_transcript` output already
   loaded for the Conversation surface. If that inspection is not loaded for the active Journey,
   load it once; do not add a new Tauri command unless the existing one cannot be reused.

## Slice Plan

**Slice 1, the first pull.** Domain derivation (rules 1, 2, 6, 7) with tests. Presence markers on
file nodes in `JourneyDocumentationSurface`. Header with counts and the shell-read disclaimer.
Admission panel for marked files. Legend. No new pages yet. This slice alone already changes what
the tab is.

**Slice 2.** Agent's field region with the four rows. Instructions page (rule 4). Active
Conversation page using existing chapter data. Sources page (rule 3). Briefing page (rule 5) in its
honest state.

**Slice 3, only after a Navigator walkthrough.** Per-folder roll-ups, write and edit markers, or a
Mirror Core signal for briefing admission. Each is a new CR, not a continuation.

Slices 1 and 2 may ship in one CR if the Navigator agrees at pull time. Slice 3 may not.

## Where to Extend

- `src/app/JourneyDocumentationBrowser.tsx`: the stateful browser (line 107) and the presentational
  `JourneyDocumentationSurface` (line 388). Add presence as a prop map keyed by relative path; do
  not fork the component.
- `src/domain/journeyDocumentation.ts`: tree types. Add nothing about presence here; keep the tree
  ignorant of perception and join at the surface.
- New: `src/domain/admittedContext.ts` for rules 1-6. New: `src/tests/admittedContext.test.ts`.
- `src/styles/app.css`: markers must follow the CR102 approach. Shape first, measured contrast,
  opaque backgrounds where the rail taught us clipping happens.
- `src/tests/journeyDocumentationBrowser.test.tsx`: extend, do not replace.

## Test Plan

Write these before the code they exercise.

- A branch with `read` calls inside and outside the root yields the correct seen set and ignores
  outside paths for the tree.
- A `bash` call whose command contains `cat <path>` yields no seen entry.
- A `read` call with an error result yields no seen entry.
- A `read` call with no matching `toolResult` yields no seen entry.
- A `toolResult` whose `toolName` is `read` but whose call block is absent yields no seen entry,
  because the path lives only on the call.
- Envelope grouping distinguishes `raw` from `unknown`.
- With no chapter closure, present-now equals seen and the legend flag is set.
- With one closure, a read before `firstKeptEntryId` is seen but not present; a read after it is
  both.
- An attachment with no later `read` is `referenced`; with one, it is `read`.
- Envelope grouping reports counts per class without text.
- The surface renders three distinct marker shapes and the disclaimer with an inspection fixture.
- Existing browser tests stay green unchanged.
- Accessibility: markers have text alternatives; shapes remain distinct with `forced-colors`.

## Gates Before Closing

- `npm test`, `npm run lint`, `cargo test` in `src-tauri`, and the repository's existing check
  script, all green.
- Measured contrast for the three markers recorded in the CR document, as CR102 did.
- Navigator validation on a real Conversation with at least one compaction, recorded as evidence
  in the CR document with a screenshot path.
- CR105 document updated to `done` only after validation; RS021 index and top-level refinement
  index updated in the same commit.

## Rules That Must Not Be Broken

- Never mark seen from anything but a `read` tool call with a non-error result.
- Never hide an available file to make the map look focused.
- Never let colour alone carry presence.
- Never show envelope or prompt text.
- Never add persistence, indexes or background scans.
- Never claim the briefing was admitted.
- Never call the map complete, in copy or in code comments.
