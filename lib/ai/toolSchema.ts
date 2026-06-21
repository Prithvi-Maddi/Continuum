import type Anthropic from '@anthropic-ai/sdk';

// Manual JSON schema type that satisfies Anthropic SDK's InputSchema requirement
type ToolDef = {
  name: string;
  description: string;
  input_schema: Anthropic.Tool['input_schema'];
};

// Pre-defined schemas for each tool (avoids zod-to-json-schema compatibility issues with zod v4)

export const EMIT_CLAIMS_TOOL: ToolDef = {
  name: 'emit_claims',
  description: 'Emit extracted claims and inferred context',
  input_schema: {
    type: 'object',
    properties: {
      inferredContext: {
        type: 'object',
        properties: {
          presentation: { type: 'string', enum: ['main', 'flashback', 'flashforward', 'unknown'] },
          anchorEventName: { type: ['string', 'null'] },
          branchName: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          signals: { type: 'array', items: { type: 'string' } },
          conflict: { type: 'boolean' },
        },
        required: ['presentation', 'confidence', 'conflict'],
      },
      claims: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            claimText: { type: 'string' },
            claimType: { type: 'string', enum: ['world_rule', 'character_state', 'object_state', 'relationship', 'faction_state', 'knowledge_state', 'timeline', 'branch_state'] },
            entityMentions: { type: 'array', items: { type: 'string' } },
            sceneQuote: { type: 'string' },
            impliedBranch: { type: ['string', 'null'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['claimText', 'claimType', 'entityMentions', 'sceneQuote', 'confidence'],
        },
      },
    },
    required: ['inferredContext', 'claims'],
  },
};

export const EMIT_ISSUES_TOOL: ToolDef = {
  name: 'emit_issues',
  description: 'Emit detected continuity issues',
  input_schema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issueType: { type: 'string', enum: ['world_rule', 'travel_time', 'character_state', 'object_state', 'relationship', 'faction_state', 'knowledge_state', 'timeline', 'branch'] },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            highlightedText: { type: 'string' },
            explanation: { type: 'string' },
            evidenceQuotes: { type: 'array', items: { type: 'string' } },
            conflictingFactIds: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            suggestedFixes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  description: { type: 'string' },
                  replacement: { type: 'string' },
                  preservesVoice: { type: 'boolean' },
                },
                required: ['label', 'description', 'replacement', 'preservesVoice'],
              },
            },
          },
          required: ['issueType', 'severity', 'highlightedText', 'explanation', 'evidenceQuotes', 'conflictingFactIds', 'confidence', 'suggestedFixes'],
        },
      },
    },
    required: ['issues'],
  },
};

export const EMIT_FIXES_TOOL: ToolDef = {
  name: 'emit_fixes',
  description: 'Emit suggested fixes',
  input_schema: {
    type: 'object',
    properties: {
      fixes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            description: { type: 'string' },
            replacement: { type: 'string' },
            preservesVoice: { type: 'boolean' },
          },
          required: ['label', 'description', 'replacement', 'preservesVoice'],
        },
      },
    },
    required: ['fixes'],
  },
};

const FACT_TYPE_ENUM = ['world_rule', 'character_state', 'object_state', 'relationship', 'faction_state', 'knowledge_state', 'timeline', 'branch_state'];

export const EMIT_CANON_TOOL: ToolDef = {
  name: 'emit_canon',
  description: 'Emit all extracted entities, timeline events, and facts in one call',
  input_schema: {
    type: 'object',
    properties: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['character', 'location', 'faction', 'object', 'event', 'rule'] },
            aliases: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
          required: ['name', 'type'],
        },
      },
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            summary: { type: 'string' },
          },
          required: ['name'],
        },
      },
      facts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            factType: { type: 'string', enum: FACT_TYPE_ENUM },
            entities: { type: 'array', items: { type: 'string' } },
            sourceQuote: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            validityFromEvent: { type: ['string', 'null'] },
            validityUntilEvent: { type: ['string', 'null'] },
            epistemicStatus: { type: 'string', enum: ['objective', 'character_believed', 'public', 'hidden'] },
          },
          required: ['text', 'factType', 'entities', 'sourceQuote'],
        },
      },
    },
    required: ['entities', 'events', 'facts'],
  },
};

export const CANON_BUILDER_TOOLS: ToolDef[] = [
  {
    name: 'add_entity',
    description: 'Add a new entity to the canon',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['character', 'location', 'faction', 'object', 'event', 'rule'] },
        aliases: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'add_fact',
    description: 'Add a new canon fact',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        factType: { type: 'string', enum: FACT_TYPE_ENUM },
        entities: { type: 'array', items: { type: 'string' } },
        sourceQuote: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1, default: 0.9 },
        validityFromEvent: { type: ['string', 'null'] },
        validityUntilEvent: { type: ['string', 'null'] },
        branch: { type: ['string', 'null'] },
        epistemicStatus: { type: 'string', enum: ['objective', 'character_believed', 'public', 'hidden'], default: 'objective' },
      },
      required: ['text', 'factType', 'entities', 'sourceQuote'],
    },
  },
  {
    name: 'add_event',
    description: 'Add a timeline event',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        orderHint: { type: 'string', enum: ['early', 'mid', 'late'] },
        summary: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_branch',
    description: 'Add a branch definition',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        parentBranch: { type: ['string', 'null'] },
        description: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_existing_canon',
    description: 'Search existing canon for deduplication',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        topK: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['query'],
    },
  },
];
