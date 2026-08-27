export type ProjectionSource = {
  namespace: string;
  projection: string;
  snapshotId: string;
};

export type OperationalProjection = {
  journeyId: string;
  snapshotId: string;
  sourceRevision: string;
  content?: OperationalProjectionContent;
};

export type OperationalProjectionContent = {
  activeWork?: {
    activeItem?: string;
    checkpoint?: string;
    pendingConfirmation?: string;
    status?: string;
  };
  roadmap?: {
    roots: OperationalRoadmapNode[];
  };
  refinementStories?: OperationalRefinementStory[];
  exploratoryStories?: OperationalExploratoryStory[];
};

export type OperationalRoadmapNode = {
  id: string;
  title: string;
  type: string;
  status: string;
  outcome?: string;
  path?: string;
  artifacts?: Record<string, string>;
  children: OperationalRoadmapNode[];
};

export type OperationalRefinementStory = {
  id: string;
  title: string;
  status: string;
  active?: boolean;
  path?: string;
  changeRequests: {
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
  }[];
};

export type OperationalExploratoryStory = {
  id: string;
  title: string;
  status: string;
  summary?: string;
  path?: string;
  attractors: { title: string; description?: string; status?: string }[];
  experiments: { title: string; description?: string; status?: string }[];
  handoff?: { path?: string; status?: string };
};

export type DerivedMeaningCheckpoint = {
  id: string;
  title: string;
  summary: string;
  state: "provisional" | "consolidated" | "contested" | "correction_requested" | "stale";
  sourceReferences: string[];
  correctionBoundary?: string;
};

export type TacticalProjection = OperationalProjection & {
  sourceSnapshots: ProjectionSource[];
  content: {
    mission: { id: string; title: string; purpose: string; sourceReferences: string[] };
    evidence: { id: string; title: string; summary: string; sourceReferences: string[] }[];
    deliverables: { id: string; title: string; summary: string; evidenceIds: string[]; sourceReferences: string[] }[];
    ambiguities: { id: string; title: string; summary: string; sourceReferences: string[] }[];
    meaningCheckpoints: DerivedMeaningCheckpoint[];
  };
};

export type StrategicProjection = OperationalProjection & {
  sourceSnapshots: ProjectionSource[];
  content: {
    impacts: { id: string; title: string; summary: string; sourceReferences: string[] }[];
    realizations: {
      id: string;
      title: string;
      summary: string;
      impactIds: string[];
      pragmaticValue: { summary: string; sourceReferences: string[] };
      integrativeValue: { summary: string; sourceReferences: string[] };
      sourceReferences: string[];
    }[];
    meaningCheckpoints: DerivedMeaningCheckpoint[];
  };
};

export type JourneyProjectionBundle = {
  journeyId: string;
  operational?: OperationalProjection;
  tactical?: TacticalProjection;
  strategic?: StrategicProjection;
  tacticalStale: boolean;
  strategicStale: boolean;
  errors: string[];
};

type RecordValue = Record<string, unknown>;

export function normalizeJourneyProjectionBundle(value: unknown, expectedJourneyId: string): JourneyProjectionBundle {
  const payload = record(value, "projection bundle");
  const journeyId = text(payload.journeyId, "bundle Journey");
  if (journeyId !== expectedJourneyId) throw new Error("Projection bundle Journey does not match the selected Journey.");
  const operational = payload.operational == null ? undefined : parseOperational(payload.operational, journeyId);
  const tactical = payload.tactical == null ? undefined : parseTactical(payload.tactical, journeyId);
  const strategic = payload.strategic == null ? undefined : parseStrategic(payload.strategic, journeyId);
  const errors = payload.errors == null ? [] : stringArray(payload.errors, "bundle errors", true);
  const operationalSnapshot = operational?.snapshotId;
  const tacticalOperational = tactical && findSource(tactical.sourceSnapshots, "ariad", "operational");
  const strategicOperational = strategic && findSource(strategic.sourceSnapshots, "ariad", "operational");
  const strategicTactical = strategic && findSource(strategic.sourceSnapshots, "nautilus-synthesis", "tactical");
  return {
    journeyId,
    operational,
    tactical,
    strategic,
    tacticalStale: Boolean(tactical && (!operationalSnapshot || tacticalOperational?.snapshotId !== operationalSnapshot)),
    strategicStale: Boolean(strategic && (
      !operationalSnapshot
      || strategicOperational?.snapshotId !== operationalSnapshot
      || Boolean(strategicTactical && strategicTactical.snapshotId !== tactical?.snapshotId)
    )),
    errors,
  };
}

