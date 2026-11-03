import { advanceTurnJournal, loadTurnJournal } from "./turnJournal";
import {
  acknowledgeMirrorAppendItem,
  appendMirrorOutboxItem,
  enqueueMirrorAppendItem,
} from "./mirrorAppendOutboxStorage";
import {
  loadDedicatedJourneyConversationMetadata,
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
    // CR184: the post-frontier read checks authority and takes the receipt; the native save keeps
    // the stored messages, so the bodies are never needed here.
    loadPersistedProjection: (authority) => loadDedicatedJourneyConversationMetadata(
      authority.journeyId,
      authority.generation,
      authority.threadId,
    ),
    savePostFrontierProjection: savePostFrontierReceiptProjection,
  };
}
