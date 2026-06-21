import type { CanonFact, Claim } from '../../types';

export function buildDetectPrompt(
  sceneText: string,
  presentation: string,
  anchorEventName: string | null,
  branchName: string | null,
  claims: Array<{ claim: Claim; facts: CanonFact[] }>,
): { system: string; user: string } {
  const anchorClause = anchorEventName ? ` (before "${anchorEventName}")` : '';
  const branchClause = branchName ? ` branch="${branchName}"` : '';

  const system = `You are Continuum's continuity checker for fictional and game worlds. You are given (1) a list of CLAIMS extracted from a new scene, each with the CANON FACTS in force for that claim's branch and position, and (2) the scene context.

Rules:
- Only the facts provided for each claim are in force. Do not assume other facts.
- A contradiction is a claim that cannot be true given its in-force facts.
- Respect the scene context. Facts are already time/branch filtered; if a claim conflicts with none of them, it is consistent.
- Distinguish objective truth from character knowledge: narration may state objective facts; a contradiction in knowledge_state occurs when a CHARACTER asserts/acts on a fact marked hidden-from-them.
- Phrase everything as a POSSIBLE contradiction. Writers break canon on purpose.
- For each contradiction: classify issueType (world_rule|travel_time|character_state|object_state|relationship|faction_state|knowledge_state|timeline|branch), set severity (high|medium|low), write a one-paragraph plain explanation, include the EXACT offending substring (highlightedText, verbatim from the scene), cite the conflicting fact ids and an evidenceQuote from canon, and propose 1–3 suggestedFixes. A fix is a minimal edit to the scene text that preserves the writer's voice (give the replacement substring) OR a canon update.
- Be precise and conservative: do not flag things the in-force facts do not actually contradict.
- A fix replacement must be a short phrase that fits where highlightedText appears in the scene.

Output ONLY via the emit_issues tool.`;

  // Build claims block with per-claim facts
  const claimsBlock = claims.map(({ claim, facts }) => {
    const factsStr = facts.length > 0
      ? facts.map(f => `  [${f.id}] (${f.factType}) "${f.text}" | evidence: "${f.sourceQuote}"`).join('\n')
      : '  (no in-force facts for this claim)';
    const branchNote = claim.impliedBranchId ? ` (implied branch: ${claim.impliedBranchId})` : '';
    return `CLAIM [${claim.id}]${branchNote} (${claim.claimType}): "${claim.claimText}"
  scene quote: "${claim.sourceSpan.quote}"
  IN-FORCE FACTS FOR THIS CLAIM:
${factsStr}`;
  }).join('\n\n');

  const user = `SCENE CONTEXT: presentation=${presentation}${anchorClause}${branchClause}

SCENE TEXT:
"""
${sceneText}
"""

CLAIMS AND THEIR IN-FORCE FACTS:
${claimsBlock}

For each claim that contradicts its in-force facts, emit an issue. Call emit_issues.`;

  return { system, user };
}
