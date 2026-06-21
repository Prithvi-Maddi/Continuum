'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useContinuumStore, FLASHBACK_DRAFT, DEMO_DRAFT } from '@/hooks/useContinuumStore';
import { useCheck } from '@/hooks/useCheck';
import { useEffect, useState, useRef } from 'react';
import { useCommitScene } from '@/hooks/useCommitScene';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';
import type { ContinuityIssue, PresentationType } from '@/lib/types';

// Walk ProseMirror doc text nodes and find PM positions for a target string
function findInDoc(doc: Parameters<typeof DecorationSet.create>[0], target: string): { from: number; to: number } | null {
  const segments: Array<{ text: string; pos: number }> = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) segments.push({ text: node.text, pos });
  });

  const combined = segments.map(s => s.text).join('');
  const cumLen = [0];
  for (const s of segments) cumLen.push(cumLen[cumLen.length - 1] + s.text.length);

  // Try exact → lowercase → first-4-words
  let matchIdx = combined.indexOf(target);
  let matchLen = target.length;
  if (matchIdx === -1) {
    matchIdx = combined.toLowerCase().indexOf(target.toLowerCase());
  }
  if (matchIdx === -1) {
    const firstWords = target.split(' ').slice(0, 4).join(' ');
    matchIdx = combined.indexOf(firstWords);
    if (matchIdx === -1) matchIdx = combined.toLowerCase().indexOf(firstWords.toLowerCase());
    if (matchIdx !== -1) matchLen = Math.min(target.length, combined.length - matchIdx);
  }
  if (matchIdx === -1) return null;

  const endIdx = matchIdx + matchLen;
  let from = -1;
  let to = -1;

  for (let i = 0; i < segments.length; i++) {
    const segStart = cumLen[i];
    const segEnd = cumLen[i + 1];
    if (from === -1 && matchIdx < segEnd && matchIdx >= segStart) {
      from = segments[i].pos + (matchIdx - segStart);
    }
    if (from !== -1 && endIdx <= segEnd) {
      to = segments[i].pos + (endIdx - segStart);
      break;
    }
  }

  return from !== -1 && to !== -1 ? { from, to } : null;
}

// TipTap extension that adds issue decorations
function createIssuePlugin(getIssues: () => ContinuityIssue[], getSelectedId: () => string | null, onSelect: (id: string) => void) {
  return new Plugin({
    key: new PluginKey('issues'),
    props: {
      decorations(state) {
        const issues = getIssues();
        const selectedId = getSelectedId();
        const decorations: Decoration[] = [];

        for (const issue of issues) {
          if (issue.status === 'ignored' || issue.status === 'resolved') continue;

          const pos = findInDoc(state.doc, issue.highlightedText);
          if (!pos) continue;

          const cls = [
            `issue-${issue.severity}`,
            selectedId === issue.id ? 'issue-selected' : '',
          ].filter(Boolean).join(' ');

          decorations.push(
            Decoration.inline(pos.from, pos.to, {
              class: cls,
              'data-issue-id': issue.id,
            }),
          );
        }

        return DecorationSet.create(state.doc, decorations);
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        const issueId = target.closest('[data-issue-id]')?.getAttribute('data-issue-id');
        if (issueId) {
          onSelect(issueId);
          return true;
        }
        return false;
      },
    },
  });
}

const IssueHighlightExtension = (
  getIssues: () => ContinuityIssue[],
  getSelectedId: () => string | null,
  onSelect: (id: string) => void,
) => Extension.create({
  name: 'issueHighlight',
  addProseMirrorPlugins() {
    return [createIssuePlugin(getIssues, getSelectedId, onSelect)];
  },
});

type Presentation = PresentationType;

const PRESENTATIONS: { value: Presentation; label: string }[] = [
  { value: 'main', label: 'Main timeline' },
  { value: 'flashback', label: 'Flashback' },
  { value: 'flashforward', label: 'Flash-forward' },
  { value: 'unknown', label: 'Unknown' },
];

