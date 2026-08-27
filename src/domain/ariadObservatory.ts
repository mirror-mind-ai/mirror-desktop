import type { OperationalProjection } from "./journeyProjections";

export type AriadFieldId = "delivery" | "refinement" | "exploration";

export type AriadRoadmapNode = {
  id: string;
  title: string;
  type: string;
  status: string;
  outcome?: string;
  path?: string;
  artifacts?: Record<string, string>;
  children: AriadRoadmapNode[];
};

export type AriadActiveWork = {
  activeItem?: string;
  checkpoint?: string;
  pendingConfirmation?: string;
  status?: string;
};

export type AriadRefinementStory = {
  id: string;
  title: string;
  status: string;
  active?: boolean;
  path?: string;
  changeRequests: AriadChangeRequest[];
};

export type AriadChangeRequest = {
  id: string;
  title: string;
  status: string;
  active?: boolean;
  problem?: string;
  expectedBehavior?: string;
  evidence?: string;
  outcome?: string;
  driver?: string;
  delivery?: string;
  path?: string;
};

export type AriadExploratoryStory = {
  id: string;
  title: string;
  status: string;
  summary?: string;
  path?: string;
  attractors: { title: string; description?: string; status?: string }[];
  experiments: { title: string; description?: string; status?: string }[];
  handoff?: { path?: string; status?: string };
};

export type AriadSelectedMatter = {
  field: AriadFieldId;
  id: string;
  title: string;
  kind: string;
  status: string;
  summary?: string;
  path?: string;
  details: { label: string; value: string }[];
  boundary: string;
};

export type AriadObservatoryModel = {
  journeyId: string;
  source: "published_operational_projection" | "unavailable";
  availability: "ready" | "unavailable";
  sourceRevision?: string;
  snapshotId?: string;
  activeWork?: AriadActiveWork;
  nextSafeMovement: { field: AriadFieldId; label: string }[];
  delivery: { roots: AriadRoadmapNode[]; summary: string };
  refinement: { stories: AriadRefinementStory[]; summary: string };
  exploration: { stories: AriadExploratoryStory[]; summary: string };
  defaultSelection?: AriadSelectedMatter;
  boundary: string;
};

export function createAriadObservatoryModel(
  journeyId: string,
  operational?: OperationalProjection,
): AriadObservatoryModel {
  const content = operational?.content;
  if (!operational || !content) {
    return {
      journeyId,
      source: "unavailable",
      availability: "unavailable",
      nextSafeMovement: [
        { field: "delivery", label: "Operational Ariad projection is unavailable" },
        { field: "refinement", label: "Refinement field cannot be inspected yet" },
        { field: "exploration", label: "Exploration field cannot be inspected yet" },
      ],
      delivery: { roots: [], summary: "Delivery source unavailable" },
      refinement: { stories: [], summary: "Refinement source unavailable" },
      exploration: { stories: [], summary: "Exploration source unavailable" },
      boundary: "Read-only. No source data was inferred or repaired.",
    };
  }

  const activeWork = content.activeWork;
  const deliveryRoots = content.roadmap?.roots ?? [];
  const refinementStories = content.refinementStories ?? [];
  const exploratoryStories = content.exploratoryStories ?? [];
  const selected = selectDefaultMatter(activeWork, deliveryRoots, refinementStories, exploratoryStories);

  return {
    journeyId,
    source: "published_operational_projection",
    availability: "ready",
    sourceRevision: operational.sourceRevision,
    snapshotId: operational.snapshotId,
    activeWork,
    nextSafeMovement: [
      { field: "delivery", label: activeWork?.activeItem ? `Inspect ${activeWork.activeItem}` : "Inspect roadmap or pull a planned item through Builder" },
      { field: "refinement", label: activeRefinementLabel(refinementStories) },
      { field: "exploration", label: activeExplorationLabel(exploratoryStories) },
    ],
    delivery: {
      roots: deliveryRoots,
      summary: `${countNodes(deliveryRoots)} roadmap item${countNodes(deliveryRoots) === 1 ? "" : "s"}`,
    },
    refinement: {
      stories: refinementStories,
      summary: refinementStories.length > 0 ? `${refinementStories.length} refinement stor${refinementStories.length === 1 ? "y" : "ies"}` : "No Refinement field published",
    },
    exploration: {
      stories: exploratoryStories,
      summary: exploratoryStories.length > 0 ? `${exploratoryStories.length} exploratory stor${exploratoryStories.length === 1 ? "y" : "ies"}` : "No Exploration field published",
    },
    defaultSelection: selected,
    boundary: "Read-only Ariad observatory. Continue lifecycle work through the Builder or Explorer runtime.",
  };
}

