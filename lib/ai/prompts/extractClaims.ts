export function buildExtractClaimsPrompt(
  sceneText: string,
  presentation: string,
  anchorEventName: string | null,
  entities: Array<{ name: string; aliases?: string[] | null }>,
): { system: string; user: string } {
  const anchorClause = anchorEventName ? ` (flashback before "${anchorEventName}")` : '';

  const entityList = entities.map(e => {
    const aliasStr = e.aliases?.length ? ` (also: ${e.aliases.join(', ')})` : '';
    return `${e.name}${aliasStr}`;
  }).join('\n');

  const system = `You are Continuum's claim extractor. Given a NEW scene, list every concrete factual claim it asserts about the story world. Also infer scene context: presentation (main|flashback|flashforward|unknown), anchor event if flashback/forward, confidence 0..1, conflict boolean.

For each claim output: claimText (normalized assertion), claimType, entity names mentioned (use canonical names, not nicknames), EXACT verbatim scene substring as sceneQuote, confidence 0..1.

Claim types: world_rule | character_state | object_state | relationship | faction_state | knowledge_state | timeline | branch_state

Be thorough — extract claims about:
- Character physical state (alive/dead, injuries, missing limbs, location)
- Character knowledge and beliefs
- Object states (who holds what, condition)
- Travel and timing
- World rules (what is mythical, what exists)
- Relationships between characters

Limit to the 20 most important/checkable claims. Prioritize claims likely to conflict with existing canon.

Output ONLY via the emit_claims tool. Do NOT evaluate consistency here.`;

  const user = `SCENE CONTEXT: presentation=${presentation}${anchorClause}

SCENE TEXT:
"""
${sceneText}
"""

Known entities and aliases (resolve all nicknames/titles to canonical names):
${entityList}

Extract every factual claim. Call emit_claims.`;

  return { system, user };
}
