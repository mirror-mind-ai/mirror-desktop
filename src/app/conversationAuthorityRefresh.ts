export type ConversationAuthorityRefreshCoordinator = {
  refresh: () => Promise<void>;
  checking: () => boolean;
};

export function createConversationAuthorityRefreshCoordinator(
  inspect: () => Promise<void>,
): ConversationAuthorityRefreshCoordinator {
  let activeInspection: Promise<void> | undefined;

  return {
    refresh() {
      if (activeInspection) return activeInspection;
      const inspection = inspect().finally(() => {
        if (activeInspection === inspection) activeInspection = undefined;
      });
      activeInspection = inspection;
      return inspection;
    },
    checking() {
      return Boolean(activeInspection);
    },
  };
}
