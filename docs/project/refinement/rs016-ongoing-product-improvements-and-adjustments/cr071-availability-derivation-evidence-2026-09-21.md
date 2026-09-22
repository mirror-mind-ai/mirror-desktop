[< CR071](cr071-stop-offering-models-the-desktop-invocation-cannot-run.md)

# CR071 — Availability Derivation Evidence (2026-09-21)

Availability is decided by comparing two catalog reads of the same Pi
binary. `--list-models` performs no inference and contacts no provider: it
prints the models the loaded extension set registered. "Unavailable"
therefore means exactly "this invocation could not resolve the model" —
the `No models match pattern` startup failure — and nothing about quota,
credentials or network.

Measured on the Navigator's installation, `PI_OFFLINE=1`:

| Read | Flags | Lines | `claude-bridge` models |
| --- | --- | --- | --- |
| A — offering | ordinary discovery | 29 | 8 |
| B — pre-CR072 Desktop | `--no-extensions` | 21 | 0 |
| C — invocation-shaped | `--no-extensions` + resolved `--extension` entries | 29 | 8 |

Read C carries the same extension flags the mirror-mediated send uses, so
the comparison is the send's own resolution question, asked ahead of time.

B documents the original defect: the catalog offered 8 models the
invocation could not resolve. C documents CR072's effect: offering and
runnable now coincide, so nothing is marked unavailable on this machine —
CR071 stands as a silent guard that speaks only when an extension stops
resolving or a retained override points at a model the send cannot run.
