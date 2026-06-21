export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Sentry server-side init (since we don't use withSentryConfig wrapper)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('./sentry.server.config');
    }

    // Arize / OpenInference auto-instrumentation of Anthropic SDK calls
    const { initArize } = await import('./lib/telemetry/arize');
    initArize();

    // Backfill Upstash Vector with all existing facts on startup
    const { isVectorEnabled, backfillAllFacts } = await import('./lib/store/vectorStore');
    if (isVectorEnabled()) {
      const { memoryStore } = await import('./lib/store/memoryStore');
      const allFacts = memoryStore.getProjectList().flatMap(p => memoryStore.getWorld(p.id).facts);
      backfillAllFacts(allFacts).catch(err => console.warn('[startup] vector backfill failed:', err));
    }
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      await import('./sentry.edge.config');
    }
  }
}
