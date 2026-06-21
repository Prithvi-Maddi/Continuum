import { NextResponse } from 'next/server';

/**
 * Returns which sponsor integrations are wired (env vars present).
 * Never returns the actual keys — only presence booleans.
 */
export async function GET() {
  return NextResponse.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    upstash: !!(process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN),
    arize: !!(process.env.ARIZE_API_KEY || process.env.PHOENIX_CLIENT_HEADERS),
    deepgram: !!process.env.DEEPGRAM_API_KEY,
  });
}
