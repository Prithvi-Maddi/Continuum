'use client';
import { create } from 'zustand';
import type {
  Project, Entity, CanonFact, TimelineEvent, Branch,
  SceneContext, ContinuityIssue, IssueStatus, InferredContext,
} from '@/lib/types';

// Hardcoded GoT issues for M1 fallback (always available)
export const HARDCODED_ISSUES: ContinuityIssue[] = [
  {
    id: 'iss_demo_1', projectId: 'proj_got_demo', sceneDraftId: 'draft_demo',
    issueType: 'character_state', severity: 'high',
    highlightedText: 'both gauntlets',
    span: { start: 30, end: 43 },
    explanation: 'Possible contradiction: Jaime Lannister lost his right sword hand after being captured. He cannot tighten straps on both gauntlets.',
    evidenceQuotes: ['Jaime Lannister lost his right sword hand after being captured.'],
    conflictingFactIds: ['fact_jaime_hand'],
    suggestedFixes: [{
      id: 'fix_demo_1a', label: 'Use his left gauntlet only',
      description: 'Reflect that Jaime only has one hand.',
      replacement: 'his left gauntlet', preservesVoice: true,
    }],
    status: 'open', confidence: 0.97,
  },
  {
    id: 'iss_demo_2', projectId: 'proj_got_demo', sceneDraftId: 'draft_demo',
    issueType: 'travel_time', severity: 'high',
    highlightedText: 'reached King\'s Landing by sunset',
    span: { start: 89, end: 116 },
    explanation: "Possible contradiction: Overland travel from Winterfell to King's Landing takes weeks of hard riding, not a single day.",
    evidenceQuotes: ["Overland travel from Winterfell to King's Landing takes weeks of hard riding, not a single day."],
    conflictingFactIds: ['fact_travel_time'],
    suggestedFixes: [{
      id: 'fix_demo_2a', label: 'Weeks later',
      description: 'Change the travel duration to match canon.',
      replacement: 'arrived at King\'s Landing weeks later, road-worn', preservesVoice: true,
    }],
    status: 'open', confidence: 0.95,
  },
  {
    id: 'iss_demo_3', projectId: 'proj_got_demo', sceneDraftId: 'draft_demo',
    issueType: 'world_rule', severity: 'high',
    highlightedText: 'a sight every lord had grown up seeing',
    span: { start: 147, end: 184 },
    explanation: "Possible contradiction: Daenerys Targaryen's three dragons are the first living dragons in a generation. No lord grew up seeing dragons — they are newly hatched.",
    evidenceQuotes: ["Daenerys Targaryen's three dragons are the first living dragons in a generation; no lord or commoner grew up knowing living dragons."],
    conflictingFactIds: ['fact_dragons_new'],
    suggestedFixes: [{
      id: 'fix_demo_3a', label: 'A sight none had seen before',
      description: 'Reflect the novelty of dragons.',
      replacement: 'a sight no living lord had ever seen before', preservesVoice: true,
    }],
    status: 'open', confidence: 0.93,
  },
  {
    id: 'iss_demo_4', projectId: 'proj_got_demo', sceneDraftId: 'draft_demo',
    issueType: 'branch', severity: 'high',
    highlightedText: 'Catelyn was already dead in the great hall',
    span: { start: 220, end: 261 },
    explanation: 'Possible contradiction: In the branch where Robb Stark survived the Twins, Catelyn Stark also survived. She cannot be already dead in the great hall within that branch.',
    evidenceQuotes: ['In the branch where Robb survived, Catelyn Stark also survived the massacre at the Twins.'],
    conflictingFactIds: ['fact_catelyn_lives'],
    suggestedFixes: [{
      id: 'fix_demo_4a', label: 'Catelyn survived too',
      description: 'Consistent with Robb-lives branch where Catelyn also survived.',
      replacement: 'Catelyn stood at Robb\'s side in the great hall', preservesVoice: true,
    }],
    status: 'open', confidence: 0.91,
  },
];

export const DEMO_DRAFT = "Catelyn Stark made her way down from the highest tower of Winterfell. Below, a group of riders were readying their horses to embark on the journey to King's Landing. They would leave in the late afternoon and ride all night to reach it by morning. She hoped that Jaime would take her message to Ned that Robb was safe and sound. Jaime raised his right hand in a wave, spotting her on the steps, and she nodded to him. She thought of the message that Maester Luwin had received by raven from across the Narrow Sea and shivered. Hopefully, the rumors were false and the Targaryen girl's dragons were as much a myth as dragons had been for the past three centuries. If they were real, Catelyn thought grimly, the destruction and devastation that Westeros would face in the coming years would be unparalleled to anything since Aegon's Conquest.";

export const FLASHBACK_DRAFT = "Jaime caught the wine cup with both hands.";

interface ContinuumState {
  project: Project | null;
  projectList: Array<{ id: string; name: string }>;
  entities: Entity[];
  facts: CanonFact[];
  events: TimelineEvent[];
  branches: Branch[];
  scene: { text: string; context: SceneContext };
  issues: ContinuityIssue[];
  selectedIssueId: string | null;
  checking: boolean;
  ingesting: boolean;
  traceMessages: Array<{ msg: string; agent: 'extraction' | 'detection' }>;
  lastChecked: number | null;
  newlyAddedEntityIds: string[];
  newlyAddedFactIds: string[];

