[< RS011 — Conversation surface semantic composition](index.md)

# CR023 — Make highlighted blocks consistently copyable

## Problem

Mirror Desktop renders many agent-emitted commands, plain-text excerpts,
configurations, and wireframes as dark highlighted blocks. Some provide a copy control,
while visually and semantically equivalent blocks do not. The inconsistency makes the
user inspect or manually select content that was clearly presented for reuse.

Inferring copyability from command-like words or CSS background color would be fragile
and would continue diverging across live and persisted rendering paths.

## Expected Behavior

Every agent-emitted Markdown block with code-block semantics offers one consistent copy
control, regardless of whether the fence declares a language. This includes commands,
plain text, configuration, and wireframes. Inline code remains unchanged.

The control copies only the raw block content, excluding language labels, syntax
highlighting markup, visual decoration, and transport markers. It provides accessible
naming, keyboard operation, visible focus, and brief non-disruptive success or failure
feedback.

Equivalent live and persisted Agent Comments must render through the same semantic
contract. Applicability to highlighted content inside System Surfaces and tool outputs
must be assessed explicitly rather than inferred from visual similarity.

## Impact

This CR can be assessed and validated independently from CR021 and CR022, although it
belongs to the same conversation-surface refinement outcome. It may affect Markdown AST
handling, shared block rendering, clipboard integration, live and persisted message
paths, tests, accessibility, and theme styling.

Source exploration:

- [Conversation Surface Semantic Turn Model](../../explorations/conversation-surface-semantic-turn-model/index.md)

## Assessment Questions

- Which rendering paths currently create dark highlighted blocks without the existing
  copy control?
- Is there already one shared code-block component, or do live, persisted, surface, and
  tool renderers diverge?
- Do System Surfaces own separate immutable rendering contracts that should not inherit
  the Agent Comments control automatically?
- Should tool outputs expose copy at the whole-output level, individual code-block level,
  or both?
- How does clipboard failure surface without interrupting the conversation?

## Builder Assessment

`MessageContent` is the shared semantic renderer for live and persisted Agent Comments.
Its parser already emits an explicit `{ type: "code", language?, text }` block for every
triple-backtick fence, including fences without a language. Rendering currently maps that
semantic block directly to `<pre class="message-code-block"><code>…</code></pre>` with no
copy control. Inline backticks follow a separate `InlineToken` path, so block copy can be
added without textual heuristics or risk of decorating inline code.

`MessageCopyAction` already owns the permitted Tauri clipboard write, keyboard-operable
button semantics, visible focus styling, and transient `copied` / `failed` feedback. It can
be reused with code-block-specific English labels rather than introducing another native
boundary or clipboard implementation. The code block needs a semantic wrapper because a
button must be a sibling of `<pre>`, not invalid interactive content inside `<pre>` or
`<code>`. The button body can receive `block.text` directly, which excludes the fence,
language declaration, rendered links, and decoration.

`MessageContent` also renders user messages. The new capability therefore needs an
explicit opt-in from `AgentTurn`, rather than globally making user-authored fences
copyable by accident. Both streaming and restored assistant messages already flow through
`AgentTurn` and the same `MessageContent` call, so no separate live/persisted implementation
or persistence field is required.

Other visually highlighted paths have different semantics and remain outside this CR:

- `ImportedActivity` renders canonical Mirror/Ariad System Surfaces and payloads. Those
  surfaces retain subsystem-specific provenance and transport behavior; visual `<pre>`
  similarity is not authority to add a control.
- `LiveRuntimeActivity` renders whole tool arguments and outputs as operational evidence,
  not parsed agent Markdown. Whole-output or nested-block copy requires a separately
  refined tool-output contract.
- `ArtifactMarkdown` and raw Journey documentation previews belong to the artifact browser,
  not Agent Comments.

This assessment resolves System Surfaces and tool outputs explicitly as excluded rather
than silently unsupported. No clipboard content, copy result, or timer state needs durable
storage.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- The Navigator selected this CR and authorized planning. Planned status does not assign a
  Driver, choose Delivery, authorize implementation, or authorize push, publication,
  release, or installation.
- Detection must use semantic rendered structure, not textual command heuristics or
  background-color inspection.
- Inline code does not receive a block copy button.
- Raw copied content must not gain labels, decorations, hidden markers, or unrelated
  neighboring text.
- No clipboard content is persisted or transmitted.

## Implementation Authorization

The Navigator approved the plan and authorized implementation. Driver is `@alissonvale`;
Delivery is `refinement/rs011-cr023-semantic-code-block-copy`.

## Proposed Plan

1. Add an explicit `copyCodeBlocks` rendering capability to `MessageContent`, disabled by
   default and enabled only by `AgentTurn` for Agent Comments. Keep parsing based solely on
   the existing `MessageBlock.type === "code"` semantic boundary.
2. Introduce a small Agent Comment code-block renderer that places the existing `<pre>` and
   `<code>` markup inside a positioned semantic wrapper and renders exactly one
   `MessageCopyAction` sibling per fenced block.
3. Pass `block.text` unchanged as the clipboard body. Do not include the opening/closing
   fence, optional language declaration, linkification markup, syntax presentation,
   adjacent prose, or any surface transport marker.
4. Reuse `MessageCopyAction` with English labels specific to code blocks, such as `Copy code
   block`, `Code block copied`, and `Copy code block failed; retry`. Preserve the existing
   two-second non-disruptive feedback reset and Tauri clipboard writer.
