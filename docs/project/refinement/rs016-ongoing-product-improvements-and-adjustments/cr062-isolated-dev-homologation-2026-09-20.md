[< CR062](cr062-make-post-terminal-finalization-self-healing-and-actionable.md)

# CR062 Isolated DEV Homologation — 2026-09-20

## Scope and Authority

The Navigator authorized isolated DEV homologation only. The rehearsal did not launch Stable or Eval, mutate production app data, repair the production turn, push, merge, publish or release.

Mirror Desktop DEV ran against an atomically swapped app-data fixture and a SQLite backup under `/private/tmp`. The ordinary DEV app-data directory was restored after every launch and its complete bounded inventory digest matched before and after. The installed Mirror checkout was executed read-only because the separate `mirror-dev` checkout exposed Core `0.31.12`, below Desktop's required `>=0.31.14,<0.32.0`; all Mirror writes were directed to the sandbox database.

## Fixture

A completed, authority-valid DEV turn was copied from Journey `mirror-desktop` and rewound only inside the sandbox to:

```text
terminal_durable / resume_projection
exact outbox item absent
exact two Mirror message IDs absent
native execution inactive
```

Two unrelated historical DEV records left at `admitted/running` without uniquely claimable Pi turns were marked `interrupted` only in the copied fixture. Before that isolation correction, recovery failed closed with `mirror_append_pi_recovery_ambiguous` and exposed the persistence-only recovery surface without invoking a provider.

## Successful Route

On Conversation hydration, the implementation completed the exact retained turn in 14.1 seconds:

```text
terminal_durable
→ schema 1.1.0 outbox materialization
→ exact Mirror append
→ projection receipt merge
→ outbox acknowledgement
→ settled / complete
```

Observed final state:

- journal phase: `settled`;
- recovery disposition: `complete`;
- exact outbox items: `0`;
- exact Mirror messages: `2`;
- both Mirror message IDs and roles matched the authority-bound projection;
- both Mirror message contents matched the projection exactly;
- projection Mirror state: `committed` with the exact user and assistant message IDs;
- journal run set unchanged: no new run was created;
- every copied Pi JSONL file remained byte-for-byte unchanged;
- successful relaunch showed the Conversation without a synchronization/finalization notice and with the Composer available.

## Safety Verification

- No provider or model execution occurred: no new journal run appeared and all Pi session hashes remained unchanged.
- The exact outbox item was acknowledged rather than retained or duplicated.
- The ordinary DEV app-data inventory was restored exactly with digest:
  `03b286634eb42819828c861d449f3cda07981ed02bbeb41ba0d8543111dc216d`.
- Production `turn-journal/mirror-desktop.json` and `mirror-append-outbox.json` hashes remained unchanged across the rehearsal.
- No Mirror Core source file was edited.
- All launched DEV processes were terminated before completion.

## Additional Fail-Closed Evidence

The setup surfaced three bounded environmental/fixture failures before the successful route:

1. non-canonical `/tmp` binding rejected in favor of `/private/tmp`;
2. incompatible Core `0.31.12` rejected before runtime use;
3. ambiguous unclaimed historical Pi debt rejected as `mirror_append_pi_recovery_ambiguous` with an actionable persistence-only retry surface.

These failures did not mutate production and confirm that automatic recovery does not bypass canonical-path, Core-version or exact-evidence gates.

## Result

**PASS — isolated DEV homologation.**

CR062 is ready for Navigator review. Production repair, acceptance, closure, push, merge, publication and release remain separately governed.
