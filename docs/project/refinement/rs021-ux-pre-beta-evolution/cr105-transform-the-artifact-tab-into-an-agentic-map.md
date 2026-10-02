[< RS021](index.md)

# CR105: Transform the Artifact Tab into the Context Surface

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr105-agentic-map`

## Friction / Opportunity

The Artifact tab is a file-oriented surface. The desired surface is an Agentic Map: a navigable map
of the agent's working field rather than a passive list of artifacts.

## Outcome

The Artifact tab becomes an Agentic Map that helps the Navigator orient within the Journey's
agent-relevant material, understand relationships and provenance, and move intentionally to a
source or artifact without pretending that generated structure is authoritative when it is not.

## First Investigation

This is an exploratory product change, not a UI rename. First render and inventory the current
Artifact tab's sources, hierarchy, document/artifact distinction, provenance, actions and empty
states. Then define what "map" means in observable user decisions before selecting an information
architecture or implementation.

## Acceptance

- The Navigator can orient to the relevant working material faster than with the current tab.
- Every mapped item retains an honest source, path or provenance and a bounded action.
- Generated relationships, summaries or agent interpretations are visibly distinguished from
  filesystem/Journey authority.
- The map remains useful with no artifacts, deeply nested material and externally referenced files.
- Existing artifact opening, reveal and safety boundaries continue to work.

## Boundaries

No autonomous file modification, no implicit indexing beyond existing authority, no claim that the
map is a complete representation of the Journey, and no implementation before an explicit Explorer
or Builder handoff establishes the map's user decisions.

## Exploration Outcome (2026-10-01)

The Explorer handoff that establishes the map's user decisions exists at
[docs/project/explorations/cr105-agentic-map-of-admitted-context/](../../explorations/cr105-agentic-map-of-admitted-context/index.md).
It resolves "map" as **a partial view of what effectively entered the agent's context**, not a
representation of the Journey. The complete artifact tree stays as quiet relief; items the agent
evidently read gain presence; every contextual item states how it entered.

Measured constraints that bound the first slice:

- The Journey briefing is not injected into Desktop turns. It is shown as available through
  Mirror with admission not evidenced.
- File reads are evidenced only by `read` tool calls. Shell reads are not detected and the surface
  must say so.
- Attachments are references until a matching `read` exists.
- The compaction boundary (`firstKeptEntryId`) separates "seen in this Conversation" from
  "present now".

Implementation guidance, evidence inventory, slice plan and test plan are in
[builder-orientation.md](../../explorations/cr105-agentic-map-of-admitted-context/builder-orientation.md).

## Pull (2026-10-01)

Pulled by explicit Navigator intent. Implementation covers slices 1 and 2 of the handoff plan,
confirmed by the Navigator together with both open design questions:

- **Delivery slice: 1 and 2 together.** Slice 1 alone marks files on the tree with no contextual
  region beside them, and in that state the markers read as file status rather than perception —
  the exact misreading the CR exists to prevent. The contextual region is what teaches the
  markers' meaning, so the two ship as one.
- **Briefing ships in the first delivery**, in its honest `available, not evidenced` state. A
  visible region that declares its own limit teaches the boundary; an absent one teaches nothing.
- **Turn label after compaction follows the presence claim.** A read at or after the retained tail
  is named by its turn. A read before it is named by the chapter that closed over it, because the
  turn itself is no longer carried and pointing at it would contradict the marker beside it.

## Implementation (2026-10-01)

**Derivation.** `src/domain/admittedContext.ts` derives admission from the active branch of the
Pi session inspection and stores nothing. A path is admitted only by a `read` tool call joined to
its `toolResult` by `toolCallId` with `isError !== true`; a call with no result is an attempt, not
a perception. Shell reads are not parsed, by design, and the surface states that permanently.
Attachments stay `referenced` until a successful read at or after the turn that attached them.
Instruction envelopes are reported in four classes, with `raw` kept distinct from `unknown` so an
ordinary unheaded turn does not look suspicious. The briefing is always
`available_not_evidenced`, because Pi is launched with `--no-context-files` and nothing durable
records the agent loading it.

**Surface.** `src/app/AgenticMapField.tsx` adds the header, the agent's field region with the four
territories, the presence legend, the admission panel and the four contextual pages.
`JourneyDocumentationBrowser` composes them over the existing tree and preview, which were
extended rather than replaced: navigation intents, context menu, reveal, lazy folder loading and
path safety are untouched. Folders carry no roll-up — "3 of 12 seen" would read as coverage.

**Presence legibility.** Shape carries the state: `○` available, `●` seen in this Conversation,
`◉` present now, each with a text alternative. Colour is a lightness ramp rather than three hues,
so it cannot collide with the Navigator-chosen accent the way CR102 and CR106 found hues do.
Measured against the Artifacts panel's worst (tinted) end over `#0b0d0e`:

