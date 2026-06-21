export function buildGenerateFixPrompt(
  spanContext: string,
  highlightedText: string,
  explanation: string,
  evidenceQuote: string,
): { system: string; user: string } {
  const system = `You repair a single continuity contradiction in a fictional scene with the LIGHTEST possible touch. You preserve the writer's voice, tone, and sentence rhythm. You change only what is necessary to remove the contradiction. You may also offer a "change canon instead" option. Output ONLY via emit_fixes.`;

  const user = `SCENE EXCERPT: "${spanContext}"
OFFENDING PHRASE: "${highlightedText}"
WHY IT CONTRADICTS: ${explanation}
CONFLICTING CANON: ${evidenceQuote}

Propose 1–3 minimal fixes. For each: a short label, a one-line description, and the exact replacement text for the offending phrase. Mark preservesVoice. Call emit_fixes.`;

  return { system, user };
}
