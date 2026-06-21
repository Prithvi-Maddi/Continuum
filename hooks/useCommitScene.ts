'use client';
import { useState } from 'react';
import { useContinuumStore } from './useContinuumStore';

type CommitStatus = 'idle' | 'loading' | 'done' | 'error';

export function useCommitScene() {
  const { scene, project, addEntities, addFacts, addEvents, markNewEntities, markNewFacts } = useContinuumStore();
  const [committing, setCommitting] = useState(false);
  const [commitStatus, setCommitStatus] = useState<CommitStatus>('idle');

  async function commitScene() {
    if (!scene.text.trim()) return;
    setCommitting(true);
    setCommitStatus('loading');
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id ?? 'proj_got_demo',
          title: `Scene — ${new Date().toLocaleString()}`,
          text: scene.text,
          kind: 'scene',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? 'Ingest failed');
      addEntities(data.entities ?? []);
      addFacts(data.facts ?? []);
      addEvents(data.events ?? []);
      markNewEntities((data.entities ?? []).map((e: { id: string }) => e.id));
      markNewFacts((data.facts ?? []).map((f: { id: string }) => f.id));
      setCommitStatus('done');
      // Reset status after 3s
      setTimeout(() => setCommitStatus('idle'), 3000);
    } catch {
      setCommitStatus('error');
      setTimeout(() => setCommitStatus('idle'), 3000);
    } finally {
      setCommitting(false);
    }
  }

  return { commitScene, committing, commitStatus };
}
