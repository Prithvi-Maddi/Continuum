/**
 * Upstash Vector store for semantic fact retrieval.
 * Gracefully degrades to no-op when credentials are absent (local dev without Upstash).
 */
import type { CanonFact } from '../types';

let _index: import('@upstash/vector').Index | null = null;

function getIndex(): import('@upstash/vector').Index | null {
  if (_index) return _index;
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Index } = require('@upstash/vector') as typeof import('@upstash/vector');
    _index = new Index({ url, token });
    return _index;
  } catch {
    return null;
  }
}

export async function indexFact(fact: CanonFact): Promise<void> {
  const idx = getIndex();
  if (!idx) return;
  try {
    await idx.upsert({
      id: fact.id,
      data: fact.text,
      metadata: {
        projectId: fact.projectId,
        factType: fact.factType,
        branchId: fact.branchId ?? '',
        validityStartEventId: fact.validityStartEventId ?? '',
        validityEndEventId: fact.validityEndEventId ?? '',
        entityIds: fact.entityIds.join(','),
      },
    });
  } catch (err) {
    console.warn('[vectorStore] indexFact failed:', err);
  }
}

export async function indexFacts(facts: CanonFact[]): Promise<void> {
  const idx = getIndex();
  if (!idx || facts.length === 0) return;
  try {
    await idx.upsert(
      facts.map(fact => ({
        id: fact.id,
        data: fact.text,
        metadata: {
          projectId: fact.projectId,
          factType: fact.factType,
          branchId: fact.branchId ?? '',
          validityStartEventId: fact.validityStartEventId ?? '',
          validityEndEventId: fact.validityEndEventId ?? '',
          entityIds: fact.entityIds.join(','),
        },
      })),
    );
  } catch (err) {
    console.warn('[vectorStore] indexFacts failed:', err);
  }
}

export async function searchRelevantFacts(
  claimText: string,
  projectId: string,
  topK = 12,
): Promise<string[]> {
  const idx = getIndex();
  if (!idx) return [];
  try {
    const results = await idx.query({
      data: claimText,
      topK,
      filter: `projectId = '${projectId}'`,
      includeMetadata: true,
    });
    return results.map(r => String(r.id));
  } catch (err) {
    console.warn('[vectorStore] searchRelevantFacts failed:', err);
    return [];
  }
}

export async function deleteFact(factId: string): Promise<void> {
  const idx = getIndex();
  if (!idx) return;
  try {
    await idx.delete([factId]);
  } catch (err) {
    console.warn('[vectorStore] deleteFact failed:', err);
  }
}

export function isVectorEnabled(): boolean {
  return !!(process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN);
}

/**
 * Backfill existing facts into the vector index. Idempotent — upsert overwrites.
 * Called once at server startup if Upstash creds are present.
 */
let _backfillStarted = false;
export async function backfillAllFacts(allFacts: CanonFact[]): Promise<{ indexed: number; skipped: boolean }> {
  if (_backfillStarted) return { indexed: 0, skipped: true };
  _backfillStarted = true;

  const idx = getIndex();
  if (!idx) return { indexed: 0, skipped: true };
  if (allFacts.length === 0) return { indexed: 0, skipped: false };

  // Upstash recommends batches of ≤100
  const BATCH = 100;
  let indexed = 0;
  for (let i = 0; i < allFacts.length; i += BATCH) {
    const batch = allFacts.slice(i, i + BATCH);
    try {
      await idx.upsert(
        batch.map(fact => ({
          id: fact.id,
          data: fact.text,
          metadata: {
            projectId: fact.projectId,
            factType: fact.factType,
            branchId: fact.branchId ?? '',
            validityStartEventId: fact.validityStartEventId ?? '',
            validityEndEventId: fact.validityEndEventId ?? '',
            entityIds: fact.entityIds.join(','),
          },
        })),
      );
      indexed += batch.length;
    } catch (err) {
      console.warn(`[vectorStore] backfill batch ${i / BATCH} failed:`, err);
    }
  }
  console.log(`[vectorStore] Backfilled ${indexed}/${allFacts.length} facts into Upstash Vector`);
  return { indexed, skipped: false };
}