function parseOperational(value: unknown, journeyId: string): OperationalProjection {
  const document = validatedInspection(value, journeyId, "ariad", "operational", "operational");
  return {
    journeyId,
    snapshotId: text(document.snapshotId, "Operational snapshot"),
    sourceRevision: text(document.sourceRevision, "Operational revision"),
    content: parseOperationalContent(document.content),
  };
}

function parseTactical(value: unknown, journeyId: string): TacticalProjection {
  const document = validatedInspection(value, journeyId, "nautilus-synthesis", "tactical", "tactical");
  const content = record(document.content, "Tactical content");
  exactKeys(content, ["mission", "evidence", "deliverables"], "Tactical content", ["ambiguities", "meaningCheckpoints"]);
  const mission = record(content.mission, "Tactical mission");
  exactKeys(mission, ["id", "title", "purpose"], "Tactical mission", ["sourceReferences"]);
  const evidence = records(content.evidence, "Tactical evidence").map((item) => ({
    id: text(item.id, "Evidence id"), title: text(item.title, "Evidence title"), summary: text(item.summary, "Evidence summary"),
    sourceReferences: stringArray(item.sourceReferences, "Evidence sources"),
  }));
  uniqueIds(evidence, "evidence");
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const deliverables = records(content.deliverables, "Tactical deliverables").map((item) => ({
    id: text(item.id, "Deliverable id"), title: text(item.title, "Deliverable title"), summary: text(item.summary, "Deliverable summary"),
    evidenceIds: stringArray(item.evidenceIds, "Deliverable evidence"), sourceReferences: stringArray(item.sourceReferences, "Deliverable sources"),
  }));
  uniqueIds(deliverables, "deliverable");
  if (deliverables.some((item) => item.evidenceIds.some((id) => !evidenceIds.has(id)))) throw new Error("Tactical deliverable references unknown evidence.");
  const sourceSnapshots = sources(document.sourceSnapshots);
  if (!findSource(sourceSnapshots, "ariad", "operational")) throw new Error("Tactical projection requires Operational ancestry.");
  const ambiguities = optionalRecords(content.ambiguities).map((item) => ({
    id: text(item.id, "Ambiguity id"), title: text(item.title, "Ambiguity title"), summary: text(item.summary, "Ambiguity summary"),
    sourceReferences: stringArray(item.sourceReferences, "Ambiguity sources"),
  }));
  uniqueIds(ambiguities, "ambiguity");
  return {
    journeyId, snapshotId: text(document.snapshotId, "Tactical snapshot"), sourceRevision: text(document.sourceRevision, "Tactical revision"),
    sourceSnapshots,
    content: {
      mission: {
        id: text(mission.id, "Mission id"), title: text(mission.title, "Mission title"), purpose: text(mission.purpose, "Mission purpose"),
        sourceReferences: mission.sourceReferences == null ? [] : stringArray(mission.sourceReferences, "Mission sources", true),
      },
      evidence,
      deliverables,
      ambiguities,
      meaningCheckpoints: optionalRecords(content.meaningCheckpoints).map(meaningCheckpoint),
    },
  };
}

