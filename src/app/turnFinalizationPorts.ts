import { advanceTurnJournal, loadTurnJournal } from "./turnJournal";
import {
  acknowledgeMirrorAppendItem,
  appendMirrorOutboxItem,
  enqueueMirrorAppendItem,
} from "./mirrorAppendOutboxStorage";
import {
  loadDedicatedJourneyConversation,
  savePostFrontierReceiptProjection,
} from "./journeyConversationStorage";
import type { TurnFinalizationPorts } from "./turnFinalizationCoordinator";

export function createProductionFinalizationPorts(overrides: Pick<
  TurnFinalizationPorts,
  "loadActiveEvidence" | "saveProjection" | "cleanupLease"
>): TurnFinalizationPorts {
  return {
    ...overrides,
    loadJournal: loadTurnJournal,
    advanceJournal: async (authority, expected, next) => {
      await advanceTurnJournal(authority, expected, next);
    },
    enqueueOutboxItem: enqueueMirrorAppendItem,
    deliverOutboxItem: appendMirrorOutboxItem,
    acknowledgeOutboxItem: async (itemId, conversationId, authority) => {
      await acknowledgeMirrorAppendItem(itemId, conversationId, authority);
    },
    loadPersistedProjection: (authority) => loadDedicatedJourneyConversation(
      authority.journeyId,
      authority.generation,
      authority.threadId,
      { sessionId: authority.piSessionId, sessionFile: authority.piSessionFile },
    ),
    savePostFrontierProjection: savePostFrontierReceiptProjection,
  };
}
