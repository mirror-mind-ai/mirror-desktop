[< RS023](index.md)

# CR133: Stop a Disclosure From Selecting a Journey

**Status:** planned
**Driver:** —
**Delivery:** —

## Friction

Revealing a Journey's conversations is not a structural act in this app; it is a navigation act. `expandJourneyConversations` calls `selectJourney(ownerJourneyId, "pointer")` and dispatches `journey_selected` **before** dispatching `expand` (`App.tsx:3998`–`:4004`), and the catalog load that follows reads `selectedJourney` to decide whether it may reuse the loaded thread.

Two consequences, both reported:

1. Opening a Journey's conversation list by its disclosure arrow **selects and loads that Journey**, even when the Navigator wanted only to see what is inside it.
2. Switching to another Journey collapses the original Journey's conversation list, because conversation focus is a single `focused_journey` state rather than a set, so direct access to work in flight is lost.

Together these make stable alternation among concurrent work in several Journeys or conversations impossible. This is the symptom the Navigator describes as the app not feeling stable.

## Outcome

Structural visibility and selection are separately operable. The Navigator can reveal what is inside a Journey without going there, keep several conversation groups open at once, and return directly to an active conversation from the sidebar.

## First Investigation

1. Trace selection, expansion and persistence as three separate concerns through `conversationFocus`, `selectedJourney`, `collapsedJourneyIds` and the sidebar preferences file. Record which of them the catalog load actually requires.
2. Establish what the catalog load genuinely needs from `selectedJourney`. It currently reuses `journeyThreadState.thread` only when `ownerJourneyId === selectedJourney`; determine whether loading a non-selected Journey's thread is safe, idempotent and free of provisioning side effects.
3. Reproduce the exact reported sequence and record every state transition that selects or reloads a workspace: active conversation → select another Journey → return to or disclose the original Journey.
4. Determine whether expansion must become a set, and whether an expanded group containing active work needs different retention from an idle one.

## Investigation Findings (2026-10-08)

All four items answered against source. Line numbers are from `main` at `c3c5fb5`.

### 1. Three concerns, one fused value

- **Selection** is `selectedJourney` plus `selectedJourneyRef` (`App.tsx:868`), changed only by `selectJourney` (`:4229`).
- **Expansion** is `conversationFocus`, a `useReducer` initialised to `{ kind: "all_journeys" }` (`:713`) over `reduceConversationFocus` (`conversationSpaces.ts`). Its `focused_journey` variant carries **both** `journeyId` (which single disclosure is open) **and** `selection` (which workspace is selected). The two concerns share one value, and `expand` always resets `selection` to the expanded Journey's root. So the reducer selects on expand by itself, before `App.tsx` adds its own `selectJourney` call.
- **Persistence**: expansion is not persisted anywhere. `journey-preferences.json` holds `pinnedJourneyIds, recentJourneyIds, activeJourneyId, journeyListOrder, sidebarCompact, lastWorkedAtByJourneyId, applicationTheme, journeyAppearanceById, voiceLanguage` and nothing about disclosures. `conversation-spaces/<journey>/catalog.json` is catalog *data* written by Rust, not a preference. Reload therefore always starts collapsed, which already fails acceptance item 5.
- A fourth, unnamed singleton exists: the catalog itself — `conversationCatalog`, `conversationCatalogStatus`, `conversationCatalogError` (`:717`–`:719`) and `focusedJourneyRootThreadId` (`:732`) — one set for the whole app, cleared by `selectJourney` (`:4235`–`:4237`).
- `collapsedJourneyIds` (`:583`) is a different concern: it collapses *child Journeys* in the tree. It is already a `Set`, already independent of selection, and already reconciled against the registry on reload (`journeyRegistry.ts:77`, `:92`). It is the precedent for the shape expansion should take.

### 2. What the catalog load needs from `selectedJourney`: nothing essential

`expandJourneyConversations` (`:3998`) uses `selectedJourney` twice, neither essentially:

