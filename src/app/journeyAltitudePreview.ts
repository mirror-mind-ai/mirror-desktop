export type JourneyAltitude = "operational" | "tactical" | "strategic";

export type JourneyAltitudeDescriptor = {
  id: JourneyAltitude;
  label: string;
};

export const journeyAltitudeDescriptors = [
  { id: "operational", label: "Operational" },
  { id: "tactical", label: "Tactical" },
  { id: "strategic", label: "Strategic" },
] as const satisfies readonly JourneyAltitudeDescriptor[];

export const defaultJourneyAltitude: JourneyAltitude = "operational";

type PreviewStatus = "representative";

type PreviewArtifact = {
  id: string;
  kind: "folder" | "file";
  label: string;
  path: string;
};

type PreviewEvidence = {
  id: string;
  label: string;
  detail: string;
};

type PreviewDeliverable = {
  id: string;
  label: string;
  state: "complete" | "forming";
};

type PreviewImpact = {
  id: string;
  label: string;
};

export type RepresentativeJourneyPreview = {
  kind: "representative_preview";
  previewLabel: string;
  journey: {
    id: string;
    name: string;
  };
  artifacts: {
    previewStatus: PreviewStatus;
    items: readonly PreviewArtifact[];
  };
  tactical: {
    previewStatus: PreviewStatus;
    mission: {
      id: string;
      title: string;
      purpose: string;
      evidenceIds: readonly string[];
      deliverableIds: readonly string[];
    };
    evidence: readonly PreviewEvidence[];
    deliverables: readonly PreviewDeliverable[];
  };
  strategic: {
    previewStatus: PreviewStatus;
    realizations: readonly {
      id: string;
      title: string;
      relatedMissionId: string;
      relatedDeliverableIds: readonly string[];
      impactIds: readonly string[];
      pragmaticValue: string;
      integrativeValue: string;
    }[];
    impacts: readonly PreviewImpact[];
  };
};

export const representativeJourneyPreview = {
  kind: "representative_preview",
  previewLabel: "Representative Journey preview",
  journey: {
    id: "nautilus-harness",
    name: "Nautilus Harness",
  },
  artifacts: {
    previewStatus: "representative",
    items: [
      { id: "docs", kind: "folder", label: "docs", path: "docs" },
      {
        id: "roadmap",
        kind: "file",
        label: "roadmap/index.md",
        path: "docs/project/roadmap/index.md",
      },
      {
        id: "reconciliation-contract",
        kind: "file",
        label: "three-body reconciliation",
        path: "docs/architecture/three-body-conversation-reconciliation.md",
      },
      { id: "app", kind: "folder", label: "src/app", path: "src/app" },
    ],
  },
  tactical: {
    previewStatus: "representative",
    mission: {
      id: "integrate-nautilus-method",
      title: "Integrate the Nautilus method into the Harness",
      purpose: "Let one Journey be inhabited at operational, tactical and strategic altitudes.",
      evidenceIds: ["three-body-parity", "three-altitude-exploration"],
      deliverableIds: ["conversation-parity", "three-altitude-experiment"],
    },
    evidence: [
      {
        id: "three-body-parity",
        label: "Three-body parity accepted",
        detail: "Harness, Pi and Mirror continuity reached an accepted in-sync checkpoint.",
      },
      {
        id: "three-altitude-exploration",
        label: "Three-altitude exploration promoted",
        detail: "Operational, Tactical and Strategic were shaped as distances over one Journey.",
      },
    ],
    deliverables: [
      {
        id: "conversation-parity",
        label: "Conversation and Mirror context parity",
        state: "complete",
      },
      {
        id: "three-altitude-experiment",
        label: "Three-altitude GUI experiment",
        state: "forming",
      },
    ],
  },
  strategic: {
    previewStatus: "representative",
    realizations: [
      {
        id: "causal-journey-continuity",
        title: "Journey continuity became causally trustworthy",
        relatedMissionId: "integrate-nautilus-method",
        relatedDeliverableIds: ["conversation-parity", "three-altitude-experiment"],
        impactIds: ["safe-continuation", "method-ready-body"],
        pragmaticValue: "A Journey can continue across Harness, Pi and Mirror without silent loss or duplication.",
        integrativeValue: "The Harness can now reveal meaning at wider altitudes without abandoning operational truth.",
      },
    ],
    impacts: [
      {
        id: "safe-continuation",
        label: "Conversation continuation is observable and recoverable.",
      },
      {
        id: "method-ready-body",
        label: "The desktop body is ready to experiment with the Nautilus method.",
      },
    ],
  },
} as const satisfies RepresentativeJourneyPreview;

export function representativeJourneyPreviewForJourney(
  journeyId: string,
): RepresentativeJourneyPreview | undefined {
  return journeyId === representativeJourneyPreview.journey.id
    ? representativeJourneyPreview
    : undefined;
}
