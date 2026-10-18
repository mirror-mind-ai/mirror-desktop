import type { AgentSettings } from "../domain/agentProfile";

/**
 * CR158: one owner for every agent-settings write.
 *
 * The defect this exists to make impossible: `persistAgentSettings` used to receive an
 * already-computed `next`, and all nine callers computed it from the `agentSettings` captured in the
 * calling render's closure, before awaiting. Two writes issued before the first `setAgentSettings`
 * landed both merged onto the same pre-first value, so the second silently overwrote the first. The
 * loss was invisible: the second write succeeded, its success message was shown, and the file stayed
 * valid.
 *
 * Reachability was audited and found closed today — seven of the nine callers sit behind controls
 * disabled while a write is in flight, and the three menu entries close the menu in the same commit
 * that sets `saving`, so the menu cannot issue a second write. That is an emergent property of nine
 * controls across four surfaces, and it is not the kind of fact that stays true. The repair is
 * therefore structural: no caller can capture a baseline, because no caller supplies one.
 *
 * An update is applied *after* the queue grants it a turn, against the baseline this writer owns.
 */

export type AgentSettingsUpdate = (current: AgentSettings) => AgentSettings;

export type AgentSettingsWriteOutcome =
  | { readonly status: "written"; readonly settings: AgentSettings }
  | { readonly status: "failed"; readonly error: unknown };

export type AgentSettingsWriter = {
  /** Queue an update. It reads its baseline when it runs, never when it was written. */
  enqueue: (update: AgentSettingsUpdate) => Promise<AgentSettingsWriteOutcome>;
  /** Take a baseline that arrived from outside this writer, such as the launch loader's read. */
  adopt: (settings: AgentSettings) => void;
  snapshot: () => AgentSettings;
};

export function createAgentSettingsWriter(options: {
  readonly initial: AgentSettings;
  readonly write: (next: AgentSettings) => Promise<void>;
}): AgentSettingsWriter {
  let current = options.initial;
  let tail: Promise<unknown> = Promise.resolve();

  function enqueue(update: AgentSettingsUpdate): Promise<AgentSettingsWriteOutcome> {
    const run = tail.then(async (): Promise<AgentSettingsWriteOutcome> => {
      // Read here, not at call time. This line is the whole repair.
      const next = update(current);
      try {
        await options.write(next);
      } catch (error) {
        // The baseline deliberately does not advance: the next update must merge onto what is on
        // disk, not onto something that failed to get there.
        return { status: "failed", error };
      }
      current = next;
      return { status: "written", settings: next };
    });
    // A rejection must not poison the queue for every later write, so the tail swallows it. The
    // outcome is still reported to the caller through `run`.
    tail = run.catch(() => undefined);
    return run;
  }

  return {
    enqueue,
    adopt: (settings) => { current = settings; },
    snapshot: () => current,
  };
}
