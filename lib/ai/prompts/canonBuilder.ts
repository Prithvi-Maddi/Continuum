import type { Entity, TimelineEvent } from '../../types';

export function buildCanonBuilderPrompt(
  title: string,
  rawText: string,
  existingEntities: Entity[],
  existingEvents: TimelineEvent[],
): { system: string; user: string } {
  const existingEntityList = existingEntities.length
    ? existingEntities.map(e => `  ${e.name} (${e.type})${e.aliases?.length ? ` aka ${e.aliases.join(', ')}` : ''}`).join('\n')
    : '  (none yet)';

  const existingEventList = existingEvents.length
    ? existingEvents.map(e => `  [order ${e.order}] ${e.name}`).join('\n')
  : '  (none yet)';

  const system = `You are a canon extractor for a story consistency tool. Given source text, extract all story-world facts into structured data. Be thorough and precise. Extract only what the text states or clearly implies — do not invent.

Entity types: character | location | faction | object | event | rule
Fact types: world_rule | character_state | object_state | relationship | faction_state | knowledge_state | timeline | branch_state
Epistemic status: objective | character_believed | public | hidden

Rules:
- Do not re-add entities or events already in the EXISTING CANON list below. Reference them by their exact name in fact entity arrays.
- For each fact, set validityFromEvent / validityUntilEvent (use event names, not IDs) when timing matters — e.g. a character's death is valid from the death event onward.
- sourceQuote must be a short verbatim snippet from the source text supporting this fact.
- Call emit_canon exactly once with everything.`;

  const user = `SOURCE: "${title}"

TEXT:
"""
${rawText}
"""

EXISTING CANON (do not duplicate):
Entities:
${existingEntityList}

Events (ordered):
${existingEventList}

Extract all new entities, timeline events, and facts. Call emit_canon once.`;

  return { system, user };
}
