'use client';
import { useEffect, useState } from 'react';

interface Status {
  anthropic: boolean;
  sentry: boolean;
  upstash: boolean;
  arize: boolean;
  deepgram: boolean;
}

const LABELS: Array<{ key: keyof Status; name: string; color: string }> = [
  { key: 'anthropic', name: 'Anthropic', color: '#d97757' },
  { key: 'sentry',    name: 'Sentry',    color: '#9b6dff' },
  { key: 'upstash',   name: 'Upstash',   color: '#00c98c' },
  { key: 'arize',     name: 'Arize',     color: '#5dade2' },
  { key: 'deepgram',  name: 'Deepgram',  color: '#13ef93' },
];

export function IntegrationStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch('/api/integrations/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {LABELS.map(({ key, name, color }) => {
        const on = status[key];
        return (
          <span
            key={key}
            title={on ? `${name}: connected` : `${name}: not configured`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 7px', borderRadius: 10,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
              background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: `1px solid ${on ? color + '60' : 'var(--border)'}`,
              color: on ? color : 'var(--text-dim)',
              opacity: on ? 1 : 0.55,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: on ? color : 'var(--text-dim)',
              boxShadow: on ? `0 0 6px ${color}` : 'none',
            }} />
            {name}
          </span>
        );
      })}
    </div>
  );
}