function ContextChip({ confirmed, children, onClick }: { confirmed: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--bg-card)',
      border: `1px ${confirmed ? 'solid' : 'dashed'} ${confirmed ? 'var(--border)' : 'var(--text-muted)'}`,
      borderRadius: 6,
      padding: '3px 10px',
      fontSize: 12,
      color: confirmed ? 'var(--text)' : 'var(--text-muted)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {!confirmed && <span style={{ opacity: 0.6 }}>○</span>}
      {children}
    </button>
  );
}

export function SceneEditor() {
  const {
    scene, setSceneText, setContext, confirmContext, issues, selectedIssueId, selectIssue, checking, events,
  } = useContinuumStore();
  const { runCheck } = useCheck();
  const { commitScene, committing, commitStatus } = useCommitScene();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);

  const { state: dictationState, toggle: toggleDictation } = useVoiceDictation((transcript) => {
    if (!editor) return;
    const current = editor.getText();
    const separator = current.trim() ? '\n\n' : '';
    editor.commands.setContent(`<p>${(current + separator + transcript).split('\n').join('</p><p>')}</p>`);
    setSceneText(editor.getText());
  });

  // Refs keep the plugin closures stable across renders without stale values
  const issuesRef = useRef<ContinuityIssue[]>([]);
  issuesRef.current = issues;
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedIssueId;

  const editor = useEditor({
    extensions: [
      StarterKit,
      IssueHighlightExtension(
        () => issuesRef.current,
        () => selectedIdRef.current,
        selectIssue,
      ),
    ],
    content: `<p>${scene.text.split('\n').join('</p><p>')}</p>`,
    onUpdate({ editor }) {
      setSceneText(editor.getText());
    },
    editorProps: {
      attributes: { class: 'tiptap-editor' },
    },
  });

  const lastTextRef = useRef(scene.text);

  // Sync external text changes to editor (e.g. after apply fix or demo preset)
  useEffect(() => {
    if (!editor) return;
    const editorText = editor.getText();
    if (editorText !== scene.text && scene.text !== lastTextRef.current) {
      editor.commands.setContent(`<p>${scene.text.split('\n').join('</p><p>')}</p>`);
    }
    lastTextRef.current = scene.text;
  }, [scene.text, editor]);

  // Force decoration refresh when issues change
  useEffect(() => {
    if (editor) {
      editor.view.dispatch(editor.view.state.tr);
    }
  }, [issues, selectedIssueId, editor]);

  // Auto-save scene text to localStorage (debounced 1s)
  useEffect(() => {
    const projectId = useContinuumStore.getState().project?.id ?? 'proj_got_demo';
    const key = `continuum:draft:${projectId}`;
    const t = setTimeout(() => {
      try { localStorage.setItem(key, scene.text); } catch { /* storage full */ }
    }, 1000);
    return () => clearTimeout(t);
  }, [scene.text]);

  // Keyboard shortcut: Enter to check
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runCheck();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runCheck]);

  const ctx = scene.context;
  const anchorEvent = ctx.anchorEventId ? events.find(e => e.id === ctx.anchorEventId) : null;

  const presentationLabel = PRESENTATIONS.find(p => p.value === ctx.presentation)?.label ?? 'Main timeline';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg)', borderRight: '1px solid var(--border)',
    }}>
      {/* Context bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Context</span>

        {/* Presentation chip */}
        <div style={{ position: 'relative' }}>
          <ContextChip confirmed={ctx.confirmed} onClick={() => setShowContextMenu(!showContextMenu)}>
            {presentationLabel}
            {anchorEvent ? ` — before ${anchorEvent.name}` : ''}
          </ContextChip>
          {showContextMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, overflow: 'hidden', marginTop: 4, minWidth: 200,
            }}>
              {PRESENTATIONS.map(p => (
                <button key={p.value} onClick={() => {
                  setContext({ presentation: p.value, anchorEventId: null });
                  confirmContext();
                  setShowContextMenu(false);
                }} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', background: 'none', border: 'none',
                  color: ctx.presentation === p.value ? 'var(--accent)' : 'var(--text)',
                  fontSize: 13, cursor: 'pointer',
                }}>
                  {p.label}
                </button>
              ))}
              {/* Flashback options per event */}
              {(ctx.presentation === 'flashback' || ctx.presentation === 'flashforward') && events.length > 0 && (
                <>
                  <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>Anchor event:</div>
                  {events.map(evt => (
                    <button key={evt.id} onClick={() => {
                      setContext({ anchorEventId: evt.id });
                      confirmContext();
                      setShowContextMenu(false);
                    }} style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 16px', background: 'none', border: 'none',
                      color: ctx.anchorEventId === evt.id ? 'var(--accent)' : 'var(--text)',
                      fontSize: 12, cursor: 'pointer',
                    }}>
                      {evt.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Demo shortcuts */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Deepgram voice dictation */}
          <button
            onClick={toggleDictation}
            title={dictationState === 'recording' ? 'Stop recording' : 'Dictate scene (Deepgram)'}
            style={{
              fontSize: 15,
              background: dictationState === 'recording' ? 'rgba(248,81,73,0.15)' : 'var(--bg-card)',
              color: dictationState === 'recording' ? '#f85149' : dictationState === 'transcribing' ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${dictationState === 'recording' ? '#f85149' : 'var(--border)'}`,
              borderRadius: 4, padding: '3px 8px', cursor: dictationState === 'transcribing' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              animation: dictationState === 'recording' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {dictationState === 'transcribing' ? '…' : '🎙'}
            <span style={{ fontSize: 11 }}>
              {dictationState === 'recording' ? 'Stop' : dictationState === 'transcribing' ? 'Transcribing…' : 'Dictate'}
            </span>
          </button>
          <button onClick={() => {
            setSceneText(scene.text); // trigger re-render
            setContext({ presentation: 'flashback', anchorEventId: 'evt_jaime_captured', branchId: null });
            confirmContext();
            // Swap to flashback draft
            const store = useContinuumStore.getState();
            store.setSceneText(FLASHBACK_DRAFT);
            if (editor) editor.commands.setContent(`<p>${FLASHBACK_DRAFT}</p>`);
          }} style={{
            fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
          }}>
            Flashback demo
          </button>
          <button onClick={() => {
            useContinuumStore.getState().setSceneText(DEMO_DRAFT);
            setContext({ presentation: 'main', anchorEventId: null, branchId: null, confirmed: false });
            if (editor) editor.commands.setContent(`<p>${DEMO_DRAFT}</p>`);
          }} style={{
            fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
          }}>
            Reset demo
          </button>
        </div> {/* end demo shortcuts */}
      </div>

      {/* Checking indicator */}
      {checking && (
        <div style={{
          borderBottom: '2px solid var(--accent)',
          transition: 'border-color 0.3s',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}

      {/* Editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} onClick={() => setShowContextMenu(false)}>
        <EditorContent editor={editor} />
      </div>

      {/* Commit to canon */}
      <div style={{
        borderTop: '1px solid var(--border)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, background: 'var(--bg)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {commitStatus === 'done' && '✓ Scene added to canon'}
          {commitStatus === 'error' && '✗ Failed to add to canon'}
          {commitStatus === 'idle' && 'Commit this scene to the project canon'}
        </span>
        <button
          onClick={() => setShowCommitConfirm(true)}
          disabled={committing || !scene.text.trim()}
          style={{
            background: commitStatus === 'done' ? 'rgba(63,185,80,0.15)' : 'var(--bg-card)',
            color: commitStatus === 'done' ? '#3fb950' : 'var(--text-muted)',
            border: `1px solid ${commitStatus === 'done' ? '#3fb950' : 'var(--border)'}`,
            borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 500,
            cursor: committing ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: !scene.text.trim() ? 0.4 : 1,
          }}
        >
          {committing ? (
            <>
              <span style={{
                display: 'inline-block', width: 10, height: 10,
                border: '2px solid var(--text-dim)', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              Adding to canon…
            </>
          ) : 'Add scene to canon'}
        </button>
      </div>

      {/* Commit confirmation modal */}
      {showCommitConfirm && (
        <div
          onClick={() => setShowCommitConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '24px 28px', width: 380,
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>
              Add scene to canon?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              This will extract entities, events, and facts from the current scene and permanently add them to the project canon. This cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowCommitConfirm(false)}
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 16px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowCommitConfirm(false); commitScene(); }}
                style={{
                  background: 'var(--accent)', border: 'none', borderRadius: 6,
                  padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#0f1117', cursor: 'pointer',
                }}
              >
                Add to canon
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
