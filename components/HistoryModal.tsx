'use client';
import { useEffect, useState } from 'react';
import { useContinuumStore } from '@/hooks/useContinuumStore';
import type { CanonSource } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  scene: 'Scene',
  import: 'Import',
  manuscript: 'Manuscript',
  notes: 'Notes',
  wiki: 'Wiki',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const { project, setSceneText } = useContinuumStore();
  const [sources, setSources] = useState<CanonSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    fetch(`/api/sources?projectId=${encodeURIComponent(project.id)}`)
      .then(r => r.json())
      .then(data => setSources(Array.isArray(data) ? data : []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [project]);

  function loadScene(source: CanonSource) {
    setSceneText(source.text);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, width: 640, maxHeight: '75vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Scene History</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {project?.name} — committed scenes and imports
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '12px 16px', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: 13 }}>
              Loading…
            </div>
          )}
          {!loading && sources.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px', fontSize: 13, lineHeight: 1.6 }}>
              No scenes committed yet.
              <br />
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Use "Add scene to canon" at the bottom of the editor.
              </span>
            </div>
          )}
          {sources.map(src => {
            const isOpen = expanded === src.id;
            const preview = src.text.length > 180 ? src.text.slice(0, 180).trimEnd() + '…' : src.text;
            return (
              <div
                key={src.id}
                style={{
                  border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, marginBottom: 8, overflow: 'hidden',
                  background: isOpen ? 'rgba(88,166,255,0.04)' : 'var(--bg)',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Card header */}
                <div
                  onClick={() => setExpanded(isOpen ? null : src.id)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: src.kind === 'scene' ? 'var(--accent)' : 'var(--text-muted)',
                        background: src.kind === 'scene' ? 'rgba(88,166,255,0.12)' : 'var(--bg-card)',
                        border: `1px solid ${src.kind === 'scene' ? 'rgba(88,166,255,0.3)' : 'var(--border)'}`,
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        {KIND_LABEL[src.kind] ?? src.kind}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {src.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(src.createdAt)}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, flexShrink: 0 }}>{isOpen ? '▴' : '▾'}</span>
                </div>

                {/* Expanded view */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
                    <div style={{
                      fontSize: 13, color: 'var(--text)', lineHeight: 1.65,
                      whiteSpace: 'pre-wrap', marginBottom: 12,
                      maxHeight: 300, overflowY: 'auto',
                      background: 'var(--bg-panel)', borderRadius: 6, padding: '10px 12px',
                    }}>
                      {src.text}
                    </div>
                    {src.kind === 'scene' && (
                      <button
                        onClick={() => loadScene(src)}
                        style={{
                          background: 'rgba(88,166,255,0.15)', color: 'var(--accent)',
                          border: '1px solid var(--accent)', borderRadius: 6,
                          padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Load into editor
                      </button>
                    )}
                  </div>
                )}

                {/* Collapsed preview */}
                {!isOpen && (
                  <div style={{
                    padding: '0 14px 10px',
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}>
                    {preview}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
