[< Story](index.md)

# Concurrent Load Characterization — CV-008.DS-002

**Journey:** `mirror-desktop`  
**Capacity under evaluation:** 4  
**Evidence state:** deterministic implementation evidence passed; natural isolated development validation required

## Environment

```text
macOS: 26.6.2
Architecture: x86_64
CPU: Intel Core i7-9750H 2.60 GHz
Memory: 17,179,869,184 bytes
Pi: 0.85.1
Node: 24.6.0
Rust: 1.95.0
Mirror Desktop: 0.2.0-alpha.6 development source
```

No production conversation, prompt, path, credential, screenshot or log is retained in this artifact.

## Native Registry Characterization

The focused Rust suite exercised production capacity four with private fake authorities and children:

```text
24 tests passed
four distinct concurrent reservations admitted
five simultaneous reservations produced exactly four winners
fifth reservation rejected before start callback
one lease per Journey retained
finalizing lease continued to occupy admission
first terminal transition won
stale target could not change replacement
four-child shutdown snapshot remained sorted and bounded
all four child controls attempted when an earlier control failed
```

Measured command process envelope, including debug compilation and the test harness rather than a packaged app:

```text
elapsed: 14.16 s
maximum resident set size: 513,630,208 bytes
peak memory footprint: 102,334,464 bytes
```

These memory figures are build/test-process observations and are not interpreted as per-Pi runtime consumption.

## Frontend Characterization

The focused frontend suite exercised four admitted authorities, bounded inspection and owner-keyed interleaving:

```text
49 tests passed across 3 files
Vitest duration: 2.26 s
measured command elapsed: 3.58 s
maximum resident set size: 210,718,720 bytes
peak memory footprint: 22,306,816 bytes
```

The four-way state case interleaved a normal completion, owner-specific warning, targeted cancellation and sibling message delta. Each outcome remained confined to its Journey entry. Occupancy projection accepted only governed limits 1, 2 and 4, rejected 0, 3, 5 and inconsistent evidence, exposed only aggregate used/limit values and returned no presentation while free.

## Pi Process Baseline

Four extension-free, session-free Pi 0.85.1 RPC processes were started concurrently with `PI_OFFLINE=1`. Each handled one correlated read-only `get_state` request and returned zero conversational messages. No provider request, session persistence, Mirror extension or Journey data was involved.

```text
successful correlated responses: 4 / 4
elapsed: 0.87 s
maximum resident set size: 122,306,560 bytes
peak memory footprint: 548,864 bytes
```

This proves that four local Pi RPC process boundaries start and answer concurrently on the characterization host. It does not substitute for Mirror-mediated Journey execution or Navigator interaction validation.

## Implementation Decision

The deterministic evidence supports carrying capacity four into the isolated development candidate:

- the registry remains bounded and atomic;
- shutdown control covers every production-admitted child;
- frontend inspection and aggregate presentation remain bounded;
- four owner-keyed runtime entries tolerate interleaved outcomes;
- four ephemeral Pi RPC processes run concurrently on the target host.

A release-mode isolated bundle was built successfully as `Mirror Desktop Dev`, bundle ID `ai.mirrormind.desktop.dev`, version `0.2.0-alpha.6`, architecture `x86_64`. Its identity and executable were inspected without installing a user-channel artifact. A packaged interaction session was not retained because another development instance already owned the same isolated app identity; the newly opened duplicate was terminated without disturbing the existing instance or its data.

Capacity four is not yet accepted as delivered product behavior. The required next evidence is the natural `Mirror Desktop Dev` route with four disposable development Journeys, one Steering message, a fifth-Journey refusal, targeted cancellation, independent settlement and restart recovery. Failure of that route blocks Validation and any release; it does not authorize a larger or silently reduced capacity.

## Boundary

Four is the intended supported horizon. Growth above four requires separately governed product need and new characterization. The production constant has no environment or user override, and rollback to two remains one bounded code change without persistence migration.
