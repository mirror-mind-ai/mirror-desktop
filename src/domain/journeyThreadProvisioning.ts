export type JourneyActivationReceipt = {
  schemaVersion: "1.0.0";
  journeyId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  mirrorConversationId: string;
  mode: "mirror";
  commandAuthority: "installed";
  runtimeChannel?: "user" | "development";
  activatedAt: string;
};

export type JourneyActivationCoordinates = Pick<JourneyActivationReceipt,
  "journeyId" | "threadId" | "generation" | "piSessionId" | "mirrorConversationId">;

export function dedicatedNativeNames(journeyName: string, generation: number) {
  const readable = journeyName.normalize("NFKC").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim() || "Journey";
  const suffix = ` · Mirror Desktop · Generation ${generation}`;
  const bounded = (limit: number) => `${readable.slice(0, Math.max(1, limit - suffix.length)).trim()}${suffix}`;
  return { piSessionName: bounded(80), mirrorConversationName: bounded(100) };
}

export function createJourneyActivationReceipt(
  coordinates: JourneyActivationCoordinates & { activatedAt?: string },
): JourneyActivationReceipt {
  return {
    schemaVersion: "1.0.0",
    journeyId: coordinates.journeyId,
    threadId: coordinates.threadId,
    generation: coordinates.generation,
    piSessionId: coordinates.piSessionId,
    mirrorConversationId: coordinates.mirrorConversationId,
    mode: "mirror",
    commandAuthority: "installed",
    activatedAt: coordinates.activatedAt ?? new Date().toISOString(),
  };
}

export function verifyJourneyActivationReceipt(
  receipt: JourneyActivationReceipt | undefined,
  coordinates: JourneyActivationCoordinates,
): boolean {
  return Boolean(receipt
    && receipt.schemaVersion === "1.0.0"
    && receipt.mode === "mirror"
    && receipt.commandAuthority === "installed"
    && receipt.journeyId === coordinates.journeyId
    && receipt.threadId === coordinates.threadId
    && receipt.generation === coordinates.generation
    && receipt.piSessionId === coordinates.piSessionId
    && receipt.mirrorConversationId === coordinates.mirrorConversationId
    && !Number.isNaN(Date.parse(receipt.activatedAt)));
}
