[< RS016](index.md)

# CR036: Restore Generation Ready Notice Contrast in Light Themes

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr036-generation-ready-notice-contrast`

## Problem

The centered generation-ready notice shown above the Conversation can become effectively unreadable in light application themes. In the observed state, the sentence `Generation 2 is ready. Previous conversation preserved.` uses an extremely pale foreground against a pale blue notice surface, so the message appears blank even though its container remains visible.

## Expected Behavior

The generation-ready notice remains clearly readable in every supported light theme while preserving the existing notice hierarchy, wording and generation-transition behavior. Its text and surface should retain sufficient contrast without degrading dark-theme presentation.

## Impact

The hidden sentence removes confirmation that the new generation is ready and that the previous Conversation was preserved. Users can see that a notice exists but cannot recover its meaning, weakening trust at the exact point where Conversation continuity is being communicated.

## Plan Or Decision

### Proposed Scope

- Add a light-theme-only semantic contrast contract for `.journey-reload-status` in Daylight, Mist and Parchment.
- Preserve the existing notice wording, rounded visual hierarchy and dark-theme treatment.
- Extend application-theme regression coverage with measurable text-to-notice-surface contrast for every supported light palette.

### Affected Files

- `src/styles/app.css`
- `src/tests/applicationTheme.test.ts`

### Acceptance

- The sentence `Generation 2 is ready. Previous conversation preserved.` is clearly readable in Daylight, Mist and Parchment.
- Notice text meets the established 4.5:1 contrast threshold against its effective light-theme background.
- The existing border, layout, wording, generation transition behavior and dark-theme presentation remain unchanged.

### Validation

- Run `npm test -- --run src/tests/applicationTheme.test.ts`.
- Run the complete frontend test suite and `npm run build`.
- Rebuild isolated `Mirror Desktop Dev` for Navigator validation of the supplied screenshot route in at least one affected light theme.

### Exclusions

- No change to generation lifecycle, Conversation preservation, notice timing or wording.
- No redesign of the general notification system or light-theme palettes.

### Authority Boundary

The Navigator approved this plan and assigned Driver `@alissonvale` with Delivery branch `refinement/rs016-cr036-generation-ready-notice-contrast`. Local implementation is authorized. Commit, push, merge, publication and release remain separate decisions.

## Evidence

Navigator screenshot supplied on 2026-09-17 shows the notice container in a light theme with the sentence `Generation 2 is ready. Previous conversation preserved.` rendered nearly indistinguishably from its background.

Implementation evidence:

- `src/styles/app.css` adds a light-theme-only semantic foreground contract for `.journey-reload-status` while preserving its existing surface, border, layout and dark-theme declaration.
- `src/tests/applicationTheme.test.ts` calculates generation-ready notice contrast in Daylight, Mist and Parchment and asserts the dedicated CSS boundary.
- The new focused regression test failed before the CSS contract was added, then passed after implementation.
- `npm test -- --run src/tests/applicationTheme.test.ts`: passed, 14 tests.
- `npm test -- --run`: passed, 144 files and 801 tests.
- `npm run build`: passed. Vite emitted the existing chunk-size warning only.
- `npm run tauri:build:dev`: passed and produced the isolated `Mirror Desktop Dev.app` and DMG.

## Navigator Validation

Accepted by the Navigator in isolated `Mirror Desktop Dev` on 2026-09-17 after confirming that the generation-ready notice is readable in the affected light-theme route.

## Proportionality Review

The correction is limited to one light-theme foreground override and one regression test in the existing application-theme suite. It leaves the notice component, wording, lifecycle, surface treatment, dark themes and general notification styling unchanged.

## Debt Review

**Decision:** no_action

The implementation reuses the existing `--light-text` semantic token and established contrast-test helpers. It introduces no new theme token, styling system, component branch or runtime behavior. Broader notice-system refactoring would exceed the validated defect without removing debt introduced by this correction.

## Outcome

Done. The generation-ready notice is readable in Daylight, Mist and Parchment, automated checks passed, and the Navigator accepted the rebuilt isolated Dev route. No commit, push, merge, publication or release was performed.