  setProject(p: Project): void;
  setProjectList(list: Array<{ id: string; name: string }>): void;
  addToProjectList(p: { id: string; name: string }): void;
  setEntities(e: Entity[]): void;
  setFacts(f: CanonFact[]): void;
  setEvents(e: TimelineEvent[]): void;
  setBranches(b: Branch[]): void;
  setSceneText(t: string): void;
  setContext(c: Partial<SceneContext>): void;
  confirmContext(): void;
  applyInferredContext(i: InferredContext): void;
  setIssues(issues: ContinuityIssue[]): void;
  setIssueStatus(id: string, status: IssueStatus): void;
  selectIssue(id: string | null): void;
  setChecking(v: boolean): void;
  setIngesting(v: boolean): void;
  pushTrace(msg: string, agent: 'extraction' | 'detection'): void;
  clearTrace(): void;
  markNewEntities(ids: string[]): void;
  markNewFacts(ids: string[]): void;
  setLastChecked(ts: number): void;
  setResolvedPosition(pos: number): void;
  addEntities(entities: Entity[]): void;
  addFacts(facts: CanonFact[]): void;
  addEvents(events: TimelineEvent[]): void;
  addBranches(branches: Branch[]): void;
  deleteFact(factId: string): void;
  deleteEntity(entityId: string): void;
}

export const useContinuumStore = create<ContinuumState>((set) => ({
  project: null,
  projectList: [],
  entities: [],
  facts: [],
  events: [],
  branches: [],
  scene: {
    text: DEMO_DRAFT,
    context: {
      presentation: 'main',
      anchorEventId: null,
      branchId: null,
      confirmed: false,
    },
  },
  issues: [],
  selectedIssueId: null,
  checking: false,
  ingesting: false,
  traceMessages: [],
  lastChecked: null,
  newlyAddedEntityIds: [],
  newlyAddedFactIds: [],

  setProject: (p) => set({ project: p }),
  setProjectList: (projectList) => set({ projectList }),
  addToProjectList: (p) => set((s) => ({
    projectList: s.projectList.some(x => x.id === p.id) ? s.projectList : [...s.projectList, p],
  })),
  setEntities: (entities) => set({ entities }),
  setFacts: (facts) => set({ facts }),
  setEvents: (events) => set({ events }),
  setBranches: (branches) => set({ branches }),
  setSceneText: (text) => set((s) => ({ scene: { ...s.scene, text } })),
  setContext: (c) => set((s) => ({
    scene: { ...s.scene, context: { ...s.scene.context, ...c } },
  })),
  confirmContext: () => set((s) => ({
    scene: { ...s.scene, context: { ...s.scene.context, confirmed: true } },
  })),
  applyInferredContext: (inferred) => set((s) => {
    if (s.scene.context.confirmed) return s;
    return {
      scene: {
        ...s.scene,
        context: {
          ...s.scene.context,
          presentation: inferred.presentation,
          anchorEventId: inferred.anchorEventId ?? null,
          branchId: inferred.branchId ?? null,
          inferred,
        },
      },
    };
  }),
  setIssues: (issues) => set({ issues }),
  setIssueStatus: (id, status) => set((s) => ({
    issues: s.issues.map(i => i.id === id ? { ...i, status } : i),
  })),
  selectIssue: (id) => set({ selectedIssueId: id }),
  setChecking: (v) => set({ checking: v }),
  setIngesting: (v) => set({ ingesting: v }),
  pushTrace: (msg, agent) => set(s => ({ traceMessages: [...s.traceMessages, { msg, agent }] })),
  clearTrace: () => set({ traceMessages: [] }),
  markNewEntities: (ids) => {
    set({ newlyAddedEntityIds: ids });
    setTimeout(() => set({ newlyAddedEntityIds: [] }), 2500);
  },
  markNewFacts: (ids) => {
    set({ newlyAddedFactIds: ids });
    setTimeout(() => set({ newlyAddedFactIds: [] }), 2500);
  },
  setLastChecked: (ts) => set({ lastChecked: ts }),
  setResolvedPosition: (pos) => set(s => ({
    scene: { ...s.scene, context: { ...s.scene.context, resolvedPosition: pos } },
  })),
  addEntities: (entities) => set((s) => {
    const incoming = new Map(entities.map(e => [e.id, e]));
    const merged = s.entities.map(e => incoming.has(e.id) ? incoming.get(e.id)! : e);
    const existingIds = new Set(s.entities.map(e => e.id));
    const newOnes = entities.filter(e => !existingIds.has(e.id));
    return { entities: [...merged, ...newOnes] };
  }),
  addFacts: (facts) => set((s) => ({ facts: [...s.facts, ...facts] })),
  addEvents: (events) => set((s) => ({ events: [...s.events, ...events] })),
  addBranches: (branches) => set((s) => ({ branches: [...s.branches, ...branches] })),
  deleteFact: (factId) => set((s) => ({ facts: s.facts.filter(f => f.id !== factId) })),
  deleteEntity: (entityId) => set((s) => ({ entities: s.entities.filter(e => e.id !== entityId) })),
}));
