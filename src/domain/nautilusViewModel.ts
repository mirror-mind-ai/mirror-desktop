import type { FixtureValidation } from "../protocol/loadFixture";

export type NautilusViewModel = {
  status: "compatible" | "invalid";
  identity: {
    name: string;
    methodVersion: string;
    protocolVersion: string;
    schemaVersion: string;
    grammarStatus: string;
    compatibility: string;
  };
  mission?: {
    id: string;
    title: string;
    purpose: string;
    status: string;
  };
  errors: string[];
  executionAvailable: false;
};

export function toViewModel(validation: FixtureValidation): NautilusViewModel {
  if (!validation.ok) {
    return {
      status: "invalid",
      identity: {
        name: "Nautilus",
        methodVersion: "unknown",
        protocolVersion: "unknown",
        schemaVersion: "unknown",
        grammarStatus: "unknown",
        compatibility: "invalid",
      },
      errors: validation.errors,
      executionAvailable: false,
    };
  }

  const { document } = validation;
  return {
    status: "compatible",
    identity: {
      name: document.name,
      methodVersion: document.method_version,
      protocolVersion: document.protocol_version,
      schemaVersion: document.schema_version,
      grammarStatus: document.grammar_status,
      compatibility: document.compatibility,
    },
    mission: {
      id: document.mission.id,
      title: document.mission.title,
      purpose: document.mission.purpose,
      status: document.mission.status,
    },
    errors: [],
    executionAvailable: false,
  };
}
