import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { memoryStore } from '@/lib/store/memoryStore';
import { runRepairVerify } from '@/lib/agents/repairVerify';
import type { SceneContext, ContinuityIssue, SuggestedFix } from '@/lib/types';

const RequestSchema = z.object({
  projectId: z.string(),
  sceneText: z.string(),
  context: z.object({
    presentation: z.enum(['main', 'flashback', 'flashforward', 'unknown']),
    anchorEventId: z.string().nullable().optional(),
    branchId: z.string().nullable(),
    confirmed: z.boolean(),
  }),
  issue: z.any(),
  fix: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, sceneText, context, issue, fix } = RequestSchema.parse(body);

    const world = memoryStore.getWorld(projectId);
    const ctx: SceneContext = {
      presentation: context.presentation,
      anchorEventId: context.anchorEventId ?? null,
      branchId: context.branchId,
      confirmed: context.confirmed,
    };

    const result = await runRepairVerify(
      sceneText,
      ctx,
      issue as ContinuityIssue,
      fix as SuggestedFix | null ?? null,
      world,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/repair]', error);
    return NextResponse.json(
      { error: { code: 'repair_error', message: String(error) } },
      { status: 502 },
    );
  }
}