- as a cache shortcut, reusing `journeyThreadState.thread` only when `ownerJourneyId === selectedJourney` (`:4010`), otherwise calling `loadNautilusJourneyThread(ownerJourneyId)`;
- as an abort guard, discarding the loaded catalog when `selectedJourneyRef.current !== ownerJourneyId` (`:4029`, `:4034`).

The non-selected path already exists and is read-only end to end: `loadNautilusJourneyThread` (`journeyThreadStorage.ts:19`) invokes `load_journey_thread` (`main.rs:501`), which reads the thread file, validates it and returns `Ok(None)` when it does not exist — it provisions nothing. `loadDesktopConversationCatalog` reads `catalog.json`; `loadMirrorConversationCatalog` runs `scripts/mirror_conversation_catalog.py` on its `catalog` branch (`:80`), in which no write verb was found. Loading a non-selected Journey's catalog is safe and idempotent. **Validation must confirm the script's `catalog` branch is read-only by reading it, not by grep.**

Because `selectJourney` is called before `expand`, and `selectedJourney` is the stale closure value at that point, the "different Journey" case **already** takes the `loadNautilusJourneyThread` path today. The coupling buys nothing.

### 3. The reported sequence, traced

Start: Journey A selected, conversation X in A expanded and selected — `focused_journey{A, desktop X}`, catalog = A's.

1. Click Journey B's row → `selectJourney(B)` (`:4229`): dispatches `collapse(A)` (`:4233`) → focus becomes `all_journeys{returnTo: A root}`; catalog, status and root-thread id cleared; `selectedJourney = B`. **A's list disappears (symptom 2), and X's selection disappears with it**, because they were one value.
2. Click B's disclosure → `expandJourneyConversations(B)`: B already selected; `expand(B)` → `focused_journey{B, B root}`; B's catalog loads.
3. Click A's disclosure, wanting only to look → `expandJourneyConversations(A)`: `A !== selectedJourney`, so **`selectJourney(A)`** (`:4001`, symptom 1): B collapses, catalog clears, transcript, Composer target and thread all move to A. Then `expand(A)` → `focused_journey{A, A root}` — **the selection is A's root, not X**; `returnTo` is written by `collapse` and read by nothing (no consumer outside the reducer). The Navigator must re-find X in the list. "Return directly to an active conversation" currently costs select-Journey, expand, find, click, and destroys B's view on the way.
4. If the Navigator clicks anywhere else while step 3's catalog is loading, the guard at `:4029` drops the result silently.

### 4. Expansion must become a set