| Marker | Token | Contrast | ΔE to neighbour |
|---|---|---|---|
| available | `#8a9ba1` | 5.98:1 | 16.5 to seen |
| seen in this Conversation | `#b9c7cc` | 9.94:1 | 16.1 to present |
| present now | `#e8f4f8` | 15.37:1 | 32.7 across the ramp |

The measurements are enforced from the shipped stylesheet by
`src/tests/agenticMapLegibility.test.ts`, and `@media (forced-colors: active)` hands the palette
back to the system because the glyph already distinguishes the states.

**Honest degradation.** With no active Conversation or an unreadable session, the field region says
`Admission evidence unavailable` with the reason and the workspace below keeps working unchanged.
With no compaction, seen and present coincide and the surface says so instead of presenting a
distinction it cannot derive.

**Known limits, stated rather than hidden.** The map under-reports: in a sampled production session
`bash` was used 1969 times against 228 `read` calls, so many real reads are invisible here.
Admission is derived once per session authority from the branch already inspected for the
Conversation surface; a very long session pays that read once when the tab's authority changes.

## Gates (2026-10-01)

- `npm test`: 210 files, 1422 tests, all passing, including 17 derivation tests, 14 surface tests
  and 6 legibility measurements added by this CR.
- `npx tsc --noEmit`: clean.
- `cargo test` in `src-tauri`: 231 passed, 3 ignored. No Rust change was needed.
- `npm run roadmap:check`: READY.

## Navigator Validation (2026-10-01)

Run on the development channel against the `builder-mode-evolution` Journey, whose active
generation is the only dev Conversation carrying a compaction (43 entries, retained tail
`f5b3d2aa` at message 27, six successful reads either side of it). Predictions were derived from
the session file before the walkthrough, so a mismatch would have been a finding.

| Step | Subject | Result |
|---|---|---|
| 1 | Counts and markers under compaction | Validated. Predicted 2 present now, 3 more seen, 1 of 5 reads outside the workspace, four markers on the tree |
| 2 | Admission panel and chapter label | Validated. `Read during chapter “Understand and continue the \`builder-mode-evolution\` Journey, especially CV20 Builder Mode Evolution, current DS12 hand…”` |
| 3 | Artifact with no evidence | Validated |
| 4 | Conversation with no compaction | Validated |
| 5 | The four territories | Validated |
| 6 | Attachment: referenced against read | Validated, with two images attached and only one read |
| 7 | Light theme and contrast | **Failed.** Several labels unreadable on the light families |

### Defect found at step 7, and repaired

The presence ramp was built and measured on the dark shell only, and two mistakes followed from
that. The ramp was ported to the light families unchanged, so its strongest rung — present now,
`#e8f4f8` — sat one step from a white surface. And the ramp was being used as a text palette, so
the territory names, the counts, the source names and the admission panel values inherited it and
vanished on Daylight.

Both are now separated. `--presence-*` colours markers and the presence word; `--map-text*`
colours reading, and on the light families it follows each theme's own `--light-text` and
`--light-muted`. The ramp inverts rather than tinting, because evidence accumulates as light on a
dark field and as ink on a light one.

Light ramp, measured across all three light families at both ends of the panel gradient, worst
case Parchment's raised end `#f4eddc`:

| Marker | Token | Worst contrast | ΔE to neighbour |
|---|---|---|---|
| available | `#596577` | 5.06:1 | 16.4 to seen |
| seen in this Conversation | `#333f4d` | 7.73:1 | 20.0 to present |
| present now | `#0d1420` | 15.21:1 | 36.3 across the ramp |

`src/tests/agenticMapLegibility.test.ts` now measures both registers from the shipped stylesheet,
asserts the ramp runs towards emphasis in each direction, and fails if any rule outside a
`data-presence` selector borrows the ramp for text.

### Naming, by Navigator decision

- The Operational tab is **Agent’s Field**, not Artifacts. The surface stopped being a list of
  files. The surface id stays `artifacts` because it is persisted selection state, not a label.
- The header reads **Agentic Field**, not Agentic Map.
- The two cards no longer repeat the tab name. The left card is **Context territories** above
  **Workspace structure**; the detail card is **Context detail**.

### Second failure at step 7: the repair did not reach the element

The Navigator reported the contrast unchanged after the token repair, and they were right. The
tokens were correct and the declarations measured well; the colour never arrived.

Measuring computed styles in a browser, against the real stylesheet and the component's real
markup, found the territory names computing to `rgb(255, 255, 255)` while `--map-text` resolved
to `#1f2937` on the same element and the rest of the rule applied. The cause is a light-family
catch-all:

```css
.app-shell:is(…) :where(button:not(… opt-out list …)) { color: #ffffff; }
```

