import { describe, expect, it } from "vitest";
import { mapPiProcessEventToStreamEvents } from "../agent/piProcessStream";
import { inferMessageSpeaker, stripMessageSpeakerSignature, withCertifiedPersona } from "../app/conversationPresentation";
import { projectAgentTurnPresentation } from "../app/conversationTurnPresentation";
import mainSource from "../../src-tauri/src/main.rs?raw";
import contextSource from "../../src-tauri/src/mirror_context.rs?raw";

// CR188: on 0.3 the Core asks the model to `sign ◇ <persona>` and the model signs last (94 of 126
// answers in production since the cutover; none first). The speaker row read only a first-line
// signature, so it said "Agent" and the signature trailed the answer.
describe("CR188: the persona at the top of the answer", () => {
  const signedLast = "A resposta, em dois parágrafos.\n\nO segundo.\n\n◇ ai-engineer";

  it("names the persona of an answer signed last, and leaves no signature in the body", () => {
    expect(inferMessageSpeaker({ role: "assistant", content: signedLast })).toEqual({
      label: "ai-engineer",
      avatar: "AE",
      kind: "persona",
    });
    expect(stripMessageSpeakerSignature(signedLast)).toBe("A resposta, em dois parágrafos.\n\nO segundo.");
    expect(stripMessageSpeakerSignature("Feito.\n◇ software-engineer\n")).toBe("Feito.");
  });

  it("does not take a diamond inside the text, or a last line that is not a persona id, for a signature", () => {
    for (const content of ["Usei o ◇ como marcador no fim ◇ ai-engineer", "Fim.\n\n◇ não é persona"]) {
      expect(inferMessageSpeaker({ role: "assistant", content }).kind).toBe("agent");
      expect(stripMessageSpeakerSignature(content)).toBe(content);
    }
  });

  it("shows the delivered persona from the start of a live turn, and the model's own signature once it comes is not shown", () => {
    const live = withCertifiedPersona("", "ai-engineer");
    expect(inferMessageSpeaker({ role: "assistant", content: live }).label).toBe("ai-engineer");
    const settled = `${live}${signedLast}`;
    expect(inferMessageSpeaker({ role: "assistant", content: settled }).label).toBe("ai-engineer");
    expect(stripMessageSpeakerSignature(settled)).toBe("A resposta, em dois parágrafos.\n\nO segundo.");
    const presentation = projectAgentTurnPresentation({ messageId: "m", content: settled, createdAt: "2026-11-03T15:00:00.000Z", linkedActivity: [] });
    expect(presentation.agentComment).toBe("A resposta, em dois parágrafos.\n\nO segundo.");
  });

  it("reads the line the native side writes for the delivered persona as the persona event", () => {
    // The exact line `mirror_context::persona_event_line` writes (checked in Rust, `cr188_*`).
    const line = '{"journeyId":"mirror-desktop","mode":"mirror","persona":"ai-engineer","schemaVersion":"0.1.0","type":"mirror_context"}';
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` }, { mappingState: {} })).toEqual([
      { type: "persona_context", persona: "ai-engineer" },
    ]);
  });

  it("emits the delivered persona to the run before Pi starts, only when the context reached the turn", () => {
    expect(contextSource).toContain("pub persona: Option<String>");
    const start = mainSource.slice(mainSource.indexOf("mirror_context::prepare_turn(&app"));
    const branch = start.slice(0, start.indexOf("Some(guard)"));
    expect(branch).toMatch(/if let Some\(persona\) = context\.persona \{\s*emit\(\s*&app,\s*&authority,\s*PiProcessEventKind::Stdout,\s*mirror_context::persona_event_line\(&run_authority\.journey_id, &persona\),/);
    expect(branch.indexOf("persona_event_line")).toBeGreaterThan(branch.indexOf("context_file = Some(file)"));
  });
});
