'use client';
import { useState, useEffect, useRef } from 'react';
import { useContinuumStore } from '@/hooks/useContinuumStore';
import type { ContinuityIssue, SuggestedFix } from '@/lib/types';

const SEVERITY_COLORS = {
  high: 'var(--severity-high)',
  medium: 'var(--severity-medium)',
  low: 'var(--severity-low)',
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  world_rule: 'World Rule',
  travel_time: 'Travel Time',
  character_state: 'Character State',
  object_state: 'Object State',
  relationship: 'Relationship',
  faction_state: 'Faction State',
  knowledge_state: 'Knowledge State',
  timeline: 'Timeline',
  branch: 'Branch',
};

function ConfidenceDot({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.85 ? 'var(--severity-high)' : confidence >= 0.6 ? 'var(--severity-medium)' : 'var(--severity-low)';
  return (
    <span title={`${pct}% confidence`} style={{
      marginLeft: 'auto',
      display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
    }}>
      {[0.33, 0.66, 1].map((threshold, i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: confidence >= threshold ? color : 'var(--border)',
        }} />
      ))}
      <span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 1 }}>{pct}%</span>
    </span>
  );
}

function DiffPreview({ scene, highlightedText, replacement }: {
  scene: string; highlightedText: string; replacement: string;
}) {
  const idx = scene.toLowerCase().indexOf(highlightedText.toLowerCase());
  if (idx === -1) {
    return (
      <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--accent)', marginTop: 4 }}>
        → "{replacement}"
      </div>
    );
  }
  const before = scene.slice(Math.max(0, idx - 30), idx);
  const after = scene.slice(idx + highlightedText.length, idx + highlightedText.length + 30);
  const hasMore = idx > 30 || (idx + highlightedText.length + 30) < scene.length;
  return (
    <div style={{
      fontSize: 12, background: 'var(--bg-panel)', borderRadius: 5,
      padding: '6px 8px', marginTop: 6, lineHeight: 1.6, fontFamily: 'inherit',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>
        {hasMore && before && <span style={{ opacity: 0.5 }}>…</span>}
        <span style={{ opacity: 0.6 }}>{before}</span>
        <span style={{
          textDecoration: 'line-through', color: 'var(--severity-high)',
          background: 'rgba(248,81,73,0.12)', borderRadius: 2, padding: '0 2px',
        }}>{highlightedText}</span>
        <span style={{ opacity: 0.6 }}>{after}</span>
        {hasMore && after && <span style={{ opacity: 0.5 }}>…</span>}
      </div>
      <div style={{ color: 'var(--text-muted)' }}>
        {hasMore && before && <span style={{ opacity: 0.5 }}>…</span>}
        <span style={{ opacity: 0.6 }}>{before}</span>
        <span style={{
          color: '#3fb950',
          background: 'rgba(63,185,80,0.12)', borderRadius: 2, padding: '0 2px',
        }}>{replacement}</span>
        <span style={{ opacity: 0.6 }}>{after}</span>
        {hasMore && after && <span style={{ opacity: 0.5 }}>…</span>}
      </div>
    </div>
  );
}

function IssueCard({ issue, selected, onSelect }: {
  issue: ContinuityIssue;
  selected: boolean;
  onSelect: () => void;
}) {
  const { setIssueStatus, scene, project } = useContinuumStore();
  const [applying, setApplying] = useState(false);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  const isInactive = issue.status === 'ignored' || issue.status === 'resolved' || issue.status === 'intentional';

  async function applyFix(fix: SuggestedFix) {
    setApplying(true);
    try {
      const res = await fetch('/api/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id ?? 'proj_got_demo',
          sceneText: scene.text,
          context: {
            presentation: scene.context.presentation,
            anchorEventId: scene.context.anchorEventId ?? null,
            branchId: scene.context.branchId,
            confirmed: scene.context.confirmed,
          },
          issue,
          fix,
        }),
      });
      const data = await res.json();
      if (data.patchedText) {
        useContinuumStore.getState().setSceneText(data.patchedText);
        if (data.verified) {
          setVerifiedId(fix.id);
          setIssueStatus(issue.id, 'resolved');
        }
      }
    } catch (err) {
      console.error('Repair failed:', err);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        background: selected ? 'rgba(88,166,255,0.06)' : 'var(--bg-card)',
        opacity: isInactive ? 0.5 : 1,
        transition: 'border-color 0.15s, background 0.15s',
        marginBottom: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: SEVERITY_COLORS[issue.severity],
          boxShadow: `0 0 4px ${SEVERITY_COLORS[issue.severity]}`,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: SEVERITY_COLORS[issue.severity], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {issue.severity}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}
        </span>
        {issue.status !== 'open' && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            {issue.status}
          </span>
        )}
        <ConfidenceDot confidence={issue.confidence} />
      </div>

      {/* Offending phrase */}
      <div style={{
        fontSize: 12, fontStyle: 'italic', color: 'var(--text)',
        background: 'var(--bg)', borderRadius: 4, padding: '3px 6px', marginBottom: 6,
        borderLeft: `2px solid ${SEVERITY_COLORS[issue.severity]}`,
      }}>
        "{issue.highlightedText}"
      </div>

      {/* Expanded detail when selected */}
      {selected && !isInactive && (
        <div onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>
            {issue.explanation}
          </div>

          {issue.evidenceQuotes.map((q, i) => (
            <blockquote key={i} style={{
              borderLeft: '3px solid var(--border)', margin: '0 0 6px', padding: '4px 8px',
              fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
            }}>
              {q}
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontStyle: 'normal' }}>
                — Canon Fact #{issue.conflictingFactIds[i] ?? issue.conflictingFactIds[0]}
              </div>
            </blockquote>
          ))}

          {issue.suggestedFixes.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Suggested fixes</div>
              {issue.suggestedFixes.map(fix => (
                <div key={fix.id} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 10px', marginBottom: 6,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{fix.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fix.description}</div>
                  <DiffPreview
                    scene={scene.text}
                    highlightedText={issue.highlightedText}
                    replacement={fix.replacement}
                  />
                  <button
                    onClick={() => applyFix(fix)}
                    disabled={applying}
                    style={{
                      marginTop: 8, fontSize: 11, fontWeight: 600,
                      background: verifiedId === fix.id ? 'rgba(63,185,80,0.2)' : 'rgba(88,166,255,0.15)',
                      color: verifiedId === fix.id ? '#3fb950' : 'var(--accent)',
                      border: `1px solid ${verifiedId === fix.id ? '#3fb950' : 'var(--accent)'}`,
                      borderRadius: 4, padding: '3px 10px', cursor: applying ? 'wait' : 'pointer',
                    }}
                  >
                    {applying ? 'Verifying…' : verifiedId === fix.id ? 'Verified ✓' : 'Apply fix'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {(['ignored', 'intentional'] as const).map(s => (
              <button key={s} onClick={() => setIssueStatus(issue.id, s)} style={{
                fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
              }}>
                {s === 'ignored' ? 'Ignore' : 'Mark intentional'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentColumn({
  label, color, messages, active,
}: {
  label: string; color: string;
  messages: string[]; active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {active && (
          <span style={{
            display: 'inline-block', width: 6, height: 6,
            border: `1.5px solid ${color}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
        )}
        {label}
      </div>
      <div ref={ref} style={{ maxHeight: 72, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>Waiting…</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            fontSize: 10, color: i === messages.length - 1 && active ? color : 'var(--text-dim)',
            lineHeight: 1.5, marginBottom: 2,
          }}>
            {i === messages.length - 1 && active ? '› ' : '✓ '}{msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function TracePanel({ messages }: { messages: Array<{ msg: string; agent: 'extraction' | 'detection' }> }) {
  const extractionMsgs = messages.filter(m => m.agent === 'extraction').map(m => m.msg);
  const detectionMsgs = messages.filter(m => m.agent === 'detection').map(m => m.msg);
  const activeAgent = messages.length > 0 ? messages[messages.length - 1].agent : 'extraction';

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
      padding: '8px 10px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <AgentColumn
          label="Extraction Agent"
          color="#58a6ff"
          messages={extractionMsgs}
          active={activeAgent === 'extraction'}
        />
        <div style={{ width: 1, background: 'var(--border)', flexShrink: 0, margin: '2px 0' }} />
        <AgentColumn
          label="Detection Agent"
          color="#d29922"
          messages={detectionMsgs}
          active={activeAgent === 'detection'}
        />
      </div>
    </div>
  );
}

export function IssuePanel() {
  const { issues, selectedIssueId, selectIssue, checking, traceMessages, lastChecked } = useContinuumStore();

  const open = issues.filter(i => i.status === 'open');
  const resolved = issues.filter(i => i.status !== 'open');

  const sorted = [...open].sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return (sev[a.severity] - sev[b.severity]) || (a.span.start - b.span.start);
  });

  const hasRun = lastChecked !== null;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      height: '100%',
      overflowY: 'auto',
      padding: '12px 12px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Continuity Issues
        </div>
        {open.length > 0 && (
          <span style={{
            background: 'var(--severity-high-bg)',
            color: 'var(--severity-high)',
            borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600,
          }}>{open.length}</span>
        )}
      </div>

      {/* Live trace while checking */}
      {checking && traceMessages.length > 0 && <TracePanel messages={traceMessages} />}

      {/* Empty states */}
      {!checking && sorted.length === 0 && !hasRun && (
        <div style={{
          textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
          padding: '32px 16px', lineHeight: 1.6,
        }}>
          No continuity check run yet.
          <br />
          <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginTop: 8 }}>
            Write a scene and press Check Continuity ↵
          </span>
        </div>
      )}

      {!checking && sorted.length === 0 && hasRun && issues.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 16px', lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3fb950', marginBottom: 4 }}>
            No continuity issues found
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            This scene is consistent with the project canon.
          </div>
        </div>
      )}

      {sorted.map(issue => (
        <IssueCard
          key={issue.id}
          issue={issue}
          selected={selectedIssueId === issue.id}
          onSelect={() => selectIssue(selectedIssueId === issue.id ? null : issue.id)}
        />
      ))}

      {resolved.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', margin: '12px 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Resolved / Ignored
          </div>
          {resolved.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              selected={selectedIssueId === issue.id}
              onSelect={() => selectIssue(selectedIssueId === issue.id ? null : issue.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}
