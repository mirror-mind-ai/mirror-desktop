import { describe, expect, it } from "vitest";
import { createTerminalAgentActionEvidence } from "../app/terminalAgentActionEvidence";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { interruptDedicatedTurn } from "../domain/dedicatedTurnCommit";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { createDedicatedJourneyConversation, replaceJourneyConversationMessages } from "../domain/journeyConversation";
import { createPersistedJourneyConversation, parsePersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import { readyThread } from "./fixtures/readyThread";

const FRAGMENT = "Ok — foquei só no primeiro arquivo lido:";

function interruptedConversation(failureCode = "turn_journal_cancelled") {
  const thread = readyThread("mirror-desktop");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  const staged = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-1", role: "user", content: "leia os quatro arquivos", createdAt: "2026-09-30T11:53:50Z" },
    { id: "assistant-1", role: "assistant", content: "", createdAt: "2026-09-30T11:53:51Z" },
  );
  const interrupted = interruptDedicatedTurn(staged, "turn-1", failureCode, "2026-09-30T11:54:04Z");
  const evidence = createTerminalAgentActionEvidence({
    correlation,
    terminalStatus: "cancelled",
    projection: { status: "cancelled", operations: [], reasoningSummaries: [], activityOrder: [] },
    interruptedFragment: FRAGMENT,
  });
  return { correlation, conversation: { ...interrupted, terminalAgentActionEvidence: { "assistant-1": evidence } } };
}

function roundTrip(conversation: unknown) {
  return parsePersistedJourneyConversation(
    JSON.parse(JSON.stringify(createPersistedJourneyConversation(conversation as never))),
  );
}

describe("CR089 interrupted evidence survives persistence", () => {
  it("keeps the evidence of an interrupted turn whose assistant message is gone", () => {
    // Reprojection replaces the harness assistant message with the Pi-derived ones, so by the time
    // this is reloaded the evidence key names a message that no longer exists. Requiring it here
    // would discard the only record of what the cancelled run did and said.
    const { conversation } = interruptedConversation();
    const reprojected = replaceJourneyConversationMessages(
      conversation,
      conversation.messages
        .filter((message) => message.id !== "assistant-1")
        .concat([{ id: "pi-90b9eb69", role: "assistant", content: "Vou identificar.", createdAt: "2026-09-30T11:53:57Z" }]),
    );

    const parsed = roundTrip(reprojected);
    expect(parsed).toBeDefined();
    expect(parsed?.conversation.terminalAgentActionEvidence?.["assistant-1"]?.interruptedFragment).toBe(FRAGMENT);
  });

  it("still keeps it while the assistant message is present", () => {
    const { conversation } = interruptedConversation();

    const parsed = roundTrip(conversation);
    expect(parsed?.conversation.terminalAgentActionEvidence?.["assistant-1"]?.interruptedFragment).toBe(FRAGMENT);
  });

  it("still refuses evidence no turn record vouches for", () => {
    const { conversation } = interruptedConversation();
    const stale = JSON.parse(JSON.stringify(createPersistedJourneyConversation(conversation as never)));
    stale.conversation.terminalAgentActionEvidence["assistant-1"].runId = "other-run";

    const parsed = parsePersistedJourneyConversation(stale);
    expect(parsed).toBeDefined();
    expect(parsed?.conversation.terminalAgentActionEvidence).toBeUndefined();
  });
});
