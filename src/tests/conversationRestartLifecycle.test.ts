import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/journeyThreadStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

describe("dedicated conversation restart lifecycle", () => {
  it("requires explicit confirmation and explains preservation", () => {
    expect(appSource).toContain("Restart Conversation…");
    expect(appSource).toContain('aria-label="Confirm conversation restart"');
    expect(appSource).toContain("No model will be called and no synthetic greeting will be created.");
    expect(appSource).toContain("The current generation remains active unless the replacement is fully verified.");
  });

  it("uses a dedicated model-free native command and progress channel", () => {
    expect(storageSource).toContain('invoke<unknown>("restart_journey_thread"');
    expect(storageSource).toContain('"nautilus-journey-restart"');
    const command = tauriSource.slice(tauriSource.indexOf("async fn restart_journey_thread"), tauriSource.indexOf("fn load_journey_registry"));
    expect(command).toContain("provision_pi_session");
    expect(command).toContain("provision_mirror_conversation");
    expect(command).not.toContain("start_pi_invocation");
    expect(command).not.toContain("generatePacket");
  });

  it("automatically closes inactive attempts and keeps implementation jargon out of normal recovery", () => {
    expect(appSource).toContain('decision !== "auto_interrupt"');
    expect(appSource).toContain("await interruptInactiveTurnRecord(");
    expect(appSource).toContain("Preparing your conversation…");
    expect(appSource).toContain("A previous attempt didn’t finish. You can send your message again.");
    expect(appSource).not.toContain("Unfinished turn needs recovery");
    expect(appSource).not.toContain("Resume recovery");
    expect(appSource).not.toContain("Mark as interrupted");
  });

  it("persists dedicated Harness projections by generation", () => {
    expect(tauriSource).toContain('join(format!("generation-{}.json", generation))');
    expect(tauriSource).toContain("Could not migrate dedicated generation projection");
  });

  it("unlocks drafting when provider work ends and uses the explicit append outbox", () => {
    expect(appSource).not.toContain("Recording the completed turn… You can draft the next message now.");
    expect(appSource).toContain("isFinalizingTurn");
    expect(appSource).toContain("createMirrorAppendOutboxItem");
    expect(appSource).toContain("appendMirrorOutboxItem");
    expect(appSource).not.toContain("observedAssistantMirrorCommit");
    expect(appSource).toContain("disabled={isJourneyReloading}");
    expect(appSource).toContain("disabled={!draft.trim() || selectedInvocationAdmissionBlocked");
  });
});
