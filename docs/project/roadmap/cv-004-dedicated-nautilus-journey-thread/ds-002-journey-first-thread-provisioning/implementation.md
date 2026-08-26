# Implementation — CV-004.DS-002

Delivered an explicit model-free **Start this Journey** flow. Tauri reserves a durable Journey-scoped operation, creates a named native Pi session through RPC `get_state`, creates or recovers one Journey-bound Mirror conversation, emits a bounded activation receipt, and atomically publishes the ready dedicated thread. Failed partial operations preserve the requested Pi ID for idempotent retry; in-process duplicate starts are rejected.

The desktop renders start, progress, failure and retry states. It ignores late results after Journey switching, keeps the composer gated by verified receipt readiness, and creates an empty dedicated conversation projection using the exact native IDs. Start produces no prompt, synthetic turn, assistant greeting or provider request. The first real invocation uses the dedicated Pi session and the pre-bound Mirror runtime conversation; DS-003 remains responsible for dedicated three-body turn commit/repair.

Verification: 44 frontend files / 270 tests, production build, 19 Rust tests, `cargo check`, and 4 Harness Python tests. A temporary Mirror-home probe proved conversation provisioning idempotent with the same native conversation ID.
