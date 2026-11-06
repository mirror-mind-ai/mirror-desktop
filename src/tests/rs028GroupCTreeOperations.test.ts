import { describe, expect, it } from "vitest";
import {
  journeyTreeAvailability,
  mutationTargetJourneyId,
  runningJourneyScope,
  treeOperationOfMutation,
  type JourneyMutationName,
  type JourneyTreeOperation,
  type RunningJourneyScope,
} from "../domain/journeyTreeAvailability";
import type { JourneyRegistry } from "../domain/journeyRegistry";

const registry: JourneyRegistry = {
  schemaVersion: "0.1.0",
  source: "fixture",
  syncedAt: "2026-11-06T10:00:00.000Z",
  roots: [
    {
      id: "vida-tecnica",
      name: "Vida Técnica",
      children: [
        { id: "mirror-desktop", name: "Nautilus App", children: [{ id: "nautilus-site", name: "Site" }] },
        { id: "finances", name: "Finanças" },
      ],
    },
    { id: "vida-criativa", name: "Vida Criativa" },
  ],
};

const idle: RunningJourneyScope = { runningJourneyIds: [], uncertain: false };
const running = (...ids: string[]): RunningJourneyScope => ({ runningJourneyIds: ids, uncertain: false });

/** Every tree operation the global guard used to disable, in one list, so none is forgotten. */
const operations: JourneyTreeOperation[] = [
  "create",
  "edit",
  "move",
  "drag",
  "set_project_path",
  "appearance",
  "reload_tree",
  "delete",
];

describe("CR099: a running turn stops blocking the tree", () => {
  it("allows every tree operation while nothing is running", () => {
    for (const operation of operations) {
      const availability = journeyTreeAvailability(operation, { targetJourneyId: "finances", registry, scope: idle });
      expect(availability, operation).toEqual({ allowed: true });
    }
  });

  it("allows every operation on another Journey while one Journey's agent works", () => {
    for (const operation of operations) {
      const availability = journeyTreeAvailability(operation, {
        targetJourneyId: "finances",
        registry,
        scope: running("vida-criativa"),
      });
      expect(availability.allowed, operation).toBe(true);
      expect(availability.reason, operation).toBeUndefined();
    }
  });

  it("allows reshaping the running Journey itself, because moving and renaming touch metadata only", () => {
    for (const operation of ["create", "edit", "move", "drag", "appearance", "reload_tree"] as JourneyTreeOperation[]) {
      const availability = journeyTreeAvailability(operation, {
        targetJourneyId: "mirror-desktop",
        registry,
        scope: running("mirror-desktop"),
      });
      expect(availability, operation).toEqual({ allowed: true });
    }
  });
});

describe("CR099: the two refusals that are kept, each with its reason named", () => {
  it("refuses to delete a Journey whose own agent is working", () => {
    expect(
      journeyTreeAvailability("delete", { targetJourneyId: "mirror-desktop", registry, scope: running("mirror-desktop") }),
    ).toEqual({
      allowed: false,
      reason: "An agent is working in this Journey. Stop the turn before deleting it.",
    });
  });

  it("refuses to delete a Journey whose descendant has a working agent, naming where it is", () => {
    expect(
      journeyTreeAvailability("delete", { targetJourneyId: "vida-tecnica", registry, scope: running("nautilus-site") }),
    ).toEqual({
      allowed: false,
      reason: "An agent is working in Site, under this Journey. Stop the turn before deleting it.",
    });
  });

  it("allows deleting a Journey while a sibling's agent works", () => {
    expect(
      journeyTreeAvailability("delete", { targetJourneyId: "finances", registry, scope: running("mirror-desktop") }),
    ).toEqual({ allowed: true });
  });

  it("lets the running Journey's folder change, and says the turn in flight keeps its own", () => {
    expect(
      journeyTreeAvailability("set_project_path", {
        targetJourneyId: "mirror-desktop",
        registry,
        scope: running("mirror-desktop"),
      }),
    ).toEqual({
      allowed: true,
      note: "The turn now running keeps the folder it started in. The new folder applies to the next turn.",
    });
  });

  it("says nothing about the next turn when the folder changes on an idle Journey", () => {
    expect(
      journeyTreeAvailability("set_project_path", { targetJourneyId: "finances", registry, scope: running("mirror-desktop") }),
    ).toEqual({ allowed: true });
  });
});

