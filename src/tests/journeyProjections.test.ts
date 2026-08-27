import { describe, expect, it } from "vitest";
import { normalizeJourneyProjectionBundle } from "../domain/journeyProjections";

const operational = {
  document: {
    contractVersion: "1.0", schemaVersion: "1", journeyId: "journey-a", altitude: "operational",
    namespace: "ariad", projection: "operational", snapshotId: "op-current", sourceRevision: "sha256:op",
    sourceSnapshots: [], content: {},
  },
  manifest: { namespace: "ariad", projection: "operational", snapshotId: "op-current", sourceRevision: "sha256:op" },
};

const tactical = {
  document: {
    contractVersion: "1.0", schemaVersion: "1", journeyId: "journey-a", altitude: "tactical",
    namespace: "nautilus-synthesis", projection: "tactical", snapshotId: "ta-current", sourceRevision: "sha256:ta",
    sourceSnapshots: [{ namespace: "ariad", projection: "operational", snapshotId: "op-current" }],
    content: {
      mission: { id: "mission", title: "Current mission", purpose: "Orient the Journey.", sourceReferences: ["mission-source"] },
      evidence: [{ id: "evidence", title: "Evidence", summary: "Grounded signal.", sourceReferences: ["roadmap"] }],
      deliverables: [{ id: "delivery", title: "Delivery", summary: "Available form.", evidenceIds: ["evidence"], sourceReferences: ["roadmap"] }],
      ambiguities: [{ id: "ambiguity", title: "Open ambiguity", summary: "Two readings remain possible.", sourceReferences: ["roadmap"] }],
      meaningCheckpoints: [{ id: "checkpoint", title: "Provisional checkpoint", summary: "Interpretation is still emerging.", state: "provisional", sourceReferences: ["checkpoint-source"] }],
    },
  },
  manifest: { namespace: "nautilus-synthesis", projection: "tactical", snapshotId: "ta-current", sourceRevision: "sha256:ta" },
};

const strategic = {
  document: {
    contractVersion: "1.0", schemaVersion: "1", journeyId: "journey-a", altitude: "strategic",
    namespace: "nautilus-synthesis", projection: "strategic", snapshotId: "st-current", sourceRevision: "sha256:st",
    sourceSnapshots: [
      { namespace: "ariad", projection: "operational", snapshotId: "op-current" },
      { namespace: "nautilus-synthesis", projection: "tactical", snapshotId: "ta-current" },
    ],
    content: {
      impacts: [{ id: "impact", title: "Impact", summary: "Something happened after.", sourceReferences: ["roadmap"] }],
      realizations: [{
        id: "realization", title: "Realization", summary: "Value became available.", impactIds: ["impact"],
        pragmaticValue: { summary: "Useful capacity.", sourceReferences: ["roadmap"] },
        integrativeValue: { summary: "Field coherence.", sourceReferences: ["roadmap"] },
        sourceReferences: ["roadmap"],
      }],
      meaningCheckpoints: [{ id: "strategic-checkpoint", title: "Consolidated meaning", summary: "Meaning was explicitly published.", state: "consolidated", sourceReferences: ["strategic-source"], correctionBoundary: "Correction appends review without rewriting the source." }],
    },
  },
  manifest: { namespace: "nautilus-synthesis", projection: "strategic", snapshotId: "st-current", sourceRevision: "sha256:st" },
};

describe("published Journey projections", () => {
  it("normalizes current coordinated readings", () => {
    const bundle = normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical, strategic, errors: [] }, "journey-a");
    expect(bundle.operational?.snapshotId).toBe("op-current");
    expect(bundle.tactical?.content.mission.title).toBe("Current mission");
    expect(bundle.tactical?.content.mission.sourceReferences).toEqual(["mission-source"]);
    expect(bundle.tactical?.content.ambiguities[0].title).toBe("Open ambiguity");
    expect(bundle.tactical?.content.meaningCheckpoints[0].state).toBe("provisional");
    expect(bundle.strategic?.content.realizations[0].title).toBe("Realization");
    expect(bundle.strategic?.content.meaningCheckpoints[0].correctionBoundary).toContain("without rewriting");
    expect(bundle.tacticalStale).toBe(false);
    expect(bundle.strategicStale).toBe(false);
  });

  it("keeps missing derived readings honestly absent", () => {
    const bundle = normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical: null, strategic: null, errors: [] }, "journey-a");
    expect(bundle.tactical).toBeUndefined();
    expect(bundle.strategic).toBeUndefined();
  });

  it("detects Operational and Tactical ancestry staleness", () => {
    const staleTactical = structuredClone(tactical);
    staleTactical.document.sourceSnapshots[0].snapshotId = "op-old";
    const staleStrategic = structuredClone(strategic);
    staleStrategic.document.sourceSnapshots[1].snapshotId = "ta-old";
    const bundle = normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical: staleTactical, strategic: staleStrategic, errors: [] }, "journey-a");
    expect(bundle.tacticalStale).toBe(true);
    expect(bundle.strategicStale).toBe(true);
  });

  it("rejects cross-Journey, divergent and relationally invalid documents", () => {
    expect(() => normalizeJourneyProjectionBundle({ journeyId: "journey-b", operational, errors: [] }, "journey-a")).toThrow("Journey");
    const divergent = structuredClone(tactical);
    divergent.manifest.snapshotId = "ta-other";
    expect(() => normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical: divergent, errors: [] }, "journey-a")).toThrow("manifest");
    const broken = structuredClone(tactical);
    broken.document.content.deliverables[0].evidenceIds = ["unknown"];
    expect(() => normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical: broken, errors: [] }, "journey-a")).toThrow("evidence");
    const ungrounded = structuredClone(tactical);
    ungrounded.document.sourceSnapshots = [];
    expect(() => normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical: ungrounded, errors: [] }, "journey-a")).toThrow("ancestry");
    const badCheckpoint = structuredClone(strategic);
    badCheckpoint.document.content.meaningCheckpoints[0].state = "invented";
    expect(() => normalizeJourneyProjectionBundle({ journeyId: "journey-a", operational, tactical, strategic: badCheckpoint, errors: [] }, "journey-a")).toThrow("checkpoint state");
  });
});
