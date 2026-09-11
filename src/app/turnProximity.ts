export type AssistantTurnProximity = "active" | "latest_completed" | "historical";

export function classifyAssistantTurnProximity(
  messages: ReadonlyArray<{ id: string; role: "user" | "assistant" }>,
  runtimeAssistantMessageId: string | undefined,
  runtimeActive: boolean,
): Map<string, AssistantTurnProximity> {
  const assistantIds = messages.filter((message) => message.role === "assistant").map((message) => message.id);
  const activeId = runtimeActive && runtimeAssistantMessageId && assistantIds.includes(runtimeAssistantMessageId)
    ? runtimeAssistantMessageId
    : undefined;
  const latestCompletedId = [...assistantIds].reverse().find((id) => id !== activeId);
  const result = new Map<string, AssistantTurnProximity>();
  for (const id of assistantIds) {
    result.set(id, id === activeId ? "active" : id === latestCompletedId ? "latest_completed" : "historical");
  }
  return result;
}
