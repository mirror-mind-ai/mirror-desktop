[< RS016](index.md)

# CR158: Stop One Agent Settings Write From Dropping Another

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

Not reported from the field. Found while reading `App.tsx` for CR154, and captured rather than
repaired inside it so that the field can attribute each repair to the symptom it was aimed at.

## The Mechanism

`persistAgentSettings` builds its argument from the `agentSettings` captured in the calling render's
closure, writes the file, and only then updates state:

```ts
async function persistAgentSettings(next: AgentSettings, successMessage: string) {
  …
  await saveAgentSettings(next);
  setAgentSettings(next);
```

Every one of the six callers computes `next` from the closure's `agentSettings` **before** awaiting.
So two writes issued before the first `setAgentSettings` lands both merge onto the same pre-first
value, and the second **silently overwrites the first**. A Journey override set by the first write
disappears, and that Journey falls back to the global default.

Nothing reports it. The second write succeeds, its success message is shown, and the file is valid.

## Why It Is Not CR154's Symptom

The window is the duration of one file write. The Navigator's CR154 report contains a turn between
the two choices, which runs for tens of seconds — the window closes many times over before the
second choice is made. **This is a latent defect, not the explanation for anything observed yet.**

## First Investigation

- **Is the window reachable by a human?** Two model choices inside one file write means a double
  click or a very fast sequence. If it is not reachable by hand, the right answer may be a guard that
  makes it impossible rather than a repair that makes it correct.
- **Is `restoreDefaultAgentSettings` the dangerous caller?** It writes a whole fresh `defaults`
  object rather than a merge, so it does not read stale state — but anything in flight when it lands
  is lost, which may be the intent.
- **Functional update, or serialise?** A functional `setAgentSettings` cannot be awaited for the file
  write, so the fix is probably to serialise writes behind a single owner rather than to make each
  merge smarter.

## Boundaries

Does not change what any of the six callers mean to write. Does not touch the file format.

## Provenance

`App.tsx:4265–4362` and `agentProfile.ts` read on 2026-10-14 while answering CR154's investigation.
The mechanism is read from the code; no occurrence has been observed.
