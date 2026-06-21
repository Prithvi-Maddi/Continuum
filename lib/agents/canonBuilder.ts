import { getClient } from '../ai/client';
import { MODELS } from '../ai/models';
import { EmitCanonInput } from '../ai/schemas';
import { EMIT_CANON_TOOL } from '../ai/toolSchema';
import { buildCanonBuilderPrompt } from '../ai/prompts/canonBuilder';
import { memoryStore } from '../store/memoryStore';
import type { Entity, CanonFact, TimelineEvent, Branch, CanonSource, IngestResponse } from '../types';
import { nanoid } from '../utils';
import type Anthropic from '@anthropic-ai/sdk';

export async function runCanonBuilder(
  title: string,
  rawText: string,
  projectId: string,
  kind: CanonSource['kind'] = 'import',
): Promise<IngestResponse> {
  const client = getClient();
  const world = memoryStore.getWorld(projectId);

  const { system, user } = buildCanonBuilderPrompt(title, rawText, world.entities, world.events);

  const response = await client.messages.create({
    model: MODELS.canonBuilder,
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: user }],
    tools: [EMIT_CANON_TOOL],
    tool_choice: { type: 'any' },
  });

  const toolUse = (response as Anthropic.Message).content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );
  if (!toolUse) return { entities: [], facts: [], events: [], branches: [], sourceId: '' };

  const parseResult = EmitCanonInput.safeParse(toolUse.input);
  if (!parseResult.success) {
    console.error('[canonBuilder] Schema parse failed:', JSON.stringify(parseResult.error.issues));
    return { entities: [], facts: [], events: [], branches: [], sourceId: '' };
  }
  const parsed = parseResult.data;

  // Build name→id lookup from existing + newly staged entities
  const entityIdMap = new Map<string, string>();
  for (const e of world.entities) {
    entityIdMap.set(e.name.toLowerCase(), e.id);
    for (const a of e.aliases ?? []) entityIdMap.set(a.toLowerCase(), e.id);
  }

  // Build name→id lookup from existing + newly staged events
  const eventIdMap = new Map<string, string>();
  for (const e of world.events) {
    eventIdMap.set(e.name.toLowerCase(), e.id);
  }

  const resolveEntityId = (name: string): string => {
    return entityIdMap.get(name.toLowerCase()) ?? `ent_${nanoid()}`;
  };

  const resolveEventId = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const lower = name.toLowerCase();
    for (const [k, v] of eventIdMap) {
      if (k.includes(lower) || lower.includes(k)) return v;
    }
    return null;
  };

  // Stage entities — merge into existing if name/alias already known
  let orderCounter = Math.max(...world.events.map(e => e.order), 0) + 1;
  const stagedEntities: Entity[] = [];   // brand-new
  const mergedEntities: Entity[] = [];   // updated in-place

  for (const e of parsed.entities) {
    const existingId = entityIdMap.get(e.name.toLowerCase());
    if (existingId) {
      // Merge aliases + prefer longer summary
      const existing = world.entities.find(x => x.id === existingId);
      if (existing) {
        const mergedAliases = Array.from(new Set([...(existing.aliases ?? []), ...(e.aliases ?? [])]));
        const merged: Entity = {
          ...existing,
          aliases: mergedAliases,
          summary: (e.summary ?? '').length > (existing.summary ?? '').length ? e.summary! : (existing.summary ?? ''),
        };
        mergedEntities.push(merged);
        for (const a of e.aliases ?? []) entityIdMap.set(a.toLowerCase(), existingId);
      }
    } else {
      const id = `ent_${nanoid()}`;
      const entity: Entity = { id, projectId, name: e.name, type: e.type, aliases: e.aliases ?? [], summary: e.summary ?? '' };
      stagedEntities.push(entity);
      entityIdMap.set(e.name.toLowerCase(), id);
      for (const a of e.aliases ?? []) entityIdMap.set(a.toLowerCase(), id);
    }
  }

  // Stage events — skip if already known by name
  const stagedEvents: TimelineEvent[] = [];
  for (const e of parsed.events) {
    if (eventIdMap.has(e.name.toLowerCase())) continue;
    const id = `evt_${nanoid()}`;
    const event: TimelineEvent = { id, projectId, name: e.name, order: orderCounter++, branchId: null };
    stagedEvents.push(event);
    eventIdMap.set(e.name.toLowerCase(), id);
  }

  // Stage facts
  const stagedFacts: CanonFact[] = [];
  for (const f of parsed.facts) {
    const fact: CanonFact = {
      id: `fact_${nanoid()}`,
      projectId,
      text: f.text,
      factType: f.factType,
      entityIds: f.entities.map(n => resolveEntityId(n)),
      sourceId: null,
      sourceQuote: f.sourceQuote,
      confidence: f.confidence ?? 0.9,
      branchId: null,
      validityStartEventId: resolveEventId(f.validityFromEvent),
      validityEndEventId: resolveEventId(f.validityUntilEvent),
      epistemicStatus: f.epistemicStatus ?? 'objective',
    };
    stagedFacts.push(fact);
  }

  // Commit to store
  const source: CanonSource = {
    id: `src_ingest_${nanoid()}`, projectId, title,
    kind, text: rawText, createdAt: new Date().toISOString(),
  };
  memoryStore.addSource(projectId, source);
  stagedEntities.forEach(e => memoryStore.addEntity(projectId, e));
  mergedEntities.forEach(e => memoryStore.updateEntity(projectId, e));
  stagedEvents.forEach(e => memoryStore.addEvent(projectId, e));
  stagedFacts.forEach(f => memoryStore.addFact(projectId, { ...f, sourceId: source.id }));

  // Return new + merged entities so the client can upsert all of them
  return { entities: [...stagedEntities, ...mergedEntities], facts: stagedFacts, events: stagedEvents, branches: [], sourceId: source.id };
}