White ink is right for a filled button, and the list names every transparent text button that
opts out. The territory rows were not on it, and at `(0,2,0)` the catch-all outranks
`.agentic-map-territory button` at `(0,1,1)`. The names were painted white on white; their counts,
which are spans rather than buttons, stayed readable. That is exactly the pattern in the
Navigator's screenshot.

The same mechanism hit the admission labels through a bare `dt` in a `:where(…)` list. One extra
step of specificity fixes those without touching the house contract for `dt` elsewhere.

### Measured after the repair

Computed colours for every text and marker element of the surface, across four themes (Daylight,
Mist, Parchment, Tide) and three states (territory list, artifact detail, Sources page), against
both ends of the panel gradient: **12 pages, 45 element readings, none below 4.5:1**. Secondary
text in the light families was additionally pulled 15% towards the family's own text colour,
because the raw `--light-muted` lands at 4.44:1 on the raised end and this text is small.

### What the tests were missing

The legibility test measured tokens. A token test proves a colour is legible; it cannot prove the
colour reaches the element, and the whole defect lived in that gap. Two cascade tests now guard
it: every button the surface introduces must appear in the light catch-all's opt-out list. Both
were confirmed to fail when the opt-out entry is removed.

### Known, pre-existing, out of scope

`.operational-artifacts-section-label` renders at 4.44:1 against the panel's raised end in
Daylight. It is shared with surfaces outside CR105 and predates this work, so it is reported here
rather than changed. Raising `--light-muted` across the three light families is a candidate for a
separate CR.

### Remaining

Navigator re-check of step 7 in the running app.

## Gates (re-run 2026-10-01)

- `npm test`: 210 files, 1429 tests, all passing.
- `npx tsc --noEmit`: clean.
- `cargo test`: unchanged, no Rust touched since the previous run.

## Naming Retirement (2026-10-01)

The Navigator reported that the surface works and then declined to validate it, because seeing it
working showed that the name and the framing came from the wrong place. Agentic Field and Human
Territory are Nautilus method vocabulary. The product had borrowed both while the surface was being
designed, which made the tab announce a concept broader than anything one tab can hold.

Both terms go back to the method. The visible copy now reads:

| Before | After |
| --- | --- |
| Tab label `Agent's Field` | `Context` |
| Panel heading `Agentic Field` | `Context` |
| Section label `Context territories` | `Admitted context` |
| Section label `Context detail` | `Admission detail` |

Admission stays, because the admission grammar is this product's own vocabulary rather than the
method's. The surface still shows what effectively entered the agent's context, and the honest
limits already shipped are unchanged: the shell blind spot is still stated permanently, and the
briefing is still shown as available rather than evidenced.

A regression test in `src/tests/operationalJourneyWorkspace.test.tsx` renders the switcher and
asserts that neither `Field` nor `Territor` appears in the visible copy, in either case, so the
retired vocabulary cannot drift back in.

### Deliberately unchanged

Internal identifiers keep the old names: the component file `AgenticMapField.tsx`, the
`agentic-map-*` CSS classes, the `AgenticMapTerritory` type, the test file names, this document's
file slug, and the branch `refinement/rs021-cr105-agentic-map`. None of them is user-visible, the
cascade tests added for step 7 bind to the `agentic-map-territory` selector, and renaming roughly a
hundred occurrences across a component, a stylesheet and three test files would bury a label change
inside mechanical churn. Internal renaming is a separate, reviewable change if it is wanted at all.

The surface id stays `artifacts`, which was already decided: it is persisted selection state, not a
label.

## Gates (rename 2026-10-01)

- `npm test`: 210 files, 1430 tests, all passing. One test more than the previous run, the new
  retired-vocabulary regression test.
- `npx tsc --noEmit`: clean.
- `cargo test`: not re-run, no Rust touched by the rename.


## Closure (2026-10-01)

The Navigator explicitly closed CR105 after authorising its integration into `main` and the
subsequent separation of CR112 for the Journey-declared Workflow surface. The first
walkthrough established that the admission surface worked, then showed that its original framing
was conceptually wrong for the product. The later naming retirement resolves that framing without
changing what the surface evidences.

The historical "Naming, by Navigator decision" section above records the labels at the time of the
step-7 validation. It is evidence, not current copy. The later Naming Retirement section is the
current authority: the tab and heading read `Context`, and the visible vocabulary contains neither
Field nor Territory.

The remaining re-check under the historical step-7 section is therefore closed as part of this
Navigator decision. Its technical evidence remains: the post-repair browser measurement covered
12 pages, 45 readings and four themes, with none below 4.5:1; the subsequent Context rename ran
`npm test` with 210 files and 1430 tests green and `npx tsc --noEmit` clean. The separately
reported 4.44:1 shared section-label issue remains outside this CR.

CR112 is the follow-on work. It does not extend this surface into a generic map. It gives a
Journey-owned workflow declaration a separate Workflow tab, leaving Context to state only what
effectively entered the agent's active Conversation.
