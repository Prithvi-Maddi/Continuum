'use client';
import { useState, useRef, useEffect } from 'react';
import { useContinuumStore } from '@/hooks/useContinuumStore';
import { useCheck } from '@/hooks/useCheck';
import { IngestModal } from './IngestModal';
import { HistoryModal } from './HistoryModal';

export function TopBar() {
  const {
    checking, project, projectList,
    setProject, setEntities, setFacts, setEvents, setBranches, setIssues, addToProjectList,
  } = useContinuumStore();
  const { runCheck } = useCheck();
  const [showIngest, setShowIngest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [switching, setSwitching] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false);
        setCreatingProject(false);
        setNewName('');
      }
    };
    if (showProjectMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProjectMenu]);

  async function switchProject(id: string) {
    if (id === project?.id) { setShowProjectMenu(false); return; }
    setSwitching(true);
    setShowProjectMenu(false);
    try {
      const res = await fetch(`/api/project?id=${encodeURIComponent(id)}`);
      const world = await res.json();
      setProject(world.project);
      setEntities(world.entities ?? []);
      setFacts(world.facts ?? []);
      setEvents(world.events ?? []);
      setBranches(world.branches ?? []);
      setIssues([]);
    } catch (e) {
      console.error('Failed to switch project', e);
    } finally {
      setSwitching(false);
    }
  }

  async function renameProject(id: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    try {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: trimmed }),
      });
      // Update local list
      useContinuumStore.getState().setProjectList(
        projectList.map(p => p.id === id ? { ...p, name: trimmed } : p)
      );
      // Update active project name if it's the one being renamed
      if (project?.id === id) setProject({ ...project, name: trimmed });
    } catch (e) {
      console.error('Failed to rename project', e);
    } finally {
      setRenamingId(null);
    }
  }

  async function createProject() {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const proj = await res.json();
      addToProjectList({ id: proj.id, name: proj.name });
      setNewName('');
      setCreatingProject(false);
      setShowProjectMenu(false);
      await switchProject(proj.id);
    } catch (e) {
      console.error('Failed to create project', e);
    }
  }

  return (
    <div style={{
      background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 48, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text)' }}>
          Continuum
        </span>

        {/* Project switcher */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProjectMenu(v => !v)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6,
              padding: '3px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {switching ? 'Loading…' : (project?.name ?? 'Select project')}
            <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
          </button>

          {showProjectMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, overflow: 'hidden', minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {projectList.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No projects yet</div>
              )}
              {projectList.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 8px' }}
                  className="project-row">
                  {renamingId === p.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameProject(p.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => renameProject(p.id)}
                      style={{
                        flex: 1, background: 'var(--bg)', border: '1px solid var(--accent)',
                        borderRadius: 4, padding: '4px 8px', color: 'var(--text)', fontSize: 13, outline: 'none',
                      }}
                    />
                  ) : (
                    <>
                      <button onClick={() => switchProject(p.id)} style={{
                        flex: 1, textAlign: 'left', padding: '6px 4px', background: 'none', border: 'none',
                        color: project?.id === p.id ? 'var(--accent)' : 'var(--text)',
                        fontSize: 13, cursor: 'pointer',
                      }}>
                        {p.name}
                        {project?.id === p.id && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.5 }}>✓</span>}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setRenamingId(p.id); setRenameValue(p.name); }}
                        title="Rename"
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-dim)',
                          cursor: 'pointer', padding: '4px 6px', fontSize: 12, flexShrink: 0,
                          opacity: 0, transition: 'opacity 0.1s',
                        }}
                        className="rename-btn"
                      >
                        ✎
                      </button>
                    </>
                  )}
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', padding: 8 }}>
                {creatingProject ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setCreatingProject(false); }}
                      placeholder="Project name…"
                      style={{
                        flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 4, padding: '4px 8px', color: 'var(--text)', fontSize: 12, outline: 'none',
                      }}
                    />
                    <button onClick={createProject} style={{
                      background: 'var(--accent)', color: '#0f1117', border: 'none',
                      borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>Create</button>
                  </div>
                ) : (
                  <button onClick={() => setCreatingProject(true)} style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: '2px 4px',
                  }}>
                    + New project
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setShowHistory(true)} style={{
          background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          History
        </button>

        <button onClick={() => setShowIngest(true)} style={{
          background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          Import Canon
        </button>

        <button onClick={runCheck} disabled={checking} style={{
          background: checking ? 'var(--bg-card)' : 'var(--accent)',
          color: checking ? 'var(--text-muted)' : '#0f1117', border: 'none', borderRadius: 6,
          padding: '6px 16px', fontSize: 13, fontWeight: 600,
          cursor: checking ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s',
        }}>
          {checking ? (
            <>
              <span style={{
                display: 'inline-block', width: 12, height: 12,
                border: '2px solid var(--text-muted)', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              Checking...
            </>
          ) : 'Check Continuity ↵'}
        </button>
      </div>

      {showIngest && <IngestModal onClose={() => setShowIngest(false)} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
