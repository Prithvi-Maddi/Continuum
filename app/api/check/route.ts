import { NextRequest } from 'next/server';
import { z } from 'zod';
import { memoryStore } from '@/lib/store/memoryStore';
import { checkScene } from '@/lib/engine/checkScene';
import type { SceneContext } from '@/lib/types';

const RequestSchema = z.object({
  projectId: z.string(),
  sceneText: z.string().min(1),
  context: z.object({
    presentation: z.enum(['main', 'flashback', 'flashforward', 'unknown']).default('main'),
    anchorEventId: z.string().nullable().optional(),
    branchId: z.string().nullable().default(null),
    confirmed: z.boolean().default(false),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, sceneText, context } = RequestSchema.parse(body);
    const world = memoryStore.getWorld(projectId);

    const ctx: SceneContext = {
      presentation: context.presentation,
      anchorEventId: context.anchorEventId ?? null,
      branchId: context.branchId,
      confirmed: context.confirmed,
    };

    const encoder = new TextEncoder();
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();

    const emit = (event: Record<string, unknown>) => {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    checkScene(sceneText, ctx, world, (msg, agent) => emit({ type: 'progress', message: msg, agent }))
      .then(result => {
        emit({ type: 'done', ...result });
        writer.close();
      })
      .catch(err => {
        console.error('[/api/check]', err);
        emit({ type: 'error', message: String(err) });
        writer.close();
      });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[/api/check] parse error', error);
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`,
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }
}