function parseStrategic(value: unknown, journeyId: string): StrategicProjection {
  const document = validatedInspection(value, journeyId, "nautilus-synthesis", "strategic", "strategic");
  const content = record(document.content, "Strategic content");
  exactKeys(content, ["realizations", "impacts"], "Strategic content", ["meaningCheckpoints"]);
  const impacts = records(content.impacts, "Strategic impacts").map((item) => ({
    id: text(item.id, "Impact id"), title: text(item.title, "Impact title"), summary: text(item.summary, "Impact summary"),
    sourceReferences: stringArray(item.sourceReferences, "Impact sources"),
  }));
  uniqueIds(impacts, "impact");
  const impactIds = new Set(impacts.map((item) => item.id));
  const realizations = records(content.realizations, "Strategic realizations").map((item) => {
    const pragmatic = valueReading(item.pragmaticValue, "Pragmatic value");
    const integrative = valueReading(item.integrativeValue, "Integrative value");
    const related = stringArray(item.impactIds, "Realization impacts", true);
    if (related.some((id) => !impactIds.has(id))) throw new Error("Strategic realization references unknown impact.");
    return {
      id: text(item.id, "Realization id"), title: text(item.title, "Realization title"), summary: text(item.summary, "Realization summary"), impactIds: related,
      pragmaticValue: pragmatic, integrativeValue: integrative, sourceReferences: stringArray(item.sourceReferences, "Realization sources"),
    };
  });
  uniqueIds(realizations, "realization");
  const sourceSnapshots = sources(document.sourceSnapshots);
  if (!findSource(sourceSnapshots, "ariad", "operational")) throw new Error("Strategic projection requires Operational ancestry.");
  return {
    journeyId, snapshotId: text(document.snapshotId, "Strategic snapshot"), sourceRevision: text(document.sourceRevision, "Strategic revision"),
    sourceSnapshots, content: { impacts, realizations, meaningCheckpoints: optionalRecords(content.meaningCheckpoints).map(meaningCheckpoint) },
  };
}

function validatedInspection(value: unknown, journeyId: string, namespace: string, projection: string, altitude: string): RecordValue {
  const inspection = record(value, `${projection} inspection`);
  const document = record(inspection.document, `${projection} document`);
  const manifest = record(inspection.manifest, `${projection} manifest`);
  if (document.contractVersion !== "1.0" || document.schemaVersion !== "1") throw new Error(`${projection} contract version is unsupported.`);
  if (document.journeyId !== journeyId) throw new Error(`${projection} document belongs to another Journey.`);
  if (document.namespace !== namespace || document.projection !== projection || document.altitude !== altitude) throw new Error(`${projection} identity is invalid.`);
  for (const key of ["namespace", "projection", "snapshotId", "sourceRevision"]) {
    if (manifest[key] !== document[key]) throw new Error(`${projection} manifest does not match its document.`);
  }
  return document;
}

function sources(value: unknown): ProjectionSource[] {
  return records(value, "source snapshots", true).map((item) => ({ namespace: text(item.namespace, "source namespace"), projection: text(item.projection, "source projection"), snapshotId: text(item.snapshotId, "source snapshot") }));
}

function findSource(items: ProjectionSource[], namespace: string, projection: string) {
  return items.find((item) => item.namespace === namespace && item.projection === projection);
}

function parseOperationalContent(value: unknown): OperationalProjectionContent | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const content = value as RecordValue;
  const activeWork = optionalRecord(content.activeWork);
  const roadmap = optionalRecord(content.roadmap);
  return {
    activeWork: activeWork ? {
      activeItem: optionalText(activeWork.activeItem),
      checkpoint: optionalText(activeWork.checkpoint),
      pendingConfirmation: optionalText(activeWork.pendingConfirmation),
      status: optionalText(activeWork.status),
    } : undefined,
    roadmap: roadmap ? { roots: optionalRecords(roadmap.roots).map(roadmapNode) } : undefined,
    refinementStories: optionalRecords(content.refinementStories).map(refinementStory),
    exploratoryStories: optionalRecords(content.exploratoryStories).map(exploratoryStory),
  };
}

