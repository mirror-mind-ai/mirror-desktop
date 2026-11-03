[< Refinement Workbench](../index.md)

# RS026 — After the 0.3 Cutover

**Status:** active

## Framing

Created by the Navigator on 2026-11-01, while CV-010 DS-005 phase 5c was being proven. Phase 5c moves
production to the 0.3 line ("one home path, one core"); the work that does not block that day is
gathered here so it has one place to wait and one order to be taken in.

This RS is a **queue, not a theme**. It owns the new CRs below, captured from the phase 5 rehearsals,
and it orders the open CRs that already live in other Refinement Stories. Those stay where they are
and are referenced, the same rule RS025 applies: moving a CR between stories rewrites history without
delivering anything.

## Intake Rules

- A CR enters only if it does **not** block the cutover. Anything that blocks the day is fixed
  before it, as CR165 was.
- Work starts after the cutover, on the 0.3 line only. `release/0.2` is frozen at alpha.58 and
  retired by the cutover, so nothing here is backported.
- Each new CR names the line and repository it touches; Core work goes through `mirror-ts`'s PR
  route and must only extend.

## New Change Requests

- [CR167: Keep a User's Claude Code Plugin Out of the Desktop's Own Turns](cr167-keep-a-users-claude-code-plugin-out-of-the-desktops-own-turns.md) — **done** · Desktop (delivered through CR173) · affects new users who already use Claude Code with Mirror
- [CR168: Name a Channel Refusal Instead of invalid_record](cr168-name-a-channel-refusal-instead-of-invalid-record.md) — **done** · Desktop
- [CR169: Tell a Dev Build Apart From the User Build](cr169-tell-a-dev-build-apart-from-the-user-build.md) — **done** · Desktop
- [CR170: Pass the Invocation Directory to the Core Explicitly](cr170-pass-the-invocation-directory-to-the-core-explicitly.md) — **captured** · Core
- [CR171: Retire the nautilus_harness Interface Label](cr171-retire-the-nautilus-harness-interface-label.md) — **captured** · Desktop + Core data
- [CR172: Bring the Site's Install Guides to the TypeScript Core and Mirror Desktop 0.3](cr172-bring-the-sites-install-guides-to-the-typescript-core-and-mirror-desktop-0-3.md) — **done** · the public site (another Journey's repository) · put first by the Navigator
- [CR173: Make Anthropic Access the Desktop's Own Provider](cr173-make-anthropic-access-the-desktops-own-provider.md) — **done** · Desktop · Navigator, 2026-11-02; closes CR167 without waiting on the bridge's author
- [CR174: A Bound Home That No Longer Opens Must Not Hold the App](cr174-a-bound-home-that-no-longer-opens-must-not-hold-the-app.md) — **done** · Desktop · found by the Navigator testing CR173 in dev, 2026-11-02
- [CR175: Organize Settings by What the Person Wants to Do](cr175-organize-settings-by-what-the-person-wants-to-do.md) — **captured** · Desktop · Navigator, testing CR173, 2026-11-02
- [CR176: Run the Agent in the Journey's Folder, Not in the Mirror Home](cr176-run-the-agent-in-the-journeys-folder-not-in-the-mirror-home.md) — **done** · Desktop · found by the Navigator testing CR173, 2026-11-02; the agent's tools act inside the home
- [CR177: Keep the Person's Mirror Skills From Reaching Another Home](cr177-keep-the-persons-mirror-skills-from-reaching-another-home.md) — **done** · Desktop · found measuring CR176; a dev turn can write to production through `mm-*` skills
- [CR178: A Chapter May Begin at Mirror's Context](cr178-a-chapter-may-begin-at-mirrors-context.md) — **done** · Desktop · found on alpha.5; a compaction whose kept tail starts at Mirror's context fails the chapter check
- [CR179: Read a Table Whose Delimiter Has Fewer Than Three Hyphens](cr179-read-a-table-whose-delimiter-has-fewer-than-three-hyphens.md) — **done** · Desktop · Navigator, 2026-11-02; `|--:|` makes a whole table a paragraph
- [CR180: Keep the OpenRouter Key Without Asking the Keychain Every Turn](cr180-keep-the-openrouter-key-without-asking-the-keychain-every-turn.md) — **done** · Desktop · Navigator, 2026-11-02; the Keychain prompts on every turn; the app is unsigned
- [CR181: Keep What the Person Types While the Turn Starts](cr181-keep-what-the-person-types-while-the-turn-starts.md) — **done** · Desktop · Navigator, 2026-11-02; text typed during Working is erased when the agent starts
- [CR182: Store the Composer Draft When the Person Leaves the Field](cr182-store-the-composer-draft-when-the-person-leaves-the-field.md) — **captured** · Desktop · Navigator, 2026-11-02; typing does not feel good; store the draft on blur
- [CR183: Give Back a Message Whose Turn Was Cancelled Before Any Answer](cr183-give-back-a-message-whose-turn-was-cancelled-before-any-answer.md) — **done** · Desktop · Navigator, 2026-11-02; cancelling during Working loses the sent message
- [CR184: Finish a Turn Without Redrawing the Whole Conversation](cr184-finish-a-turn-without-redrawing-the-whole-conversation.md) — **done** · Desktop · Navigator, 2026-11-02; the conversation flashes when the agent finishes; remount and projection reads removed, longest end-of-turn task 0.21 s
- [CR185: Keep the Output Surface Moving While the Agent Works](cr185-keep-the-output-surface-moving-while-the-agent-works.md) — **done** · Desktop · Navigator, 2026-11-02; closed on "não está lento" after CR184 and the glow change; the output stalls during a turn, in production's long conversations

## Queue After the Cutover

The proposed order. The Navigator can reorder it; the index's status column stays the authority.
Rows F1 to F5 are the frictions the Navigator reported on 2026-11-02, after alpha.7; their order
is proposed and awaits the Navigator.

| Order | CR | Home RS | Status | Why here |
|------:|----|---------|--------|----------|
| F1 | [CR180](cr180-keep-the-openrouter-key-without-asking-the-keychain-every-turn.md) | RS026 | done | shipped in alpha.8; no prompt in production after the one carry-over, 2026-11-02 |
| F2 | [CR181](cr181-keep-what-the-person-types-while-the-turn-starts.md) | RS026 | done | on `main` (`dda86f5`); dev-validated 2026-11-02; ships in the next alpha |
| F3 | [CR183](cr183-give-back-a-message-whose-turn-was-cancelled-before-any-answer.md) | RS026 | done | on `main` (`dda86f5`); dev-validated 2026-11-02; ships in the next alpha |
| F4 | [CR182](cr182-store-the-composer-draft-when-the-person-leaves-the-field.md) | RS026 | captured | composer group; measured first, it shares the draft code with CR181; evaluated, a sample while typing comes first |
| F5 | [CR184](cr184-finish-a-turn-without-redrawing-the-whole-conversation.md) | RS026 | done | on `main` (`07dc639`, `1ada90c`, `68c9437`); dev-validated 2026-11-03; shipped in v0.3.0-alpha.10 |
| F6 | [CR185](cr185-keep-the-output-surface-moving-while-the-agent-works.md) | RS026 | done | on `main` (`32d7163`, `ebfa0a3`); dev-validated 2026-11-03 at production size; shipped in v0.3.0-alpha.10 |
| 1 | [CR166](../rs025-legible-endings-for-a-turn-that-ends-badly/cr166-recover-this-turn-does-nothing-on-a-turn-still-running.md) | RS025 | in_progress | an exit offered that does nothing; seen in the field on 0.3. First half on `main` (`11f8b96`): the exit now says which guard held it |
| 2 | [CR172](cr172-bring-the-sites-install-guides-to-the-typescript-core-and-mirror-desktop-0-3.md) | RS026 | done | deployed to mirrormind.sh and mirrormind.com.br 2026-11-02; validated and closed by the Navigator the same day |
| 3 | [CR167](cr167-keep-a-users-claude-code-plugin-out-of-the-desktops-own-turns.md) | RS026 | done | reproduced in a sandbox 2026-11-02; the fix is `disableAllHooks` in the provider, not the Core; delivered by CR173 |
| 3a | [CR173](cr173-make-anthropic-access-the-desktops-own-provider.md) | RS026 | done | the Desktop owns its Anthropic provider (pinned fork of the bridge), on `main` 2026-11-02, release acceptance owed; the lean provider is an [exploration](../../explorations/a-lean-anthropic-provider/index.md) |
| 3c | [CR176](cr176-run-the-agent-in-the-journeys-folder-not-in-the-mirror-home.md) | RS026 | done | on `main` (`1b14030`): Journey folder, session anchored, no project trust, provider on user settings; dev-validated 2026-11-02 |
| 3c2 | [CR177](cr177-keep-the-persons-mirror-skills-from-reaching-another-home.md) | RS026 | done | the bound home (Navigator); on `main` (`09ae441`); dev-validated 2026-11-02 |
| 3c3 | [CR178](cr178-a-chapter-may-begin-at-mirrors-context.md) | RS026 | done | shipped in alpha.6; chapters confirmed in production 2026-11-02 |
| 3b | [CR174](cr174-a-bound-home-that-no-longer-opens-must-not-hold-the-app.md) | RS026 | done | on `main` (`be81e1c`); dev-validated 2026-11-02 |
| 3d | [CR175](cr175-organize-settings-by-what-the-person-wants-to-do.md) | RS026 | captured | Settings by intent; setup offers Claude through Claude Code |
| 3e | [CR179](cr179-read-a-table-whose-delimiter-has-fewer-than-three-hyphens.md) | RS026 | done | shipped in alpha.6; confirmed in production 2026-11-02 |
| 4 | [CR159](../rs025-legible-endings-for-a-turn-that-ends-badly/cr159-say-why-the-provider-refused-a-turn.md) | RS025 | in_progress | the real refusal arrived on 2026-11-01 ("Third-party apps now draw from your extra usage"); attach it and read it on 0.3 |
| 5 | [CR163](../rs025-legible-endings-for-a-turn-that-ends-badly/cr163-a-hung-mirror-append-freezes-every-exit.md) | RS025 | in_progress | field check owed, now on the TypeScript append |
| 6 | [CR168](cr168-name-a-channel-refusal-instead-of-invalid-record.md) | RS026 | done | group B; on `main` (`eb43319`); dev-validated 2026-11-02 |
| 7 | [CR169](cr169-tell-a-dev-build-apart-from-the-user-build.md) | RS026 | done | group B; on `main` (`27c9e13`); dev-validated 2026-11-02 |
| 8 | [CR164](../rs025-legible-endings-for-a-turn-that-ends-badly/cr164-the-hung-append-test-races-its-own-stderr.md) | RS025 | captured | flaky test, test-only |
| 9 | [CR155](../rs025-legible-endings-for-a-turn-that-ends-badly/cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md), [CR161](../rs025-legible-endings-for-a-turn-that-ends-badly/cr161-give-every-finishing-the-same-exits.md) | RS025 | parked | unpark together with CR166, which touches the same exits |
| 10 | [CR170](cr170-pass-the-invocation-directory-to-the-core-explicitly.md) | RS026 | captured | Core |
| 11 | [CR171](cr171-retire-the-nautilus-harness-interface-label.md) | RS026 | captured | cosmetic in data, no hurry |
| — | [CR094](../rs022-mirror-core-debts/cr094-mirror-mode-activation-rebinds-desktop-conversation-journey.md) | RS022 | parked | re-read against the TypeScript Core before resuming |
| — | [CR131](../rs016-ongoing-product-improvements-and-adjustments/cr131-make-the-mirror-a-channel-validates-against-identifiable.md), [CR148](../rs016-ongoing-product-improvements-and-adjustments/cr148-give-an-unanswered-turn-back-its-own-identity.md), [CR156](../rs016-ongoing-product-improvements-and-adjustments/cr156-simplify-the-context-map.md), [CR157](../rs016-ongoing-product-improvements-and-adjustments/cr157-stop-moving-the-whole-conversation-through-every-settlement.md) | RS016 | captured | re-read against 0.3 first; some may no longer apply |
| — | [CR098](../rs021-ux-pre-beta-evolution/cr098-allow-a-journey-to-be-reparented.md), [CR099](../rs021-ux-pre-beta-evolution/cr099-allow-safe-editing-during-another-journeys-work.md) | RS021 | captured | product features, not defects |

## Group B Check

CR177, CR168 and CR169 share one risk, taking the development build for the user's, and one check,
in the development app bound to `ensaio-5c-2` (Navigator, 2026-11-02):

1. The sidebar reads "Mirror Desktop TS Dev". (CR169)
2. Settings › Updates says the build does not update itself, with no Check for updates. (CR169)
3. In any Journey, ask the agent to add a task with `mm-tasks`. The Driver then confirms it is in
   `ensaio-5c-2` and not in production. (CR177)
4. The Driver marks one development conversation as the user build's (backup kept); opening it says
   it belongs to another Mirror Desktop build, not "needs recovery". The Driver restores it. (CR168)

## Composer Group Check

CR181 and CR183, in the development app bound to `ensaio-5c-2` (Navigator, 2026-11-02):

1. Send a turn and type while it shows Working, and on while the agent starts writing. The text
   stays, and is still there after the turn ends. (CR181)
2. Send a turn and cancel it during Working. The message is back in the composer, with "Message
   returned to the composer". (CR183)
3. The same, typing something new before cancelling: the message comes back first, the new text
   after it. (CR183)

## Not Change Requests

Housekeeping owed after the cutover is recorded in DS-005, not here: "Owed at the End of Phase 5"
(the stray `/tmp` folder, the unpushed `mirror-extensions` commits, the merged port branches and
worktree), the rehearsal leftovers (`ensaio-*` homes, `/private/tmp/5c*`), and retiring the Python
hooks, the Python `mirror-logger` and the Python-era `AGENTS.md` in `~/mirror`. See
[DS-005](../../roadmap/cv-010-first-run-assistant/ds-005-speak-to-the-typescript-core/index.md).
