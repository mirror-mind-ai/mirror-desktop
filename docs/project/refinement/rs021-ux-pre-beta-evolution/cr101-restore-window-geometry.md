[< RS021](index.md)

# CR101: Restore Window Geometry

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Boundaries

No cross-machine sync, no multi-window layout manager and no persistence of workspace content beyond
native geometry.
