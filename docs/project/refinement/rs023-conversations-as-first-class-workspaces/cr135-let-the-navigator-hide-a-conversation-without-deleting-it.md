[< RS023](index.md)

# CR135: Let the Navigator Hide a Conversation Without Deleting It

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs023-cr135-let-the-navigator-hide-a-conversation`

## Friction

The sidebar shows many conversations that are no longer in focus: old Desktop work and imported Mirror Core history compete for attention with active work. The Navigator cannot hide a conversation and later reveal it without treating it as deleted.

What exists today is not a visibility control. `FocusedConversationSidebar` computes `hiddenCount` from `props.entries.length - visibleEntries.length` and offers *Show N more* (`:33`, `:96`–`:98`). That is the app's own truncation cap deciding what to show. The Navigator chooses nothing, and what is capped is not what they want out of the way.

## Outcome

The working set of the conversation list is the Navigator's choice. Hiding is explicit, discoverable and reversible, and it is never a deletion.

## First Investigation

1. Inventory the conversation catalog: `journey_workspace`, `desktop_conversation` and `mirror_history` entries, their source and provenance, their lifecycle and their persistence coordinates. Establish which states may be hidden safely without deleting or mutating their authority.
2. Decide the relationship between a Navigator hide and the existing truncation cap. They are different mechanisms and must not be conflated; determine whether the cap should remain at all once hiding exists.
3. Determine where visibility is persisted and what happens to a hidden conversation that later receives work, a correction, or a Mirror-side change — including whether it must reveal itself.
4. ~~Compare a current Desktop conversation, a parent Journey workspace and a Mirror Core history entry in the reveal surface, and confirm provenance survives for each.~~ **Superseded 2026-10-09**, Navigator approved: the Journey workspace is not a catalog entry and must not become hideable, because CR134 built the guaranteed carrier of running work on that row. The comparison stands for the two kinds that exist.

## Acceptance

- The Navigator can hide a conversation from the sidebar's ordinary working set and reveal it again through an explicit, discoverable control.
- Hiding is reversible and does not delete, retire, archive, mutate, merge or lose the conversation's transcript, Mirror provenance, thread or run evidence.
- Old Desktop conversations and Mirror Core history remain distinguishable by provenance in any visibility or reveal surface.
- A hidden conversation is never represented as deleted, and an imported Mirror record is never represented as a Desktop one.
- Reload preserves visibility choices.
- A hidden conversation that owns active work is reachable, and hiding it never removes the only indication that work is running — CR134's Journey-row carrier must still show it. Hiding is the third way a conversation can become invisible, after a compact sidebar and an unexpanded Journey, and it is the only one the Navigator chooses deliberately.


## Investigation Findings (2026-10-09)

Read against source at `e1891b5`. All four items answered.

### 1. The catalog has two kinds, not three — and the Journey workspace is already unhideable

`ConversationCatalogEntry` is a union of exactly `desktop_conversation` and `mirror_history` (`conversationSpaces.ts:62`–`:80`). `journey_workspace` is a member of `ConversationSpaceSelection` (`:40`–`:42`), **not** of the catalog. The Journey's own workspace is therefore not a hideable object, and could not be hidden even by accident.

That is the right outcome rather than a limitation: RS023's visibility invariant makes the Journey row the guaranteed carrier of running work, and CR134 built the status signal and its route on it. **A hideable Journey workspace would contradict the invariant this Story inherits.** The acceptance line asking to compare "a parent Journey workspace" in the reveal surface is therefore not implementable as written, and should not be made implementable.

**Entry identity is composite.** The codebase consistently treats `(kind, conversationId)` as the identity: the list key is `` `${entry.kind}:${entry.conversationId}` `` (`FocusedConversationSidebar.tsx:74`) and the selected comparison tests both fields (`:65`–`:67`). A hidden set keyed on `conversationId` alone would risk hiding a Desktop entry and a Mirror entry together. The hidden key must be composite, and that is this CR's single most load-bearing detail.

Provenance needs no work to survive: it is intrinsic to the entry — `kind`, the `◆`/`◇` glyph and the `Desktop ·` / `Mirror ·` metadata line (`:68`–`:70`, `:100`). Hiding preserves provenance by not touching entries at all.

### 2. The cap is local, unpersisted, and must stay disjoint from hiding

`INITIAL_VISIBLE_CONVERSATIONS = 6` (`:8`) with `showAll` as **local component state** (`:32`, `:35`–`:36`). Since CR133 made every open group its own component instance, the cap is per group and resets when the group collapses (unmount) and on every reload. `hiddenCount` is the cap's own arithmetic (`:36`) and the *Show N more* label reports it (`:105`–`:108`).

Recommendation: **keep the cap and keep the two mechanisms strictly disjoint.** The cap applies to the *visible* set only; the reveal control for hidden entries is separate and carries its own count. If *Show N more* ever included hidden entries, a cap the Navigator never set would undo a choice they made deliberately — which is precisely the conflation this CR's Friction warns about.

### 3. Persistence, and the one case that must render even when hidden

`journey-preferences.json` already carries per-Journey Records (`lastWorkedAtByJourneyId`, `journeyAppearanceById` — `journeyPreferencePersistence.ts:15`, `:17`), so the shape has precedent. The persisted key set is enumerated by `journeyManagementGuardrails.test.ts:23`–`:26`, so a new key is admitted deliberately rather than by drift — the same load-bearing guard that caught CR133's one new field.

**No automatic reveal.** The Boundaries forbid automatic hiding; an app-chosen *un*-hiding is the same class of act. Work on a hidden conversation stays visible through CR134's Journey-row carrier and its route, not by overriding the Navigator's choice.

**But a hidden conversation that is currently selected must still render.** CR134's route reads `loaded.entries` from the catalog state (`App.tsx:4157`–`:4168`), not from the rendered list, so it will successfully land the Navigator inside a hidden conversation. Without this rule the list would then deny that conversation exists while the transcript shows it — **exactly the two-surfaces-disagree shape used to characterise CR137**, and here it would be guaranteed rather than incidental. It renders marked as hidden, not silently.

**The architectural constraint this CR lives or dies by:** hiding filters at **render**, and never removes entries from `JourneyConversationCatalogState.entries`. That is what makes acceptance item 6 true by construction rather than by vigilance, and it needs its own guard.

### 4. The reveal affordance already exists, and its neighbour is Delete

`ConversationEntryContextMenu` is already reachable by right-click and by keyboard (`ContextMenu`, `Shift+F10` — `FocusedConversationSidebar.tsx:76`–`:94`). It branches by kind: Mirror gets three items, Desktop gets *Rename Conversation…* and *Delete Conversation…* with `danger-menu-item` (`ConversationEntryContextMenu.tsx:73`–`:80`). **Hide therefore needs no new interaction model.**

The risk is adjacency: in the Desktop branch, Hide would sit next to Delete, and this CR's central requirement is that hiding is never read as a deletion. That must be handled by explicit separation and wording rather than left to the reader.

`availableConversationActions` returns `[]` for `needs_attention` and `preparing_handoff` (`conversationSpaces.ts:259`–`:265`), and it is used only as a **handler guard** (`App.tsx:4214`, `:4244`, `:4290`) — the menu does not render from it. **Hide must not be gated through it**: a conversation that needs attention is arguably the one most worth putting away, and hiding mutates nothing it could damage.

## Plan

- **D1** new `src/domain/conversationVisibility.ts` — composite `conversationVisibilityKey(entry)`, `HiddenConversationsByJourney`, `hideConversation`, `revealConversation`, `isConversationHidden`, and `partitionConversationVisibility(entries, hidden, selected)` returning `{ visible, hidden }` with the selected entry forced into `visible` and flagged. A new module rather than an edit to `conversationSpaces.ts`, whose strongest guarantee is that its existing derivations did not change.
- **D2** persist `hiddenConversationIdsByJourneyId: Record<string, string[]>`; admit it in the key-set guard; **an invalid map degrades to empty while the rest of the file survives**, following CR133's deliberate departure — a cosmetic preference must never reset pins or theme. Reconcile against the registry at the four `reconcileReloadedJourneyState` sites, consistent with the sibling fields. **Named consequence:** a Journey that leaves the registry and returns comes back with its conversations revealed. Chosen for consistency and bounded growth, not because it is free.
- **D3** `FocusedConversationSidebar` partitions before capping; the cap counts visible entries only; a separate footer control reveals hidden ones with its own count. The heading's total stays the factual entry count, so its existing `aria-label` does not move.
- **D4** Hide / Reveal in both kind branches of the context menu, separated from Delete by a divider and by wording that names reversibility.
- **D5** guards: CR134's route still resolves a **hidden** conversation; the catalog state is never filtered; the cap's count and the hidden count are disjoint; the persisted key set is admitted; invalid input degrades to empty without collateral; provenance is present for both kinds in the reveal surface; a `needs_attention` entry can still be hidden.

## Open Decisions

1. **Driver and Delivery.** Proposed `@alissonvale` and `refinement/rs023-cr135-let-the-navigator-hide-a-conversation`.
2. **The acceptance line about a "parent Journey workspace" in the reveal surface.** It contradicts the Story's visibility invariant and cannot be implemented without breaking CR134's carrier. Proposed: strike it through, dated, retaining the text — the convention CR134 used.
3. **Where the reveal surface lives.** Proposed: a footer control in each group, next to *Show N more* but visually distinct. Putting the two counts side by side keeps the conflation risk visible instead of hiding it in a separate panel.


## Delivery Record (2026-10-09)

Decisions 1 and 3 accepted as proposed; decision 2 accepted, so the acceptance line naming a parent Journey workspace is struck above rather than implemented.

### Delivered

- **D1** `src/domain/conversationVisibility.ts` (new): composite `conversationVisibilityKey`, `hideConversation` / `revealConversation` / `revealAllConversations` / `forgetConversationVisibility`, `partitionConversationVisibility`, and the parse and sanitize pair. A new module rather than an edit to `conversationSpaces.ts`, whose strongest guarantee is that its existing derivations did not move.
- **D2** `hiddenConversationIdsByJourneyId` persisted in `journey-preferences.json`. An unreadable map **degrades to empty while pins, theme and recents survive**, following CR133's deliberate departure. A departed Journey loses its hidden set through `sanitizeHiddenConversations`.
- **D3** the sidebar partitions before capping. The cap now counts the **visible** set only, so *Show N more* can no longer fold in a choice the Navigator made. The hidden set has its own disclosure with its own count, and the heading keeps reporting the factual total.
- **D4** *Hide from List (can be revealed)* / *Reveal in List* in both kind branches of the existing context menu, which was already keyboard reachable. In the Desktop branch a `role="separator"` stands between it and *Delete Conversation…*, and the guard asserts that order rather than trusting it.
- **D5** six guard groups across two new files, plus the deliberate admissions described below.

### What the writing changed

**The reassurance moved because a test failed.** The sentence *"Hidden only from this list. Nothing was deleted."* was first written inside the opened hidden section, where `renderToStaticMarkup` cannot reach it. The failure was the useful part: the doubt this CR exists to remove — *did I delete it?* — arrives **before** the section is opened. The closed control now carries it too.

**Reconciliation at the four runtime sites was dropped from the plan, deliberately.** The plan said to follow the sibling fields into `reconcileReloadedJourneyState`. It is not needed and it was not done: a stale `expandedConversationJourneyIds` entry would try to *load a catalog* for a Journey that no longer exists, whereas a stale hidden key is consulted only when rendering that Journey's list — and that Journey has no list. `sanitizeJourneyPreferenceState` already prunes it on load. Doing it anyway would have churned five pinned reconcile literals for no behavioural gain. Recorded as a reduction rather than left to be discovered as an omission.

**A stale key is inert by design, and bounded rather than pruned.** A conversation deleted outside this app leaves its key behind. Pruning against the catalog was rejected: catalogs are capped at `MAX_CONVERSATION_CATALOG_ENTRIES`, so pruning on load would silently reveal anything beyond the cap. Instead the map is bounded at 256 Journeys and 256 keys per Journey, and deletion inside the app forgets the key through `forgetConversationVisibility`.

### Three guards that were load-bearing

Each of these refused the change until it was made deliberately, which is the point of having them.

1. `journeyManagementGuardrails.test.ts` enumerates the persisted key set, so the new preference had to be admitted by hand — the same guard that caught CR133's one new field.
2. `conversationSpaceSurfaces.test.tsx` counts `role="menuitem"`. Both counts moved by exactly one, and the Desktop count now also pins the separator's position between *Hide* and *Delete*.
3. `journeyPreferencePersistence.test.ts`'s sanitize case now proves a departed Journey loses its hidden set while a surviving one keeps its own.

### A mistake worth recording

A scripted edit added the new props to three call sites after asserting it matched exactly three occurrences of `journeyName="Mirror Desktop"`. The count was right and **one of the three was the wrong component** — `EmptyDesktopConversation`, not the sidebar. `tsc` caught it immediately. The lesson is the one CR133 already wrote down and this turn repeated: **anchor on content, not on a count.** The repair was anchored on `historicalSegments`, which exists in only one of them.

### Verified

- `tsc --noEmit` clean; `npm test` **247 files / 1859 tests**, from 244 / 1822 at the branch point.
- `src-tauri/` **zero diff**; `cargo test` **269 passed / 3 ignored**, unchanged.
- `npm run build` and `npm run tauri:build:dev` clean. Dev binary `ef0707fdd9cacc7c35a3ef069314501237fd1e027bd84126f123c785ab6fe74e`, installed to `/Applications/Mirror Desktop Dev.app` and hash-matched; previous bundle kept at `/tmp/mirror-desktop-dev-backup-20261009-114834.app`. Production untouched.

### Owed

Field validation. Unlike CR134's, this one **does** leave durable evidence: the Dev preference file must carry `hiddenConversationIdsByJourneyId` with the composite key of whatever is hidden, so the closure can rest on a file rather than on an attestation.

## Boundaries

No automatic deletion, archival, migration or pruning, and no automatic hiding — the Navigator chooses. This is a presentation preference and must not drift into archival or lifecycle semantics. No change to transcript authority, admission or runtime keying.
