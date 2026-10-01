[< RS021](index.md)

# CR101: Restore Window Geometry

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr101-window-geometry`

## Pull — 2026-10-01

The Navigator explicitly pulled CR101 as the next item in the confirmed UX-first order after
homologating and closing CR103. This branch is limited to CR101 characterisation and, only after
further explicit instruction, its implementation.

## Friction

Mirror Desktop opens with a generic window geometry rather than the position and dimensions where
the Navigator last left it.

## Outcome

The app restores a usable last-known window position and size on the same display arrangement,
while falling back safely when that geometry is no longer visible or valid.

## First Investigation

Characterise native window lifecycle events on macOS: move, resize, close-to-hide, explicit quit,
reopen and display changes. Decide the durable local ownership and bounded schema before adding any
write path.

## Acceptance

- After an explicit quit and relaunch, the main window restores its last usable bounds.
- Closing and reopening the hidden window preserves the current usable geometry.
- An off-screen, malformed, obsolete-display or too-small geometry falls back to safe default bounds
  without trapping the app.
- Geometry remains local application preference; it never mutates Journey, Conversation or Mirror
  data.

## Diagnosis — 2026-10-01

### Nothing was persisted at all

The three channel configs opened the window at a fixed `1100×760`, minimum `860×620`. There was no
`tauri-plugin-window-state`, no geometry file in the Dev App Data directory and no read or write path
anywhere in the app.

What already worked, and why it was not enough: CR085 hides the window on close instead of destroying
it (`onCloseRequested` → flush drafts → `appWindow.hide()`), and `RunEvent::Reopen` reveals the same
window. Geometry therefore survived *within* a process but never *across* one. An explicit quit ended
the process and the next launch returned to the fixed configuration.

### Two routes, and why the native one was chosen

The installed `@tauri-apps/api` exposes `outerPosition`, `outerSize`, `currentMonitor`,
`availableMonitors`, `onMoved`, `onResized`, `setPosition` and `setSize`, so the frontend could own
this. It was rejected: the frontend would need four new window permissions in `capabilities/default.json`,
and it can only restore after the webview has loaded, which means the Navigator watches a default
window jump into place. Natively the window can be placed before it is ever shown, and the frontend
gains no window authority it did not have.

## Repair — 2026-10-01

### The decision is separated from the window that performs it

New `src-tauri/src/window_geometry.rs` holds every rule as a pure function over stored geometry and
the monitor work areas the platform reports, so the cases that matter are provable without a running
window: 16 unit tests cover them.

### Reachability, not a monitor fingerprint

The first design recorded a fingerprint of the display arrangement and refused to restore when it
changed. That was dropped: unplugging an unrelated display would discard perfectly good geometry. The
question that actually matters is whether the window would be *reachable*, so validation asks exactly
that — a `120×48` patch inside some monitor's **work area**, plus a top edge at or below that work
area. The second rule is specific to macOS: a window whose title bar sits under the menu bar can be
seen but not dragged out. Nothing unused is stored, so the file is just a schema version and four
numbers.

### Physical pixels, and an honest account of the size floor

Geometry is stored in physical pixels, matching what the monitors report, so no conversion is needed
to judge overlap. The corruption floor reuses the configured logical minimum (`860×620`) against
physical pixels. This is sound in one direction only and deliberately loose: on the 2× display
measured here every legitimate window is at least `1720` physical pixels wide, so the floor catches
damaged data rather than enforcing layout. Tauri still clamps to the real minimum when the size is
applied.

### The finding that changed the implementation

Geometry was first applied in `setup`. Measured against the real window, it had no effect — the window
opened at the default on every stored value. Window commands are messages to the event loop, and in
`setup` nothing is processing them yet. Moving the work to `RunEvent::Ready` made the restore exact.

The window is configured `visible: false` in all three channel configs and shown from `Ready` after
geometry is applied, so the restore is never a visible jump. Showing is unconditional and separate
from the decision: no geometry problem can leave the app running with no window.

### Recording

`Builder::on_window_event` records on `Moved` and `Resized` only. A minimized window reports its
minimized bounds and a fullscreen window reports the whole screen, so neither is recorded — restoring
either as a normal window would hand back something the Navigator never arranged. Writes are throttled
to one per 400 ms, with a final flush on `ExitRequested` so the last arrangement is never the one lost.

### A rejected file is kept, not repaired

Geometry that fails validation stays on disk untouched. A file written by a future schema keeps its
content for a version that understands it, and a transiently unplugged display does not destroy the
arrangement behind it.

### Every fallback names its reason

`GeometryRejection::reason_code` gives `nothing_stored`, `unreadable`, `malformed`,
`unsupported_schema`, `implausible_size`, `no_monitors_reported` and `no_visible_monitor_overlap`.
Everything except a first launch is logged, so geometry that quietly stopped being restored is a
readable signal.

### Validation

Decision branches exercised against the real binary and the real display (work area `3072×1700`
physical, scale 2), then the resulting window measured through the macOS window server:

| Stored geometry | Window on screen (logical) | Outcome |
| --- | --- | --- |
| none | `218,53 1100×760` | default, nothing logged |
| physical `600,400 2360×1640` | `300,200 1180×820` | restored exactly |
| physical `200,160 2000×1400` | `100,80 1000×700` | restored exactly |
| off-screen | `218,53 1100×760` | `no_visible_monitor_overlap`, window visible |
| corrupt text | — | `malformed` |
| `12×8` | — | `implausible_size` |
| schema `9.9.9` | — | `unsupported_schema`, file preserved |

Gates: `tsc` clean, 205 files / 1350 TypeScript tests, `cargo test --locked` 231 passed, production
build, `roadmap:check` READY, `git diff --check` clean. Dev installed at `0.2.0-alpha.27`, binary
`3ed0ae13a6f13c6f`.

### Declared limits

- A maximized window is restored as its bounds, un-maximized. The two look nearly identical and no
  maximized flag is persisted.
- The throttle can lose up to 400 ms of movement if the app is force-quit or crashes. An ordinary quit
  flushes first.
- Geometry is only written once the Navigator moves or resizes. A window never touched stores nothing
  and keeps opening at the configured default.
- Reachability is judged against the displays present at launch. A window restored onto a display that
  is unplugged moments later is not re-validated until the next launch.
- Per CR101's own boundaries: no cross-machine sync, no multi-window layout manager, and no
  persistence of workspace content beyond native geometry.

## Closure — 2026-10-01

The Navigator homologated the Dev build. CR101 is closed: after an ordinary quit the app reopens
with the last reachable arrangement, while missing, corrupt, stale or off-screen data falls back to
a visible default without silently destroying the stored evidence. Window geometry remains native
state only; no frontend window permission, Journey authority or workspace content authority changed.

## Boundaries

No cross-machine sync, no multi-window layout manager and no persistence of workspace content beyond
native geometry.
