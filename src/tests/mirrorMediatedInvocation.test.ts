import { describe, expect, it } from "vitest";
import piProcessStreamSource from "../agent/piProcessStream.ts?raw";
import providerConfigSource from "../agent/providerConfig.ts?raw";
import tauriMainSource from "../../src-tauri/src/main.rs?raw";
import mirrorLogScriptSource from "../../scripts/log_mirror_conversation.py?raw";
import appSource from "../app/App.tsx?raw";
import mirrorExportScriptSource from "../../scripts/export_mirror_bootstrap.py?raw";

describe("Mirror-mediated Pi invocation", () => {
  it("makes Mirror-mediated invocation the explicit default provider mode", () => {
    expect(providerConfigSource).toContain('invocationMode: "mirror"');
    expect(providerConfigSource).toContain("Mirror runtime Pi via");
    expect(providerConfigSource).toContain("Raw local Pi via");
  });

  it("passes active Journey authority and a stable Nautilus session id into the Tauri invocation", () => {
    expect(piProcessStreamSource).toContain("runAuthority: RunAuthority");
    expect(piProcessStreamSource).toContain("expectedAuthority: runAuthority");
    expect(piProcessStreamSource).toContain("runAuthority,");
    expect(piProcessStreamSource).toContain("The selected Journey ID for this turn is exactly:");
    expect(piProcessStreamSource).toContain("/skill:ext-nautilus-synthesis journey-id=");
  });

  it("rechecks dedicated authority immediately before a live provider run", () => {
    expect(appSource).not.toContain("await refreshExternalConversationActivity()");
    expect(appSource).toContain("baseConversation = conversationRef.current");
    expect(appSource).toContain('journeyThreadState.kind !== "ready"');
    expect(appSource).toContain("dedicatedTurnBlocksNewInvocation(classifyDedicatedTurnState(baseConversation))");
    expect(appSource).toContain("createDedicatedTurnAuthority(");
    expect(appSource).toContain("Live invocation stopped because Journey conversation authority changed");
    expect(appSource).toContain("Recording the completed turn");
    expect(appSource).not.toContain("active Pi/Mirror pair settles");
    expect(appSource).not.toContain("openMirrorConversationPicker");
  });

  it("runs Mirror-mediated processes from the Mirror runtime root without duplicate after-the-fact logging", () => {
    expect(tauriMainSource).toContain('let mirror_mediated = config.invocation_mode == "mirror"');
    expect(tauriMainSource).toContain("active_runtime_channel");
    expect(tauriMainSource).toContain("profile.apply_to_command(&mut process_command)");
    expect(tauriMainSource).toContain("run_authority.pi_session_file");
    expect(tauriMainSource).toContain('args.push("--approve".to_string())');
    expect(tauriMainSource).toContain('args.push("--no-extensions".to_string())');
    expect(tauriMainSource).toContain("mirror_runtime_skill_paths");
    expect(tauriMainSource).toContain('join("extensions.json")');
    expect(tauriMainSource).not.toContain('log_mirror_message(&session_id, &journey_id, "user", &prompt)');
    expect(tauriMainSource).not.toContain('log_mirror_message(&session_id, &journey_id, "assistant", &output)');
    expect(tauriMainSource).not.toContain("query_pi_session_context");
    expect(tauriMainSource).not.toContain("get_pi_session_context");
    expect(appSource).toContain("authoritativeContextStats");
  });

  it("does not write the dedicated flow into legacy persistence and rolls back a pre-agent failure", () => {
    expect(appSource).not.toContain("void saveJourneyConversation(conversation)");
    expect(appSource).not.toContain("await saveJourneyConversation(stagedConversation)");
    expect(appSource).toContain("runFailed && !runReachedAgent");
    expect(appSource).toContain("setConversation(conversationBeforeRun)");
    expect(appSource).toContain("await saveDedicatedJourneyConversation(conversationBeforeRun)");
    expect(appSource).toContain("interruptDedicatedTurn(");
  });

  it("does not hydrate or adopt arbitrary Mirror conversations", () => {
    expect(appSource).not.toContain("hydrateJourneyPiSession");
    expect(appSource).not.toContain("loadJourneyConversation");
    expect(tauriMainSource).not.toContain("hydrate_pi_session_from_local_conversation");
    expect(tauriMainSource).not.toContain("reload_journey_from_mirror");
    expect(mirrorExportScriptSource).not.toContain('"origin": "mirror_import"');
    expect(mirrorExportScriptSource).not.toContain("write_local_conversations");
  });

  it("keeps the old narrow Mirror logging helper outside the live runtime", () => {
    expect(mirrorLogScriptSource).toContain('interface="nautilus_harness"');
    expect(mirrorLogScriptSource).toContain("journey=args.journey_id");
    expect(mirrorLogScriptSource).toContain("mem.add_message(conversation.id, role=args.role, content=args.content)");
    expect(mirrorLogScriptSource).not.toMatch(/api[_-]?key|token|secret|password/);
  });
});
