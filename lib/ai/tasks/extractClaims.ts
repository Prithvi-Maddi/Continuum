import { getClient } from '../client';
import { MODELS } from '../models';
import { EmitClaimsInput } from '../schemas';
import { EMIT_CLAIMS_TOOL } from '../toolSchema';
import { buildExtractClaimsPrompt } from '../prompts/extractClaims';
import type { Claim, InferredContext, Entity, Branch, SceneContext } from '../../types';
import { nanoid } from '../../utils';
import type Anthropic from '@anthropic-ai/sdk';

const FALLBACK_CONTEXT: InferredContext = {
  presentation: 'main', anchorEventId: null, branchId: null,
  confidence: 0.5, signals: [], conflict: false,
};

export async function extractClaims(
  sceneText: string,
  context: SceneContext,
  entities: Entity[],
  branches: Branch[],
  events: import('../../types').TimelineEvent[] = [],
): Promise<{ claims: Claim[]; inferredContext: InferredContext }> {
  const client = getClient();

  const anchorEvent = context.anchorEventId
    ? events.find(e => e.id === context.anchorEventId)?.name ?? null
    : null;

  const { system, user } = buildExtractClaimsPrompt(
    sceneText,
    context.presentation,
    anchorEvent,
    entities.map(e => ({ name: e.name, aliases: e.aliases })),
  );

  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 8192,   // Haiku default was 4096 — long scenes were truncating the claims array
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: user }],
    tools: [EMIT_CLAIMS_TOOL],
    tool_choice: { type: 'any' },
  });

  const toolUse = (response as Anthropic.Message).content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );

  if (!toolUse) {
    console.warn('[extractClaims] No tool call returned — returning empty claims');
    return { claims: [], inferredContext: FALLBACK_CONTEXT };
  }

  // .catch() on schema fields means this will never throw
  const result = EmitClaimsInput.safeParse(toolUse.input);
  if (!result.success) {
    console.error('[extractClaims] Schema parse failed:', JSON.stringify(result.error.issues));
    return { claims: [], inferredContext: FALLBACK_CONTEXT };
  }
  const parsed = result.data;

  const resolveBranch = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const lower = name.toLowerCase();
    const match = branches.find(b =>
      b.name.toLowerCase().includes(lower) ||
      (b.description ?? '').toLowerCase().includes(lower) ||
      lower.includes((b.name.toLowerCase().split('—')[1] ?? '').trim()),
    );
    return match?.id ?? null;
  };

  const claims: Claim[] = parsed.claims.map(c => ({
    id: `claim_${nanoid()}`,
    claimText: c.claimText,
    claimType: c.claimType,
    entityIds: [],
    entityMentions: c.entityMentions,
    sourceSpan: { start: 0, end: 0, quote: c.sceneQuote },
    impliedBranchId: resolveBranch(c.impliedBranch),
    confidence: c.confidence,
  }));

  const inf = parsed.inferredContext;
  const inferredContext: InferredContext = {
    presentation: inf.presentation,
    anchorEventId: null,
    branchId: resolveBranch(inf.branchName),
    confidence: inf.confidence,
    signals: inf.signals,
    conflict: inf.conflict,
  };

  return { claims, inferredContext };
}
