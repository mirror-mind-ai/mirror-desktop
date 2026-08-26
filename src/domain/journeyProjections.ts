export type ProjectionSource = {
  namespace: string;
  projection: string;
  snapshotId: string;
};

export type OperationalProjection = {
  journeyId: string;
  snapshotId: string;
  sourceRevision: string;
};

export type TacticalProjection = OperationalProjection & {
  sourceSnapshots: ProjectionSource[];
  content: {
    mission: { id: string; title: string; purpose: string };
    evidence: { id: string; title: string; summary: string; sourceReferences: string[] }[];
    deliverables: { id: string; title: string; summary: string; evidenceIds: string[]; sourceReferences: string[] }[];
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
  return { journeyId, snapshotId: text(document.snapshotId, "Operational snapshot"), sourceRevision: text(document.sourceRevision, "Operational revision") };
}

function parseTactical(value: unknown, journeyId: string): TacticalProjection {
  const document = validatedInspection(value, journeyId, "nautilus-synthesis", "tactical", "tactical");
  const content = record(document.content, "Tactical content");
  exactKeys(content, ["mission", "evidence", "deliverables"], "Tactical content");
  const mission = record(content.mission, "Tactical mission");
  exactKeys(mission, ["id", "title", "purpose"], "Tactical mission");
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
  return {
    journeyId, snapshotId: text(document.snapshotId, "Tactical snapshot"), sourceRevision: text(document.sourceRevision, "Tactical revision"),
    sourceSnapshots,
    content: { mission: { id: text(mission.id, "Mission id"), title: text(mission.title, "Mission title"), purpose: text(mission.purpose, "Mission purpose") }, evidence, deliverables },
  };
}

function parseStrategic(value: unknown, journeyId: string): StrategicProjection {
  const document = validatedInspection(value, journeyId, "nautilus-synthesis", "strategic", "strategic");
  const content = record(document.content, "Strategic content");
  exactKeys(content, ["realizations", "impacts"], "Strategic content");
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
    sourceSnapshots, content: { impacts, realizations },
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

function valueReading(value: unknown, label: string) {
  const item = record(value, label);
  return { summary: text(item.summary, `${label} summary`), sourceReferences: stringArray(item.sourceReferences, `${label} sources`) };
}

function record(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as RecordValue;
}

function records(value: unknown, label: string, allowEmpty = false): RecordValue[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) throw new Error(`${label} is invalid.`);
  return value.map((item) => record(item, label));
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is invalid.`);
  return value;
}

function stringArray(value: unknown, label: string, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || item.trim() === "")) throw new Error(`${label} is invalid.`);
  return value as string[];
}

function exactKeys(value: RecordValue, expected: string[], label: string) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`${label} has unexpected fields.`);
}

function uniqueIds(items: { id: string }[], label: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`${label} identifiers must be unique.`);
}
