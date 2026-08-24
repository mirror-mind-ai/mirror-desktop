import { describe, expect, it } from "vitest";
import { validateMissionFixture } from "../protocol/loadFixture";
import { toViewModel } from "../domain/nautilusViewModel";

const validFixture = `name: Nautilus
method_version: 0.1.0-experimental
protocol_version: 0.1.0
schema_version: 0.1.0
grammar_status: experimental
compatibility: compatible
mission:
  id: mission-001
  title: Formulate the first Nautilus mission
  purpose: Prove that Nautilus can name a directed intention before execution.
  status: formulated
`;

describe("Nautilus protocol validation", () => {
  it("accepts the DS-004 identity plus Mission fixture", () => {
    const result = validateMissionFixture(validFixture);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.name).toBe("Nautilus");
      expect(result.document.mission.status).toBe("formulated");
    }
  });

  it("rejects a missing identity field", () => {
    const result = validateMissionFixture(validFixture.replace("name: Nautilus\n", ""));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain("name");
    }
  });

  it("rejects a missing Mission field", () => {
    const result = validateMissionFixture(validFixture.replace("  purpose: Prove that Nautilus can name a directed intention before execution.\n", ""));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain("mission.purpose");
    }
  });

  it("rejects Mission execution status in the current chamber", () => {
    const result = validateMissionFixture(validFixture.replace("status: formulated", "status: executing"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toContain("mission.status");
    }
  });

  it("creates a GUI view model from a valid fixture", () => {
    const validation = validateMissionFixture(validFixture);
    const model = toViewModel(validation);

    expect(model.status).toBe("compatible");
    expect(model.identity.methodVersion).toBe("0.1.0-experimental");
    expect(model.mission?.title).toBe("Formulate the first Nautilus mission");
    expect(model.executionAvailable).toBe(false);
  });
});
