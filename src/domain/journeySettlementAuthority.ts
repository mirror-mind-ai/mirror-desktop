import type { RunAuthority } from "./runAuthority";

export type JourneySettlementAuthority = Readonly<{
  schemaVersion: "0.1.0";
  runAuthority: RunAuthority;
  journeyId: string;
  runId: string;
  turnId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  piSessionFile: string;
  mirrorConversationId: string;
  harnessUserMessageId: string;
  harnessAssistantMessageId: string;
}>;

export function createJourneySettlementAuthority(runAuthority: RunAuthority): JourneySettlementAuthority {
  return Object.freeze({
    schemaVersion: "0.1.0",
    runAuthority,
    journeyId: runAuthority.journeyId,
    runId: runAuthority.runId,
    turnId: runAuthority.turnId,
    threadId: runAuthority.threadId,
    generation: runAuthority.generation,
    piSessionId: runAuthority.piSessionId,
    piSessionFile: runAuthority.piSessionFile,
    mirrorConversationId: runAuthority.mirrorConversationId,
    harnessUserMessageId: runAuthority.harnessUserMessageId,
    harnessAssistantMessageId: runAuthority.harnessAssistantMessageId,
  });
}
