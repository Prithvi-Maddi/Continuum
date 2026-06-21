import type { SceneContext, WorldState, ContinuityIssue, Claim, InferredContext } from '../types';
import { resolveContext } from './resolveContext';
import { filterFactsForClaims } from './filterFacts';
import { extractClaims } from '../ai/tasks/extractClaims';
import { detectContradictions } from '../ai/tasks/detectContradictions';

export interface CheckSceneResult {
  issues: ContinuityIssue[];
  claims: Claim[];
  inferredContext: InferredContext | null;
  resolvedPosition: number;
  meta: {
    factsConsidered: number;
    factsFiltered: number;
    claimsExtracted: number;
    latencyMs: number;
  };
}

export async function checkScene(
  sceneText: string,
  context: SceneContext,
  world: WorldState,
  onProgress?: (msg: string, agent: 'extraction' | 'detection') => void,
): Promise<CheckSceneResult> {
  const t0 = Date.now();

  const resolvedCtx = resolveContext(context, world.events);
  const position = resolvedCtx.resolvedPosition ?? Infinity;

  onProgress?.('Extracting factual claims from scene text…', 'extraction');
  const { claims, inferredContext } = await extractClaims(
    sceneText,
    resolvedCtx,
    world.entities,
    world.branches,
    world.events,
  );

  const { sceneFacts, perClaimFacts } = filterFactsForClaims(
    world.facts,
    claims,
    position,
    resolvedCtx.branchId,
    world.events,
  );

  onProgress?.(
    `Found ${claims.length} claim${claims.length !== 1 ? 's' : ''} — checking against ${sceneFacts.length} in-force facts…`,
    'detection',
  );

  const issues = await detectContradictions(
    sceneText,
    claims,
    perClaimFacts,
    resolvedCtx,
    world.events,
    world.branches,
    world.project.id,
  );

  return {
    issues,
    claims,
    inferredContext,
    resolvedPosition: position,
    meta: {
      factsConsidered: world.facts.length,
      factsFiltered: world.facts.length - sceneFacts.length,
      claimsExtracted: claims.length,
      latencyMs: Date.now() - t0,
    },
  };
}