5. Add wrapper/control styling for dark and light application themes. Keep the button
   visible without obscuring the first code line, preserve horizontal scrolling, expose a
   clear `:focus-visible` state, and avoid overflow on narrow conversation widths.
6. Preserve current rendering for inline code, user-authored content, copy-ready quoted
   drafts, whole-message copy, links, tables, and malformed or ordinary prose.
7. Keep System Surfaces, tool arguments/outputs, artifacts, and Journey documentation out
   of this delivery. Record those exclusions in tests so future visual similarity does not
   silently broaden the semantic contract.
8. Add TDD coverage for fenced blocks with and without language, command/configuration/
   plain-text/wireframe bodies, multiple blocks, empty and multiline content, exact raw
   clipboard body, success/failure labels, keyboard button semantics, inline-code
   non-regression, AgentTurn-only enablement, theme contrast, and narrow-width containment.
9. Run focused message-content, copy-action, AgentTurn, width, and theme suites; then run
   the complete frontend suite, `npm run build`, and `npm run tauri:build:dev`. Validate in
   isolated `Mirror Desktop Dev` that mouse and keyboard copy work for live and restored
   Agent Comments and that success/failure feedback does not move or interrupt the turn.

## Implementation Evidence

Implemented on `refinement/rs011-cr023-semantic-code-block-copy` in commit `d08c1a6`.

- `MessageContent` now exposes an explicit `copyCodeBlocks` capability at the existing
  semantic fenced-code block boundary. It remains disabled by default.
- `AgentTurn` enables that capability for Agent Comments, covering the same live and
  restored assistant rendering path without persistence changes.
- Each enabled fenced block renders one `MessageCopyAction` sibling of its `<pre>` and
  receives `block.text` as the clipboard body. Code-specific English labels preserve the
  existing success/failure feedback and native clipboard boundary.
- Wrapper styling keeps the icon visible above content, preserves horizontal scrolling,
  focus indication, narrow-width containment, and inherited light-theme contrast.
- User messages, inline code, System Surfaces, tool evidence, artifacts, and Journey
  documentation do not opt into the capability.

Automated evidence on 2026-09-11:

- focused MessageContent, MessageCopyAction, AgentTurn, width, theme, and semantic-turn
  suites: 46 tests passed across 6 files;
- complete frontend suite: 673 tests passed across 123 files;
- `npm run build`: passed;
- `npm run tauri:build:dev`: passed, producing `Mirror Desktop Dev`, bundle ID
  `ai.mirrormind.desktop.dev`, version `0.2.0-alpha.3`;
- built Dev executable inode: `161560843`.

## Navigator Validation

On 2026-09-11 the Navigator confirmed the rendered result and successful clipboard
behavior for all three Agent Comment examples: a language-declared shell block, an
unlabelled multiline plain-text block, and a JSON block. The supplied screenshot also
confirmed that inline code remained undecorated and that each fenced block had exactly one
unobstructed control. After reopening the exact isolated Dev executable, the Navigator
confirmed keyboard and restored-turn behavior and accepted the CR.

## Proportionality and Debt Review

The implementation is proportional: one opt-in flag extends the existing semantic
renderer and one existing clipboard component owns all native interaction and feedback.
There is no second parser, clipboard adapter, persistence field, runtime branch, or native
command. Styling is local to the fenced-block wrapper and retains the existing code
scrolling boundary.

No new technical debt is recorded. The explicit default-off capability prevents accidental
scope expansion into user messages, System Surfaces, tool evidence, artifacts, or Journey
documentation. Any future copy behavior for those surfaces requires its own semantic
refinement rather than reuse by visual resemblance.

## Outcome

CR023 is closed as `done` with Driver `@alissonvale` and Delivery
`refinement/rs011-cr023-semantic-code-block-copy`. No push, merge, publication, release, or
installation was performed. All RS011 Change Requests are now done, but RS011 itself
remains `active` pending explicit Navigator authorization to close the Story.

## Proposed Acceptance

- Every fenced Markdown block in an Agent Comment renders exactly one visible copy button,
  whether or not the fence declares a language and regardless of whether the body is a
  command, configuration, plain text, or wireframe.
- Activating the button by pointer or keyboard copies exactly the parsed raw block body.
  Fences, language labels, HTML/link markup, surrounding prose, decorations, and transport
  markers are excluded.
- Equivalent live and restored Agent Comments use the same renderer and behavior without a
  new persistence schema or reconstructed metadata.
- The button has an English accessible name and title, visible keyboard focus, and brief
  truthful `copied` or retryable `failed` feedback without modal UI or conversation
  reflow.
- Multiple fenced blocks each retain independent controls and clipboard bodies. Empty and
  multiline fences remain bounded and truthful.
- Inline code receives no block control. User messages, whole-message copy, copy-ready
  quoted drafts, links, tables, and ordinary or malformed prose preserve their existing
  behavior.
- System Surfaces, tool arguments/outputs, artifact Markdown, and Journey documentation do
  not inherit Agent Comment copy controls in this CR.
- Dark and light themes remain legible; the control does not cover content, and long code
  remains horizontally scrollable within narrow conversation widths.
- Focused tests, the complete frontend suite, production frontend build, and isolated Dev
  validation pass before Navigator acceptance is requested.
- No clipboard content or feedback state is persisted or transmitted, and no new native,
  Mirror-core, updater, release, publication, or installation boundary is introduced.
