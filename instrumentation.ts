export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Arize / OpenInference auto-instrumentation of Anthropic SDK calls
  const { initArize } = await import('./lib/telemetry/arize');
  initArize();

  // Backfill Upstash Vector with all existing facts on startup
  const { isVectorEnabled, backfillAllFacts } = await import('./lib/store/vectorStore');
  if (isVectorEnabled()) {
    const { memoryStore } = await import('./lib/store/memoryStore');
    const allFacts = memoryStore.getProjectList().flatMap(p => memoryStore.getWorld(p.id).facts);
    // fire-and-forget — don't block server startup on network calls
    backfillAllFacts(allFacts).catch(err => console.warn('[startup] vector backfill failed:', err));
  }
}
