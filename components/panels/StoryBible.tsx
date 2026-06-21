'use client';
import { useState } from 'react';
import { useContinuumStore } from '@/hooks/useContinuumStore';
import { CanonGraph } from './CanonGraph';
import type { Entity, CanonFact, TimelineEvent } from '@/lib/types';

async function serverDeleteFact(projectId: string, factId: string) {
  await fetch('/api/canon/fact', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factId, projectId }),
  });
}

function SectionHeader({ title, count, open, onToggle }: { title: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
      color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      <span>{open ? '▾' : '▸'} {title}</span>
      <span style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>
    </button>
  );
}

function EntityRow({ entity, isNew }: { entity: Entity; isNew: boolean }) {
  const { deleteEntity, project } = useContinuumStore();
  const typeColors: Record<string, string> = {
    character: '#58a6ff', location: '#3fb950', faction: '#d29922',
    object: '#bc8cff', event: '#f85149', rule: '#79c0ff',
  };
  return (
    <div
      className={isNew ? 'newly-added' : undefined}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', borderRadius: 3 }}
    >
      <span style={{
        fontSize: 10, fontWeight: 600, color: typeColors[entity.type] ?? 'var(--text-muted)',
        background: 'var(--bg-card)', borderRadius: 4, padding: '1px 5px', marginTop: 1, flexShrink: 0,
      }}>
        {entity.type.slice(0, 4).toUpperCase()}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{entity.name}</div>
        {entity.summary && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{entity.summary}</div>}
      </div>
      <button
        onClick={() => deleteEntity(entity.id)}
        title="Remove entity"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          color: 'var(--text-dim)', fontSize: 11, opacity: 0.4, flexShrink: 0,
          lineHeight: 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
      >
        ✕
      </button>
    </div>
  );
}

function FactRow({ fact, isNew }: { fact: CanonFact; isNew: boolean }) {
  const { deleteFact, project } = useContinuumStore();
  return (
    <div
      className={isNew ? 'newly-added' : undefined}
      style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', borderRadius: 3, display: 'flex', alignItems: 'flex-start', gap: 6 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{fact.text}</div>
        {fact.branchId && (
          <span style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2, display: 'block' }}>Branch: {fact.branchId}</span>
        )}
      </div>
      <button
        onClick={() => {
          deleteFact(fact.id);
          if (project) serverDeleteFact(project.id, fact.id).catch(() => {});
        }}
        title="Remove fact"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          color: 'var(--text-dim)', fontSize: 11, opacity: 0.4, flexShrink: 0,
          lineHeight: 1, marginTop: 2,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
      >
        ✕
      </button>
    </div>
  );
}

function TimelineTrack({ events, facts, resolvedPosition }: {
  events: TimelineEvent[];
  facts: CanonFact[];
  resolvedPosition: number;
}) {
  const sorted = [...events].sort((a, b) => a.order - b.order);

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ position: 'relative', paddingLeft: 16 }}>
        <div style={{
          position: 'absolute', left: 7, top: 8, bottom: 8,
          width: 2, background: 'var(--border)',
        }} />

        {sorted.map((evt) => {
          const isYouAreHere = resolvedPosition !== Infinity
            ? Math.abs(resolvedPosition - evt.order) < 0.6
            : false;
          const isPast = resolvedPosition >= evt.order;
          const factsAtEvent = facts.filter(f =>
            f.validityStartEventId === evt.id || f.validityEndEventId === evt.id
          );

          return (
            <div key={evt.id} style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{
                position: 'absolute', left: -10, top: 4,
                width: 10, height: 10, borderRadius: '50%',
                background: isYouAreHere ? 'var(--accent)' : isPast ? 'var(--text-muted)' : 'var(--bg-card)',
                border: `2px solid ${isYouAreHere ? 'var(--accent)' : 'var(--border)'}`,
                zIndex: 1,
              }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: isPast ? 'var(--text)' : 'var(--text-dim)' }}>
                  {evt.name}
                  {isYouAreHere && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, color: 'var(--accent)',
                      background: 'rgba(88,166,255,0.12)', borderRadius: 4, padding: '1px 5px',
                    }}>you are here</span>
                  )}
                </div>
                {factsAtEvent.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    {factsAtEvent.map(f => (
                      <div key={f.id} style={{
                        fontSize: 10, color: resolvedPosition < evt.order ? 'var(--text-dim)' : 'var(--text-muted)',
                        fontStyle: 'italic', paddingLeft: 4,
                      }}>
                        {resolvedPosition < evt.order ? '⊘ ' : '✓ '}{f.text.slice(0, 60)}…
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {resolvedPosition === Infinity && (
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <div style={{
              position: 'absolute', left: -10, top: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--accent)', border: '2px solid var(--accent)',
            }} />
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)' }}>
              Now (main timeline)
              <span style={{
                marginLeft: 6, fontSize: 10,
                background: 'rgba(88,166,255,0.12)', borderRadius: 4, padding: '1px 5px',
              }}>you are here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ViewMode = 'bible' | 'graph';

export function StoryBible() {
  const { entities, facts, events, scene, newlyAddedEntityIds, newlyAddedFactIds } = useContinuumStore();
  const [view, setView] = useState<ViewMode>('bible');
  const [sections, setSections] = useState({
    characters: true, locations: false, objects: false,
    worldRules: true, timeline: true,
  });

  const toggle = (k: keyof typeof sections) => setSections(s => ({ ...s, [k]: !s[k] }));

  const characters = entities.filter(e => e.type === 'character');
  const locations = entities.filter(e => e.type === 'location');
  const objects = entities.filter(e => e.type === 'object');
  const worldRules = facts.filter(f => f.factType === 'world_rule' || f.factType === 'character_state');
  const resolvedPosition = scene.context.resolvedPosition ?? Infinity;

  const newEntitySet = new Set(newlyAddedEntityIds);
  const newFactSet = new Set(newlyAddedFactIds);

  return (
    <div style={{
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header with view toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Story Bible
        </div>
        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 6, padding: 2, gap: 2 }}>
          {(['bible', 'graph'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 4, border: 'none',
              background: view === v ? 'var(--bg-card)' : 'transparent',
              color: view === v ? 'var(--text)' : 'var(--text-dim)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'graph' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CanonGraph />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 12px' }}>
          <SectionHeader title="Characters" count={characters.length} open={sections.characters} onToggle={() => toggle('characters')} />
          {sections.characters && characters.map(e => <EntityRow key={e.id} entity={e} isNew={newEntitySet.has(e.id)} />)}

          <SectionHeader title="Locations" count={locations.length} open={sections.locations} onToggle={() => toggle('locations')} />
          {sections.locations && locations.map(e => <EntityRow key={e.id} entity={e} isNew={newEntitySet.has(e.id)} />)}

          <SectionHeader title="Objects" count={objects.length} open={sections.objects} onToggle={() => toggle('objects')} />
          {sections.objects && objects.map(e => <EntityRow key={e.id} entity={e} isNew={newEntitySet.has(e.id)} />)}

          <SectionHeader title="Canon Facts" count={worldRules.length} open={sections.worldRules} onToggle={() => toggle('worldRules')} />
          {sections.worldRules && worldRules.map(f => <FactRow key={f.id} fact={f} isNew={newFactSet.has(f.id)} />)}

          <SectionHeader title="Timeline" count={events.length} open={sections.timeline} onToggle={() => toggle('timeline')} />
          {sections.timeline && (
            <TimelineTrack events={events} facts={facts} resolvedPosition={resolvedPosition} />
          )}
        </div>
      )}
    </div>
  );
}