describe("CR099: an unreadable occupancy refuses only what is irreversible", () => {
  const uncertain: RunningJourneyScope = { runningJourneyIds: [], uncertain: true };

  it("refuses deletion while Nautilus cannot tell which Journeys are working", () => {
    expect(journeyTreeAvailability("delete", { targetJourneyId: "finances", registry, scope: uncertain })).toEqual({
      allowed: false,
      reason: "Nautilus cannot tell which Journeys have a working agent right now. Try again in a moment.",
    });
  });

  it("still allows every reversible operation, because waiting on an unreadable registry blocks the person for nothing", () => {
    for (const operation of operations.filter((operation) => operation !== "delete")) {
      expect(journeyTreeAvailability(operation, { targetJourneyId: "finances", registry, scope: uncertain }).allowed, operation).toBe(true);
    }
  });
});

describe("CR099: a target the tree does not know", () => {
  it("treats a missing target as deletable only when nothing at all is running", () => {
    expect(journeyTreeAvailability("delete", { targetJourneyId: "gone", registry, scope: idle })).toEqual({ allowed: true });
    expect(
      journeyTreeAvailability("delete", { targetJourneyId: "gone", registry, scope: running("mirror-desktop") }),
    ).toEqual({ allowed: true });
  });

  it("allows operations with no target at all, such as creating a root Journey", () => {
    expect(journeyTreeAvailability("create", { registry, scope: running("mirror-desktop") })).toEqual({ allowed: true });
    expect(journeyTreeAvailability("reload_tree", { registry, scope: running("mirror-desktop") })).toEqual({ allowed: true });
  });
});

describe("CR099: which Journeys count as working", () => {
  it("reads the renderer's runtime entries and the native leases as one set", () => {
    expect(
      runningJourneyScope({
        runtimeEntries: { "mirror-desktop": true, finances: false },
        nativeLeaseJourneyIds: ["vida-criativa"],
        occupancyKnown: true,
      }),
    ).toEqual({ runningJourneyIds: ["mirror-desktop", "vida-criativa"], uncertain: false });
  });

  it("never repeats a Journey both sources name", () => {
    expect(
      runningJourneyScope({
        runtimeEntries: { "mirror-desktop": true },
        nativeLeaseJourneyIds: ["mirror-desktop"],
        occupancyKnown: true,
      }).runningJourneyIds,
    ).toEqual(["mirror-desktop"]);
  });

  it("marks the scope uncertain when the native registry could not be read", () => {
    expect(
      runningJourneyScope({ runtimeEntries: {}, nativeLeaseJourneyIds: [], occupancyKnown: false }),
    ).toEqual({ runningJourneyIds: [], uncertain: true });
  });
});

describe("CR099: the mutation that reaches Mirror is judged as the same operation", () => {
  it("maps every mutation to a tree operation, so none escapes the rule", () => {
    const mapping: Record<JourneyMutationName, JourneyTreeOperation> = {
      create_journey: "create",
      update_journey: "edit",
      set_project_path: "set_project_path",
      clear_project_path: "set_project_path",
      move_journey: "move",
      delete_journey: "delete",
    };
    for (const [mutation, operation] of Object.entries(mapping)) {
      expect(treeOperationOfMutation(mutation as JourneyMutationName), mutation).toBe(operation);
    }
  });

  it("takes the target from the payload, and gives creation no target at all", () => {
    expect(mutationTargetJourneyId("update_journey", { journeyId: "finances" })).toBe("finances");
    expect(mutationTargetJourneyId("delete_journey", { journeyId: "finances" })).toBe("finances");
    expect(mutationTargetJourneyId("create_journey", { parentId: "finances" })).toBeUndefined();
    expect(mutationTargetJourneyId("update_journey", {})).toBeUndefined();
    expect(mutationTargetJourneyId("update_journey", { journeyId: "" })).toBeUndefined();
    expect(mutationTargetJourneyId("update_journey", { journeyId: 7 })).toBeUndefined();
  });

  it("refuses the delete mutation itself, not only the menu item that opens it", () => {
    const availability = journeyTreeAvailability(
      treeOperationOfMutation("delete_journey"),
      { targetJourneyId: mutationTargetJourneyId("delete_journey", { journeyId: "mirror-desktop" }), registry, scope: running("mirror-desktop") },
    );
    expect(availability.allowed).toBe(false);
    expect(availability.reason).toContain("Stop the turn before deleting it.");
  });
});
