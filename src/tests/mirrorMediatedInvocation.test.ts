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

  it("passes active Journey and a stable Nautilus session id into the Tauri invocation", () => {
    expect(piProcessStreamSource).toContain('journeyId: packet.journeyId ?? "nautilus-harness"');
    expect(piProcessStreamSource).toContain('packet.liveConversation?.piSessionId ?? `nautilus-${packet.journeyId ?? "nautilus-harness"}`');
    expect(piProcessStreamSource).toContain("The selected Journey ID for this turn is exactly:");
    expect(piProcessStreamSource).toContain("/skill:ext-nautilus-synthesis journey-id=");
  });

  it("rechecks conversation authority immediately before a live provider run", () => {
    expect(appSource).toContain("await refreshExternalConversationActivity()");
    expect(appSource).toContain("baseConversation = conversationRef.current");
    expect(appSource).toContain("externalPiInFlightRef.current.size > 0");
    expect(appSource).toContain('!["uninitialized", "in_sync"].includes(baseConversation.reconciliation.classification)');
    expect(appSource).toContain("Live invocation stopped because Journey conversation authority changed");
  });

  it("runs Mirror-mediated processes from the Mirror runtime root without duplicate after-the-fact logging", () => {
    expect(tauriMainSource).toContain('config.invocation_mode == "mirror"');
    expect(tauriMainSource).toContain("mirror_runtime_root");
    expect(tauriMainSource).toContain("process_command.current_dir(mirror_root)");
    expect(tauriMainSource).toContain('args.push("--session-id".to_string())');
    expect(tauriMainSource).toContain('args.push("--approve".to_string())');
    expect(tauriMainSource).not.toContain('log_mirror_message(&session_id, &journey_id, "user", &prompt)');
    expect(tauriMainSource).not.toContain('log_mirror_message(&session_id, &journey_id, "assistant", &output)');
    expect(tauriMainSource).not.toContain("query_pi_session_context");
    expect(tauriMainSource).not.toContain("get_pi_session_context");
    expect(appSource).toContain("authoritativeContextStats");
  });

  it("does not durably save a partial stream and rolls back a pre-agent failure", () => {
    expect(appSource).toContain("if (!conversationLoaded || isStreaming)");
    expect(appSource).toContain("runFailed && !runReachedAgent");
    expect(appSource).toContain("setConversation(conversationBeforeRun)");
  });

  it("hydrates an explicitly selected Mirror conversation into the mapped Pi session", () => {
    expect(appSource).toContain("hydrateJourneyPiSession");
    expect(appSource).toContain("reloadedConversation.liveIdentity.piSessionId");
    expect(tauriMainSource).toContain("hydrate_pi_session_from_local_conversation");
    expect(tauriMainSource).toContain("Only an explicitly selected Mirror conversation can hydrate a Pi session.");
    expect(mirrorExportScriptSource).toContain('"origin": "mirror_import"');
    expect(mirrorExportScriptSource).toContain('"mirrorConversationId": conversation["source"]["conversationId"]');
  });

  it("keeps the old narrow Mirror logging helper outside the live runtime", () => {
    expect(mirrorLogScriptSource).toContain('interface="nautilus_harness"');
    expect(mirrorLogScriptSource).toContain("journey=args.journey_id");
    expect(mirrorLogScriptSource).toContain("mem.add_message(conversation.id, role=args.role, content=args.content)");
    expect(mirrorLogScriptSource).not.toMatch(/api[_-]?key|token|secret|password/);
  });
});
