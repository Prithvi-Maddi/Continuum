// Loaded by Next.js on the client. Initializes Sentry browser SDK if DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import('./sentry.client.config');
}
