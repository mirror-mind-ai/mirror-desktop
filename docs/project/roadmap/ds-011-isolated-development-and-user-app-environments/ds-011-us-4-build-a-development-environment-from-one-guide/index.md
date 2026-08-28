[< Parent](../index.md)

# DS-011.US-4 — Build a Development Environment from One Guide

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As a human developer or coding agent,
I want one concise canonical guide for constructing the isolated Nautilus Dev and Mirror Dev environment,
So that I can reach a verified development launch without relying on prior conversations, undocumented machine state or production data.

## Outcome

A new contributor or agent can start from the documented prerequisites, establish the Mirror Dev and Nautilus Dev roots, run the supported setup and launch commands, verify the active runtime identities and diagnose common failures without touching the stable Nautilus app or production Mirror database.

## Acceptance Behavior

```text
Given a machine that satisfies the documented operating-system and toolchain prerequisites
And the stable user application and production Mirror home may already exist
When a human or coding agent follows the development-environment guide in order
Then the Mirror Dev code/home/user/database contract is established explicitly
And Nautilus Dev launches with its distinct bundle identity, icon, visual treatment and Harness data root
And the runtime diagnostic confirms the expected development coordinates
And no step requires reading historical chat instructions or mutating production state
```

```text
Given setup or verification fails
When the reader consults the same guide
Then bounded troubleshooting identifies the failed prerequisite or identity boundary
And recovery commands remain safe to run without deleting stable user data
```

## Documentation Contract

The canonical guide must include:

- supported operating-system scope and required toolchains;
- repository and runtime directory layout using `$HOME`-relative examples;
- how to obtain or prepare `~/Code/mirror-dev`;
- the `MIRROR_HOME`, `MIRROR_USER` and `DB_PATH` development contract established by `~/mirror-dev.sh`;
- Nautilus Dev installation, launch, build and test commands;
- first-run initialization that does not copy production conversations, memories or credentials;
- a copy-pastable verification checklist for bundle ID, app-data root, Mirror code/home/user/database and visible `DEV` identity;
- safe troubleshooting for missing tools, wrong paths, channel mismatch and accidental production fallback;
- explicit warnings before any destructive reset command;
- references from the repository entry documentation and agent-facing instructions so humans and agents discover the same source.

## Scope

- One canonical guide rather than divergent human and agent procedures.
- Short conceptual explanation followed by deterministic commands.
- Commands that can be executed individually and inspected before mutation.
- Verification that proves isolation, not merely successful process startup.

## Out Of Scope

- A universal installer for every operating system.
- Automatic copying of production Mirror data, credentials or Harness state.
- Provisioning cloud services or provider accounts.
- Replacing the repository's broader architecture and contribution documentation.

## Validation

- A human follows the guide from prerequisites to the first verified Nautilus Dev launch.
- A coding agent with only repository instructions can locate and follow the same guide.
- Documentation commands are exercised against the delivered development channel.
- Link and source checks prove there is one canonical setup procedure rather than duplicated drifting copies.
