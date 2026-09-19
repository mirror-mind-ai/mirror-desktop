import type { ComposerDraftMap } from "../domain/composerDrafts";

type ComposerDraftPersistenceOptions = {
  save: (drafts: ComposerDraftMap) => Promise<void>;
  idleMs: number;
  onError?: (error: unknown) => void;
};

export type ComposerDraftPersistence = {
  schedule: (drafts: ComposerDraftMap) => void;
  flush: () => Promise<void>;
  dispose: () => void;
};

export function createComposerDraftPersistence({
  save,
  idleMs,
  onError = () => undefined,
}: ComposerDraftPersistenceOptions): ComposerDraftPersistence {
  let pending: ComposerDraftMap | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saveChain: Promise<void> = Promise.resolve();

  function clearTimer() {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
  }

  function persistPending(): Promise<void> {
    clearTimer();
    if (!pending) return saveChain;
    const snapshot = pending;
    pending = undefined;
    saveChain = saveChain
      .catch(() => undefined)
      .then(() => save(snapshot));
    return saveChain;
  }

  return {
    schedule(drafts) {
      pending = { ...drafts };
      clearTimer();
      timer = setTimeout(() => {
        timer = undefined;
        void persistPending().catch(onError);
      }, idleMs);
    },
    flush: persistPending,
    dispose() {
      clearTimer();
      pending = undefined;
    },
  };
}
