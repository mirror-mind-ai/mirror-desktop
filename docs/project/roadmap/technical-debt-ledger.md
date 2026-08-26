# Technical Debt Ledger

Ariad Review records technical debt here when debt should be paid now or deferred.

| ID | Source Story | Location | Kind | Description | Impact | Recommendation | Navigator Decision | Status |
|----|--------------|----------|------|-------------|--------|----------------|--------------------|--------|
| [TD-001](cv-003-nautilus-method-integration/ds-006-three-published-journey-projections/cv-003-ds-006-ts-2-repository-baselines-and-mirror-compatibility/td-001-operational-relative-link-confinement-defect.md) | CV-003.DS-006.TS-2 | Mirror `OperationalCompiler._resolve_link` | External contract defect | Mirror v0.31.10 rejected confined roadmap table links containing `..`, including existing CV-001 links to root delivery stories, so post-lifecycle Operational refresh returned `unsafe_projection_path`. | Ariad truth advanced while `operational.json` remained stale. | Resolved in Mirror v0.31.11; installed public rebuild accepted unchanged links and established matching manifest/document coordinates. | Driver accepted immutable release and installed consumer evidence; gate opened. | Resolved |

## Deferred Debt Requirements

When debt is deferred, record the defer reason and revisit trigger.
