# Technical Debt Ledger

Ariad Review records technical debt here when debt should be paid now or deferred.

| ID | Source Story | Location | Kind | Description | Impact | Recommendation | Navigator Decision | Status |
|----|--------------|----------|------|-------------|--------|----------------|--------------------|--------|
| TD-001 | CV-003.DS-006.TS-2 | Mirror `OperationalCompiler._resolve_link` | External contract defect | Mirror v0.31.10 rejects confined roadmap table links containing `..`, including existing CV-001 links to root delivery stories, so every post-lifecycle Operational refresh returns `unsafe_projection_path`. | Ariad truth commits, but `operational.json` remains stale and the released auto-refresh promise is unusable for this Journey. | Fix canonical confinement to permit relative parent traversal that resolves inside the registered Journey; add regression fixture and release a patched Mirror before synthesis depends on current Operational. | Driver deferred because TS-2 through TS-4 do not consume live Operational; mandatory revisit before explicit synthesis implementation. | Deferred |

## Deferred Debt Requirements

When debt is deferred, record the defer reason and revisit trigger.
