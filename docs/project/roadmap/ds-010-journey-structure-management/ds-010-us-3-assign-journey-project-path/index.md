[< DS-010](../index.md)

# DS-010.US-3 — Assign Journey Project Path

**Status:** 🟢 Done
**Type:** User Story

---

## User Story

As the Navigator,
I want to assign or correct a Journey's local project path,
So that project-backed artifacts and projections resolve from an explicit canonical association.

## Outcome

A Journey-scoped management action exposes whether a path is assigned and allows choosing, replacing or clearing it through a native directory picker and explicit confirmation. Mirror updates only `project_path`; Harness accepts the result after verified reload.

## Acceptance Behavior

```text
Given a canonical Journey and an accessible local directory
When I confirm the project association
Then only that Journey's project_path changes and project-backed surfaces resolve from the verified canonical path.
```

## Scope

- Journey-scoped action placement and keyboard access.
- Native directory picker.
- Canonical directory, existence and authority validation.
- Assign, replace and clear confirmation flows.
- Path privacy and recoverable failure treatment.

## Out Of Scope

- Creating or mutating project files/directories.
- Inferring paths from slug, name, Git or recency.
- Granting broad filesystem mutation authority.

## Validation

Assign, replace and clear paths; exercise missing, file-not-directory, symlink escape, stale authority and cancellation; verify artifacts follow the accepted association while Journey identity and thread state remain unchanged.
