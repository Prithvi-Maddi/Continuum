import { z } from 'zod';

const FactTypeSchema = z.enum([
  'world_rule', 'character_state', 'object_state',
  'relationship', 'faction_state', 'knowledge_state',
  'timeline', 'branch_state',
]);

const IssueTypeSchema = z.enum([
  'world_rule', 'travel_time', 'character_state', 'object_state',
  'relationship', 'faction_state', 'knowledge_state', 'timeline', 'branch',
]);

const EpistemicStatusSchema = z.enum(['objective', 'character_believed', 'public', 'hidden']);

// emit_claims output
export const EmitClaimsInput = z.object({
  inferredContext: z.object({
    presentation: z.enum(['main', 'flashback', 'flashforward', 'unknown']).catch('main'),
    anchorEventName: z.string().nullable().optional(),
    branchName: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1).catch(0.5),
    signals: z.array(z.string()).optional(),
    conflict: z.boolean().catch(false),
  }),
  // .catch([]) ensures a missing or malformed claims key never throws
  claims: z.array(z.object({
    claimText: z.string(),
    claimType: FactTypeSchema.catch('character_state'),
    entityMentions: z.array(z.string()).catch([]),
    sceneQuote: z.string(),
    impliedBranch: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1).catch(0.8),
  })).catch([]),
});

// emit_issues output
export const EmitIssuesInput = z.object({
  issues: z.array(z.object({
    issueType: IssueTypeSchema.catch('character_state'),
    severity: z.enum(['high', 'medium', 'low']).catch('medium'),
    highlightedText: z.string(),
    explanation: z.string(),
    evidenceQuotes: z.array(z.string()).catch([]),
    conflictingFactIds: z.array(z.string()).catch([]),
    confidence: z.number().min(0).max(1).catch(0.7),
    suggestedFixes: z.array(z.object({
      label: z.string(),
      description: z.string(),
      replacement: z.string(),
      preservesVoice: z.boolean(),
    })).catch([]),
  })).catch([]),
});

// emit_fixes output
export const EmitFixesInput = z.object({
  fixes: z.array(z.object({
    label: z.string(),
    description: z.string(),
    replacement: z.string(),
    preservesVoice: z.boolean(),
  })),
});

// Canon-builder tool schemas
export const AddEntityInput = z.object({
  name: z.string(),
  type: z.enum(['character', 'location', 'faction', 'object', 'event', 'rule']),
  aliases: z.array(z.string()).optional(),
  summary: z.string().optional(),
});

export const AddFactInput = z.object({
  text: z.string(),
  factType: FactTypeSchema,
  entities: z.array(z.string()),
  sourceQuote: z.string(),
  confidence: z.number().min(0).max(1).default(0.9),
  validityFromEvent: z.string().nullable().optional(),
  validityUntilEvent: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  epistemicStatus: EpistemicStatusSchema.default('objective'),
});

export const AddEventInput = z.object({
  name: z.string(),
  orderHint: z.enum(['early', 'mid', 'late']).optional(),
  summary: z.string().optional(),
});

export const AddBranchInput = z.object({
  name: z.string(),
  parentBranch: z.string().nullable().optional(),
  description: z.string().optional(),
});

export const SearchCanonInput = z.object({
  query: z.string(),
  topK: z.number().int().min(1).max(10).default(5),
});

// emit_canon: one-shot bulk extraction for canon ingestion
export const EmitCanonInput = z.object({
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['character', 'location', 'faction', 'object', 'event', 'rule']),
    aliases: z.array(z.string()).optional().default([]),
    summary: z.string().optional().default(''),
  })),
  events: z.array(z.object({
    name: z.string(),
    summary: z.string().optional().default(''),
  })),
  facts: z.array(z.object({
    text: z.string(),
    factType: FactTypeSchema,
    entities: z.array(z.string()),
    sourceQuote: z.string(),
    confidence: z.number().min(0).max(1).default(0.9),
    validityFromEvent: z.string().nullable().optional(),
    validityUntilEvent: z.string().nullable().optional(),
    epistemicStatus: EpistemicStatusSchema.default('objective'),
  })),
});

export type EmitClaimsOutput = z.infer<typeof EmitClaimsInput>;
export type EmitIssuesOutput = z.infer<typeof EmitIssuesInput>;
export type EmitFixesOutput = z.infer<typeof EmitFixesInput>;
export type EmitCanonOutput = z.infer<typeof EmitCanonInput>;
