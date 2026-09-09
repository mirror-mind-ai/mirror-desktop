[< Refinement Workbench](../index.md)

# CR010 — Composer Shift+Enter line breaks are not rendered in chat

## Problem

During Mirror Desktop alpha usage, when the Navigator types Shift+Enter in the composer textbox, the input is not understood as a line break by the chat rendering.

## Expected Behavior

a Shift+Enter line break authored in the composer should be preserved and rendered as a visible line break in the chat message.

## Impact

Captured as `manual` refinement work for `mirror-desktop`. Provenance:
not separately recorded.

## Plan Or Decision

Navigator approved the following implementation and validation route:

1. Characterize the composer keyboard behavior, message construction, persistence,
   transcript rendering, and restored-history rendering.
2. Add a failing regression test at the narrowest boundary where authored line breaks
   are lost.
3. Preserve `Enter` as send and `Shift+Enter` as a local newline without introducing a
   Markdown syntax requirement.
4. Ensure user-authored newlines survive send, transcript rendering, Journey switching,
   and app restart through the existing persistence format.
5. Run focused tests, the frontend build, and the relevant repository test suite.
6. Build `Mirror Desktop Dev.app` through `npm run tauri:build:dev` and provide the
   natural Navigator validation route against the isolated development channel.

### Affected Surface

Expected scope is limited to the composer/message rendering path and focused tests. The
exact implementation files will be selected only after characterization identifies the
loss boundary.

### Acceptance Criteria

- `Enter` sends the current message.
- `Shift+Enter` inserts a newline and does not send.
- Sent user messages visibly preserve one or more authored line breaks.
- Journey switching and app restart preserve the same visible line breaks.
- Existing single-line and assistant-message rendering do not regress.
- Validation uses `Mirror Desktop Dev` with bundle identifier
  `ai.mirrormind.desktop.dev` and isolated development app data.

### Validation Route

In a disposable development Journey, author a three-line user message with
`Shift+Enter`, send it, continue the conversation, switch away and back, then close and
reopen Mirror Desktop Dev. Pass requires the same three visible lines throughout. Fail
includes premature send, collapsed whitespace, lost persistence, or any mutation of the
stable application/runtime state.

### Exclusions

- No redesign of Markdown rendering or the composer.
- No production installation, stable-channel execution, updater publication, or release.
- No migration or rewrite of existing conversation records unless characterization
  proves it necessary and the Navigator approves the expanded scope.

### Assignment And Authority

Navigator approved Driver `@alissonvale` and Delivery
`refinement/rs009-cr010-shift-enter-line-breaks`. Local implementation, tests, and a Dev
bundle are authorized. Commit, push, merge, publication, release, and production
promotion remain separately gated.

## Evidence

Characterization found that the composer already preserves internal newline characters,
`Enter` already sends, and `Shift+Enter` already remains a native textarea newline. The
loss occurred in `parseMessageBlocks`, which joined consecutive paragraph lines with a
space before rendering. Conversation persistence stores the resulting user message
content without this rendering normalization.

Implementation adds an explicit paragraph-line-break preservation option to
`MessageContent`, enables it only for user messages, and renders those paragraphs with
`white-space: pre-wrap`. Assistant Markdown retains its existing soft-line behavior.

TDD and build evidence:

- the new focused regression test failed first because `First line\nSecond line\nThird
  line` was returned as one space-joined paragraph;
- focused message, keyboard navigation, and conversation presentation suite: 23 tests
  passed;
- frontend production build passed;
- complete frontend suite: 113 files and 626 tests passed;
- `npm run tauri:build:dev` compiled and produced the isolated development app and DMG;
- verified bundle name `Mirror Desktop Dev`, identifier
  `ai.mirrormind.desktop.dev`, version `0.2.0-alpha.2`, and `x86_64` architecture;
- development DMG SHA-256:
  `412e215c9baab238b7ada345b2c7e842753f1845af21bb41ab7618ecc67089cb`;
- launch smoke failed before the UI opened: the always-registered Tauri updater plugin
  received `plugins.updater: null` because the development overlay has no updater
  configuration. Tauri aborted during its setup hook. The crash is independent from the
  user-message rendering change but blocks the approved Navigator validation route.

Navigator completed the natural Dev-bundle route and reported “Funcionou. Validado.” The
multiline user-message behavior is explicitly accepted. CR010 is `validated`; terminal
closure still requires proportionality and debt review.

## Blocker

Resolved by CR017. The development channel no longer registers the updater plugin, the
rebuilt Dev bundle opened successfully, and the Navigator completed this CR's validation
route without connecting Dev to the alpha/stable updater lane.

## Proportionality And Debt Review

The change is proportional: it adds one opt-in rendering flag at the existing message
parser boundary and one scoped CSS rule. User-authored newlines are preserved without
changing assistant Markdown, persistence formats, stored conversations, composer
keyboard authority, or runtime invocation. Focused and complete tests cover the behavior.
No follow-up debt was found.

## Outcome

The Navigator accepted the corrected multiline rendering in Mirror Desktop Dev. CR010 is
Done with no follow-up debt action. Commit, push, publication, release, and production
promotion remain separately gated.

## Migration Provenance

- Legacy record: `815130b4`.
- Created: `2026-09-09T00:26:06.386079Z`.
- Last updated: `2026-09-09T00:26:06.386079Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
