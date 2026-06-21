import { getClient } from '../client';
import { MODELS, DETECTION_THINKING_BUDGET } from '../models';
import { EmitIssuesInput } from '../schemas';
import { EMIT_ISSUES_TOOL } from '../toolSchema';
import { buildDetectPrompt } from '../prompts/detectContradictions';
import type { Claim, CanonFact, SceneContext, ContinuityIssue, TimelineEvent, Branch } from '../../types';
import { findSpan } from '../../engine/mapSpans';
import { nanoid } from '../../utils';
import type Anthropic from '@anthropic-ai/sdk';

export async function detectContradictions(
  sceneText: string,
  claims: Claim[],
  perClaimFacts: Map<string, CanonFact[]>,
  context: SceneContext,
  events: TimelineEvent[],
  branches: Branch[],
  projectId: string,
): Promise<ContinuityIssue[]> {
  if (claims.length === 0) return [];

  const client = getClient();

  const anchorEvent = context.anchorEventId
    ? events.find(e => e.id === context.anchorEventId)?.name ?? null
    : null;
  const branchName = context.branchId
    ? branches.find(b => b.id === context.branchId)?.name ?? null
    : null;

  const claimsWithFacts = claims.map(claim => ({
    claim,
    facts: perClaimFacts.get(claim.id) ?? [],
  }));

  const { system, user } = buildDetectPrompt(
    sceneText,
    context.presentation,
    anchorEvent,
    branchName,
    claimsWithFacts,
  );

  const response = await client.messages.create({
    model: MODELS.detection,
    max_tokens: 8000,
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: user }],
    tools: [EMIT_ISSUES_TOOL],
    tool_choice: { type: 'any' },
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) return [];

  const result = EmitIssuesInput.safeParse(toolUse.input);
  if (!result.success) {
    console.error('[detectContradictions] Schema parse failed:', JSON.stringify(result.error.issues));
    return [];
  }
  const parsed = result.data;
  const sceneDraftId = `draft_${nanoid()}`;

  return parsed.issues.map(issue => {
    const span = findSpan(sceneText, issue.highlightedText) ?? { start: 0, end: 0 };
    return {
      id: `iss_${nanoid()}`,
      projectId,
      sceneDraftId,
      issueType: issue.issueType,
      severity: issue.severity,
      highlightedText: issue.highlightedText,
      span,
      explanation: issue.explanation,
      evidenceQuotes: issue.evidenceQuotes,
      conflictingFactIds: issue.conflictingFactIds,
      suggestedFixes: issue.suggestedFixes.map(f => ({
        id: `fix_${nanoid()}`,
        label: f.label,
        description: f.description,
        replacement: f.replacement,
        preservesVoice: f.preservesVoice,
      })),
      status: 'open' as const,
      confidence: issue.confidence,
    };
  });
}
