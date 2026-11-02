[< RS026](index.md)

# CR174: A Bound Home That No Longer Opens Must Not Hold the App

**Status:** in_progress
**Line:** 0.3 · Desktop only

## Friction

Found by the Navigator on 2026-11-02, testing CR173 in development. The dev app was bound to
`~/Mirror Homes/ensaio-alisson-vale`, a copy that never received the 0.3 mark. Setup showed
"Create your Mirror" with `… is not a marked 0.3 home.` in red, and neither way out worked:

- **Open an existing Mirror home…** on `ensaio-5c-2` (marked, adopted on Core 0.39.0) did nothing
  visible. The binding file stayed as it was.
- **Create my Mirror** would have refused the same way.

The cause is in `bind_marked_home` and `create_mirror_home` (`src-tauri/src/main.rs`): before binding,
both call `mirror_home::load_home_binding(app_data_root)?`, which opens the *current* home through
`MarkedHome::open` to learn its id for `home_switch_refusal`. A current home that no longer opens
makes that `?` return its error, the same sentence already on screen, so the person sees no change
and cannot leave. The guard exists to keep a turn from losing its home mid-flight; a home that does
not open can have nothing in flight.

A second, smaller finding on the same screen: **Choose another place…** (the folder a *new* home
goes in) and **Open an existing Mirror home…** open the same folder picker, and the Navigator chose
the first by mistake. The preview line then read `Your Mirror home will be …/ensaio-5c-2/…` while
the old red sentence stayed, as if it were about the new choice.

Unblocked by hand the same day: the dev binding was renamed to
`runtime-home.v2.json.ensaio-alisson-vale` in the dev app data folder. Nothing was deleted;
production was not touched.

## Direction

1. **A current binding that does not open counts as no current home** for the switch refusal:
   opening another home or creating one proceeds, and the unreadable binding is replaced. A binding
   that opens keeps today's guard unchanged.
2. **Every choice clears the old message**, so a sentence on screen is always about the last thing
   done.
3. **The two pickers say what they are for** in their titles and in the screen's words, so a folder
   for a new home is not mistaken for a home to open.

## Delivered on `main` (`be81e1c`)

- `mirror_home::bound_home_id_for_switch`: the bound home's id when it opens; a binding that does not
  open (unmarked, gone, unreadable) counts as none. Used by binding, creating **and adopting** a
  home: `adopt_mirror_home` had the same `load_home_binding(..)?`, not named in the friction above.
  `load_home_binding` itself still reports a broken binding, so the diagnostic keeps saying why.
- The old home's sentence is no longer shown as an error. It reads "The Mirror home this app opened
  before can no longer be opened: … Create a new one, or open another.", and goes once the person
  chooses either picker.
- "Choose another place…" is now "Create it in another folder…"; the pickers' titles are "Open an
  existing Mirror home" and "Choose the folder your new Mirror home is created in".
- Spec first; 5 mutation controls, each applied and caught. Full suites: 2486 TypeScript, 450 Rust.

### Navigator check in development (owed)

The dev binding to `ensaio-alisson-vale` was kept as `runtime-home.v2.json.ensaio-alisson-vale`.
Putting it back reproduces the field case: Open an existing Mirror home… on `ensaio-5c-2` should
bind it in one try.

## Acceptance

- Spec first: with a binding to an unmarked folder, `bind_marked_home` on a marked home binds it,
  and `create_mirror_home` creates and binds; with a binding that opens and a busy Desktop, both still
  refuse. Mutation controls on the new branch.
- The screen shows no stale sentence after a choice (component test).
- Navigator check in dev: bound to an unmarked copy, Open an existing Mirror home… reaches the
  marked home in one try.