Acceptance item 3 (changing selection never collapses unrelated groups) and the need to render several inline groups both require it. On retention: once collapse is only ever explicit, no group is collapsed silently, so the "never one that contains active work" clause holds by construction. The remaining retention question is reload, and that is a persistence question, not a runtime one: the persisted set must be restored without consulting run ownership, and an active native process stays reachable through the Journey row (CR134's carrier) — expansion never participates in it.

## Plan

### Scope

**D1 — Split the fused state (`src/domain/conversationSpaces.ts`).** `ConversationFocusState` becomes two values with two reducers, or one reducer over a product type whose actions are provably disjoint:

- `expandedConversationJourneyIds: ReadonlySet<string>` — structural visibility. Actions `expand(journeyId)` / `collapse(journeyId)` touch only this set.
- `conversationSelection: ConversationSpaceSelection` scoped to the selected Journey — `select_root` / `select_desktop` / `select_mirror` touch only this.

`expand` no longer writes a selection. `collapse` no longer writes `returnTo`; the field is removed because nothing reads it. The selection guard that rejects actions for a Journey other than the selected one is kept.

**D2 — Per-Journey catalog state (new `src/app/conversationCatalogState.ts`).** `conversationCatalog`, `conversationCatalogStatus`, `conversationCatalogError` and `focusedJourneyRootThreadId` become one `Record<journeyId, { entries, status, error, rootThreadId }>`. `selectJourney` stops clearing it. The abort guard becomes "is this Journey still expanded, and is this still its latest load request", never "is this Journey selected". New module rather than more `App.tsx` state, following CR132's precedent: the strongest guarantee is that the existing derivations did not change.

**D3 — `expandJourneyConversations` stops selecting.** The `selectJourney` / `journey_selected` pair at `:4001`–`:4002` is removed. The root thread is always obtained through `loadNautilusJourneyThread(ownerJourneyId)`; reusing the selected thread is at most an optimisation and must not change the result. A Journey with no thread file renders an honest "not started" state inside its group and **is not started** — the current message *"Start this Journey before creating additional conversations."* is kept as the group's text, not surfaced as a failure.

**D4 — Render several groups.** `conversationsExpanded` (`:5191`) reads the set. Each `FocusedConversationSidebar` receives its own catalog slice. Its `selected` prop becomes optional and is passed only for the selected Journey, so a non-selected Journey's root is never shown as selected. `onSelectEntry` for a non-selected Journey performs `selectJourney(J)` **and** the selection in one act — clicking a conversation *is* navigation, by design, and is the one place where a conversation-list gesture selects a Journey. The row's own `onClick`/`onKeyDown` `select_root` pre-dispatch (`:5222`, `:5236`) is reduced to selecting the Journey. The shell-wide `conversation-catalog-loading` class (`:5036`) and `aria-busy` (`:5298`) become per-group.

**D5 — Persist expansion (`src/domain/journeyPreferencePersistence.ts`).** New optional preference `expandedConversationJourneyIds: string[]`, parsed with the file's existing `=== undefined ? default : parse(...)` pattern so an **absent field is an empty set**. Reconciled on registry reload exactly like `collapsedJourneyIds` (`journeyRegistry.ts:92`): ids no longer in the registry are dropped. On startup, expanded groups render immediately in `loading` and load their catalogs **sequentially**, so a Navigator with many open groups does not spawn many catalog subprocesses at once. **No cap on the set and no eviction**, because eviction would be a silent collapse and acceptance item 3 forbids one. One stated departure from the file's convention: an *invalid* value for this field drops it to empty and keeps the rest of the preferences, rather than discarding the whole file as the sibling fields do. Expansion is cosmetic renderer state and must never be able to reset the Navigator's pins, theme or recents.

### Files

- `src/domain/conversationSpaces.ts` — D1.
- `src/app/conversationCatalogState.ts` — D2 (new).
- `src/app/App.tsx` — D3, D4, wiring of D2 and D5; `expandJourneyConversations`, `selectJourney`, the journey-row render block, `selectedConversationSpace` (`:956`) and `selectedThreadId` (`:992`), which must read the selected Journey's `rootThreadId` from the record.
- `src/app/FocusedConversationSidebar.tsx` — `selected` optional; per-group busy state.
- `src/domain/journeyPreferencePersistence.ts`, `src/domain/journeyRegistry.ts` — D5.
- `src/styles/app.css` — only if several inline groups need spacing; the group is already an inline flex block under its row (`:8657`), and the grid column at `:106` is the whole sidebar, so no structural CSS change is expected.
- Tests listed below. **No Rust.** `cargo test` must show zero change in `src-tauri/`.

### Guards to re-aim (never delete)

- `src/tests/conversationSpaces.test.ts:178` *"focuses one Journey and returns to its root when collapsed"* — pins `expand` writing a selection and `collapse` writing `returnTo`. Re-aimed to: `expand`/`collapse` change only the set; selection untouched.
- `src/tests/conversationSpaces.test.ts:194` *"rejects focus actions for a different Journey"* — kept, re-expressed against the split selection.
- `src/tests/conversationSpaceIntegration.test.ts:40` *"clears the previous Journey catalog before another Journey expands"* — **this test pins symptom 2's mechanism** (it requires `collapse` and `setConversationCatalog([])` inside `selectJourney`). Re-aimed to its opposite: `selectJourney` contains neither.
- `src/tests/conversationSpaceIntegration.test.ts:5` — pins the shell-wide loading class and `aria-busy` strings; re-aimed to the per-group forms.
- `src/tests/conversationSpaceSurfaces.test.tsx` — expected to pass unchanged except for the optional `selected` prop.

### New guards

- Reducer: for every action, exactly one of {expansion set, selection} changes; a table-driven test over all five actions.
- Source guard: `expandJourneyConversations` contains no `selectJourney(`; `selectJourney(` contains no `type: "collapse"` and no catalog clear.
- Component: two Journeys expanded at once, each with its own catalog; selecting the second leaves the first expanded with entries intact; only the selected Journey's group shows a selected entry.
- Behaviour: clicking an entry in a non-selected expanded Journey selects that Journey and that entry in one act, and the previously selected Journey's group stays expanded.
- Behaviour: expanding a Journey whose thread file is absent renders its "not started" state, and no `start_*`, `provision_*`, `ensure_*` or `activate_*` command is invoked — asserted on the invoke mock.
- Behaviour: a catalog load whose Journey was collapsed before it resolved is discarded; one whose *selection* changed is kept.
- Persistence: round-trip of the set; absent field → empty set; invalid field → empty set with the rest of the preferences preserved; registry reload drops unknown ids and keeps known ones.
- Keyboard: the disclosure toggle is independently focusable and operable with Enter/Space without selecting; Enter/Space on the row still selects.
- Equivalence: `deriveJourneyNavigationPresentation` receives the same `selectedThreadId` as before for the selected Journey across the three selection kinds.

### Validation

1. `npm test` and `tsc` green; `cargo test` unchanged (zero Rust diff).
2. Read `scripts/mirror_conversation_catalog.py`'s `catalog` branch and record that it performs no write.
3. Dev build (`npm run tauri:build:dev`), then the reported sequence on the Dev channel: expand A, select X in A, select B, expand B, click A's disclosure — A's group was never collapsed, X is one click away, B's transcript and Composer never moved. Then quit, relaunch, and confirm both groups return expanded and load without selecting anything.
4. `npm run roadmap:check` READY; links intact.

### Exclusions

- No change to admission, occupancy, `derivePiInvocationAdmission`, `hasActiveNativeExecution` or runtime keying. Expansion state never reaches any of them.
- No per-Journey *selection memory* (restoring X when A is re-selected without a click). "Return directly" is satisfied by X remaining visible in A's still-expanded group. Recorded as a possible follow-up, not folded in.
- No change to the *Show N more* truncation cap (CR135's territory) and no running-work signalling (CR134's).
- `collapsedJourneyIds` (tree collapse) is not persisted today either; left as is and noted as a separate observation.
- No change to `FocusedSidebarResizeHandle` or sidebar width.
- No change to the roughly twenty other `selectedJourneyRef.current` guards in `App.tsx`; only the catalog's two change.

### Risks

- `App.tsx` is the widest file in the repository and D3/D4 touch its hottest render block; the guard-level tests above are what make the change reviewable, and the diff must stay confined to the named regions.
- The `selected` prop becoming optional changes `FocusedConversationSidebar`'s contract; every call site is in `App.tsx`.
- Sequential startup loading means the last of many expanded groups fills late; it renders `loading` honestly meanwhile. Named so it is not mistaken for a hang.

### Decisions for the Navigator before `in_progress`

1. Driver and Delivery. Proposed: `@alissonvale`, `refinement/rs023-cr133-stop-a-disclosure-from-selecting-a-journey`.
2. Confirm the exclusion of per-Journey selection memory from this CR.
3. Confirm the stated departure in D5: an invalid expansion field drops to empty rather than discarding the preferences file.

## Acceptance

- Expanding or collapsing a Journey's conversation disclosure never changes selected Journey, selected conversation, Composer target, loaded transcript or run ownership.
- Selection and structural visibility are separately operable with both keyboard and pointer.
- Changing selected Journey does not silently collapse unrelated expanded conversation groups, and never one that contains active work.
- The Navigator can return to an active conversation directly from the sidebar.
- Reload preserves expansion choices without fabricating a run owner and without losing access to an active native process.
- Revealing a Journey's conversations does not provision, start, restart or otherwise mutate that Journey.

## Boundaries

No change to admission, occupancy or runtime keying — a Journey that refuses work still refuses it, and this CR does not make anything concurrent. No change to transcript authority or Mirror provenance. Expansion state is renderer state; it must never participate in run admission.