export function selectedMatterFromDelivery(node: AriadRoadmapNode): AriadSelectedMatter {
  return {
    field: "delivery",
    id: node.id,
    title: node.title,
    kind: formatKind(node.type),
    status: node.status,
    summary: node.outcome,
    path: node.path,
    details: [
      { label: "Children", value: String(countNodes(node.children)) },
      ...(node.path ? [{ label: "Source", value: node.path }] : []),
    ],
    boundary: "Delivery is construction commitment. This view observes roadmap matter only.",
  };
}

export function selectedMatterFromRefinement(story: AriadRefinementStory, request?: AriadChangeRequest): AriadSelectedMatter {
  const item = request ?? story;
  return {
    field: "refinement",
    id: item.id,
    title: item.title,
    kind: request ? "Change Request" : "Refinement Story",
    status: item.status,
    summary: request?.problem ?? `${story.changeRequests.length} change request${story.changeRequests.length === 1 ? "" : "s"}`,
    path: item.path,
    details: [
      ...(request?.expectedBehavior ? [{ label: "Expected", value: request.expectedBehavior }] : []),
      ...(request?.evidence ? [{ label: "Evidence", value: request.evidence }] : []),
      ...(request?.driver ? [{ label: "Driver", value: request.driver }] : []),
      ...(request?.delivery ? [{ label: "Delivery", value: request.delivery }] : []),
    ],
    boundary: "Refinement is friction care. Continue transitions through Builder runtime.",
  };
}

export function selectedMatterFromExploration(story: AriadExploratoryStory): AriadSelectedMatter {
  return {
    field: "exploration",
    id: story.id,
    title: story.title,
    kind: "Exploratory Story",
    status: story.status,
    summary: story.summary,
    path: story.path,
    details: [
      { label: "Attractors", value: String(story.attractors.length) },
      { label: "Experiments", value: String(story.experiments.length) },
      ...(story.handoff?.path ? [{ label: "Handoff", value: story.handoff.path }] : []),
    ],
    boundary: "Exploration is organized uncertainty. Promotion remains an explicit Explorer boundary.",
  };
}

function selectDefaultMatter(
  activeWork: AriadActiveWork | undefined,
  deliveryRoots: AriadRoadmapNode[],
  refinementStories: AriadRefinementStory[],
  exploratoryStories: AriadExploratoryStory[],
) {
  const activeDelivery = activeWork?.activeItem ? findDeliveryNode(deliveryRoots, activeWork.activeItem) : undefined;
  if (activeDelivery) return selectedMatterFromDelivery(activeDelivery);
  const activeRefinement = refinementStories.find((story) => story.active) ?? refinementStories[0];
  if (activeRefinement) {
    return selectedMatterFromRefinement(activeRefinement, activeRefinement.changeRequests.find((request) => request.active) ?? activeRefinement.changeRequests[0]);
  }
  const activeExploration = exploratoryStories.find((story) => story.status === "active") ?? exploratoryStories[0];
  return activeExploration ? selectedMatterFromExploration(activeExploration) : undefined;
}

function findDeliveryNode(nodes: AriadRoadmapNode[], id: string): AriadRoadmapNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findDeliveryNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function countNodes(nodes: AriadRoadmapNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function activeRefinementLabel(stories: AriadRefinementStory[]) {
  const active = stories.find((story) => story.active) ?? stories.find((story) => story.changeRequests.some((request) => request.active));
  if (!active) return stories.length > 0 ? "Inspect Refinement field" : "No active Refinement field";
  const request = active.changeRequests.find((item) => item.active);
  return request ? `Continue observing ${request.id}` : `Inspect ${active.id}`;
}

function activeExplorationLabel(stories: AriadExploratoryStory[]) {
  const active = stories.find((story) => story.status === "active") ?? stories[0];
  return active ? `Inspect ${active.title}` : "No active Exploration field";
}

function formatKind(value: string) {
  return value.split("_").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}
