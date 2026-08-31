import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import streamSource from "../agent/piProcessStream.ts?raw";
import mockSource from "../agent/agentStream.ts?raw";

function sourceBetween(start: string, end: string): string {
  return appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
}

describe("Journey runtime integration guardrails", () => {
  it("uses one Journey-keyed reducer instead of selected-Journey runtime state hooks", () => {
    expect(appSource).toContain("useReducer(\n    journeyRuntimeReducer");
    expect(appSource).toContain("selectJourneyRuntime(journeyRuntimeState, selectedJourney)");
    expect(appSource).toContain("hasActiveOrFinalizingJourneyRuntime(journeyRuntimeState)");
    expect(appSource).not.toContain("const [isStreaming, setIsStreaming]");
    expect(appSource).not.toContain("const [agentRunJourneyId");
  });

  it("keeps selection presentation-only and globally blocks navigation while runtime is busy", () => {
    const selection = sourceBetween("function selectJourney", "function openJourneyTreeMenu");
    expect(selection).toContain("if (runtimeBusy || journeyId === selectedJourney)");
    expect(selection).not.toContain("dispatchJourneyRuntime");
    expect(appSource).toContain("draggable={journeyListOrder === \"tree\" && !runtimeBusy}");
    expect(appSource).toContain("journeyThreadState.kind !== \"ready\" || runtimeBusy || reconciliationBlocksInvocation");
  });

  it("routes run mutations and finalization through captured identity", () => {
    const generation = sourceBetween("async function generatePacket", "async function startSelectedJourney");
    expect(generation).toContain("const runtimeIdentity: JourneyRunIdentity");
    expect(generation).toContain('type: "stream_event", identity: runtimeIdentity, event');
    expect(generation).toContain('type: "finalization_started", identity: runtimeIdentity');
    expect(generation).toContain('type: "finalization_finished", identity: runtimeIdentity');
    expect(generation).toContain("let runConversation = stagedConversation");
    expect(generation).toContain("selectedJourneyRef.current === ownerJourneyId");
  });

  it("mounts the shared dispatcher once and leaves mock streaming Tauri-free", () => {
    expect(appSource).toContain("piProcessEventDispatcher.mount()");
    expect(appSource).toContain("piProcessEventDispatcher.dispose()");
    expect(streamSource).not.toContain('from "@tauri-apps/api/event"');
    expect(mockSource).not.toContain("@tauri-apps/api");
    expect(mockSource).not.toContain("piProcessEventDispatcher");
  });
});
