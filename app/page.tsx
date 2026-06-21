'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { StoryBible } from '@/components/panels/StoryBible';
import { SceneEditor } from '@/components/panels/SceneEditor';
import { IssuePanel } from '@/components/panels/IssuePanel';
import { useContinuumStore, HARDCODED_ISSUES } from '@/hooks/useContinuumStore';

const DRAG_MIN = 160;
const DRAG_MAX = 600;

export async function loadProject(projectId: string) {
  const res = await fetch(`/api/project?id=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`Failed to load project ${projectId}`);
  return res.json();
}

export default function Home() {
  const {
    setProject, setEntities, setFacts, setEvents, setBranches,
    setProjectList, addToProjectList, setIssues,
  } = useContinuumStore();

  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  // Load project list + default project on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/project').then(r => r.json()),
      loadProject('proj_got_demo').catch(() => null),
    ]).then(([list, world]) => {
      if (Array.isArray(list)) setProjectList(list);
      if (world?.project) {
        setProject(world.project);
        setEntities(world.entities ?? []);
        setFacts(world.facts ?? []);
        setEvents(world.events ?? []);
        setBranches(world.branches ?? []);
      }
    }).catch(() => {
      import('@/seed/world').then(mod => {
        setProject(mod.PROJECT);
        setEntities(mod.ENTITIES);
        setFacts(mod.FACTS);
        setEvents(mod.EVENTS);
        setBranches(mod.BRANCHES);
        setProjectList([{ id: mod.PROJECT.id, name: mod.PROJECT.name }]);
      });
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        useContinuumStore.getState().setIssues(HARDCODED_ISSUES);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const startDrag = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    dragging.current = side;
    startX.current = e.clientX;
    startW.current = side === 'left' ? leftWidth : rightWidth;
    e.preventDefault();
  }, [leftWidth, rightWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      if (dragging.current === 'left') {
        setLeftWidth(Math.max(DRAG_MIN, Math.min(DRAG_MAX, startW.current + delta)));
      } else {
        setRightWidth(Math.max(DRAG_MIN, Math.min(DRAG_MAX, startW.current - delta)));
      }
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleStyle: React.CSSProperties = {
    width: 5, cursor: 'col-resize', background: 'transparent', flexShrink: 0, position: 'relative', zIndex: 10,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: leftWidth, flexShrink: 0, overflow: 'hidden' }}>
          <StoryBible />
        </div>
        <div style={handleStyle} onMouseDown={startDrag('left')}>
          <div style={{ position: 'absolute', inset: '0 -1px', background: 'var(--border)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--border)')} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SceneEditor />
        </div>
        <div style={handleStyle} onMouseDown={startDrag('right')}>
          <div style={{ position: 'absolute', inset: '0 -1px', background: 'var(--border)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--border)')} />
        </div>
        <div style={{ width: rightWidth, flexShrink: 0, overflow: 'hidden' }}>
          <IssuePanel />
        </div>
      </div>
    </div>
  );
}
