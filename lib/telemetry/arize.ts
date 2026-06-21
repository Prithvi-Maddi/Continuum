/**
 * Arize Phoenix / OpenInference telemetry for LLM observability.
 * Instruments Anthropic SDK calls with OpenInference trace data.
 * Gracefully no-ops when ARIZE_API_KEY is not set.
 */

let _initialized = false;

export function initArize(): void {
  if (_initialized) return;
  if (!process.env.ARIZE_API_KEY && !process.env.PHOENIX_CLIENT_HEADERS) return;

  _initialized = true;

  try {
    // Dynamic requires avoid bundler issues with OTel in Next.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { AnthropicInstrumentation } = require('@arizeai/openinference-instrumentation-anthropic') as any;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node') as any;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http') as any;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base') as any;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { registerInstrumentations } = require('@opentelemetry/instrumentation') as any;

    const headers: Record<string, string> = {};
    if (process.env.PHOENIX_CLIENT_HEADERS) {
      process.env.PHOENIX_CLIENT_HEADERS.split(',').forEach((pair: string) => {
        const [k, v] = pair.split('=');
        if (k && v) headers[k.trim()] = v.trim();
      });
    } else if (process.env.ARIZE_API_KEY && process.env.ARIZE_SPACE_ID) {
      headers['api_key'] = process.env.ARIZE_API_KEY;
      headers['space_id'] = process.env.ARIZE_SPACE_ID;
    }

    const exporter = new OTLPTraceExporter({
      url: 'https://otlp.arize.com/v1/traces',
      headers,
    });

    const provider = new NodeTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    provider.register();

    registerInstrumentations({
      instrumentations: [new AnthropicInstrumentation()],
    });

    console.log('[arize] OpenInference telemetry initialized');
  } catch (err) {
    console.warn('[arize] Failed to initialize telemetry:', err);
  }
}
