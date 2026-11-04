[< CV-012](../index.md)

# CV-012.DS-001 - Launch With Only the Canonical Set

**Status:** ✅ Validated in development by the Navigator on 2026-11-04 — shipping in v0.3.0-alpha.14

## Outcome

A person who installs the app sees only the canonical set: Journeys and their conversations. The
Context Map, the Agent's Canvas, Ariad and the Tactical and Strategic altitudes are hidden by
default and can be turned back on in Settings, marked experimental.

## Why Now (Navigator, 2026-11-03)

The rename (CV-013) is the last step before the Navigator goes out to promote the app. A function
that ships in that launch becomes something people use, and moving it into an extension later means
taking it away from them. Hiding it before the launch costs little, because the code stays.

## Candidate Scope

- `OperationalWorkspaceSwitcher` offers Conversation only by default; Context Map (`artifacts`),
  Agent's Canvas (`canvas`) and Ariad (`ariad`) appear when their setting is on.
- `JourneyAltitudeSwitcher` is hidden by default, so the Journey opens at the Operational altitude
  only; Tactical and Strategic appear when their setting is on. With one surface and one altitude
  left, neither switcher needs to show at all.
- One Settings switch per function, off by default for a new installation. The Navigator's
  installation keeps them on, because the Navigator uses the Canvas daily; how that is decided
  (carried setting or a first-run default) is a planning question.
- A persisted selection of a hidden surface falls back to Conversation instead of an empty view.
- When CV-012's extensions exist, each switch becomes "turn this extension on".

## Open Before Planning

- ~~Ariad and the Tactical and Strategic altitudes: hide them too?~~ **Decided by the Navigator,
  2026-11-03: yes, they are outside the canonical set too and are hidden in this story.**
- One switch per function, or one switch for "Nautilus method" (Ariad and the altitudes) and one per
  surface.
- Whether hiding also stops the work behind each surface (reads, prompts to the agent about the
  Canvas), or only the surface.

## Decided and Built (Navigator, 2026-11-04)

The Navigator chose neither of the two switch layouts proposed above. Instead:

- **Settings › Extensions**, a new tab, holds two switches: **Agent Field** and **Agent Canvas**.
  Both are off by default, the Navigator's installation included, and each shows or hides its tab
  beside Conversation.
- The tab says that extensions are still being built and that these options are a bridge from
  what exists to how it will work.
- **Renamed:** the Context Map is now the **Agent Field**, the Nautilus framework's name for it, and
  Agent's Canvas is now **Agent Canvas**. The persisted surface ids (`artifacts`, `canvas`) are
  unchanged.
- **Ariad and the Tactical and Strategic altitudes** needed no switch. They were already hidden by
  `journeySurfaceAvailability`, so the question above is moot.

What the build also does:

- With both switches off, only Conversation is left and the surface switcher is not drawn.
- A remembered selection of a surface that is off falls back to Conversation.
- The Canvas is read only while it is actually shown.
- A Journey document clicked in a conversation opens outside the app when the Agent Field is off,
  since there is no surface to show it in.

Code: `src/domain/appExtensions.ts`, `src/app/ExtensionsSettings.tsx`, and the surface rules in
`journeySurfaceAvailability.ts`. Spec: `src/tests/cv012Ds001ExtensionsTab.test.tsx`, checked
failing first and by mutation. Six older guards were re-aimed to the seventh Settings tab and the
new names.
