import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/journeyThreadStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

describe("dedicated conversation context reset lifecycle", () => {
  it("requires explicit confirmation and explains preservation", () => {
    expect(appSource).toContain("Reset agent context…");
    expect(appSource).toContain('aria-label="Confirm agent context reset"');
    expect(appSource).toContain("messages will not be copied verbatim into the new Pi context");
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

  it("leaves inactive attempts to native reconciliation instead of a manual recovery route", () => {
    expect(appSource).not.toContain("automaticTurnRecoveryAuthorized");
    // CR088 removed the manual routes: a blocking turn only means the exact run is still
    // finishing, and a stranded completed turn is settled by native reconciliation.
    expect(appSource).not.toContain("preserve_attempt_and_continue");
    expect(appSource).not.toContain("recover_preserved_response");
    expect(appSource).not.toContain("markBlockingTurnInterrupted");
    expect(appSource).not.toContain("interruptInactiveTurnRecord");
    expect(appSource).toContain("await recoverPostTerminalPersistence(conversation.journeyId)");
    expect(appSource).not.toContain("Discard previous response");
  });

  it("persists dedicated Harness projections by generation", () => {
    expect(tauriSource).toContain('join(format!("generation-{}.json", generation))');
    expect(tauriSource).toContain("load_or_migrate_root_projection_at");
    expect(tauriSource).toContain('"sourceRetained": true');
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
