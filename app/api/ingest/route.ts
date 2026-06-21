import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { runCanonBuilder } from '@/lib/agents/canonBuilder';
import { memoryStore } from '@/lib/store/memoryStore';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    let projectId = 'proj_got_demo';
    let title = 'Ingested Canon';
    let text = '';

    let kind: 'import' | 'scene' = 'import';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      projectId = (form.get('projectId') as string) ?? projectId;
      title = (form.get('title') as string) ?? title;
      const file = form.get('file') as File | null;
      if (file) {
        text = await file.text();
      } else {
        text = (form.get('text') as string) ?? '';
      }
    } else {
      const body = await req.json();
      projectId = body.projectId ?? projectId;
      title = body.title ?? title;
      text = body.text ?? '';
      if (body.kind === 'scene') kind = 'scene';
    }

    if (!text) {
      return NextResponse.json({ error: { code: 'no_text', message: 'No text provided' } }, { status: 400 });
    }

    const result = await runCanonBuilder(title, text, projectId, kind);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/ingest]', error);
    Sentry.captureException(error, { tags: { route: '/api/ingest' } });
    return NextResponse.json(
      { error: { code: 'ingest_error', message: String(error) } },
      { status: 502 },
    );
  }
}
