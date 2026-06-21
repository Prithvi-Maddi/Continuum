export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initArize } = await import('./lib/telemetry/arize');
    initArize();
  }
}
