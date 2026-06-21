import * as Sentry from '@sentry/nextjs';
import type { SceneContext, WorldState, ContinuityIssue, Claim, InferredContext, CanonFact } from '../types';
import { resolveContext } from './resolveContext';
import { filterFactsForClaims, filterFacts } from './filterFacts';
import { extractClaims } from '../ai/tasks/extractClaims';
import { detectContradictions } from '../ai/tasks/detectContradictions';
import { searchRelevantFacts, isVectorEnabled } from '../store/vectorStore';

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
  return Sentry.startSpan(
    { name: 'checkScene', op: 'ai.pipeline', attributes: { projectId: world.project.id } },
    async () => {
      const t0 = Date.now();

      const resolvedCtx = resolveContext(context, world.events);
      const position = resolvedCtx.resolvedPosition ?? Infinity;

      onProgress?.('Extracting factual claims from scene text…', 'extraction');
      const { claims, inferredContext } = await Sentry.startSpan(
        { name: 'extractClaims', op: 'ai.llm', attributes: { model: 'haiku', sceneLength: sceneText.length } },
        () => extractClaims(sceneText, resolvedCtx, world.entities, world.branches, world.events),
      );

      // Semantic retrieval: use vector search when available, else fallback to structural filter
      let sceneFacts = filterFacts(world.facts, position, resolvedCtx.branchId, world.events);
      let perClaimFacts: Map<string, CanonFact[]>;

      if (isVectorEnabled() && claims.length > 0) {
        const factIndex = new Map(world.facts.map(f => [f.id, f]));
        perClaimFacts = new Map();
        const relevantIds = await Sentry.startSpan(
          { name: 'vectorSearch', op: 'db.vector', attributes: { claimsCount: claims.length } },
          async () => {
            const allIds = new Set<string>();
            await Promise.all(
              claims.map(async claim => {
                const ids = await searchRelevantFacts(claim.claimText, world.project.id, 12);
                const inForceFacts = ids.map(id => factIndex.get(id)).filter(Boolean) as CanonFact[];
                const filtered = inForceFacts.filter(f =>
                  // still apply in-force filter on top of semantic results
                  sceneFacts.some(sf => sf.id === f.id)
                );
                perClaimFacts.set(claim.id, filtered.length > 0 ? filtered : sceneFacts.slice(0, 15));
                ids.forEach(id => allIds.add(id));
              }),
            );
            return allIds;
          },
        );
        // sceneFacts = union of all per-claim relevant facts (for metadata reporting)
        sceneFacts = Array.from(relevantIds).map(id => factIndex.get(id)).filter(Boolean) as CanonFact[];
      } else {
        ({ perClaimFacts } = filterFactsForClaims(world.facts, claims, position, resolvedCtx.branchId, world.events));
      }

      onProgress?.(
        `Found ${claims.length} claim${claims.length !== 1 ? 's' : ''} — checking against ${sceneFacts.length} in-force facts${isVectorEnabled() ? ' (semantic)' : ''}…`,
        'detection',
      );

      const issues = await Sentry.startSpan(
        {
          name: 'detectContradictions', op: 'ai.llm',
          attributes: { model: 'sonnet', claimsCount: claims.length, factsCount: sceneFacts.length },
        },
        () => detectContradictions(sceneText, claims, perClaimFacts, resolvedCtx, world.events, world.branches, world.project.id),
      );

      const latencyMs = Date.now() - t0;
      Sentry.setMeasurement('check_latency_ms', latencyMs, 'millisecond');
      Sentry.setMeasurement('claims_extracted', claims.length, 'none');
      Sentry.setMeasurement('issues_found', issues.length, 'none');

      return {
        issues,
        claims,
        inferredContext,
        resolvedPosition: position,
        meta: {
          factsConsidered: world.facts.length,
          factsFiltered: world.facts.length - sceneFacts.length,
          claimsExtracted: claims.length,
          latencyMs,
        },
      };
    },
  );
}
