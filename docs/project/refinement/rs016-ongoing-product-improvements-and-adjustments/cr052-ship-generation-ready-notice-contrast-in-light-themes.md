[< RS016](index.md)

# CR052: Ship Generation-Ready Notice Contrast in Light Themes

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr052-generation-ready-notice-contrast`

## Problem

The centered generation-ready notice shown after resetting a Journey context remains effectively unreadable in the published alpha.10 build when a light application theme is active. The observed production alpha route displays the notice container, but the sentence `Generation 3 is ready. Previous conversation preserved.` is rendered with a very pale foreground against a pale notice surface.

This is not a new lifecycle or Terminal-Aligned Conversation Continuity defect. CR036 previously captured, implemented and accepted the same visual problem in isolated Dev, but its own outcome records that no commit, merge, publication or release was performed. The published alpha.10 line therefore still contains the pre-fix `.journey-reload-status` declaration with the dark-theme foreground `#bff2eb` and no light-theme override.

## Expected Behavior

The generation-ready notice remains clearly readable in Daylight, Mist and Parchment whenever the app reports that a fresh generation is ready and the previous Conversation was preserved.

The fix should preserve the notice wording, lifecycle, rounded layout, existing dark-theme appearance and reset-context behavior. It should only restore the missing light-theme contrast contract to the shipped line.

## Impact

The notice communicates a critical continuity promise at the moment of context reset: the new generation is ready and the previous Conversation remains preserved. When the text is invisible, the user sees a mysterious blank pill and loses confidence in the safety of the reset operation.

## Evidence

Navigator screenshot supplied on 2026-09-19 from installed alpha.10 shows the active Mirror Desktop Journey after a reset-context route. The centered notice is visible as a pale rounded container, but the text `Generation 3 is ready. Previous conversation preserved.` is nearly indistinguishable from its background.

Published source inspection confirms:

- `src/app/App.tsx` renders `journeyReloadStatus` with class `journey-reload-status`.
- `src/styles/app.css` defines `.journey-reload-status` with `color: #bff2eb`.
- No published light-theme override for `.journey-reload-status` is present in alpha.10.
- CR036 already documents the same visual contract and its isolated Dev validation, but records no commit, push, merge, publication or release.

## Proposed Scope

- Reapply the CR036 light-theme-only semantic foreground contract for `.journey-reload-status` on the current published line.
- Keep the dark-theme declaration unchanged.
- Restore or add focused application-theme regression coverage proving the notice text contrast for Daylight, Mist and Parchment.
- Validate the screenshot route in the installed/dev light-theme flow after the fix.

## Affected Files

- `src/styles/app.css`
- `src/tests/applicationTheme.test.ts`
- This CR document and Workbench indexes.

## Acceptance

- `Generation N is ready. Previous conversation preserved.` is readable in Daylight, Mist and Parchment.
- Automated theme coverage asserts a contrast ratio at or above the established 4.5:1 threshold for the generation-ready notice text against its effective light-theme surface.
- Dark-theme notice presentation remains unchanged.
- No generation lifecycle, Conversation preservation, Pi session, Mirror synchronization, reset authority or provider execution behavior changes.

## Validation Plan

- Run `npm test -- --run src/tests/applicationTheme.test.ts`.
- Run the relevant frontend test suite or complete `npm test -- --run` if the change remains small and deterministic.
- Run `npm run build` if this is prepared for release inclusion.
- Manually validate the reset-context route in at least one affected light theme.

## Exclusions

- No redesign of the notification system.
- No change to wording, duration or placement of the generation-ready notice.
- No change to Terminal-Aligned Conversation Continuity behavior.
- No production data mutation.
- No alpha publication, tag, merge or release without separate Navigator authority.

## Plan Decision

The Navigator confirmed Driver `@alissonvale` and Delivery `refinement/rs016-cr052-generation-ready-notice-contrast`, approved this plan, and authorized implementation. Commit remains locally authorized by standing project convention when files change. Push, merge, publication and release remain separate decisions.

## Implementation

The shipped line now restores the missing light-theme semantic foreground contract for `.journey-reload-status`. The base dark-theme declaration remains unchanged with `color: #bff2eb`; only Daylight, Mist and Parchment override the notice text to `var(--light-text)`.

`src/tests/applicationTheme.test.ts` now includes focused coverage for the generation-ready notice. For every supported light theme, it computes the notice surface and asserts the primary text contrast remains at or above 4.5:1. The test also asserts the dedicated CSS contract exists.

## Validation

- `npm test -- --run src/tests/applicationTheme.test.ts`: passed, 14 tests.
- `npm test -- --run`: passed, 153 files and 836 tests.
- `npm run build`: passed. Vite emitted the existing chunk-size advisory only.

## Navigator Validation

Accepted by the Navigator after visual validation of the affected light-theme reset route. The generation-ready notice is readable and the correction is approved for closure.

## Proportionality Review

The correction is proportional: it restores one missing light-theme foreground contract for the existing generation-ready notice and adds focused contrast coverage. It does not change notice wording, lifecycle, placement, generation authority, Pi execution, Mirror synchronization or dark-theme presentation.

## Debt Review

**Decision:** no_action

No additional debt is accepted. The implementation uses existing semantic light-theme tokens and established application-theme contrast tests.

## Outcome

Done. The generation-ready notice contrast correction is implemented, covered by automated tests and accepted by the Navigator. Push, merge, publication and release remain separate decisions.

## Authority Boundary

The Navigator authorized opening, selecting, planning and implementing this CR. Push, merge, publication and release remain separate decisions unless explicitly authorized later.
