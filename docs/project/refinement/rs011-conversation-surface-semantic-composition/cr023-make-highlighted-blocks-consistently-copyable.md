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

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Canonical refinement status, Driver, and Delivery are owned by the root Workbench
  index.
- This capture does not select focus, approve a plan, assign a Driver, choose Delivery,
  authorize implementation, or authorize push, publication, release, or installation.
- Detection must use semantic rendered structure, not textual command heuristics or
  background-color inspection.
- Inline code does not receive a block copy button.
- Raw copied content must not gain labels, decorations, hidden markers, or unrelated
  neighboring text.
- No clipboard content is persisted or transmitted.

## Proposed Plan

Not planned. Builder assessment and explicit Navigator approval are required before this
CR can move to `planned`.

## Proposed Acceptance

Not yet approved. Acceptance must cover fenced blocks with and without language,
plain-text and wireframe content, live and persisted messages, clipboard success and
failure, keyboard and screen-reader behavior, themes, and non-regression for inline code.
