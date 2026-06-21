import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryStore';
import type { CanonFact } from '@/lib/types';
import { nanoid } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fact: CanonFact = {
      id: `fact_${nanoid()}`,
      projectId: body.projectId ?? 'proj_got_demo',
      text: body.text,
      factType: body.factType ?? 'character_state',
      entityIds: body.entityIds ?? [],
      sourceId: null,
      sourceQuote: body.sourceQuote ?? body.text,
      confidence: body.confidence ?? 0.9,
      branchId: body.branchId ?? null,
      validityStartEventId: body.validityStartEventId ?? null,
      validityEndEventId: body.validityEndEventId ?? null,
      epistemicStatus: body.epistemicStatus ?? 'objective',
    };
    memoryStore.addFact(fact.projectId, fact);
    return NextResponse.json({ fact });
  } catch (error) {
    return NextResponse.json({ error: { code: 'canon_error', message: String(error) } }, { status: 400 });
  }
}
