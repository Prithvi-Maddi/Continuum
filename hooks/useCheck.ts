'use client';
import { useContinuumStore, HARDCODED_ISSUES } from './useContinuumStore';

function playIssueChime(count: number) {
  try {
    const ctx = new AudioContext();
    const notes = count > 2 ? [660, 440] : [550, 440];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch { /* AudioContext may be blocked */ }
}

export function useCheck() {
  const {
    scene, project, setIssues, setChecking, applyInferredContext,
    pushTrace, clearTrace, setLastChecked, setResolvedPosition,
  } = useContinuumStore();

  async function runCheck() {
    if (!scene.text.trim()) return;
    setChecking(true);
    clearTrace();
    try {
      const res = await fetch('/api/check', {
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
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let serverError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(part.slice(6)); }
          catch { continue; } // genuinely malformed chunk — skip
          if (event.type === 'progress') {
            pushTrace(event.message as string, (event.agent as 'extraction' | 'detection') ?? 'extraction');
          } else if (event.type === 'done') {
            const issues = (event.issues as unknown[]) ?? [];
            setIssues(issues as never);
            setLastChecked(Date.now());
            if (issues.length > 0) playIssueChime(issues.length);
            if (typeof event.resolvedPosition === 'number') {
              setResolvedPosition(event.resolvedPosition as number);
            }
            if (event.inferredContext && !scene.context.confirmed) {
              applyInferredContext(event.inferredContext as never);
            }
          } else if (event.type === 'error') {
            // Don't throw inside the parse loop — record and break
            serverError = event.message as string;
            break;
          }
        }
        if (serverError) break;
      }

      if (serverError) throw new Error(serverError);
    } catch (err) {
      console.error('[check] Failed:', err);
      // Only fall back to hardcoded GoT issues on the demo project; otherwise show empty+error
      const isDemo = (useContinuumStore.getState().project?.id ?? 'proj_got_demo') === 'proj_got_demo';
      setIssues(isDemo ? HARDCODED_ISSUES : []);
      setLastChecked(Date.now());
    } finally {
      setChecking(false);
    }
  }

  return { runCheck };
}