function roadmapNode(value: RecordValue): OperationalRoadmapNode {
  return {
    id: text(value.id, "Roadmap item id"),
    title: text(value.title, "Roadmap item title"),
    type: text(value.type, "Roadmap item type"),
    status: text(value.status, "Roadmap item status"),
    outcome: optionalText(value.outcome),
    path: optionalText(value.path),
    artifacts: optionalStringRecord(value.artifacts),
    children: optionalRecords(value.children).map(roadmapNode),
  };
}

function refinementStory(value: RecordValue): OperationalRefinementStory {
  return {
    id: text(value.id, "Refinement Story id"),
    title: text(value.title, "Refinement Story title"),
    status: text(value.status, "Refinement Story status"),
    active: optionalBoolean(value.active),
    path: optionalText(value.path),
    changeRequests: optionalRecords(value.changeRequests).map((request) => ({
      id: text(request.id, "Change Request id"),
      title: text(request.title, "Change Request title"),
      status: text(request.status, "Change Request status"),
      active: optionalBoolean(request.active),
      problem: optionalText(request.problem),
      expectedBehavior: optionalText(request.expectedBehavior),
      evidence: optionalText(request.evidence),
      outcome: optionalText(request.outcome),
      driver: optionalText(request.driver),
      delivery: optionalText(request.delivery),
      path: optionalText(request.path),
    })),
  };
}

function exploratoryStory(value: RecordValue): OperationalExploratoryStory {
  const handoff = optionalRecord(value.handoff);
  return {
    id: text(value.id, "Exploratory Story id"),
    title: text(value.title, "Exploratory Story title"),
    status: text(value.status, "Exploratory Story status"),
    summary: optionalText(value.summary),
    path: optionalText(value.path),
    attractors: optionalRecords(value.attractors).map((item) => ({
      title: text(item.title, "Attractor title"),
      description: optionalText(item.description),
      status: optionalText(item.status),
    })),
    experiments: optionalRecords(value.experiments).map((item) => ({
      title: text(item.title, "Experiment title"),
      description: optionalText(item.description),
      status: optionalText(item.status),
    })),
    handoff: handoff ? {
      path: optionalText(handoff.path),
      status: optionalText(handoff.status),
    } : undefined,
  };
}

function valueReading(value: unknown, label: string) {
  const item = record(value, label);
  return { summary: text(item.summary, `${label} summary`), sourceReferences: stringArray(item.sourceReferences, `${label} sources`) };
}

function meaningCheckpoint(value: RecordValue): DerivedMeaningCheckpoint {
  const state = text(value.state, "Meaning checkpoint state");
  if (!["provisional", "consolidated", "contested", "correction_requested", "stale"].includes(state)) throw new Error("Meaning checkpoint state is invalid.");
  return {
    id: text(value.id, "Meaning checkpoint id"),
    title: text(value.title, "Meaning checkpoint title"),
    summary: text(value.summary, "Meaning checkpoint summary"),
    state: state as DerivedMeaningCheckpoint["state"],
    sourceReferences: stringArray(value.sourceReferences, "Meaning checkpoint sources"),
    correctionBoundary: optionalText(value.correctionBoundary),
  };
}

function record(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as RecordValue;
}

function records(value: unknown, label: string, allowEmpty = false): RecordValue[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) throw new Error(`${label} is invalid.`);
  return value.map((item) => record(item, label));
}

function optionalRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
}

function optionalRecords(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as RecordValue[] : [];
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalStringRecord(value: unknown): Record<string, string> | undefined {
  const item = optionalRecord(value);
  if (!item) return undefined;
  const entries = Object.entries(item).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is invalid.`);
  return value;
}

function stringArray(value: unknown, label: string, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || item.trim() === "")) throw new Error(`${label} is invalid.`);
  return value as string[];
}

function exactKeys(value: RecordValue, expected: string[], label: string, optional: string[] = []) {
  const actual = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  const wanted = [...expected, ...optional.filter((key) => value[key] !== undefined)].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`${label} has unexpected fields.`);
}

function uniqueIds(items: { id: string }[], label: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`${label} identifiers must be unique.`);
}
