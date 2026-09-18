import type { PiConversationSurfaceInspection } from "../../domain/piBackedConversationSurface";

const START = Date.parse("2026-09-18T10:00:00.000Z");

export function createContinuityEnduranceInspection(turnCount = 50): PiConversationSurfaceInspection {
  const entries: PiConversationSurfaceInspection["entries"] = [];
  for (let index = 1; index <= turnCount; index += 1) {
    entries.push({
      entryId: `native-user-${index}`,
      role: "user",
      visibleText: `Question ${index}`,
      timestamp: new Date(START + index * 2_000).toISOString(),
    });
    entries.push({
      entryId: `native-assistant-${index}`,
      role: "assistant",
      visibleText: `Answer ${index}`,
      timestamp: new Date(START + index * 2_000 + 1_000).toISOString(),
    });
  }
  entries.push({
    entryId: "native-user-incomplete",
    role: "user",
    visibleText: "Admitted before interruption",
    timestamp: new Date(START + (turnCount + 1) * 2_000).toISOString(),
  });
  return { schemaVersion: "0.1.0", entries };
}
