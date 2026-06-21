import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Deepgram not configured' }, { status: 503 });
  }

  try {
    const audioBuffer = await req.arrayBuffer();
    const contentType = req.headers.get('content-type') ?? 'audio/webm';

    const dgResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': contentType,
        },
        body: audioBuffer,
      },
    );

    if (!dgResponse.ok) {
      const err = await dgResponse.text();
      console.error('[transcribe] Deepgram error:', err);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }

    const data = await dgResponse.json() as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
    };
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error('[transcribe]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
