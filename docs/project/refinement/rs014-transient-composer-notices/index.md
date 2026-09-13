[< Refinement Workbench](../index.md)

# RS014 — Transient Composer Notices

## Framing

Refine the notices displayed between conversation output and the composer so event-like feedback remains visible long enough to understand and then clears itself, while active operational conditions remain visible until their underlying state changes.

## Desired Outcome

A user does not need to restart Mirror Desktop to clear a stale file, attachment, send or recovery message. Transient notices expire predictably without weakening persistent warnings, recovery actions, runtime authority or accessibility.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Refinement remains file-first. Legacy SQLite Workbench state is not inspected, reconciled or dual-written.
- Transient event notices and persistent condition notices must be classified explicitly before implementation.
- A timeout must not hide runtime configuration failures, blocked recovery, retained leases, capacity occupancy, pending Mirror synchronization or any notice requiring user action.
- No release, push, publication, updater endpoint, Mirror identity, Journey, conversation or protected app-data mutation is authorized.

## Change Requests

- [CR027 — Auto-dismiss transient composer notices](cr027-auto-dismiss-transient-composer-notices.md)

CR027 is `planned` and selected for refinement. RS014 is active. Driver and Delivery remain unset pending explicit Navigator authority.
