'use client';
import { useState } from 'react';
import { useContinuumStore } from '@/hooks/useContinuumStore';

interface IngestModalProps {
  onClose: () => void;
}

export function IngestModal({ onClose }: IngestModalProps) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('Canon Notes');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { project, addEntities, addFacts, addEvents, addBranches, markNewEntities, markNewFacts } = useContinuumStore();

  async function handleIngest() {
    if (!text.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project?.id ?? 'proj_got_demo', title, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? 'Ingest failed');
      addEntities(data.entities ?? []);
      addFacts(data.facts ?? []);
      addEvents(data.events ?? []);
      addBranches(data.branches ?? []);
      markNewEntities((data.entities ?? []).map((e: { id: string }) => e.id));
      markNewFacts((data.facts ?? []).map((f: { id: string }) => f.id));
      setStatus('done');
      setMessage(`Added ${data.entities?.length ?? 0} entities, ${data.facts?.length ?? 0} facts, ${data.events?.length ?? 0} events.`);
    } catch (err) {
      setStatus('error');
      setMessage(String(err));
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    const content = await file.text();
    setText(content);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, width: 560, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', gap: 14,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Ingest Canon</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Source title"
          style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none',
          }}
        />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste canon text here (300–500 words for best results)…"
          style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none',
            fontFamily: 'inherit', resize: 'vertical', minHeight: 200, flex: 1,
          }}
        />

        <label style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '4px 10px', fontSize: 12,
          }}>Upload file (.txt, .md)</span>
          <input type="file" accept=".txt,.md" onChange={handleFile} style={{ display: 'none' }} />
        </label>

        {message && (
          <div style={{
            fontSize: 12, color: status === 'error' ? 'var(--severity-high)' : '#3fb950',
            background: status === 'error' ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.1)',
            borderRadius: 6, padding: '6px 10px',
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 14px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
          }}>
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
          {status !== 'done' && (
            <button onClick={handleIngest} disabled={!text.trim() || status === 'loading'} style={{
              background: 'var(--accent)', border: 'none', borderRadius: 6,
              padding: '6px 14px', color: '#0f1117', fontWeight: 600, cursor: status === 'loading' ? 'wait' : 'pointer',
              fontSize: 13, opacity: !text.trim() ? 0.5 : 1,
            }}>
              {status === 'loading' ? 'Building canon…' : 'Build Canon'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
