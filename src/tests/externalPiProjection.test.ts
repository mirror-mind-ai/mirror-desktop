import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createHydratedReconciliationState } from "../domain/conversationReconciliation";
import { createJourneyConversation } from "../domain/journeyConversation";
import {
  projectExternalPiInspection,
  type ExternalPiInspection,
} from "../domain/externalPiProjection";
import { ExternalPiSyncNotice } from "../app/ExternalPiSyncNotice";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

function conversation() {
  const value = createJourneyConversation({
    journeyId: "journey-a",
    initialMessages: [
      { id: "user-local", role: "user", content: "local user", createdAt: "2026-08-24T10:00:00.000Z" },
      { id: "assistant-local", role: "assistant", content: "local assistant", createdAt: "2026-08-24T10:01:00.000Z" },
    ],
    now: new Date("2026-08-24T10:00:00.000Z"),
  });
  value.liveIdentity = { ...value.liveIdentity, mirrorConversationId: "mirror-a" };
  value.reconciliation = createHydratedReconciliationState(value.liveIdentity, {
    harness: { lastMessageId: "assistant-local", lastTurnId: "hydrated", messageCount: 2 },
    pi: { leafEntryId: "pi-base", entryCount: 4, sessionFile: "/sessions/journey-a.jsonl" },
    mirror: { conversationId: "mirror-a", lastMessageId: "mirror-local", messageCount: 2 },
    establishedAt: "2026-08-24T10:01:00.000Z",
  });
  return value;
}

function inspection(overrides: Partial<ExternalPiInspection> = {}): ExternalPiInspection {
  return {
    status: "advanced",
    journeyId: "journey-a",
    piSessionId: "nautilus-journey-a",
    generation: 0,
    sessionFile: "/sessions/journey-a.jsonl",
    fingerprint: { sessionFile: "/sessions/journey-a.jsonl", size: 800, modifiedMs: 10, fileId: 20 },
    baseLeafEntryId: "pi-base",
    leafEntryId: "pi-assistant-2",
    entryCount: 8,
    observedEntryIds: ["custom-1", "pi-user-2", "pi-assistant-2"],
    ancestorEntryIds: ["pi-base", "custom-1", "pi-user-2", "pi-assistant-2"],
    turns: [{
      userEntryId: "pi-user-2",
      assistantEntryId: "pi-assistant-2",
      userText: "external user",
      assistantText: "external assistant",
      startedAt: "2026-08-24T11:00:00.000Z",
      committedAt: "2026-08-24T11:01:00.000Z",
    }],
    ...overrides,
  };
}

describe("external Pi projection", () => {
  it("projects complete native turns once and advances proven checkpoints", () => {
    const result = projectExternalPiInspection(conversation(), inspection(), "2026-08-24T11:02:00.000Z");

    expect(result.conflictCode).toBeUndefined();
    expect(result.conversation.messages.slice(-2)).toMatchObject([
      { id: "pi-user-pi-user-2", role: "user", content: "external user" },
      { id: "pi-assistant-pi-assistant-2", role: "assistant", content: "external assistant" },
    ]);
    expect(result.conversation.reconciliation).toMatchObject({
      classification: "pi_advanced",
      checkpoints: {
        harness: { lastMessageId: "pi-assistant-pi-assistant-2", messageCount: 4 },
        pi: { leafEntryId: "pi-assistant-2", entryCount: 8 },
      },
      advancement: { pi: { baseLeafEntryId: "pi-base", leafEntryId: "pi-assistant-2" } },
    });
  });

  it("keeps unchanged and partial observations quiet", () => {
    const current = conversation();
    expect(projectExternalPiInspection(current, inspection({ status: "unchanged", turns: undefined }), "now")).toEqual({
      conversation: current,
      changed: false,
    });
    expect(projectExternalPiInspection(current, inspection({ status: "waiting", turns: undefined }), "now")).toEqual({
      conversation: current,
      changed: false,
    });
  });

  it("rejects stale authority, non-descendant evidence and local divergence", () => {
    expect(projectExternalPiInspection(conversation(), inspection({ generation: 2 }), "now").conflictCode)
      .toBe("authority_mismatch");
    expect(projectExternalPiInspection(conversation(), inspection({ ancestorEntryIds: ["other"] }), "now").conflictCode)
      .toBe("pi_ancestry_mismatch");
    const divergent = conversation();
    divergent.messages.push({ id: "local-extra", role: "user", content: "draft", createdAt: "now" });
    expect(projectExternalPiInspection(divergent, inspection(), "now").conflictCode)
      .toBe("authority_mismatch");
  });

  it("schedules focus and Journey activation checks without awaiting them", () => {
    expect(appSource).toContain('window.addEventListener("focus", onFocus)');
    expect(appSource).toContain("const onFocus = () => scheduleExternalPiRefresh()");
    expect(appSource).toContain("if (conversationLoaded) scheduleExternalPiRefresh(0)");
    expect(appSource).toContain("void refreshExternalConversationActivity()");
    expect(appSource).toContain('if (currentRuntime.isStreaming || currentRuntime.agentRunStatus === "running") return');
    expect(tauriSource).toContain("async fn inspect_external_pi_activity");
    expect(tauriSource).toContain("tauri::async_runtime::spawn_blocking");
  });

  it("renders a compact conflict boundary without a merge action", () => {
    const html = renderToStaticMarkup(createElement(ExternalPiSyncNotice, { reason: "pi_ancestry_mismatch" }));
    expect(html).toContain("Pi conversation changed outside Nautilus");
    expect(html).toContain("Review required");
    expect(html).not.toContain("button");
  });

  it("rejects duplicate native projection ids instead of replaying", () => {
    const current = conversation();
    current.messages.push({
      id: "pi-user-pi-user-2", role: "user", content: "already projected", createdAt: "now",
    });
    current.reconciliation.checkpoints.harness = {
      lastMessageId: "pi-user-pi-user-2", lastTurnId: "other", messageCount: 3,
    };

    expect(projectExternalPiInspection(current, inspection(), "now").conflictCode).toBe("native_id_mismatch");
  });
});
