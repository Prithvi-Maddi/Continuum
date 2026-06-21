// ---------- General primitives ----------

export type ID = string;

export type EntityType =
  | "character" | "location" | "faction" | "object" | "event" | "rule";

export type EpistemicStatus =
  | "objective"
  | "character_believed"
  | "public"
  | "hidden";

export type FactType =
  | "world_rule" | "character_state" | "object_state"
  | "relationship" | "faction_state" | "knowledge_state"
  | "timeline" | "branch_state";

export type IssueType =
  | "world_rule" | "travel_time" | "character_state" | "object_state"
  | "relationship" | "faction_state" | "knowledge_state"
  | "timeline" | "branch";

export type Severity = "high" | "medium" | "low";

export type IssueStatus = "open" | "ignored" | "intentional" | "resolved";

export type PresentationType =
  | "main" | "flashback" | "flashforward" | "unknown";

// ---------- Project ----------

export interface Project {
  id: ID;
  name: string;
  description?: string;
  createdAt: string;
}

// ---------- Sources ----------

export interface CanonSource {
  id: ID;
  projectId: ID;
  title: string;
  kind: "manuscript" | "notes" | "wiki" | "import" | "seed" | "scene";
  text: string;
  createdAt: string;
}

// ---------- Entities ----------

export interface Entity {
  id: ID;
  projectId: ID;
  name: string;
  type: EntityType;
  aliases?: string[];
  summary?: string;
  attributes?: Record<string, string>;
}

// ---------- Timeline ----------

export interface TimelineEvent {
  id: ID;
  projectId: ID;
  name: string;
  order: number;
  branchId?: ID | null;
  summary?: string;
}

// ---------- Branches ----------

export interface Branch {
  id: ID;
  projectId: ID;
  name: string;
  parentBranchId: ID | null;
  description?: string;
}

// ---------- Canon facts ----------

export interface CanonFact {
  id: ID;
  projectId: ID;
  text: string;
  factType: FactType;
  entityIds: ID[];
  sourceId: ID | null;
  sourceQuote: string;
  confidence: number;
  branchId: ID | null;
  validityStartEventId: ID | null;
  validityEndEventId: ID | null;
  epistemicStatus: EpistemicStatus;
  epistemicSubjectId?: ID | null;
}

// ---------- Scene draft + context ----------

export interface InferredContext {
  presentation: PresentationType;
  anchorEventId?: ID | null;
  branchId?: ID | null;
  confidence: number;
  signals?: string[];
  conflict: boolean;
}

export interface SceneContext {
  presentation: PresentationType;
  anchorEventId?: ID | null;
  branchId: ID | null;
  resolvedPosition?: number;
  confirmed: boolean;
  inferred?: InferredContext | null;
}

export interface SceneDraft {
  id: ID;
  projectId: ID;
  text: string;
  context: SceneContext;
  updatedAt: string;
}

// ---------- Claims ----------

export type ClaimType = FactType;

export interface Claim {
  id: ID;
  claimText: string;
  claimType: ClaimType;
  entityIds: ID[];
  entityMentions: string[];
  sourceSpan: { start: number; end: number; quote: string };
  impliedBranchId?: ID | null;
  impliedPosition?: number | null;
  confidence: number;
}

// ---------- Suggested fixes ----------

export interface SuggestedFix {
  id: ID;
  label: string;
  description: string;
  replacement: string;
  canonUpdate?: Partial<CanonFact> | null;
  preservesVoice: boolean;
}

// ---------- Continuity issues ----------

export interface ContinuityIssue {
  id: ID;
  projectId: ID;
  sceneDraftId: ID;
  issueType: IssueType;
  severity: Severity;
  highlightedText: string;
  span: { start: number; end: number };
  explanation: string;
  evidenceQuotes: string[];
  conflictingFactIds: ID[];
  claimId?: ID | null;
  suggestedFixes: SuggestedFix[];
  status: IssueStatus;
  confidence: number;
}

// ---------- API response shapes ----------

export interface CheckResponse {
  issues: ContinuityIssue[];
  claims: Claim[];
  inferredContext: InferredContext | null;
  meta: {
    factsConsidered: number;
    factsFiltered: number;
    latencyMs: number;
  };
}

export interface IngestResponse {
  entities: Entity[];
  facts: CanonFact[];
  events: TimelineEvent[];
  branches: Branch[];
  sourceId: string;
}

export interface RepairResponse {
  patchedText: string;
  verified: boolean;
  explanation?: string;
  remainingIssues?: ContinuityIssue[];
}

// ---------- Full world state ----------

export interface WorldState {
  project: Project;
  sources: CanonSource[];
  entities: Entity[];
  facts: CanonFact[];
  events: TimelineEvent[];
  branches: Branch[];
}
