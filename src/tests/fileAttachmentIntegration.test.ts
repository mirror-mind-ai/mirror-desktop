import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import packetSource from "../agent/piTaskPacket.ts?raw";
import promptSource from "../agent/piProcessStream.ts?raw";
import nativeSource from "../../src-tauri/src/main.rs?raw";

describe("Pi-style file attachment dedicated-turn integration", () => {
  it("keeps file references optimistic until exact agent-start evidence", () => {
    expect(appSource).toContain("attachments: fileAttachments");
    expect(appSource).toContain("fileAttachments: toAgentFileReferences(fileAttachments)");
    const clear = appSource.indexOf("setPendingFileAttachments([])");
    const provider = appSource.indexOf("for await (const event of provider(packet))", clear);
    const save = appSource.indexOf("() => saveAdmittedTurnProjection(stagedConversation, settlementAuthority)", provider);
    expect(clear).toBeGreaterThan(0);
    expect(provider).toBeGreaterThan(clear);
    expect(save).toBeGreaterThan(provider);
  });

  it("clears pending files on send, Journey switch and generation restart", () => {
    expect(appSource.match(/setPendingFileAttachments\(\[\]\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(appSource).toContain("listenForFileAttachments");
    expect(appSource).toContain("inspectDroppedFileAttachments");
  });

  it("projects only paths while removing the former workspace confinement", () => {
    expect(packetSource).toContain("fileAttachments?: AgentFileReference[]");
    expect(promptSource).toContain("Files explicitly selected by the user");
    expect(nativeSource).not.toContain("Local reference is outside the allowed workspace roots.");
    expect(nativeSource).not.toContain("snapshot_journey_context");
  });

  it("uses a paperclip with explicit Portuguese tooltip", () => {
    expect(appSource).toContain('aria-label="Anexar arquivos"');
    expect(appSource).toContain('title="Anexar arquivos"');
    expect(appSource).toContain("📎");
  });
});
